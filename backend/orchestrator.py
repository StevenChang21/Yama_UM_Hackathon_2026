import os
import json
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI
import asyncio

# Load .env file
load_dotenv()

# Setup API Key (User should set ILMU_API_KEY in backend/.env)
api_key = os.environ.get("ILMU_API_KEY", "")
client = OpenAI(
    api_key=api_key,
    base_url="https://api.ilmu.ai/v1",
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def read_csv_to_dict(filename):
    try:
        df = pd.read_csv(os.path.join(DATA_DIR, filename))
        return df.to_dict(orient="records")
    except Exception as e:
        return {"error": str(e)}

def get_inventory_data():
    """Get current inventory stock levels and bill of materials (BOM)."""
    return {
        "inventory": read_csv_to_dict("inventory.csv"),
        "bom": read_csv_to_dict("bom.csv")
    }

def get_sales_data():
    """Get pending sales orders."""
    return read_csv_to_dict("sales.csv")

def get_manufacturing_data():
    """Get current manufacturing work orders and WIP."""
    return read_csv_to_dict("manufacturing.csv")

def get_finance_data():
    """Get current financial cash balances and payables."""
    return read_csv_to_dict("finance.csv")

def get_logistics_data():
    """Get logistics resource availability."""
    return read_csv_to_dict("logistics.csv")

# Map function names to actual functions
available_functions = {
    "get_inventory_data": get_inventory_data,
    "get_sales_data": get_sales_data,
    "get_manufacturing_data": get_manufacturing_data,
    "get_finance_data": get_finance_data,
    "get_logistics_data": get_logistics_data,
}

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory_data",
            "description": "Get current inventory stock levels, reorder points, and bill of materials (BOM). Use this to check what raw materials are needed.",
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_data",
            "description": "Get pending sales orders and their due dates. Use this to understand upcoming demand for finished goods.",
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_manufacturing_data",
            "description": "Get current manufacturing work orders and WIP (Work In Progress).",
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_finance_data",
            "description": "Get current financial cash balances and payables to ensure we have budget for raw materials.",
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_logistics_data",
            "description": "Get logistics resource availability (e.g. trucks, warehouse space).",
        }
    }
]

SYSTEM_PROMPT = """
You are Z.AI, an intelligent supply chain orchestration agent.
Your job is to receive unstructured input from the user (e.g., a WhatsApp message from a supplier, an email, or an uploaded document), 
query the internal department databases using the provided tools, reason over the data, and make a reorder recommendation.

CRITICAL INSTRUCTIONS:
1. You must query the relevant departments to gather data before making a decision.
2. Check for Cross-SKU conflicts. E.g., If Sales orders need SKU-A and SKU-B, and both require Raw Material Y, sum the total required amount of Y and check if current stock is sufficient.
3. If data is ambiguous or missing, clearly state that in your reasoning.
4. Your FINAL response MUST be a valid JSON object matching this schema:
{
    "recommended_quantity": integer,
    "chosen_supplier": string,
    "chosen_raw_materials": string (e.g. "RAW-001"),
    "estimated_cost": number,
    "estimated_delivery_date": string (YYYY-MM-DD),
    "justification": string (plain English explanation of your reasoning, mentioning any conflicts),
    "drafts": {
        "purchase_order": string,
        "work_order": string,
        "rfq_email": string
    }
}
Do not output anything other than the JSON object as your final response.
"""

async def process_orchestration(ws, input_text):
    """
    Main orchestration loop. Yields status updates to the websocket, then the final result.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Input received:\n{input_text}\n\nPlease analyze and provide a JSON recommendation."}
    ]

    await ws.send_json({"type": "status", "message": "Received input. Initializing Z.AI Orchestrator..."})
    await asyncio.sleep(0.5)

    max_steps = 10
    step = 0

    while step < max_steps:
        step += 1
        await ws.send_json({"type": "status", "message": f"Step {step}: Reasoning / Requesting ILMU Generation..."})
        
        # If the API key is empty, we should use a mock response flow to not crash the hackathon demo
        if not api_key:
             await ws.send_json({"type": "status", "message": "ILMU API Key missing. Simulating mock reasoning flow..."})
             await asyncio.sleep(1)
             await ws.send_json({"type": "status", "message": "Calling get_inventory_data..."})
             await asyncio.sleep(1)
             await ws.send_json({"type": "status", "message": "Calling get_sales_data..."})
             await asyncio.sleep(1)
             await ws.send_json({"type": "status", "message": "Analyzing cross-SKU conflict for RAW-001..."})
             await asyncio.sleep(1)
             
             mock_json = {
                 "recommended_quantity": 500,
                 "chosen_supplier": "Global Tech Components",
                 "chosen_raw_materials": "RAW-001",
                 "estimated_cost": 7750.00,
                 "estimated_delivery_date": "2026-05-03",
                 "justification": "Sales orders require 700 units of RAW-001 total across SKU-A and SKU-B. Current stock is 500. There is a cross-SKU conflict! Recommending an immediate order of 500 additional units (200 shortfall + 300 safety stock) to avoid production stalling next week.",
                 "drafts": {
                     "purchase_order": "PO-2026-001\nSupplier: Global Tech Components\nItem: RAW-001\nQty: 500",
                     "work_order": "WO-2026-002\nItem: SKU-A & SKU-B\nStatus: Pending Material Arrival",
                     "rfq_email": "Subject: URGENT RFQ for RAW-001\n\nDear Global Tech,\nPlease provide a quote for 500 units of RAW-001. We need expedited shipping."
                 }
             }
             await ws.send_json({"type": "result", "data": mock_json})
             return

        # Real API call
        try:
            response = client.chat.completions.create(
                model="nemo-super",
                messages=messages,
                tools=tools,
            )
        except Exception as e:
            await ws.send_json({"type": "error", "message": f"API Error: {str(e)}"})
            return

        message = response.choices[0].message
        
        if message.tool_calls:
            # Add assistant message to history
            messages.append(message.model_dump())
            
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                await ws.send_json({"type": "status", "message": f"Calling Tool: {function_name}..."})
                
                function_to_call = available_functions.get(function_name)
                if function_to_call:
                    function_response = function_to_call()
                    # Add tool response to history
                    messages.append(
                        {
                            "role": "tool",
                            "content": json.dumps(function_response),
                            "tool_call_id": tool_call.id,
                        }
                    )
                else:
                    messages.append(
                        {
                            "role": "tool",
                            "content": f"Error: Function {function_name} not found.",
                            "tool_call_id": tool_call.id,
                        }
                    )
        else:
            # No more tool calls, we have our final answer
            await ws.send_json({"type": "status", "message": "Decision generated."})
            try:
                # Try to parse the final message as JSON
                final_content = message.content
                # Clean up markdown JSON wrappers if present
                if final_content.startswith("```json"):
                    final_content = final_content[7:-3]
                elif final_content.startswith("```"):
                    final_content = final_content[3:-3]
                    
                result_json = json.loads(final_content.strip())
                await ws.send_json({"type": "result", "data": result_json})
                return
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Failed to parse ILMU output as JSON.", "raw_output": message.content})
                return

    await ws.send_json({"type": "error", "message": "Max reasoning steps reached."})
