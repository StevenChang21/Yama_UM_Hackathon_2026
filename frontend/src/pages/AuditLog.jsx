import React, { useState, useEffect } from "react";
import { FileText, Play, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Mail, Cpu, Shield } from "lucide-react";

const AuditLog = () => {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [runResult, setRunResult] = useState(null);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/agent/audit-log");
      const data = await res.json();
      if (Array.isArray(data)) setAuditLog(data);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLog(); }, []);

  const runAgent = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/agent/run", { method: "POST" });
      const data = await res.json();
      setRunResult(data);
      await fetchLog();
    } catch (err) {
      setRunResult({ status: "error", message: err.message });
    } finally {
      setRunning(false);
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const intentColor = (intent) => {
    switch (intent) {
      case "new_order": return { bg: "#dbeafe", text: "#1d4ed8" };
      case "order_revision": return { bg: "#fef3c7", text: "#b45309" };
      case "supply_alert": return { bg: "#fee2e2", text: "#dc2626" };
      case "production_alert": return { bg: "#fee2e2", text: "#dc2626" };
      case "supplier_quote": return { bg: "#d1fae5", text: "#059669" };
      case "out_of_stock_notice": return { bg: "#fce7f3", text: "#be185d" };
      case "production_status": return { bg: "#e0e7ff", text: "#4338ca" };
      case "rfq_outbound": return { bg: "#f3e8ff", text: "#7c3aed" };
      default: return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const totalRisks = auditLog.reduce((acc, e) => acc + (e.risks?.length || 0), 0);
  const totalActions = auditLog.reduce((acc, e) => acc + (e.actions?.length || 0), 0);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">AI Agent Audit Log</h1>
        <p className="page-subtitle">
          Autonomous email-driven decisions, actions, and risk analysis.
        </p>
      </header>

      {/* Run Agent Button */}
      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
            <Cpu size={18} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
            Run Autonomous Agent
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Process all emails and make operational decisions.
          </p>
        </div>
        <button className="btn btn-primary" onClick={runAgent} disabled={running}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Play size={16} />
          {running ? "Running..." : "Run Agent"}
        </button>
      </div>

      {runResult && (
        <div className="card" style={{
          marginBottom: "1.5rem",
          borderLeft: `4px solid ${runResult.status === "completed" ? "var(--bosch-green)" : "var(--bosch-red)"}`,
        }}>
          <strong>{runResult.status === "completed" ? "✅ Agent completed" : "❌ Error"}</strong>
          {runResult.emails_processed && (
            <span style={{ marginLeft: "1rem", color: "var(--text-secondary)" }}>
              {runResult.emails_processed} emails processed · {runResult.files_modified?.join(", ")} updated
            </span>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {auditLog.length > 0 && (
        <div className="grid-cols-4" style={{ marginBottom: "1.5rem" }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-light-blue)" }}>{auditLog.length}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Emails Processed</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-green)" }}>{totalActions}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Actions Taken</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-red)" }}>{totalRisks}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Risks Detected</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--bosch-yellow, #f59e0b)" }}>
              {new Set(auditLog.map((e) => e.intent)).size}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Intent Categories</div>
          </div>
        </div>
      )}

      {/* Audit Log Entries */}
      {loading && <p style={{ textAlign: "center", padding: "2rem" }}>Loading audit log...</p>}

      {!loading && auditLog.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          <FileText size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <p>No audit log yet. Click <strong>Run Agent</strong> to process emails.</p>
        </div>
      )}

      {auditLog.map((entry) => {
        const ic = intentColor(entry.intent);
        const isOpen = expanded[entry.email_id];
        return (
          <div key={entry.email_id} className="card" style={{ marginBottom: "0.75rem", cursor: "pointer" }}
            onClick={() => toggleExpand(entry.email_id)}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Mail size={16} color="var(--bosch-light-blue)" />
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{entry.email_id}</span>
              <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary)" }}>{entry.subject}</span>
              <span style={{
                fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.625rem",
                borderRadius: "999px", backgroundColor: ic.bg, color: ic.text,
              }}>
                {entry.intent?.replace(/_/g, " ").toUpperCase()}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", minWidth: "120px", textAlign: "right" }}>
                {entry.date}
              </span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  From: {entry.sender}
                </div>

                {/* Inference */}
                <div style={{ margin: "0.75rem 0", padding: "0.75rem", backgroundColor: "#f0f9ff",
                  borderRadius: "6px", border: "1px solid #bae6fd" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.25rem", color: "#0369a1" }}>
                    🧠 AI Inference
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{entry.inference}</div>
                </div>

                {/* Decision */}
                <div style={{ margin: "0.75rem 0", padding: "0.75rem", backgroundColor: "#f0fdf4",
                  borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.25rem", color: "#15803d" }}>
                    ⚡ Decision
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{entry.decision}</div>
                </div>

                {/* Actions */}
                {entry.actions?.length > 0 && (
                  <div style={{ margin: "0.75rem 0" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                      <CheckCircle size={14} style={{ verticalAlign: "middle", marginRight: "0.375rem", color: "var(--bosch-green)" }} />
                      Actions ({entry.actions.length})
                    </div>
                    {entry.actions.map((a, i) => (
                      <div key={i} style={{ fontSize: "0.8125rem", padding: "0.375rem 0 0.375rem 1.5rem",
                        color: "var(--text-primary)", borderLeft: "2px solid var(--bosch-green)" }}>
                        {a}
                      </div>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {entry.risks?.length > 0 && (
                  <div style={{ margin: "0.75rem 0" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                      <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: "0.375rem", color: "var(--bosch-red)" }} />
                      Risks ({entry.risks.length})
                    </div>
                    {entry.risks.map((r, i) => (
                      <div key={i} style={{ fontSize: "0.8125rem", padding: "0.375rem 0 0.375rem 1.5rem",
                        color: "var(--bosch-red)", borderLeft: "2px solid var(--bosch-red)" }}>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AuditLog;
