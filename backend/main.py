from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import pandas as pd
from datetime import datetime, timedelta
import asyncio
import random
import os
from orchestrator import process_orchestration
from email_reader import (
    email_poll_loop,
    process_emails,
    get_all_alerts,
    clear_alerts,
)

# Start the email poll loop as a background task when the app starts
@asynccontextmanager
async def lifespan(app):
    # Startup: launch email polling background task
    task = asyncio.create_task(email_poll_loop())
    yield
    # Shutdown: cancel the background task
    task.cancel()

app = FastAPI(title="AI Inventory Replenishment API", lifespan=lifespan)

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Database / State (Old structure, kept for backward compatibility if needed)
MOCK_ITEMS = [
    {"id": "ITEM-001", "name": "Raw Steel Component X", "current_stock": 150, "reorder_point": 200, "supplier_lead_time_days": 14},
    {"id": "ITEM-002", "name": "Aluminum Casting Y", "current_stock": 500, "reorder_point": 100, "supplier_lead_time_days": 7},
    {"id": "ITEM-003", "name": "Plastic Housing Z", "current_stock": 45, "reorder_point": 50, "supplier_lead_time_days": 30},
]

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
            risk_level = "Low"
            if item["current_stock"] <= item["reorder_point"]:
                risk_level = "High"
            
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
        # Fallback
        return MOCK_ITEMS

@app.get("/api/finance")
def get_finance():
    try:
        df = pd.read_csv(os.path.join("data", "finance.csv"))
        finance_data = []
        for _, row in df.iterrows():
            finance_data.append({
                "account_name": row["account_name"],
                "balance_usd": row["balance_usd"]
            })
        return finance_data
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/sales")
def get_sales():
    try:
        df = pd.read_csv(os.path.join("data", "sales.csv"))
        sales_data = []
        for _, sale in df.iterrows():
            sales_data.append({
                "order_id": sale["order_id"],
                "sku": sale["item_id"],
                "qty": sale["qty"],
                "status": sale["status"],
                "due_date": sale["due_date"]
            })
        return sales_data
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/manufacturing")
def get_manufacturing():
    try:
        df = pd.read_csv(os.path.join("data", "manufacturing.csv"))
        manufacturing_data = []
        for _, row in df.iterrows():
            manufacturing_data.append({
                "work_order_id": row["work_order_id"],
                "sku": row["item_id"],
                "status": row["status"],
                "pending_units": row["qty"],
                "eta": row["eta"]
            })
        return manufacturing_data
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/logistics")
def get_logistics():
    try:
        df = pd.read_csv(os.path.join("data", "logistics.csv"))
        logistics_data = []
        for _, row in df.iterrows():
            logistics_data.append({
                "resource": row["resource"],
                "status": row["status"],
                "availability_date": row["availability_date"]
            })
        return logistics_data
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


@app.post("/api/analyze")
async def analyze_input(text: str = Form(None), file: UploadFile = File(None)):
    """
    HTTP endpoint for ingestion. We accept text or file.
    In the real UI, we might just pass text to the WebSocket directly, 
    but having a standard endpoint is good practice for file uploads.
    """
    content = ""
    if file:
        file_bytes = await file.read()
        # Mock file extraction
        content += f"[Uploaded File Content: {file.filename} - Extracted Text...]\n"
    if text:
        content += text
        
    return {"status": "received", "content_length": len(content)}

@app.websocket("/ws/orchestrator")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Wait for user input (the unstructured text)
            data = await websocket.receive_text()
            
            # Start the Z.AI orchestration process
            await process_orchestration(websocket, data)
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Websocket error: {e}")
