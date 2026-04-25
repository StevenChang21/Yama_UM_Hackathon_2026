"""
Email Reader Module — IMAP poller for supply chain alerts.

Polls an IMAP mailbox every 10 minutes for unread emails,
extracts the content, and uses the ILMU AI to classify whether
the email contains a supply chain issue (e.g., shipment delay,
price change, quality problem, order cancellation).

Alerts are stored in-memory and exposed via a REST API.
"""

import imaplib
import email
from email.header import decode_header
import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# ── Configuration ──────────────────────────────────────────────
IMAP_SERVER = os.environ.get("IMAP_SERVER", "")
IMAP_PORT = int(os.environ.get("IMAP_PORT", "993"))
IMAP_EMAIL = os.environ.get("IMAP_EMAIL", "")
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD", "")
POLL_INTERVAL_SECONDS = int(os.environ.get("EMAIL_POLL_INTERVAL", "600"))  # 10 min default

# ILMU AI client (reuse same key)
api_key = os.environ.get("ILMU_API_KEY", "")
ai_client = OpenAI(
    api_key=api_key,
    base_url="https://api.ilmu.ai/v1",
) if api_key else None

# ── In-memory alert store ──────────────────────────────────────
email_alerts: list[dict] = []
MAX_ALERTS = 100  # keep last 100 alerts in memory

# Track processed email IDs to avoid duplicates
_processed_ids: set[str] = set()


def _decode_mime_header(header_value: str) -> str:
    """Decode MIME-encoded email header into plain text."""
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return " ".join(result)


def _extract_body(msg: email.message.Message) -> str:
    """Extract plain-text body from an email message."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            # Skip attachments
            if "attachment" in content_disposition:
                continue
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body += payload.decode(charset, errors="replace")
            elif content_type == "text/html" and not body:
                # Fallback to HTML if no plain text
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body += payload.decode(charset, errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            body = payload.decode(charset, errors="replace")
    return body.strip()


def _analyze_email_with_ai(subject: str, body: str, sender: str) -> dict | None:
    """
    Use ILMU AI to classify whether the email contains a supply chain issue.
    Returns a dict with issue details, or None if no issue found.
    """
    if not ai_client:
        # Fallback: simple keyword-based detection if no AI key
        return _keyword_fallback(subject, body, sender)

    prompt = f"""Analyze this email and determine if it contains a supply chain issue.
If it does, classify it. If it's just a normal/promotional email, respond with {{"is_issue": false}}.

Email From: {sender}
Subject: {subject}
Body (first 2000 chars):
{body[:2000]}

