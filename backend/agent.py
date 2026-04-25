"""
Autonomous AI Operations Agent
Reads emails.csv, reasons about each email, updates relevant CSVs, produces audit log.
"""

import os
import json
import pandas as pd
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
AUDIT_LOG_PATH = os.path.join(DATA_DIR, "audit_log.json")
STATUS_PATH = os.path.join(DATA_DIR, "agent_status.json")

def set_status(status_msg, email_id=None):
    with open(STATUS_PATH, "w") as f:
        json.dump({"status": status_msg, "current_email": email_id, "updated_at": datetime.now().isoformat()}, f)

def load_csv(name):
    return pd.read_csv(os.path.join(DATA_DIR, name))

def save_csv(name, df):
    df.to_csv(os.path.join(DATA_DIR, name), index=False)

def latest_per_group(df, date_col, group_col):
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    return df.sort_values(date_col).groupby(group_col).tail(1).reset_index(drop=True)

def get_current_stock(inv_df, item_id):
    filtered = latest_per_group(inv_df, "valid_from", "item_id")
    row = filtered[filtered["item_id"] == item_id]
    return int(row["current_stock"].iloc[0]) if len(row) > 0 else 0

def get_current_balance(fin_df, account):
    filtered = latest_per_group(fin_df, "valid_from", "account_name")
    row = filtered[filtered["account_name"] == account]
    return float(row["balance_usd"].iloc[0]) if len(row) > 0 else 0.0

