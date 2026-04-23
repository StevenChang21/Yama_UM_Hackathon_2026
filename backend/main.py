from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os
from orchestrator import process_orchestration

app = FastAPI(title="AI Inventory Replenishment API")

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