Respond ONLY with a JSON object:
{{
    "is_issue": true/false,
    "category": "shipment_delay" | "price_change" | "quality_issue" | "order_cancellation" | "stock_shortage" | "other",
    "severity": "low" | "medium" | "high" | "critical",
    "summary": "One-line summary of the issue",
    "affected_items": ["list of item/SKU IDs mentioned, if any"],
    "recommended_action": "Brief suggested action"
}}
"""

    try:
        response = ai_client.chat.completions.create(
            model="ilmu-glm-5.1",
            messages=[
                {"role": "system", "content": "You are a supply chain email analyzer. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        content = response.choices[0].message.content.strip()
        # Clean markdown wrappers
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        result = json.loads(content.strip())
        return result if result.get("is_issue") else None
    except Exception as e:
        print(f"[EmailReader] AI analysis failed: {e}")
        return _keyword_fallback(subject, body, sender)


def _keyword_fallback(subject: str, body: str, sender: str) -> dict | None:
    """Simple keyword-based issue detection when AI is unavailable."""
    text = (subject + " " + body).lower()
    keywords = {
        "shipment_delay": ["delay", "delayed", "late shipment", "shipping delay", "postponed"],
        "price_change": ["price increase", "price change", "new pricing", "surcharge", "cost increase"],
        "quality_issue": ["defect", "quality issue", "damaged", "faulty", "reject", "recall"],
        "order_cancellation": ["cancel", "cancelled", "cancellation", "unable to fulfill"],
        "stock_shortage": ["out of stock", "shortage", "unavailable", "backorder", "insufficient"],
    }

    for category, words in keywords.items():
        for word in words:
            if word in text:
                return {
                    "is_issue": True,
                    "category": category,
                    "severity": "medium",
                    "summary": f"Keyword '{word}' detected in email from {sender}: {subject}",
                    "affected_items": [],
                    "recommended_action": "Review email and assess impact on current orders.",
                }
    return None


def fetch_unread_emails() -> list[dict]:
    """
    Connect to IMAP, fetch unread emails, and return their contents.
    Marks processed emails as SEEN.
    """
    if not all([IMAP_SERVER, IMAP_EMAIL, IMAP_PASSWORD]):
        print("[EmailReader] IMAP not configured — skipping email fetch.")
        return []

    fetched = []
    mail = None
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(IMAP_EMAIL, IMAP_PASSWORD)
        mail.select("INBOX")

        # Search for unread emails
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK" or not messages[0]:
            print("[EmailReader] No new unread emails.")
            return []

        email_ids = messages[0].split()
        print(f"[EmailReader] Found {len(email_ids)} unread email(s).")

        for eid in email_ids:
            eid_str = eid.decode()

            # Skip already processed
            if eid_str in _processed_ids:
                continue

            status, msg_data = mail.fetch(eid, "(BODY.PEEK[])")
            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = _decode_mime_header(msg.get("Subject", ""))
            sender = _decode_mime_header(msg.get("From", ""))
            date_str = msg.get("Date", "")
            body = _extract_body(msg)

            fetched.append({
                "email_id": eid_str,
                "subject": subject,
                "sender": sender,
                "date": date_str,
                "body": body,
            })

            _processed_ids.add(eid_str)

    except imaplib.IMAP4.error as e:
        print(f"[EmailReader] IMAP error: {e}")
    except Exception as e:
        print(f"[EmailReader] Unexpected error: {e}")
    finally:
        if mail:
            try:
                mail.close()
                mail.logout()
            except Exception:
                pass

    return fetched


def process_emails() -> list[dict]:
    """
    Fetch unread emails, analyze each for supply chain issues,
    and store any alerts found. Returns the new alerts.
    """
    emails = fetch_unread_emails()
    new_alerts = []

    for em in emails:
        analysis = _analyze_email_with_ai(em["subject"], em["body"], em["sender"])
        if analysis:
            alert = {
                "id": f"ALERT-{len(email_alerts) + 1:04d}",
                "timestamp": datetime.now().isoformat(),
                "email_subject": em["subject"],
                "email_sender": em["sender"],
                "email_date": em["date"],
                **analysis,
            }
            email_alerts.append(alert)
            new_alerts.append(alert)
            print(f"[EmailReader] ⚠ Alert: {alert['summary']}")

    # Trim to max size
    while len(email_alerts) > MAX_ALERTS:
        email_alerts.pop(0)

    return new_alerts


def get_all_alerts() -> list[dict]:
    """Return all stored email alerts (newest first)."""
    return list(reversed(email_alerts))


def clear_alerts():
    """Clear all stored alerts."""
    email_alerts.clear()
    _processed_ids.clear()


async def email_poll_loop():
    """
    Background async loop that polls for emails every POLL_INTERVAL_SECONDS.
    Call this as a background task when the FastAPI app starts.
    """
    print(f"[EmailReader] Starting email poll loop (every {POLL_INTERVAL_SECONDS}s)...")

    # Check if IMAP is configured
    if not all([IMAP_SERVER, IMAP_EMAIL, IMAP_PASSWORD]):
        print("[EmailReader] ⚠ IMAP not configured. Set IMAP_SERVER, IMAP_EMAIL, IMAP_PASSWORD in .env")
        print("[EmailReader] Email polling is DISABLED. Manual trigger via /api/emails/check still works.")
        return

    while True:
        try:
            print(f"[EmailReader] Polling for new emails at {datetime.now().isoformat()}...")
            # Run the blocking IMAP operations in a thread pool
            new_alerts = await asyncio.to_thread(process_emails)
            if new_alerts:
                print(f"[EmailReader] Found {len(new_alerts)} new alert(s)!")
            else:
                print("[EmailReader] No new issues found.")
        except Exception as e:
            print(f"[EmailReader] Poll error: {e}")

        await asyncio.sleep(POLL_INTERVAL_SECONDS)
