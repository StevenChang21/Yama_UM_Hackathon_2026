"""
Orchestrator Module — The Main Agentic Loop

This is where the AI agent "thinks". It runs a loop:
1. Send conversation + tool schemas to the LLM
2. If the LLM returns tool_calls → execute them, append results, go to step 1
3. If no tool_calls → parse the final JSON answer and send to frontend

Dependency Inversion: This class depends on LLMClient and StatusReporter
abstractions, not on concrete classes like ILMUClient or WebSocketReporter.
"""

import os
import json
import asyncio
from typing import Optional

from .data_repository import DataRepository
from .tool_registry import Tool, ToolRegistry
from .llm_client import LLMClient, ILMUClient
from .reporter import StatusReporter, WebSocketReporter, CollectingReporter


SYSTEM_PROMPT = """
You are Z.AI, an intelligent supply chain orchestration agent.
Your job is to receive unstructured input from the user (e.g., a WhatsApp message from a supplier, an email, or an uploaded document), 
or proactively check the inbox using `get_unread_emails`.
Query the internal department databases using the provided tools, reason over the data, and make a reorder recommendation.

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

MOCK_RESULT = {
    "recommended_quantity": 500,
    "chosen_supplier": "GlobalTech Components",
    "chosen_raw_materials": "RAW-001",
    "estimated_cost": 7750.00,
    "estimated_delivery_date": "2026-05-03",
    "justification": "Sales orders require 700 units of RAW-001 total across SKU-A and SKU-B. Current stock is 500. There is a cross-SKU conflict. Recommending an immediate order of 500 additional units (200 shortfall + 300 safety stock) to avoid production stalling next week.",
    "drafts": {
        "purchase_order": "PO-2026-001\nSupplier: GlobalTech Components\nItem: RAW-001\nQty: 500",
        "work_order": "WO-2026-002\nItem: SKU-A & SKU-B\nStatus: Pending Material Arrival",
        "rfq_email": "Subject: URGENT RFQ for RAW-001\n\nDear GlobalTech,\nPlease provide a quote for 500 units of RAW-001. We need expedited shipping."
    }
}

MOCK_RESULT_A = {
    "recommended_quantity": 150,
    "chosen_supplier": "GlobalTech Components",
    "chosen_raw_materials": "RAW-001",
    "estimated_cost": 2325.00,
    "estimated_delivery_date": "2026-05-02",
    "justification": "Stock levels are healthy across all 5 raw materials. BOM analysis shows current inventory can support approximately 70-80% of total demand without restocking. The only marginal case is RAW-001: producing 300x SKU-A requires 600 units (2 per unit), and current stock is 650 — leaving only a 50-unit buffer. A precautionary order of 150 units of RAW-001 via standard delivery ($15.50/unit) is recommended as a safety buffer. Budget is strong at $120,000 — no financial constraint. All logistics fully operational. No emergency action required.",
    "drafts": {
        "purchase_order": "PO-A-001\nSupplier: GlobalTech Components\nItem: Microcontroller V2 (RAW-001)\nQty: 150 units\nUnit Price: $15.50 (standard delivery)\nTotal: $2,325\nDelivery: 14-day standard, ETA May 2nd\nPriority: Normal",
        "rfq_email": "Subject: Purchase Order — Microcontroller V2 (RAW-001)\n\nDear GlobalTech Components,\nPlease process PO-A-001 for 150 units of Microcontroller V2 at $15.50/unit under standard 14-day delivery terms. Total value: $2,325. Delivery address: YamaTech Receiving Dock A. No expedite required.\n\nRegards,\nYamaTech Procurement"
    }
}

MOCK_RESULT_B = {
    "recommended_quantity": 1150,
    "chosen_supplier": "GlobalTech Components (RAW-001) + FastComp Metals (RAW-003 partial) + ClearTech Glass (RAW-004)",
    "chosen_raw_materials": "RAW-001, RAW-003, RAW-004",
    "estimated_cost": 29462.50,
    "estimated_delivery_date": "2026-04-22",
    "justification": "CRITICAL situation: 3 of 4 work orders halted. RAW-003 = 0 (blocks all SKU-C and SKU-D production). RAW-001 = 50 (blocks SKU-A and SKU-B). RAW-004 = 80 (blocks SKU-A). Customer orders totaling approx $246,500 at risk with deadlines May 3-8. Budget constraint: $38,000 operating cash. Recommended split procurement: (1) 800 units RAW-001 from GlobalTech expedited at $16.50/unit = $13,200 — ETA Apr 20; (2) 350 units RAW-003 from FastComp at $8.75/unit = $3,062 (max available, first-come) — ETA Apr 22; (3) 600 units RAW-004 from ClearTech Glass at $22.50/unit = $13,500 — ETA Apr 26. Total: $29,762 within budget. WARNING: FastComp can only supply 350 of 800 needed RAW-003 units — SKU-C and SKU-D production will remain partially constrained. Dock A is under maintenance until Apr 25; use Dock B for all inbound deliveries.",
    "drafts": {
        "purchase_order_raw001": "PO-B-001\nSupplier: GlobalTech Components\nItem: Microcontroller V2 (RAW-001)\nQty: 800 units\nUnit Price: $16.50 (expedited air freight)\nTotal: $13,200\nDelivery: 6-day expedited, ETA Apr 20\nPriority: URGENT — production halted",
        "purchase_order_raw003": "PO-B-002\nSupplier: FastComp Metals\nItem: Copper Winding Coil (RAW-003)\nQty: 350 units (maximum available)\nUnit Price: $8.75\nTotal: $3,062\nDelivery: 8-day standard, ETA Apr 22\nNote: Only 350/800 needed units available — partial fulfillment",
        "escalation_memo": "ESCALATION MEMO — Apr 14 2026\nTo: Operations Director\nFrom: Z.AI Supply Chain Orchestrator\n\n3 of 4 production lines are halted due to critical material shortages. Emergency procurement authorized totaling $29,762 of $38,000 available budget.\n\nCustomer risk: $246,500 across 5 orders with deadlines May 3-8.\nPenalty exposure: NexGen late delivery clause = $40,500 if May 8 missed.\n\nAction items:\n1. Approve PO-B-001 ($13,200) — GlobalTech RAW-001\n2. Approve PO-B-002 ($3,062) — FastComp RAW-003\n3. Approve PO-B-003 ($13,500) — ClearTech RAW-004\n4. Route all inbound to Dock B (Dock A under maintenance until Apr 25)\n\nPartial production expected to resume Apr 21 for SKU-A."
    }
}


class Orchestrator:
    """
    The main agentic reasoning loop.
    Depends only on abstractions (LLMClient, ToolRegistry, StatusReporter),
    not on concrete implementations — following Dependency Inversion.
    """

    MAX_STEPS = 10

    def __init__(self, llm_client: Optional[LLMClient], tool_registry: ToolRegistry, mock_result: dict = None):
        self._llm = llm_client
        self._tools = tool_registry
        self._mock_result = mock_result or MOCK_RESULT

    async def run(self, reporter: StatusReporter, input_text: str) -> None:
        """Entry point: run the full agentic orchestration loop."""
        await reporter.status("Received input. Initializing Agent (Provider: ILMU / Z.AI)...")
        await asyncio.sleep(0.5)

        # No LLM client → fall back to mock demo
        if not self._llm:
            await self._run_mock(reporter)
            return

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Input received:\n{input_text}\n\nCheck emails if needed. Please analyze and provide a JSON recommendation."}
        ]

        for step in range(1, self.MAX_STEPS + 1):
            await reporter.status(f"Step {step}: Reasoning / Requesting ILMU...")

            try:
                # message is a ChatCompletionMessage (Pydantic model), NOT a string.
                # That's why it has .tool_calls, .content, .model_dump()
                message = self._llm.chat_completion(messages, self._tools.get_openai_schemas())
            except Exception as e:
                await reporter.error(f"ILMU API Error: {str(e)}")
                return

            if message.tool_calls:
                # AI wants to call tools → execute them and loop back
                await self._execute_tool_calls(messages, message, reporter)
            else:
                # No tool calls → AI is giving its final JSON answer
                await self._handle_final_response(message, reporter)
                return

        await reporter.error("Max reasoning steps reached.")

    async def _execute_tool_calls(self, messages: list, message, reporter: StatusReporter) -> None:
        """Execute all tool calls from the AI's response and append results to messages."""
        # model_dump() converts the Pydantic object → dict for serialization
        messages.append(message.model_dump())

        for tool_call in message.tool_calls:
            name = tool_call.function.name
            await reporter.status(f"Calling Tool: {name}...")

            tool = self._tools.get(name)
            if tool:
                result = tool.execute()
                messages.append({
                    "role": "tool",
                    "content": json.dumps(result),
                    "tool_call_id": tool_call.id
                })
            else:
                messages.append({
                    "role": "tool",
                    "content": f"Error: Function {name} not found.",
                    "tool_call_id": tool_call.id
                })

    async def _handle_final_response(self, message, reporter: StatusReporter) -> None:
        """Parse the AI's final text response as JSON and send to the frontend."""
        await reporter.status("Decision generated.")
        content = self._strip_code_fences(message.content or "")

        try:
            result_json = json.loads(content.strip())
            await reporter.result(result_json)
        except json.JSONDecodeError:
            await reporter.error("Failed to parse ILMU output as JSON.", message.content)

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        """Remove markdown code fences the AI sometimes wraps around JSON."""
        if text.startswith("```json"):
            return text[7:-3]
        elif text.startswith("```"):
            return text[3:-3]
        return text

    async def _run_mock(self, reporter: StatusReporter) -> None:
        """Simulate the agentic flow when no API key is configured."""
        await reporter.status("ILMU API Key missing. Simulating mock reasoning flow...")
        await asyncio.sleep(1)
        await reporter.status("Calling get_unread_emails...")
        await asyncio.sleep(1)
        await reporter.status("Calling get_inventory_data...")
        await asyncio.sleep(1)
        await reporter.status("Analyzing cross-SKU conflict for RAW-001...")
        await asyncio.sleep(1)
        await reporter.result(self._mock_result)


