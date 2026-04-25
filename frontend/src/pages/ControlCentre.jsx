import React, { useState, useEffect } from "react";
import {
  Clock, Activity, CheckCircle, Clock4, ChevronDown, ChevronRight,
  Zap, Shield, Mail, FileText, AlertTriangle, TrendingUp, Target,
  BarChart3, DollarSign, Truck, Factory, Package, Timer, Brain,
  Send, ArrowRightLeft, ShieldCheck, Eye, Loader2,
} from "lucide-react";
import "./ControlCentre.css";

const API = "http://localhost:8000";

const SOURCES = ["All", "sales.csv", "inventory.csv", "manufacturing.csv", "suppliers.csv", "finance.csv", "logistics.csv", "emails.csv"];
const STATUSES = ["All", "Completed", "In Progress", "Follow-Up Required"];
const CONFIDENCES = ["All", "High", "Medium", "Low"];

const ControlCentre = () => {
  const [time, setTime] = useState(new Date());
  const [expanded, setExpanded] = useState({});
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [filterConf, setFilterConf] = useState("All");
  const [workItems, setWorkItems] = useState([]);
  const [agentStatus, setAgentStatus] = useState({ status: "Idle", current_email: null });
  const [loading, setLoading] = useState(true);

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Fetch audit log + agent status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logRes, statusRes] = await Promise.all([
          fetch(`${API}/api/agent/audit-log`),
          fetch(`${API}/api/agent/status`),
        ]);
        const logData = await logRes.json();
        const statusData = await statusRes.json();

        if (Array.isArray(logData)) {
          // Map audit log entries to work items — handle both old and new format
          const mapped = logData.map((entry, idx) => ({
            id: entry.email_id || `WI-${idx}`,
            emailId: entry.email_id || "",
            emailTime: entry.date || "",
            name: entry.work_name || entry.subject || entry.intent?.replace(/_/g, " ").toUpperCase() || "Processing...",
            source: entry.affected_source || "emails.csv",
            description: entry.agent_description || entry.inference || "",
            reasoning: entry.reasoning_detail || entry.decision || "",
            prefRefs: entry.preference_refs || [],
            kpis: entry.kpi_alignment || [],
            confidence: entry.confidence || "Medium",
            guardrail: entry.guardrail_status || "Needs Review",
            alternative: entry.alternative_considered || "",
            status: entry.status || (entry.actions && entry.actions.length > 0 ? "Completed" : "In Progress"),
            followUp: entry.follow_up || null,
            actions: entry.actions || [],
            risks: entry.risks || [],
            sender: entry.sender || "",
            subject: entry.subject || "",
          }));
          setWorkItems(mapped.reverse()); // newest first
        }
        setAgentStatus(statusData);
      } catch (err) {
        console.error("Failed to fetch control centre data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const items = workItems.filter((w) => {
    if (filterStatus !== "All" && w.status !== filterStatus) return false;
    if (filterSource !== "All" && w.source !== filterSource) return false;
    if (filterConf !== "All" && w.confidence !== filterConf) return false;
    return true;
  });

  const counts = {
    total: workItems.length,
    completed: workItems.filter((w) => w.status === "Completed").length,
    inProgress: workItems.filter((w) => w.status === "In Progress").length,
    followUp: workItems.filter((w) => w.status === "Follow-Up Required").length,
    escalated: workItems.filter((w) => w.guardrail === "Needs Review" || w.guardrail === "Blocked").length,
  };

  const confBadge = (c) => c === "High" ? "cc-badge-high" : c === "Medium" ? "cc-badge-medium" : "cc-badge-low";
  const guardBadge = (g) => g === "Passed" ? "cc-badge-passed" : g === "Blocked" ? "cc-badge-blocked" : "cc-badge-review";
  const statusBadge = (s) => s === "Completed" ? "cc-badge-completed" : s === "In Progress" ? "cc-badge-inprogress" : "cc-badge-followup";
  const statusIcon = (s) => s === "Completed" ? <CheckCircle size={12} /> : s === "In Progress" ? <Clock4 size={12} /> : <Mail size={12} />;

  const isAgentBusy = agentStatus.status !== "Idle";

  return (
    <div className="cc-page">
      {/* Header */}
      <header className="cc-header">
        <div>
          <h1 className="cc-title">
            <Brain size={28} /> Control Centre
            <span className="cc-live-badge"><span className="cc-live-dot" /> LIVE</span>
          </h1>
          <p className="cc-subtitle">
            Explainable AI operations queue — every decision traced, every action auditable.
            {isAgentBusy && (
              <span style={{ marginLeft: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#b45309", fontWeight: 600, fontSize: "0.82rem" }}>
                <Loader2 size={14} className="cc-spin" /> Processing {agentStatus.current_email}...
              </span>
            )}
          </p>
        </div>
        <div className="cc-clock"><Clock size={18} /> {time.toLocaleTimeString()}</div>
      </header>

      {/* Summary Cards */}
      <div className="cc-summary-grid">
        {[
          { label: "Total AI Actions", value: counts.total, icon: <Activity size={22} />, bg: "#dbeafe", fg: "#1e40af" },
          { label: "Completed", value: counts.completed, icon: <CheckCircle size={22} />, bg: "#d1fae5", fg: "#065f46" },
          { label: "In Progress", value: counts.inProgress, icon: <Clock4 size={22} />, bg: "#dbeafe", fg: "#1d4ed8" },
          { label: "Follow-Up Required", value: counts.followUp, icon: <Mail size={22} />, bg: "#fef3c7", fg: "#92400e" },
          { label: "Escalated", value: counts.escalated, icon: <AlertTriangle size={22} />, bg: "#fee2e2", fg: "#991b1b" },
        ].map((c) => (
          <div className="cc-summary-card" key={c.label}>
            <div className="cc-summary-icon" style={{ background: c.bg, color: c.fg }}>{c.icon}</div>
            <div><div className="cc-summary-value">{c.value}</div><div className="cc-summary-label">{c.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="cc-filters">
        <span className="cc-filter-label">Status:</span>
        {STATUSES.map((s) => (
          <button key={s} className={`cc-filter-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>{s}</button>
        ))}
        <span className="cc-filter-label" style={{ marginLeft: "0.75rem" }}>Source:</span>
        {SOURCES.map((s) => (
          <button key={s} className={`cc-filter-btn ${filterSource === s ? "active" : ""}`} onClick={() => setFilterSource(s)}>{s}</button>
        ))}
        <span className="cc-filter-label" style={{ marginLeft: "0.75rem" }}>Confidence:</span>
        {CONFIDENCES.map((c) => (
          <button key={c} className={`cc-filter-btn ${filterConf === c ? "active" : ""}`} onClick={() => setFilterConf(c)}>{c}</button>
        ))}
      </div>

      {/* Work Items */}
      {loading ? (
        <div className="cc-work-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
          <Loader2 size={20} className="cc-spin" /> Loading operations queue...
        </div>
      ) : items.length === 0 ? (
        <div className="cc-work-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          {workItems.length === 0
            ? "No work items yet — the AI agent is processing emails. Items will appear here automatically."
            : "No work items match the selected filters."
          }
        </div>
      ) : items.map((w) => (
        <div className="cc-work-card" key={w.id}>
          {/* Header row */}
          <div className="cc-work-header" onClick={() => toggle(w.id)}>
            <span className="cc-chevron">{expanded[w.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
            <div className="cc-work-time"><Clock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{w.emailTime}</div>
            <div className="cc-work-main">
              <div className="cc-work-name">{w.name}</div>
              <span className="cc-work-source"><FileText size={10} /> {w.source}</span>
            </div>
            <div className="cc-work-badges">
              <span className={`cc-badge ${statusBadge(w.status)}`}>{statusIcon(w.status)} {w.status}</span>
              <span className={`cc-badge ${confBadge(w.confidence)}`}><Target size={10} /> {w.confidence}</span>
              <span className={`cc-badge ${guardBadge(w.guardrail)}`}><ShieldCheck size={10} /> {w.guardrail}</span>
            </div>
          </div>

          {/* Expanded */}
          {expanded[w.id] && (
            <div className="cc-work-body">
              {/* Description */}
              {w.description && (
                <div>
                  <div className="cc-section-label"><Eye size={13} /> Work Description</div>
                  <p className="cc-desc-text">{w.description}</p>
                </div>
              )}

              {/* Reasoning */}
              {w.reasoning && (
                <div className="cc-reasoning-box">
                  <div className="cc-section-label"><Zap size={13} /> AI Reasoning &amp; Decision Logic</div>
                  <p className="cc-desc-text">{w.reasoning}</p>
                  {w.prefRefs.length > 0 && (
                    <div className="cc-pref-tags">
                      {w.prefRefs.map((p, i) => <span className="cc-pref-tag" key={i}>{p}</span>)}
                    </div>
                  )}
                  {w.kpis.length > 0 && (
                    <div className="cc-kpi-tags">
                      {w.kpis.map((k, i) => <span className="cc-kpi-tag" key={i}><BarChart3 size={10} style={{ marginRight: 3 }} />{k}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* Alternative */}
              {w.alternative && (
                <div className="cc-alt-box">
                  <div className="cc-section-label"><ArrowRightLeft size={13} /> Alternative Considered</div>
                  <p className="cc-desc-text">{w.alternative}</p>
                </div>
              )}

              {/* Actions taken */}
              {w.actions && w.actions.length > 0 && (
                <div>
                  <div className="cc-section-label"><CheckCircle size={13} /> Actions Taken</div>
                  <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-primary)" }}>
                    {w.actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {w.risks && w.risks.length > 0 && (
                <div>
                  <div className="cc-section-label" style={{ color: "#dc2626" }}><AlertTriangle size={13} /> Risks Detected</div>
                  <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.85rem", lineHeight: 1.7, color: "#991b1b" }}>
                    {w.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Follow-up Email */}
              {w.followUp && (
                <div>
                  <div className="cc-section-label"><Send size={13} /> Follow-Up Email Preview</div>
                  <div className="cc-email-preview">
                    <div className="cc-email-header">
                      <div className="cc-email-field"><strong>To:</strong> {w.followUp.to}</div>
                      <div className="cc-email-field"><strong>Subject:</strong> {w.followUp.subject}</div>
                    </div>
                    <div className="cc-email-body">{w.followUp.body}</div>
                    {w.followUp.reason && (
                      <div className="cc-email-reason"><AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> {w.followUp.reason}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ControlCentre;
