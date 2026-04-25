import React, { useState, useEffect } from "react";
import { Target, ShieldAlert, LineChart, CheckCircle2, AlertOctagon, Zap, Shield, FileSignature } from "lucide-react";

const Strategy = () => {
  const [approvalThreshold, setApprovalThreshold] = useState(50000);

  useEffect(() => {
    fetch("http://localhost:8000/api/preferences")
      .then(res => res.json())
      .then(data => {
        if (data.approvalThreshold) {
          setApprovalThreshold(data.approvalThreshold);
        }
      })
      .catch(err => console.error(err));
  }, []);
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Corporate Strategy & Governance</h1>
        <p className="page-subtitle">
          Decision-making parameters, performance indicators, and operational guardrails for the Autonomous AI.
        </p>
      </header>

      {/* KPI Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--bosch-dark-blue)" }}>
          <LineChart size={24} color="var(--bosch-light-blue)" />
          Primary KPIs (Key Performance Indicators)
        </h2>
        <div className="grid-cols-4">
          <div className="card" style={{ borderTop: "4px solid var(--bosch-light-blue)" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-dark-blue)", marginBottom: "0.25rem" }}>99.5%</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>On-Time Delivery (OTD)</div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: 0 }}>
              Ensure customer orders meet their requested delivery dates without compromise.
            </p>
          </div>
          <div className="card" style={{ borderTop: "4px solid var(--bosch-green)" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-dark-blue)", marginBottom: "0.25rem" }}>&lt; 5%</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Inventory Holding Cost</div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: 0 }}>
              Minimize excess raw material and finished goods stock to preserve operating cash flow.
            </p>
          </div>
          <div className="card" style={{ borderTop: "4px solid var(--bosch-red)" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-dark-blue)", marginBottom: "0.25rem" }}>0</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Production Stoppages</div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: 0 }}>
              Zero manufacturing line halts due to material shortages or logistical delays.
            </p>
          </div>
          <div className="card" style={{ borderTop: "4px solid var(--bosch-yellow, #f59e0b)" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-dark-blue)", marginBottom: "0.25rem" }}>15%</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Minimum Margin</div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: 0 }}>
              Maintain unit profitability even when expedited shipping or premium supplier pricing is required.
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* Strategy Section */}
        <section className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--bosch-dark-blue)" }}>
            <Target size={24} color="var(--bosch-green)" />
            AI Decision Making Strategy
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-green)" }}><CheckCircle2 size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Proactive Mitigation</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Detect supply chain risks (e.g., raw material shortages) before they impact the production floor, automatically triggering alternative procurement.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-green)" }}><CheckCircle2 size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Customer Priority Tiering</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Prioritize allocation of scarce inventory to high-profile clients (e.g., NexGen Robotics) to preserve critical business relationships.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-green)" }}><CheckCircle2 size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Dynamic Cost Optimization</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Balance the cost of expedited shipping vs. the financial penalty and reputational damage of missing a Service Level Agreement (SLA).
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-green)" }}><CheckCircle2 size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Continuous Real-Time Sync</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Instantly reflect incoming emails, supplier quotes, and internal floor updates across Sales, Manufacturing, and Inventory databases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Guardrails Section */}
        <section className="card" style={{ margin: 0, display: "flex", flexDirection: "column", border: "1px solid #fee2e2" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--bosch-red)" }}>
            <ShieldAlert size={24} color="var(--bosch-red)" />
            Operational Guardrails
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-red)" }}><AlertOctagon size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Maximum Spend Authority</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  The AI agent may autonomously approve Purchase Orders up to <strong>${approvalThreshold.toLocaleString()} USD</strong>. Any procurement exceeding this threshold must be flagged for Human-in-the-Loop review.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-red)" }}><Shield size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Supplier Whitelisting</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Only issue automated POs to Tier 1 pre-vetted suppliers. Alternative unverified suppliers (e.g., ClearTech Glass) must be escalated for qualification.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-red)" }}><AlertOctagon size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>No Destructive Writes</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  The AI must use an append-only architecture for database mutations. Original records are never deleted; new rows are appended with updated <code>valid_from</code> timestamps.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--bosch-red)" }}><FileSignature size={20} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Full Audit Traceability</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Every autonomous decision must be logged with its root cause trigger (Email ID), exact reasoning inference, and the resulting JSON action payload.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Strategy;
