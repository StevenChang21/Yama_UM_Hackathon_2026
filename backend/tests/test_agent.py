import unittest
from unittest.mock import patch, MagicMock, mock_open
import json
import os
import sys
import pandas as pd

# 1. FORCE a fake API key BEFORE importing anything. 
os.environ["GEMINI_API_KEY"] = "fake-test-key-no-network-calls"

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import email_reader
import agent

mock_global_ai = MagicMock()
agent.ai_client = mock_global_ai

class TestAgentPriorityMatrix(unittest.TestCase):

    def setUp(self):
        # Reset the global mock before each test so they don't contaminate each other
        mock_global_ai.chat.completions.create.side_effect = None
        mock_global_ai.chat.completions.create.return_value = None

        # We use a highly realistic supply-chain email to bypass the agent's spam filter
        self.mock_emails_df = pd.DataFrame([{
            "id": "EMAIL-001",
            "sender": "logistics@supplier-a.com",
            "subject": "URGENT: shipping delay for RAW-001",
            "date": "2026-05-01",
            "body": "Due to port congestion, we are experiencing a shipping delay. The restock is delayed by 5 days."
        }])
        self.mock_inv_df = pd.DataFrame([{
            "item_id": "RAW-001", "name": "Test Item", "type": "Raw", 
            "current_stock": 100, "reorder_point": 50, 
            "lead_time_days": 5, "cost_per_unit": 10.0,
            "valid_from": "2026-04-01"
        }])
        self.mock_sales_df = pd.DataFrame([])
        self.mock_mfg_df = pd.DataFrame([])
        self.mock_fin_df = pd.DataFrame([
            {"account_name": "Pending Payables", "balance_usd": 0.0, "notes": "", "valid_from": "2026-04-01"},
            {"account_name": "Operating Cash", "balance_usd": 150000.0, "notes": "", "valid_from": "2026-04-01"}
        ])
        self.mock_sup_df = pd.DataFrame([{
            "supplier_id": "SUP-001", "supplier_name": "Test Supplier", 
            "item_id": "RAW-001", "item_name": "Test Item", 
            "unit_cost": 10.0, "delivery_days": 5, "payment_terms": "Net30"
        }])
        self.mock_bom_df = pd.DataFrame([{
            "parent_id": "SKU-A", "child_id": "RAW-001", "qty_required": 2
        }])

    def _mock_load_csv_side_effect(self, name):
        if name == "emails.csv": return self.mock_emails_df
        elif name == "inventory.csv": return self.mock_inv_df
        elif name == "sales.csv": return self.mock_sales_df
        elif name == "manufacturing.csv": return self.mock_mfg_df
        elif name == "finance.csv": return self.mock_fin_df
        elif name == "suppliers.csv": return self.mock_sup_df
        elif name == "bom.csv": return self.mock_bom_df
        return pd.DataFrame()

    @patch('agent.send_real_email', return_value=True)
    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc01_happy_case_end_to_end(self, mock_file, mock_os_replace, mock_exists, mock_set_status, mock_save_csv, mock_load_csv, mock_send_email):
        """
        TC-01: Happy Case (Entire Flow). 
        Verifies system processes valid customer orders/restocks, updates CSVs, and drafts email.
        """
        mock_load_csv.side_effect = self._mock_load_csv_side_effect
        mock_exists.return_value = False

        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Process Restock RAW-001",
            "affected_source": "inventory.csv",
            "agent_description": "Processed valid restock and updated inventory.",
            "reasoning_detail": "Stock is low, replenishing.",
            "preference_refs": ["Low Stock Replenishment"],
            "kpi_alignment": ["Stockout risk reduction"],
            "confidence": "High",
            "guardrail_status": "Passed",
            "alternative_considered": "Do nothing, rejected.",
            "follow_up": {"to": "supplier@test.com", "subject": "PO", "body": "Need 50", "reason": "Restock"},
            "status": "Completed",
            "inference": "Supplier confirming order.",
            "decision": "Update inventory and send confirmation.",
            "actions": ["Drafted PO"],
            "risks": [],
            "csv_updates": {
                "inventory_changes": [{"item_id": "RAW-001", "stock_change": 50}],
                "finance_changes": [{"account_name": "Operating Cash", "balance_change": -500.0}]
            }
        })
        
        # Intercept using our global mock
        mock_global_ai.chat.completions.create.return_value = mock_llm_response

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(len(audit_log), 1)
        self.assertEqual(audit_log[0]["status"], "Completed")
        self.assertEqual(audit_log[0]["guardrail_status"], "Passed")
        self.assertIn("inventory.csv", files_modified)
        self.assertIn("finance.csv", files_modified)
        self.assertTrue(any("Automatically sent follow-up email" in action for action in audit_log[0]["actions"]))

    @patch('agent.send_real_email', return_value=False)  # Email send deliberately fails (no SMTP in test)
    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc02_guardrail_invalid_order(
        self, mock_file, mock_os_replace, mock_exists, mock_set_status,
        mock_save_csv, mock_load_csv, mock_send_email
    ):
        """
        TC-02: Guardrail Handling for Invalid Orders.
        Verifies the system blocks unrealistic orders (1,000,000 units of SKU-A)
        and handles them safely without corrupting any CSV.

        Specification:
          - Anomaly detected
          - Autonomous approval blocked (no inventory/finance CSV writes)
          - Follow-up email drafted and attempted
          - No CSV corruption
          - guardrail_status == 'Needs Review'
        """
        # ── Inject the extreme-quantity email ──────────────────────────────────
        unrealistic_email_df = pd.DataFrame([{
            "id": "EMAIL-TC02",
            "sender": "sales@yamatech.com",
            "subject": "Customer Order: 1,000,000 units of SKU-A",
            "date": "2026-05-01T09:00:00",
            "body": (
                "Hi team, we just received a purchase order from MegaCorp for "
                "1,000,000 units of SKU-A to be delivered within the week. "
                "Please action immediately."
            )
        }])

        def custom_load_csv(name):
            if name == "emails.csv":
                return unrealistic_email_df
            return self._mock_load_csv_side_effect(name)

        mock_load_csv.side_effect = custom_load_csv
        mock_exists.return_value = False  # No pre-existing audit log

        # ── AI response: anomaly detected, guardrail blocks autonomous action ──
        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Anomalous order: 1,000,000 units SKU-A — guardrail triggered",
            "affected_source": "emails.csv",
            "agent_description": (
                "Order quantity of 1,000,000 units of SKU-A vastly exceeds current "
                "raw material capacity and historical order patterns. Autonomous "
                "approval blocked. Drafted follow-up requesting order verification."
            ),
            "reasoning_detail": (
                "BOM analysis: SKU-A requires 2x RAW-001 per unit, meaning this order "
                "would require 2,000,000 units of RAW-001 (current stock: 100). "
                "This exceeds all budget thresholds and historical volumes by multiple "
                "orders of magnitude — classified as anomalous. No CSV changes made."
            ),
            "preference_refs": ["Budget Constraints", "Urgent Customer Demand"],
            "kpi_alignment": ["Anomaly prevention", "Fraud risk mitigation"],
            "confidence": "High",
            "guardrail_status": "Needs Review",
            "alternative_considered": (
                "Automatically processing the order was considered but rejected because "
                "it would bankrupt the company and is almost certainly a data-entry error."
            ),
            "follow_up": {
                "to": "sales@yamatech.com",
                "subject": "Re: Customer Order — Verification Required",
                "body": (
                    "Hi team, the order for 1,000,000 units of SKU-A has been flagged "
                    "as anomalous by our AI system. Please verify the quantity with the "
                    "customer before we proceed. This order has been placed on hold "
                    "pending human review."
                ),
                "reason": "Order quantity is unrealistically large — requires human verification."
            },
            "status": "Follow-Up Required",
            "inference": (
                "An order for 1,000,000 units of SKU-A has been received — this quantity "
                "is anomalous and requires human review before any action is taken."
            ),
            "decision": (
                "Block autonomous processing. Flag for human review. "
                "Send verification request to the sales team."
            ),
            "actions": [
                "Flagged order as anomalous due to unrealistic quantity (1,000,000 units)",
                "Autonomous approval blocked — no inventory or finance changes made",
                "Drafted follow-up email requesting order verification from sales team"
            ],
            "risks": [
                "Potential data-entry error or fraudulent order from external party",
                "Fulfillment impossible: 1,000,000 SKU-A requires 2,000,000 RAW-001 (stock: 100)"
            ],
            "csv_updates": {
                "inventory_changes": [],   # No inventory changes — blocked by guardrail
                "finance_changes": []       # No finance changes — blocked by guardrail
            }
        })
        mock_global_ai.chat.completions.create.return_value = mock_llm_response

        # ── Run the agent ──────────────────────────────────────────────────────
        audit_log, files_modified = agent.process_emails()

        # ── Assertions ────────────────────────────────────────────────────────
        self.assertEqual(len(audit_log), 1, "Should produce exactly one audit entry")
        entry = audit_log[0]

        # 1. Anomaly detected — inference must mention the anomaly
        self.assertIn(
            "anomalous", entry["inference"].lower(),
            "Inference should flag the order as anomalous"
        )

        # 2. Autonomous approval blocked — decision must mention blocking/review
        decision_lower = entry["decision"].lower()
        self.assertTrue(
            "block" in decision_lower or "review" in decision_lower or "hold" in decision_lower,
            f"Decision should indicate blocking or human review, got: {entry['decision']}"
        )

        # 3. Follow-up email drafted — follow_up must be populated
        self.assertIsNotNone(
            entry["follow_up"],
            "A follow-up email must be drafted for anomalous orders"
        )
        self.assertIn("to", entry["follow_up"])
        self.assertIn("subject", entry["follow_up"])
        self.assertIn("body", entry["follow_up"])

        # 4. No CSV corruption — no inventory or finance CSVs modified
        self.assertNotIn(
            "inventory.csv", files_modified,
            "inventory.csv must NOT be modified when guardrail blocks the order"
        )
        self.assertNotIn(
            "finance.csv", files_modified,
            "finance.csv must NOT be modified when guardrail blocks the order"
        )

        # 5. guardrail_status == 'Needs Review'
        self.assertEqual(
            entry["guardrail_status"],
            "Needs Review",
            f"guardrail_status should be 'Needs Review', got '{entry['guardrail_status']}'"
        )

        # Bonus: status should be Follow-Up Required (not Completed)
        self.assertEqual(
            entry["status"],
            "Follow-Up Required",
            "Status should be 'Follow-Up Required' when email send fails and order is on hold"
        )

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc06_spam_noise_filtering(self, mock_file, mock_os_replace, mock_exists, mock_set_status, mock_save_csv, mock_load_csv):
        """
        TC-06: Spam and Noise Filtering.
        Verifies irrelevant emails do not trigger workflows or CSV mutations.
        """
        spam_df = pd.DataFrame([{
            "id": "EMAIL-999",
            "sender": "marketing@spammer.com",
            "subject": "Win a free cruise!",
            "date": "2026-05-01",
            "body": "Click here for a free discount and vacation."
        }])
        
        def custom_load_csv(name):
            if name == "emails.csv": return spam_df
            return self._mock_load_csv_side_effect(name)
            
        mock_load_csv.side_effect = custom_load_csv
        mock_exists.return_value = False

        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": True,
            "work_name": "Spam Filter",
            "affected_source": "emails.csv",
            "agent_description": "Ignored promotional email.",
            "reasoning_detail": "Email is promotional noise.",
            "confidence": "High",
            "guardrail_status": "Passed",
            "status": "Skipped", 
            "inference": "This is marketing spam.",
            "decision": "Deleted from database.",
            "actions": [],
            "csv_updates": {}
        })
        
        mock_global_ai.chat.completions.create.return_value = mock_llm_response

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(len(files_modified), 0, "No CSVs should be modified for spam")

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace') 
    @patch('builtins.open', new_callable=mock_open)
    def test_hallucination_handling_invalid_sku(self, mock_file, mock_os_replace, mock_exists, mock_set_status, mock_save_csv, mock_load_csv):
        """
        Section 6.4: Hallucination Handling.
        LLM returns valid JSON but references non-existent item SKU-XYZ not found in inventory.csv.
        """
        mock_load_csv.side_effect = self._mock_load_csv_side_effect
        mock_exists.return_value = False

        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "work_name": "Update Stock",
            "affected_source": "inventory.csv",
            "status": "In Progress",
            "csv_updates": {
                "inventory_changes": [{"item_id": "SKU-XYZ", "stock_change": 100}]
            }
        })
        
        mock_global_ai.chat.completions.create.return_value = mock_llm_response

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(len(files_modified), 0, "Should block write due to hallucinated SKU")
        self.assertIn("AI Error", audit_log[0]["inference"])
        self.assertEqual(audit_log[0]["decision"], "Fallback: Manual review required.")

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace') 
    @patch('builtins.open', new_callable=mock_open)
    def test_tc04_api_rate_limit_resilience(self, mock_file, mock_os_replace, mock_exists, mock_set_status, mock_save_csv, mock_load_csv):
        """
        TC-04: External API Rate Limit Resilience.
        Verify system handles LLM API failure (e.g., 429/503) without crashing.
        """
        mock_load_csv.side_effect = self._mock_load_csv_side_effect
        mock_exists.return_value = False

        # Intercept exception using our global mock
        mock_global_ai.chat.completions.create.side_effect = Exception("Error code: 429 - Quota exceeded")

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(audit_log[0]["decision"], "Fallback: Manual review required.")
        self.assertIn("429", audit_log[0]["inference"])
        self.assertEqual(files_modified, [])

if __name__ == '__main__':
    unittest.main()