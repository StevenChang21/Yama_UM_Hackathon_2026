import unittest
from unittest.mock import patch, MagicMock, mock_open
import json
import os
import sys
import pandas as pd

# Force a fake API key BEFORE importing anything.
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

        self.mock_inv_df = pd.DataFrame([{
            "item_id": "RAW-001", "name": "Microcontroller V2", "type": "Raw",
            "current_stock": 600, "reorder_point": 200,
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
            "supplier_id": "SUP-001", "supplier_name": "Alpha Metals",
            "item_id": "RAW-001", "item_name": "Microcontroller V2",
            "unit_cost": 10.0, "delivery_days": 5, "payment_terms": "Net30"
        }])
        self.mock_bom_df = pd.DataFrame([
            {"parent_id": "SKU-A", "child_id": "RAW-001", "qty_required": 2},
            {"parent_id": "SKU-C", "child_id": "RAW-001", "qty_required": 3},
        ])

    def _mock_load_csv_side_effect(self, name):
        if name == "inventory.csv": return self.mock_inv_df
        elif name == "sales.csv": return self.mock_sales_df
        elif name == "manufacturing.csv": return self.mock_mfg_df
        elif name == "finance.csv": return self.mock_fin_df
        elif name == "suppliers.csv": return self.mock_sup_df
        elif name == "bom.csv": return self.mock_bom_df
        return pd.DataFrame()

    # ── TC-01 ──────────────────────────────────────────────────────────────────

    @patch('agent.send_real_email', return_value=True)
    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc01_perfect_storm(self, mock_file, mock_os_replace, mock_exists,
                                mock_set_status, mock_save_csv, mock_load_csv,
                                mock_send_email):
        """
        TC-01: Multi-Party Supply Chain Coordination (The 'Perfect Storm').
        Three simultaneous events arrive in one processing cycle:
          EMAIL-100 — Supplier offers expedited RAW-001 (supply opportunity)
          EMAIL-101 — VIP client orders 500 SKU-C (demand shock)
          EMAIL-102 — Forklift destroys 500 RAW-001 (supply shock)
        Verifies all three are processed, inventory and finance are updated,
        and a Purchase Order follow-up email is automatically dispatched.
        """
        three_email_df = pd.DataFrame([
            {
                "id": "EMAIL-100",
                "sender": "sales@alphametals.com",
                "subject": "Alpha Metals (SUP-001) Expedited Shipping Offer",
                "date": "2026-04-26",
                "body": "We can offer an expedited shipment of up to 2000 units of RAW-001 if you send a PO today."
            },
            {
                "id": "EMAIL-101",
                "sender": "sales@yamatech.com",
                "subject": "URGENT: VIP Client NexGen Robotics Order",
                "date": "2026-04-26",
                "body": "VIP client NexGen Robotics requires 500 units of SKU-C immediately."
            },
            {
                "id": "EMAIL-102",
                "sender": "warehouse@yamatech.com",
                "subject": "Incident Report: Destroyed Raw Materials",
                "date": "2026-04-26",
                "body": "A forklift accident destroyed 500 units of RAW-001. Immediate restocking required."
            },
        ])

        def load_three_emails(name):
            if name == "emails.csv": return three_email_df
            return self._mock_load_csv_side_effect(name)

        mock_load_csv.side_effect = load_three_emails
        mock_exists.return_value = False

        # EMAIL-100: Accept expedited offer → issue PO, update Pending Payables
        resp_100 = MagicMock()
        resp_100.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Issue PO to Alpha Metals for 2000x RAW-001",
            "affected_source": "inventory.csv",
            "agent_description": "Issued PO for 2000 units of RAW-001 at $10/unit (Net30 terms).",
            "reasoning_detail": "Expedited offer solves supply risk flagged by low stock.",
            "preference_refs": ["Low Stock Replenishment"],
            "kpi_alignment": ["Stockout risk reduction"],
            "confidence": "High",
            "guardrail_status": "Passed",
            "alternative_considered": "Reject offer — overstock risk. Rejected due to pending demand.",
            "status": "Completed",
            "inference": "Alpha Metals offers expedited RAW-001 shipment at approved pricing.",
            "decision": "Accept offer and issue PO for 2000 units under Net30 terms.",
            "actions": ["Drafted and sent PO to Alpha Metals"],
            "risks": [],
            "follow_up": {
                "to": "sales@alphametals.com",
                "subject": "PO-2026-001: 2000 units RAW-001",
                "body": "Please ship 2000 units of RAW-001 per our Net30 agreement.",
                "reason": "Purchase Order for expedited restock"
            },
            "csv_updates": {
                "inventory_changes": [{"item_id": "RAW-001", "stock_change": 2000}],
                "finance_changes": [{"account_name": "Pending Payables", "balance_change": 20000.0}]
            }
        })

        # EMAIL-101: VIP order → flag for expedited production, notify customer
        resp_101 = MagicMock()
        resp_101.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Acknowledge VIP Order SKU-C x500 from NexGen Robotics",
            "affected_source": "sales.csv",
            "agent_description": "Flagged VIP order for expedited production and sent customer acknowledgement.",
            "reasoning_detail": "VIP customer demands require highest priority handling.",
            "preference_refs": ["Urgent Customer Demand"],
            "kpi_alignment": ["Fulfilment rate protection"],
            "confidence": "High",
            "guardrail_status": "Passed",
            "alternative_considered": "Delay acknowledgement — rejected, VIP SLA risk.",
            "status": "Completed",
            "inference": "VIP client NexGen Robotics urgently orders 500 units of SKU-C.",
            "decision": "Acknowledge order and flag for expedited production scheduling.",
            "actions": ["Sent order acknowledgement to NexGen Robotics"],
            "risks": ["Raw material sufficiency for 500 SKU-C pending confirmation"],
            "follow_up": {
                "to": "sales@yamatech.com",
                "subject": "VIP Order Confirmed — NexGen Robotics 500x SKU-C",
                "body": "Your order of 500 units of SKU-C has been received and flagged for expedited production.",
                "reason": "Customer acknowledgement and order confirmation"
            },
            "csv_updates": {}
        })

        # EMAIL-102: Incident report → write off 500 RAW-001 from inventory
        resp_102 = MagicMock()
        resp_102.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Write-off 500x RAW-001 (Forklift Incident)",
            "affected_source": "inventory.csv",
            "agent_description": "Applied -500 unit write-off to RAW-001 due to warehouse incident.",
            "reasoning_detail": "Physical loss must be immediately reflected to prevent phantom stock.",
            "preference_refs": ["Production Blockage"],
            "kpi_alignment": ["Stockout risk reduction"],
            "confidence": "High",
            "guardrail_status": "Passed",
            "alternative_considered": "Defer write-off — rejected, data accuracy risk.",
            "status": "Completed",
            "inference": "Forklift accident destroyed 500 units of RAW-001 (Microcontroller V2).",
            "decision": "Write off 500 units from inventory immediately.",
            "actions": ["Applied -500 write-off to RAW-001 in inventory.csv"],
            "risks": ["RAW-001 stock critically reduced after write-off"],
            "follow_up": None,
            "csv_updates": {
                "inventory_changes": [{"item_id": "RAW-001", "stock_change": -500}],
                "finance_changes": []
            }
        })

        mock_global_ai.chat.completions.create.side_effect = [resp_100, resp_101, resp_102]

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(len(audit_log), 3, "All three emails must be processed in one cycle")
        self.assertIn("inventory.csv", files_modified, "Inventory must be updated (PO inbound + write-off)")
        self.assertIn("finance.csv", files_modified, "Finance must be updated (Pending Payables for PO)")
        self.assertTrue(
            all(e["status"] == "Completed" for e in audit_log),
            "All three emails must resolve as Completed"
        )
        self.assertTrue(
            any(e.get("follow_up") for e in audit_log),
            "At least one follow-up (Purchase Order) must be generated"
        )

    # ── TC-02 ──────────────────────────────────────────────────────────────────

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc02_supplier_item_mismatch(self, mock_file, mock_os_replace, mock_exists,
                                         mock_set_status, mock_save_csv, mock_load_csv):
        """
        TC-02: Hallucination & Data Integrity Guardrails (The Mismatched Item).
        Supplier SUP-001 (Alpha Metals, approved for RAW-001 only) emails offering
        a bulk discount on COMPONENT-XYZ — an item not in their approved profile.
        Verifies the AI refuses to issue a PO, sets status to Follow-Up Required,
        and makes no CSV mutations.
        """
        mismatch_email_df = pd.DataFrame([{
            "id": "EMAIL-MISMATCH",
            "sender": "sales@alphametals.com",
            "subject": "Exclusive Bulk Discount: COMPONENT-XYZ Available Now",
            "date": "2026-05-01",
            "body": (
                "Hi YamaTech, Alpha Metals here. We have a special bulk discount on COMPONENT-XYZ "
                "— 5000 units at $8 each. Please send a PO to secure your allocation today."
            )
        }])

        def load_mismatch(name):
            if name == "emails.csv": return mismatch_email_df
            return self._mock_load_csv_side_effect(name)

        mock_load_csv.side_effect = load_mismatch
        mock_exists.return_value = False

        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": False,
            "work_name": "Investigate Supplier Catalog Mismatch: Alpha Metals / COMPONENT-XYZ",
            "affected_source": "suppliers.csv",
            "agent_description": (
                "Detected that Alpha Metals (SUP-001) is offering COMPONENT-XYZ, "
                "which is NOT listed in their approved item profile (approved for RAW-001 only). "
                "PO issuance blocked pending manual verification."
            ),
            "reasoning_detail": (
                "Cross-referencing suppliers.csv: SUP-001 is only approved for RAW-001 "
                "(Microcontroller V2). COMPONENT-XYZ is an unrecognised item — issuing a PO "
                "would risk a costly misorder or a supplier catalog update that bypasses procurement rules."
            ),
            "preference_refs": ["Low Stock Replenishment"],
            "kpi_alignment": [],
            "confidence": "High",
            "guardrail_status": "Needs Review",
            "alternative_considered": "Issue PO blindly — rejected due to supplier-item mismatch.",
            "status": "Follow-Up Required",
            "inference": "Supplier offers COMPONENT-XYZ but is only approved for RAW-001.",
            "decision": "Hold PO. Flag for manual review to verify item identity before ordering.",
            "actions": ["Flagged supplier catalog mismatch for manual procurement review"],
            "risks": ["Potential misorder if PO issued without item identity verification"],
            "follow_up": None,
            "csv_updates": {}
        })

        mock_global_ai.chat.completions.create.return_value = mock_llm_response

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(len(files_modified), 0, "No CSVs should be mutated for a mismatched item")
        self.assertEqual(audit_log[0]["status"], "Follow-Up Required",
                         "Status must be Follow-Up Required to alert human managers")
        self.assertEqual(audit_log[0]["guardrail_status"], "Needs Review",
                         "Guardrail must flag the transaction for review")

    # ── TC-03 ──────────────────────────────────────────────────────────────────

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc03_api_rate_limit_resilience(self, mock_file, mock_os_replace, mock_exists,
                                             mock_set_status, mock_save_csv, mock_load_csv):
        """
        TC-03: External API Rate Limit Resilience (Graceful Degradation).
        The Gemini API returns a 429 Quota Exceeded error mid-cycle.
        Verifies the system does not crash, makes no CSV mutations, and logs
        the email with status 'In Progress' and guardrail 'Needs Review' so
        human managers can take over manually.
        """
        email_df = pd.DataFrame([{
            "id": "EMAIL-001",
            "sender": "logistics@supplier-a.com",
            "subject": "URGENT: shipping delay for RAW-001",
            "date": "2026-05-01",
            "body": "Due to port congestion, restock of RAW-001 is delayed by 5 days."
        }])

        def load_email(name):
            if name == "emails.csv": return email_df
            return self._mock_load_csv_side_effect(name)

        mock_load_csv.side_effect = load_email
        mock_exists.return_value = False

        mock_global_ai.chat.completions.create.side_effect = Exception("Error code: 429 - Quota exceeded")

        audit_log, files_modified = agent.process_emails()

        self.assertEqual(files_modified, [], "No CSVs must be modified when the API is unavailable")
        self.assertIn("429", audit_log[0]["inference"],
                      "Inference must record the 429 error for audit purposes")
        self.assertEqual(audit_log[0]["decision"], "Fallback: Manual review required.")
        self.assertEqual(audit_log[0]["status"], "In Progress",
                         "Status must be In Progress so the email stays in the queue")
        self.assertEqual(audit_log[0]["guardrail_status"], "Needs Review",
                         "Guardrail must flag the entry for human manager takeover")

    # ── TC-04 ──────────────────────────────────────────────────────────────────

    @patch('agent.load_csv')
    @patch('agent.save_csv')
    @patch('agent.set_status')
    @patch('agent.os.path.exists')
    @patch('agent.os.replace')
    @patch('builtins.open', new_callable=mock_open)
    def test_tc04_spam_noise_filtering(self, mock_file, mock_os_replace, mock_exists,
                                        mock_set_status, mock_save_csv, mock_load_csv):
        """
        TC-04: Spam and Noise Filtering.
        Promotional email arrives with no relevance to YamaTech supply chain operations.
        Verifies the AI classifies it as spam and makes zero CSV mutations.
        """
        spam_df = pd.DataFrame([{
            "id": "EMAIL-999",
            "sender": "marketing@spammer.com",
            "subject": "Win a free cruise!",
            "date": "2026-05-01",
            "body": "Click here for a free discount and vacation."
        }])

        def load_spam(name):
            if name == "emails.csv": return spam_df
            return self._mock_load_csv_side_effect(name)

        mock_load_csv.side_effect = load_spam
        mock_exists.return_value = False

        mock_llm_response = MagicMock()
        mock_llm_response.choices[0].message.content = json.dumps({
            "is_spam": True,
            "work_name": "Spam Filter",
            "affected_source": "emails.csv",
            "agent_description": "Ignored promotional email.",
            "reasoning_detail": "Email is promotional noise with no operational relevance.",
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


if __name__ == '__main__':
    unittest.main()
