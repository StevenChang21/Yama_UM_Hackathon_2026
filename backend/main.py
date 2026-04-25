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
    email_poll_loop,
    process_emails,
    get_all_alerts,
    clear_alerts,
)

# Start the email poll loop as a background task when the app starts
@asynccontextmanager
async def lifespan(app):
    from main import run_agent_loop
    # Startup: launch email polling background task and agent processing loop
    task1 = asyncio.create_task(email_poll_loop())
    task2 = asyncio.create_task(run_agent_loop())
    yield
    # Shutdown: cancel the background tasks
    task1.cancel()
    task2.cancel()

app = FastAPI(title="AI Inventory Replenishment API", lifespan=lifespan)

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_ITEMS = [
    {"id": "ITEM-001", "name": "Raw Steel Component X", "current_stock": 150, "reorder_point": 200, "supplier_lead_time_days": 14},
    {"id": "ITEM-002", "name": "Aluminum Casting Y", "current_stock": 500, "reorder_point": 100, "supplier_lead_time_days": 7},
    {"id": "ITEM-003", "name": "Plastic Housing Z", "current_stock": 45, "reorder_point": 50, "supplier_lead_time_days": 30},
]

def _latest_per_group(df: pd.DataFrame, date_col: str, group_col: str) -> pd.DataFrame:
    """Return the most recent row per group, used by REST endpoints to show current state."""
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    return df.sort_values(date_col).groupby(group_col).tail(1).reset_index(drop=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Z.AI Inventory Orchestrator API"}

@app.get("/api/inventory")
def get_inventory():
    """Returns the current inventory status, highlighting items at risk."""
    try:
        df = pd.read_csv(os.path.join("data", "inventory.csv"))
        df = _latest_per_group(df, "valid_from", "item_id")
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
    except Exception:
        return MOCK_ITEMS

@app.get("/api/finance")
def get_finance():
    try:
        df = pd.read_csv(os.path.join("data", "finance.csv"))
        df = _latest_per_group(df, "valid_from", "account_name")
        return [{"account_name": row["account_name"], "balance_usd": row["balance_usd"]} for _, row in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/sales")
def get_sales():
    try:
        df = pd.read_csv(os.path.join("data", "sales.csv"))
        df = _latest_per_group(df, "valid_from", "order_id")
        return [{"order_id": s["order_id"], "sku": s["item_id"], "qty": s["qty"], "status": s["status"], "due_date": s["due_date"]} for _, s in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/manufacturing")
def get_manufacturing():
    try:
        df = pd.read_csv(os.path.join("data", "manufacturing.csv"))
        df = _latest_per_group(df, "valid_from", "work_order_id")
        return [{"work_order_id": r["work_order_id"], "sku": r["item_id"], "status": r["status"], "pending_units": r["qty"], "eta": r["eta"]} for _, r in df.iterrows()]
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/logistics")
def get_logistics():
    try:
        df = pd.read_csv(os.path.join("data", "logistics.csv"))
        df = _latest_per_group(df, "valid_from", "resource")
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


# ── Agent Endpoints & Background Loop ───────────────────────────

@app.on_event("startup")
async def startup_event():
    # Start the agent background loop
    asyncio.create_task(run_agent_loop())

async def run_agent_loop():
    """Background task that runs the agent every 10 minutes."""
    from agent import process_emails as run_agent_process
    print("[Agent] Starting 10-minute background poll loop...")
    while True:
        try:
            print("[Agent] Triggering background agent run...")
            await asyncio.to_thread(run_agent_process)
        except Exception as e:
            print(f"[Agent] Loop error: {e}")
        await asyncio.sleep(10)  # 10 seconds for live demo

@app.get("/api/agent/status")
def get_agent_status():
    """Returns what the agent is currently doing."""
    status_path = os.path.join("data", "agent_status.json")
    if os.path.exists(status_path):
        with open(status_path) as f:
            return json.load(f)
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
        with open(log_path) as f:
            return json.load(f)
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