# ─── Factory & Entry Point ──────────────────────────────────────────

def _build_tool_registry(data_repo: DataRepository) -> ToolRegistry:
    """Create and populate the tool registry from a DataRepository."""
    registry = ToolRegistry()

    tools = [
        Tool("get_inventory_data",
             "Get current inventory stock levels, reorder points, and bill of materials (BOM). Use this to check what raw materials are needed.",
             data_repo.get_inventory_data),
        Tool("get_sales_data",
             "Get pending sales orders and their due dates. Use this to understand upcoming demand for finished goods.",
             data_repo.get_sales_data),
        Tool("get_manufacturing_data",
             "Get current manufacturing work orders and WIP (Work In Progress).",
             data_repo.get_manufacturing_data),
        Tool("get_finance_data",
             "Get current financial cash balances and payables to ensure we have budget for raw materials.",
             data_repo.get_finance_data),
        Tool("get_logistics_data",
             "Get logistics resource availability (e.g. trucks, warehouse space).",
             data_repo.get_logistics_data),
        Tool("get_unread_emails",
             "Read the fake email inbox to get unstructured communications from sales, suppliers, or other departments. Start with this if checking inbox.",
             data_repo.get_unread_emails),
    ]

    for tool in tools:
        registry.register(tool)

    return registry


