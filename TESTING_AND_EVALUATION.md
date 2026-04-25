# Y-Inventory: Testing & System Evaluation Documentation

## 1. QA Test Cases & Edge Case Coverage
Our QA strategy focuses on validating the AI's reasoning capabilities, its adherence to strict supply chain constraints, and its ability to handle edge cases gracefully.

### Test Case 1: Multi-Party Supply Chain Coordination (The "Perfect Storm")
* **Description:** A VIP customer urgently orders 500 units of SKU-C (Demand Shock). Simultaneously, a warehouse forklift accident destroys 500 units of a critical raw material (Supply Shock). Concurrently, a supplier emails offering expedited shipping for that exact material.
* **Expected Behavior:** The AI must ingest all three emails in one cycle, calculate the massive material deficit, correctly identify the supplier's offer as the optimal solution, and automatically generate a Purchase Order reply to the supplier while updating the customer.
* **Edge Case Covered:** Complex multi-variable constraint solving under overlapping crises.

### Test Case 2: Hallucination & Data Integrity Guardrails (The Mismatched Item)
* **Description:** A supplier emails offering a bulk discount on "Microcontroller V2". However, the internal `suppliers.csv` database strictly lists this supplier as an approved vendor for "Drill Heads" (RAW-001) only.
* **Expected Behavior:** The AI must cross-reference the supplier database, detect the nomenclature mismatch, and **refuse** to blindly issue a Purchase Order. It must set the status to "Follow-Up Required" to clarify the item identity, preventing a costly misorder.
* **Edge Case Covered:** LLM Hallucination prevention and strict database alignment.

### Test Case 3: External API Rate Limiting (Graceful Degradation)
* **Description:** The system experiences a sudden spike in emails (e.g., a massive marketing campaign reply thread), causing the Gemini API to return a `429 Quota Exceeded` error.
* **Expected Behavior:** The background polling loop catches the exception. The system does not crash. The unprocessed emails are logged in `audit_log.json` with a status of "In Progress" and a guardrail status of "Needs Review", alerting human managers to take over manually.
* **Edge Case Covered:** External service failure and fault tolerance.

---

## 2. Technical Evaluation Strategy

### Grayscale Rollout & A/B Testing
* **Grayscale Rollout (Shadow Mode):** Y-Inventory will initially be deployed to 5% of our supply chain traffic in "Shadow Mode". The AI will read incoming emails, analyze inventory, and draft decisions into the `audit_log.json`, but it will **not** execute CSV writes or send outbound emails. Supply chain managers will review the AI's logic against their own manual decisions. Once the AI achieves a 99% agreement rate, we will ramp up execution authority to 20%, 50%, and finally 100%.
* **A/B Testing:** We will run A/B tests on the AI's prompt configurations. Variant A will instruct the AI to heavily prioritize "Lowest Cost Procurement", while Variant B will prioritize "Fastest Lead Time (Fulfilment)". We will evaluate which variant yields better overall ROI over a 2-week sprint.

### Emergency Rollback (ER) & Golden Release
* **Emergency Rollback Trigger:** If the system detects a catastrophic anomaly—such as the AI attempting to issue POs exceeding the global cash reserve, or the background loop failing to release a CSV file lock within 5 seconds—an Emergency Rollback is instantly triggered.
* **Golden Release:** The system will automatically sever the WebSocket connection to the LLM Client, revert to the "Golden Release" (a purely deterministic, non-AI rule-based routing script), and restore the CSV databases (`inventory.csv`, `finance.csv`, `sales.csv`) from the last hourly automated backup to prevent data corruption.

---

## 3. Priority Matrix & Monitoring

### Priority Matrix
| Priority Level | Trigger Condition | Automated Action |
| :--- | :--- | :--- |
| **P1 Critical** | Gemini API `429` Rate Limit hit repeatedly or `503` Service Unavailable. | Graceful degradation to manual routing. Alert DevOps via SMS. |
| **P1 Critical** | AI attempts to authorize a Purchase Order exceeding the $185,000 budget constraint. | Hard block. Transaction rolled back. Status set to `Blocked`. Manager approval strictly required. |
| **P2 High** | Stock level drops below `0` (Negative Inventory) due to a recorded incident. | Expedite LLM processing queue for that specific raw material's email thread. |
| **P3 Medium** | AI Confidence Score returns as "Low" or "Medium" on a procurement decision. | Draft PO but do not send. Flag as `Needs Review` in the frontend UI. |

### System Monitoring Plan
* **Token Latency:** API calls to the LLM must return a reasoning payload within an average of 4.5 seconds under normal load. We monitor the p95 latency to ensure background loops don't overlap.
* **Cost Efficiency:** Token usage is logged per email. If the average token cost per decision exceeds the defined budget threshold ($0.005 per action), the system will automatically truncate past email context from the prompt.
* **Audit Health:** A secondary watchdog script runs every 60 seconds to verify that the `audit_log.json` array size matches the number of successfully processed rows in `emails.csv`, ensuring no data loss during processing.
