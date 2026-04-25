from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import pandas as pd
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta
import asyncio
import json
import random
import os
from orchestrator import process_orchestration

load_dotenv()
from email_reader import (
    process_emails,
    get_all_alerts,
    clear_alerts,
)

# Start the unified background task when the app starts
@asynccontextmanager
async def lifespan(app):
    from main import unified_background_loop
    # Startup: launch unified background task
    task = asyncio.create_task(unified_background_loop())
    yield
    # Shutdown: cancel the background tasks
    task.cancel()

app = FastAPI(title="AI Inventory Replenishment API", lifespan=lifespan)

def get_unprocessed_email_count() -> int:
    emails_path = os.path.join("data", "emails.csv")
    audit_path = os.path.join("data", "audit_log.json")
    
    processed_ids = set()
    if os.path.exists(audit_path):
        try:
            with open(audit_path) as f:
                log = json.load(f)
                processed_ids = {e.get("email_id") for e in log}
        except:
            pass
            
    if os.path.exists(emails_path):
        try:
            df = pd.read_csv(emails_path)
            unprocessed = [eid for eid in df["id"] if eid not in processed_ids]
            return len(unprocessed)
        except:
            pass
    return 0

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





@app.get("/")
def read_root():
    return {"message": "Welcome to the Z.AI Inventory Orchestrator API"}

@app.get("/api/inventory")
def get_inventory():
    """Returns the current inventory status, highlighting items at risk."""
    try:
        df = pd.read_csv(os.path.join("data", "inventory.csv"))
        inventory_status = []
        for _, item in df.iterrows():
            risk_level = "High" if item["current_stock"] <= item["reorder_point"] else "Low"
            inventory_status.append({
                "id": item["item_id"],
                "name": item["name"],
                "current_stock": item["current_stock"],
                "reorder_point": item["reorder_point"],
                "supplier_lead_time_days": item["lead_time_days"],
                "cost_per_unit": item["cost_per_unit"],
                "risk_level": risk_level
            })
        return inventory_status
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/finance")
def get_finance():
    try:
        df = pd.read_csv(os.path.join("data", "finance.csv"))
        return [{"account_name": row["account_name"], "balance_usd": row["balance_usd"]} for _, row in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/sales")
def get_sales():
    try:
        df = pd.read_csv(os.path.join("data", "sales.csv"))
        return [{"order_id": s["order_id"], "sku": s["item_id"], "qty": s["qty"], "status": s["status"], "due_date": s["due_date"]} for _, s in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/manufacturing")
def get_manufacturing():
    try:
        df = pd.read_csv(os.path.join("data", "manufacturing.csv"))
        return [{"work_order_id": r["work_order_id"], "sku": r["item_id"], "status": r["status"], "pending_units": r["qty"], "eta": r["eta"]} for _, r in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/logistics")
def get_logistics():
    try:
        df = pd.read_csv(os.path.join("data", "logistics.csv"))
        return [{"resource": r["resource"], "status": r["status"], "availability_date": r["availability_date"]} for _, r in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/bom")
def get_bom():
    try:
        df = pd.read_csv(os.path.join("data", "bom.csv"))
        return df.to_dict(orient="records")
    except Exception as e:
        return {"error": str(e)}

# ── Email Alert Endpoints ─────────────────────────────────────

@app.get("/api/emails/alerts")
def get_email_alerts():
    """Get all email-based supply chain alerts (newest first)."""
    return get_all_alerts()


@app.post("/api/emails/check")
async def trigger_email_check():
    """Manually trigger an email check (doesn't wait for the 10-min poll)."""
    new_alerts = await asyncio.to_thread(process_emails)
    return {
        "status": "checked",
        "new_alerts_found": len(new_alerts),
        "alerts": new_alerts,
    }


@app.delete("/api/emails/alerts")
def delete_email_alerts():
    """Clear all stored email alerts."""
    clear_alerts()
    return {"status": "cleared"}


# ── Preferences Endpoints ─────────────────────────────────────

@app.get("/api/preferences")
def get_preferences():
    """Return the saved user preferences."""
    pref_path = os.path.join("data", "preferences.json")
    if os.path.exists(pref_path):
        with open(pref_path) as f:
            return json.load(f)
    return {}

@app.post("/api/preferences")
def update_preferences(prefs: dict):
    """Update and save the user preferences."""
    pref_path = os.path.join("data", "preferences.json")
    with open(pref_path, "w") as f:
        json.dump(prefs, f, indent=2)
    return {"status": "saved"}

# ── Agent Endpoints & Background Loop ───────────────────────────

async def unified_background_loop():
    """Background task that polls emails every 10 minutes and triggers the agent if new emails are found."""
    from email_reader import process_emails as fetch_and_analyze_emails
    from agent import process_emails as run_agent_process
    print("[Background] Starting 10-minute unified background poll loop...")
    while True:
        try:
            print(f"[Background] Polling for new emails at {datetime.now().isoformat()}...")
            await asyncio.to_thread(fetch_and_analyze_emails)
            
            unprocessed_count = await asyncio.to_thread(get_unprocessed_email_count)
            if unprocessed_count > 0:
                print(f"[Background] Found {unprocessed_count} unprocessed emails. Triggering agent...")
                await asyncio.to_thread(run_agent_process)
            else:
                print("[Background] No new work-related emails found. Agent skipped.")
        except Exception as e:
            print(f"[Background] Loop error: {e}")
        await asyncio.sleep(600)  # 10 minutes

@app.get("/api/agent/status")
def get_agent_status():
    """Returns what the agent is currently doing."""
    status_path = os.path.join("data", "agent_status.json")
    if os.path.exists(status_path):
        try:
            with open(status_path) as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"status": "Idle", "current_email": None}

@app.post("/api/agent/run")
async def run_agent():
    """Run the autonomous AI operations agent on emails.csv."""
    from agent import process_emails as run_agent_process
    audit_log, files_modified = await asyncio.to_thread(run_agent_process)
    return {
        "status": "completed",
        "emails_processed": len(audit_log),
        "files_modified": files_modified,
        "audit_log": audit_log,
    }

@app.get("/api/agent/audit-log")
def get_audit_log():
    """Return the last saved audit log."""
    log_path = os.path.join("data", "audit_log.json")
    if os.path.exists(log_path):
        try:
            with open(log_path) as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return []

@app.post("/api/analyze")
async def analyze_input(text: str = Form(None), file: UploadFile = File(None)):
    content = ""
    if file:
        await file.read()
        content += f"[Uploaded File Content: {file.filename} - Extracted Text...]\n"
    if text:
        content += text
    return {"status": "received", "content_length": len(content)}

@app.websocket("/ws/orchestrator")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()

            # Support both legacy plain-text and new JSON envelope {prompt, as_of_date}
            if raw.strip().startswith('{'):
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    payload = {"prompt": raw}
            else:
                payload = {"prompt": raw}

            input_text = payload.get("prompt", raw)
            as_of_date = payload.get("as_of_date", None)

            await process_orchestration(websocket, input_text, as_of_date=as_of_date)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Websocket error: {e}")