def process_emails():
    set_status("Initializing agent and loading data...")
    emails_df = load_csv("emails.csv")
    inv_df = load_csv("inventory.csv")
    sales_df = load_csv("sales.csv")
    mfg_df = load_csv("manufacturing.csv")
    fin_df = load_csv("finance.csv")

    audit_log = []
    if os.path.exists(AUDIT_LOG_PATH):
        try:
            with open(AUDIT_LOG_PATH, "r") as f:
                audit_log = json.load(f)
        except:
            pass
    
    processed_ids = {e.get("email_id") for e in audit_log}
    files_modified = set()

    from email_reader import ai_client
    
    emails_processed_this_run = 0

    # Load Preferences
    pref_path = os.path.join(DATA_DIR, "preferences.json")
    prefs = {}
    if os.path.exists(pref_path):
        with open(pref_path, "r") as f:
            prefs = json.load(f)
            
    # Format dynamic rules
    rules = prefs.get("rules", [
        {"label": "Urgent Customer Demand"},
        {"label": "Low Stock Replenishment"},
        {"label": "Production Blockage"},
        {"label": "Supplier Delay"},
        {"label": "Budget Constraints"}
    ])
    budget = prefs.get("budget", {"low": 5000, "medium": 25000, "high": 75000})
    kpis = prefs.get("kpis", {})
    
    pref_lines = []
    for i, r in enumerate(rules):
        pref_lines.append(f"{i+1}. {r.get('label', 'Rule')} — prioritize this rule appropriately.")
    
    pref_lines.append(f"Budget Constraints: Low < ${budget.get('low')}, Medium < ${budget.get('medium')}, High < ${budget.get('high')}")
    active_kpis = [k for k, v in kpis.items() if v]
    pref_lines.append(f"Active KPIs to protect: {', '.join(active_kpis) if active_kpis else 'None'}")
    
    dynamic_prefs_str = "\n".join(pref_lines)

    for _, email in emails_df.iterrows():
        if emails_processed_this_run >= 1:
            break
            
        eid = email["id"]
        if eid in processed_ids:
            continue
            
        emails_processed_this_run += 1
            
        sender = str(email["sender"])
        subject = str(email["subject"])
        date = str(email["date"])
        body = str(email["body"])
        
        set_status("Analyzing context and reasoning with AI...", eid)
        print(f"Processing {eid} via AI...")

        entry = {
            "email_id": eid,
            "date": date,
            "sender": sender,
            "subject": subject,
            "intent": "analysis",
            "work_name": subject,
            "affected_source": "emails.csv",
            "agent_description": "",
            "reasoning_detail": "",
            "preference_refs": [],
            "kpi_alignment": [],
            "confidence": "Medium",
            "guardrail_status": "Needs Review",
            "alternative_considered": "",
            "follow_up": None,
            "status": "In Progress",
            "inference": "",
            "decision": "",
            "actions": [],
            "files_updated": [],
            "risks": [],
        }

        # If AI is unavailable, skip with fallback
        if not ai_client:
            entry["inference"] = "AI Client not configured."
            entry["decision"] = "Fallback: Manual review required."
            entry["agent_description"] = "Agent could not process — AI client not configured."
            entry["status"] = "Blocked"
            audit_log.append(entry)
            with open(AUDIT_LOG_PATH, "w") as f:
                json.dump(audit_log, f, indent=2, default=str)
            continue

        # Build context
        bom_df = load_csv("bom.csv")
        bom_lines = [f"- {r['parent_id']} needs {r['qty_required']}x {r['child_id']}" for _, r in bom_df.iterrows()]
        
        inv_context = []
        for _, row in latest_per_group(inv_df, "valid_from", "item_id").iterrows():
            inv_context.append(f"- {row['item_id']}: {row['current_stock']} units (reorder point: {row.get('reorder_point', 0)}, unit cost: ${row.get('unit_cost', 0)})")
        
        sales_lines = []
        for _, s in latest_per_group(sales_df, "valid_from", "order_id").iterrows():
            if s["status"] != "Completed":
                sales_lines.append(f"- {s['order_id']}: {s['qty']} units of {s['item_id']}, due {s['due_date']}, status: {s['status']}")
                
        mfg_lines = []
        for _, r in latest_per_group(mfg_df, "valid_from", "work_order_id").iterrows():
            if r["status"] != "Completed":
                mfg_lines.append(f"- {r['work_order_id']}: {r['item_id']}, status: {r['status']}, {r['qty']} pending units")
        
        cash = get_current_balance(fin_df, "Operating Cash")

        prompt = f"""You are an autonomous supply chain AI agent for YamaTech.

IMPORTANT CONTEXT:
- YamaTech MANUFACTURES finished goods (SKU-A, SKU-B, SKU-C, SKU-D) in-house using raw materials (RAW-xxx).
- Customers ORDER finished SKUs from us. We do NOT order SKUs from suppliers.
- We only order RAW MATERIALS from suppliers to feed our production lines.
- Each SKU has a Bill of Materials (BOM) listing which raw materials are needed.

CURRENT STATE:
Raw Material Inventory:
{chr(10).join(inv_context)}

Bill of Materials (BOM):
{chr(10).join(bom_lines)}

Active Sales Orders:
{chr(10).join(sales_lines)}

Manufacturing Work Orders:
{chr(10).join(mfg_lines)}

Operating Cash: ${cash:.2f}

PREFERENCE RULES (in priority order configured by user):
{dynamic_prefs_str}

NEW EMAIL [{eid}]:
Date: {date}
From: {sender}
Subject: {subject}
Body: {body}

INSTRUCTIONS:
Analyze this email and decide the best action. Return ONLY a JSON object with this EXACT structure:
{{
  "work_name": "Short concrete task title describing what you modified (e.g. 'Update Sales ORD-101 from 300 to 500')",
  "affected_source": "Which CSV file is affected (emails.csv, inventory.csv, sales.csv, manufacturing.csv, finance.csv, logistics.csv, or suppliers.csv)",
  "agent_description": "Precise description of what you (the AI agent) DID — not what the email says. Describe data changes, POs created, status updates made, emails drafted. Reference specific file names, order IDs, quantities.",
  "reasoning_detail": "Explain WHY you made this decision. Reference which preference rules triggered, which KPIs you are protecting, what checks you ran (BOM feasibility, stock levels, budget thresholds).",
  "preference_refs": ["List of preference rules that influenced this decision"],
  "kpi_alignment": ["List of KPI impacts, e.g. 'Fulfilment rate protection', 'Stockout risk reduction'"],
  "confidence": "High or Medium or Low",
  "guardrail_status": "Passed or Needs Review or Blocked",
  "alternative_considered": "Describe at least one alternative you considered and why you rejected it.",
  "follow_up": null,
  "status": "Completed or In Progress or Follow-Up Required",
  "inference": "Summary of what the email means",
  "decision": "What operational decision you are making",
  "actions": ["List of specific actions taken"],
  "risks": ["List of risks detected"],
  "csv_updates": {{
    "inventory_changes": [ {{"item_id": "...", "stock_change": 0}} ],
    "finance_changes": [ {{"account_name": "Operating Cash", "balance_change": 0}} ]
  }}
}}

If you need to send a follow-up email because information is missing, set follow_up to:
{{"to": "recipient@email.com", "subject": "...", "body": "...", "reason": "Why follow-up is needed"}}
and set status to "Follow-Up Required".

If no CSV updates are needed, leave arrays empty. Return ONLY valid JSON, no markdown.
"""

        try:
            response = ai_client.chat.completions.create(
                model="ilmu-glm-5.1",
                messages=[
                    {"role": "system", "content": "You are a JSON-only API. No markdown formatting, just raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()
            
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            try:
                res = json.loads(content)
                entry["inference"] = res.get("inference", "")
                entry["decision"] = res.get("decision", "")
                entry["actions"] = res.get("actions", [])
                entry["risks"] = res.get("risks", [])
                entry["work_name"] = res.get("work_name", subject)
                entry["affected_source"] = res.get("affected_source", "emails.csv")
                entry["agent_description"] = res.get("agent_description", "")
                entry["reasoning_detail"] = res.get("reasoning_detail", "")
                entry["preference_refs"] = res.get("preference_refs", [])
                entry["kpi_alignment"] = res.get("kpi_alignment", [])
                entry["confidence"] = res.get("confidence", "Medium")
                entry["guardrail_status"] = res.get("guardrail_status", "Needs Review")
                entry["alternative_considered"] = res.get("alternative_considered", "")
                entry["follow_up"] = res.get("follow_up", None)
                entry["status"] = res.get("status", "Completed" if res.get("actions") else "In Progress")
                updates = res.get("csv_updates", {})
            except json.JSONDecodeError as je:
                print(f"JSON Parse Error for {eid}. Raw content: {content}")
                entry["inference"] = f"AI Error: Invalid JSON generated. Raw output: {content}"
                entry["decision"] = "Fallback: Manual review required."
                updates = {}
            for inv_upd in updates.get("inventory_changes", []):
                item_id = inv_upd.get("item_id")
                change = inv_upd.get("stock_change", 0)
                if change != 0:
                    current = get_current_stock(inv_df, item_id)
                    # We just append a new row to represent the change
                    filtered = latest_per_group(inv_df, "valid_from", "item_id")
                    row = filtered[filtered["item_id"] == item_id].iloc[0].to_dict()
                    row["current_stock"] = current + change
                    row["valid_from"] = date
                    inv_df = pd.concat([inv_df, pd.DataFrame([row])], ignore_index=True)
                    files_modified.add("inventory.csv")
                    entry["files_updated"].append("inventory.csv")
                    
            for fin_upd in updates.get("finance_changes", []):
                acc = fin_upd.get("account_name")
                change = fin_upd.get("balance_change", 0)
                if change != 0:
                    current = get_current_balance(fin_df, acc)
                    filtered = latest_per_group(fin_df, "valid_from", "account_name")
                    row = filtered[filtered["account_name"] == acc].iloc[0].to_dict()
                    row["balance_usd"] = current + change
                    row["valid_from"] = date
                    row["notes"] = f"AI Update from {eid}"
                    fin_df = pd.concat([fin_df, pd.DataFrame([row])], ignore_index=True)
                    files_modified.add("finance.csv")
                    entry["files_updated"].append("finance.csv")
                    
        except Exception as e:
            entry["inference"] = f"AI Error: {e}"
            entry["decision"] = "Fallback: Manual review required."
            print(f"AI Error for {eid}: {e}")

        audit_log.append(entry)

        # Save audit log incrementally
        with open(AUDIT_LOG_PATH, "w") as f:
            json.dump(audit_log, f, indent=2, default=str)

    # Save updated CSVs
    save_csv("inventory.csv", inv_df)
    save_csv("manufacturing.csv", mfg_df)
    save_csv("finance.csv", fin_df)

    set_status("Idle", None)
    return audit_log, list(files_modified)


def print_summary(audit_log, files_modified):
    print("\n" + "=" * 80)
    print("  Z.AI AUTONOMOUS OPERATIONS AGENT — EXECUTION SUMMARY")
    print("=" * 80)

    for entry in audit_log:
        print(f"\n{'─' * 70}")
        print(f"  📧 {entry['email_id']} | {entry['date']}")
        print(f"  From: {entry['sender']}")
        print(f"  Subject: {entry['subject']}")
        print(f"  Intent: {entry['intent'].upper()}")
        print(f"  Inference: {entry['inference']}")
        print(f"  Decision: {entry['decision']}")
        if entry["actions"]:
            print("  Actions:")
            for a in entry["actions"]:
                print(f"    ✅ {a}")
        if entry["risks"]:
            print("  Risks:")
            for r in entry["risks"]:
                print(f"    ⚠️  {r}")

    print(f"\n{'=' * 80}")
    print(f"  TOTALS")
    print(f"  Emails processed: {len(audit_log)}")
    print(f"  Files modified: {', '.join(files_modified) if files_modified else 'None'}")
    all_risks = [r for e in audit_log for r in e.get("risks", [])]
    print(f"  Risks detected: {len(all_risks)}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    log, modified = process_emails()
    print_summary(log, modified)
