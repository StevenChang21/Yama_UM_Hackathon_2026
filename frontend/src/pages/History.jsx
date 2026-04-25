import React, { useState, useEffect } from "react";
import { History as HistoryIcon, Clock, CheckCircle } from "lucide-react";

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/agent/audit-log");
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data.reverse()); // Newest first
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Recommendation History</h1>
        <p className="page-subtitle">Past AI recommendations and planning decisions.</p>
      </header>
      <div className="card">
        <div className="card-title" style={{ marginBottom: "1.5rem" }}>
          <HistoryIcon size={20} /> Decision Log
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No history available yet. Generate a recommendation to see it here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: "1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#F8F9FA",
                }}
              >
                <div style={{ flex: 1, paddingRight: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--bosch-dark-blue)", fontSize: "1.1rem" }}>
                      {item.email_id}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={14} />
                      {item.date}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500, marginBottom: "0.5rem" }}>
                    Decision: {item.decision}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {item.inference}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "150px" }}>
                  {item.actions && item.actions.length > 0 ? (
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--bosch-green)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.25rem" }}>
                        <CheckCircle size={18} /> {item.actions.length}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        Actions Executed
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      No actions
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
