from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from datetime import datetime, timedelta
import random
import os
from orchestrator import process_orchestration

app = FastAPI(title="AI Inventory Replenishment API")

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
                "risk_level": risk_level
            })
        return inventory_status
    except Exception:
        # Fallback
        return MOCK_ITEMS

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