def create_orchestrator(as_of_date: Optional[str] = None, scenario: Optional[str] = None) -> Orchestrator:
    """Factory: builds a fully configured Orchestrator with all dependencies wired up."""
    base_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    data_dir = os.path.join(base_data_dir, scenario) if scenario else base_data_dir
    data_repo = DataRepository(data_dir, as_of_date=as_of_date)
    tool_registry = _build_tool_registry(data_repo)

    ilmu_api_key = os.environ.get("ILMU_API_KEY")
    llm_client = ILMUClient(api_key=ilmu_api_key) if ilmu_api_key else None

    mock_result = MOCK_RESULT_A if scenario == "scenario_a" else MOCK_RESULT_B if scenario == "scenario_b" else MOCK_RESULT
    return Orchestrator(llm_client=llm_client, tool_registry=tool_registry, mock_result=mock_result)


async def process_orchestration(ws, input_text: str, as_of_date: Optional[str] = None) -> None:
    """
    Backward-compatible entry point — main.py imports this function.
    Creates the orchestrator, wires up a WebSocket reporter, and runs.
    """
    orchestrator = create_orchestrator(as_of_date=as_of_date)
    reporter = WebSocketReporter(ws)
    await orchestrator.run(reporter, input_text)


async def process_comparison(ws, input_text: str) -> None:
    """
    Run Scenario A and Scenario B orchestrators in parallel.
    Streams tagged status messages live; sends both results in a single
    'comparison' message once both finish.
    """
    reporter_a = CollectingReporter(ws, "Scenario A")
    reporter_b = CollectingReporter(ws, "Scenario B")
    orch_a = create_orchestrator(scenario="scenario_a")
    orch_b = create_orchestrator(scenario="scenario_b")

    await ws.send_json({"type": "status", "message": "Running both scenarios in parallel..."})
    await asyncio.gather(
        orch_a.run(reporter_a, input_text),
        orch_b.run(reporter_b, input_text),
    )

    await ws.send_json({
        "type": "comparison",
        "scenario_a": reporter_a.final_result or {"error": reporter_a.final_error or "No result"},
        "scenario_b": reporter_b.final_result or {"error": reporter_b.final_error or "No result"},
    })
