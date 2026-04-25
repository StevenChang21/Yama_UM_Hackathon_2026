import unittest
from unittest.mock import patch, MagicMock
import json
import os
import pandas as pd
from datetime import datetime

# Import the module we want to test
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import agent

class TestAgentPriorityMatrix(unittest.TestCase):

    def setUp(self):
        # Setup mock DataFrames to be returned by load_csv
        self.mock_emails_df = pd.DataFrame([{
            "id": "EMAIL-TEST-1",
            "sender": "supplier@test.com",
            "subject": "Test",
            "date": "2026-05-01",
            "body": "Test email body"
        }])
        self.mock_inv_df = pd.DataFrame([{
            "item_id": "RAW-001", "name": "Test Item", "type": "Raw", 
            "current_stock": 100, "reorder_point": 50, 
            "lead_time_days": 5, "cost_per_unit": 10.0
        }])
        self.mock_sales_df = pd.DataFrame([])
        self.mock_mfg_df = pd.DataFrame([])
        self.mock_fin_df = pd.DataFrame([{"account_name": "Pending Payables", "balance_usd": 0.0, "notes": ""}])
        self.mock_sup_df = pd.DataFrame([{
            "supplier_id": "SUP-001", "supplier_name": "Test Supplier", 
            "item_id": "RAW-001", "item_name": "Test Item", 
            "unit_cost": 10.0, "delivery_days": 5, "payment_terms": "Net30"
        }])

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.write_json_atomically')
    @patch('agent.set_status')
    @patch('openai.OpenAI')
    @patch('agent.os.path.exists')
    def test_p1_critical_api_rate_limit(self, mock_exists, mock_openai, mock_set_status, mock_write_json, mock_save_csv, mock_load_csv):
        """
        Test Case for P1 Critical: Gemini API 429 Rate Limit.
        Ensures the system falls back to manual review and doesn't crash.
        """
        # Mock load_csv to return our DataFrames
        def load_csv_side_effect(name):
            if name == "emails.csv": return self.mock_emails_df
            elif name == "inventory.csv": return self.mock_inv_df
            elif name == "sales.csv": return self.mock_sales_df
            elif name == "manufacturing.csv": return self.mock_mfg_df
            elif name == "finance.csv": return self.mock_fin_df
            elif name == "suppliers.csv": return self.mock_sup_df
            return pd.DataFrame()
        mock_load_csv.side_effect = load_csv_side_effect

        # Mock os.path.exists to simulate no existing audit log
        mock_exists.return_value = False

        # Setup mock OpenAI client
        mock_ai_client = MagicMock()
        mock_openai.return_value = mock_ai_client

        # Mock the LLM to raise an Exception (simulating 429 Quota Exceeded)
        mock_ai_client.chat.completions.create.side_effect = Exception("Error code: 429 - Quota exceeded")

        # Set environment variable so the client initializes
        os.environ["GEMINI_API_KEY"] = "test"

        # Run the agent
        audit_log, files_modified = agent.process_emails()

        # Assertions
        self.assertEqual(len(audit_log), 1, "Should log 1 entry for the processed email")
        self.assertEqual(audit_log[0]["email_id"], "EMAIL-TEST-1")
        self.assertEqual(audit_log[0]["status"], "In Progress", "Status should be In Progress for manual review")
        self.assertEqual(audit_log[0]["guardrail_status"], "Needs Review", "Guardrail should flag for review")
        self.assertIn("429", audit_log[0]["inference"], "Inference should contain the rate limit error")
        self.assertEqual(files_modified, [], "No CSVs should be modified on API failure")


    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.write_json_atomically')
    @patch('agent.set_status')
    @patch('openai.OpenAI')
    @patch('agent.os.path.exists')
    def test_p1_critical_budget_constraint(self, mock_exists, mock_openai, mock_set_status, mock_write_json, mock_save_csv, mock_load_csv):
        """
        Test Case for P1 Critical: Budget Constraint.
        Ensures the system blocks any AI action that exceeds the $185,000 budget.
        """
        mock_load_csv.side_effect = lambda name: {
            "emails.csv": self.mock_emails_df,
            "inventory.csv": self.mock_inv_df,
            "sales.csv": self.mock_sales_df,
            "manufacturing.csv": self.mock_mfg_df,
            "finance.csv": self.mock_fin_df,
            "suppliers.csv": self.mock_sup_df
        }.get(name, pd.DataFrame())
        mock_exists.return_value = False

        # Setup mock OpenAI client
        mock_ai_client = MagicMock()
        mock_openai.return_value = mock_ai_client

        # Mock the LLM to return a decision that attempts to increase payables by $200,000
        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Test PO",
            "affected_source": "finance.csv",
            "agent_description": "test",
            "reasoning_detail": "test",
            "preference_refs": [],
            "kpi_alignment": [],
            "confidence": "High",
            "guardrail_status": "Passed",
            "alternative_considered": "none",
            "follow_up": None,
            "status": "Completed",
            "inference": "test",
            "decision": "test",
            "actions": ["test"],
            "risks": ["test"],
            "csv_updates": {
                "finance_changes": [{"account_name": "Pending Payables", "balance_change": 200000.0}]
            }
        })
        mock_ai_client.chat.completions.create.return_value = mock_llm_response
        os.environ["GEMINI_API_KEY"] = "test"

        # Run the agent
        audit_log, files_modified = agent.process_emails()

        # Assertions
        self.assertEqual(len(audit_log), 1)
        # Check if the budget constraint logic blocked it (assuming the agent has this logic implemented)
        # If the agent doesn't have it implemented yet, this test will fail, serving as TDD!
        
        # Check that guardrail_status was updated
        self.assertIn(audit_log[0]["guardrail_status"], ["Blocked", "Needs Review"])
        
        # Ensure the budget exceeding change was recorded as a risk or blocked
        self.assertTrue(any("budget" in risk.lower() or "185000" in risk for risk in audit_log[0].get("risks", [])))

if __name__ == '__main__':
    unittest.main()
