r"""
Email Reader Module — IMAP poller.

Polls an IMAP mailbox every 10 minutes for unread emails,
extracts the content, appends them directly to emails.csv,
and then marks them as \Seen.

AI decision making and spam filtering is deferred to agent.py.
"""

import imaplib
import email
from email.header import decode_header
import os
import csv
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────
IMAP_SERVER = os.environ.get("IMAP_SERVER", "")
IMAP_PORT = int(os.environ.get("IMAP_PORT", "993"))
IMAP_EMAIL = os.environ.get("IMAP_EMAIL", "")
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD", "")

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

def _append_to_emails_csv(email_dict: dict) -> str:
    """Appends a new email to data/emails.csv and returns its new MSG-XXX ID."""
    csv_path = os.path.join(os.path.dirname(__file__), "data", "emails.csv")
    
    last_num = 0
    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                eid = row.get("id", "")
                if eid.startswith("MSG-"):
                    try:
                        num = int(eid.split("-")[1])
                        if num > last_num:
                            last_num = num
                    except ValueError:
                        pass
    
    new_id = f"MSG-{last_num + 1:03d}"
    
    file_exists = os.path.exists(csv_path)
    with open(csv_path, "a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "sender", "subject", "date", "body"])
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            "id": new_id,
            "sender": email_dict["sender"],
            "subject": email_dict["subject"],
            "date": email_dict["date"],
            "body": email_dict["body"]
        })
        
    return new_id

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

            status, msg_data = mail.fetch(eid, "(BODY.PEEK[])")
            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = _decode_mime_header(msg.get("Subject", ""))
            sender = _decode_mime_header(msg.get("From", ""))
            date_str = msg.get("Date", "")
            body = _extract_body(msg)

            email_dict = {
                "subject": subject,
                "sender": sender,
                "date": date_str,
                "body": body,
            }

            # 1. Persist email to CSV
            new_id = _append_to_emails_csv(email_dict)
            email_dict["id"] = new_id

            # 2. Mark email as read on server so it is not processed again
            mail.store(eid, '+FLAGS', '\\Seen')

            fetched.append(email_dict)
            print(f"[EmailReader] Saved new email {new_id} to database.")

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
    Fetch unread emails, save them, and return them.
    """
    return fetch_unread_emails()

def get_all_alerts() -> list[dict]:
    # Deprecated: Agent handles UI decisions via audit_log
    return []

def clear_alerts():
    pass
