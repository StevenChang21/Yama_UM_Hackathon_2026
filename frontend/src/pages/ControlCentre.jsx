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

const MOCK_AUDIT_LOG = [
  {
    "email_id": "MSG-004",
    "date": "2026-04-25 09:42",
    "work_name": "Update Sales ORD-101 quantity from 300 to 500",
    "affected_source": "sales.csv",
    "agent_description": "Agent updated sales.csv: revised ORD-101 line from 300 → 500 units of SKU-A (Premium Control Module) with a 5% expedite premium applied. Confirmed acceptance back to procurement@autopartscorp.com. Triggered downstream BOM check for RAW-001, RAW-003, and RAW-004 to validate manufacturing feasibility for 500 units. Assessed production capacity on WO-001. ORD-102 left unchanged at 200 units SKU-B.",
    "reasoning_detail": "Deterministic Rule #1 (Urgent Customer Demand) triggered: existing customer with confirmed PO revision and expedite premium justifies priority acceptance. BOM explosion check: manufacturing 500 units of SKU-A requires sufficient RAW-001 (Microcontroller V2), RAW-003 (Copper Winding Coil), and RAW-004 (Tempered Glass Panel). Current raw material stock is insufficient — triggered procurement work items for shortfalls. KPI alignment confirms accepting this revision protects fulfilment rate and reduces stockout risk for SKU-A.",
    "preference_refs": ["Urgent Customer Demand rule", "Production Blockage rule", "Fulfilment Rate KPI", "Low Stock Replenishment rule"],
    "kpi_alignment": ["Fulfilment rate protection", "Stockout risk reduction", "Production feasibility: BOM validated"],
    "confidence": "High",
    "guardrail_status": "Passed",
    "alternative_considered": "Considered partial acceptance of 400 units to reduce raw material procurement pressure, but rejected because customer explicitly needs 500 units for their downstream contract and offers expedite premium — partial fill would violate fulfilment rate KPI target.",
    "status": "Completed",
    "follow_up": null
  },
  {
    "email_id": "MSG-005",
    "date": "2026-04-25 09:48",
    "work_name": "Create Purchase Order for Microcontroller V2 (RAW-001)",
    "affected_source": "inventory.csv",
    "agent_description": "Agent created an emergency Purchase Order for 1,400 units of RAW-001 (Microcontroller V2) at $16.50/unit via expedited air freight from GlobalTech Components. Updated inventory.csv with inbound PO record. Selected expedited 6-day delivery (arriving ~April 26th) over standard 14-day option to meet April 30th material deadline. Total PO value: $23,100.",
    "reasoning_detail": "Deterministic Rule #2 (Low Stock Replenishment) triggered: RAW-001 at 40% of reorder point. Contextual trigger activated by manufacturing alert (MSG-008) confirming production blockage. Supplier preference engine ranked GlobalTech Components first (fastest lead time: 6 days expedited, reliability: 95%). PO value $23,100 is within medium-budget auto-approval threshold. Expedited delivery selected to meet April 30th material deadline.",
    "preference_refs": ["Low Stock Replenishment rule", "Medium PO Budget auto-approve", "Fastest Lead Time supplier", "Manufacturing Alert trigger"],
    "kpi_alignment": ["Stockout risk reduction", "Lead time: 6 days expedited", "Budget utilisation: $23.1K"],
    "confidence": "High",
    "guardrail_status": "Passed",
    "alternative_considered": "Considered standard 14-day delivery at $15.50/unit ($21,700 total, saving $1,400) but rejected — standard delivery arrives May 2nd, leaving only 3 days before May 5th customer deadline. Lead Time Reduction KPI requires expedited option.",
    "status": "Completed",
    "follow_up": null
  },
  {
    "email_id": "MSG-003",
    "date": "2026-04-25 09:51",
    "work_name": "Emergency Reorder RAW-003 Copper Winding Coil (600 units)",
    "affected_source": "inventory.csv",
    "agent_description": "Agent placed an emergency PO for 600 units of RAW-003 (Copper Winding Coil) at current pricing of $8.75/unit with FastComp Metals before the April 28th price-lock deadline. Updated inventory.csv with inbound allocation. Delivery ETA: 8 days (~April 30th). Total PO value: $5,250. Partial allocation only — 600 of 1,200 units needed. Remaining quantity flagged for follow-up (see WI-008).",
    "reasoning_detail": "Deterministic Rule #4 (Supplier Delay) combined with Rule #2 (Low Stock Replenishment): RAW-003 at 0 units with active production orders blocked (WO-002 halted, WO-004 not started). Contextual trigger from supplier delay notice (MSG-003) activated emergency procurement. Budget check: 600 × $8.75 = $5,250 within low-budget auto-approval. Supplier preference: FastComp Metals is sole qualified supplier for RAW-003 — no alternative available.",
    "preference_refs": ["Supplier Delay rule", "Low Stock Replenishment rule", "Low PO Budget auto-approve", "Supplier Delay Notice trigger"],
    "kpi_alignment": ["Stockout risk: critical (0 units)", "Lead time: 8 days", "Budget utilisation: $5,250"],
    "confidence": "Medium",
    "guardrail_status": "Needs Review",
    "alternative_considered": "Considered waiting for full 1,200-unit allocation but rejected — remaining 600 units unavailable until May 15th at $10.50/unit (+20%). Securing partial allocation now protects production timeline and locks in current pricing per Budget Constraints rule.",
    "status": "In Progress",
    "follow_up": null
  },
  {
    "email_id": "MSG-009",
    "date": "2026-04-25 10:05",
    "work_name": "Request Missing Lead Time from ClearTech Glass Supply",
    "affected_source": "suppliers.csv",
    "agent_description": "Agent identified RAW-004 supply gap after PrimeMaterials stockout notification and drafted an RFQ email to alternative supplier ClearTech Glass Supply (cleartechglass@supply.com) requesting pricing, lead time, and ISO 9001 certification for 850 units. PO creation blocked by Supplier Whitelisting guardrail — ClearTech is unverified. Agent is awaiting supplier response before proceeding.",
    "reasoning_detail": "Deterministic Rule #4 (Supplier Delay) triggered: primary supplier stockout creates supply chain risk. ClearTech Glass is an unverified supplier — Operational Guardrail 'Supplier Whitelisting' requires qualification before automated PO. Agent has prepared a follow-up email requesting quote, lead time confirmation, and quality certification. KPI alignment: preventing RAW-004 stockout is critical for SKU-A production.",
    "preference_refs": ["Supplier Delay rule", "Supplier Whitelisting guardrail", "Reliability Score weighting", "Sales Email trigger"],
    "kpi_alignment": ["Stockout risk: high (150 units, reorder: 400)", "Lead time: 10-12 days estimated", "Supplier reliability: unverified"],
    "confidence": "Low",
    "guardrail_status": "Needs Review",
    "alternative_considered": "Considered waiting for PrimeMaterials to resume in late May, but rejected — current stock of 150 units is insufficient to cover SKU-A production runs. Fulfilment Rate KPI requires proactive sourcing.",
    "status": "Follow-Up Required",
    "follow_up": {
      "to": "cleartechglass@supply.com",
      "subject": "RFQ — Tempered Glass Panel (RAW-004 compatible) — Urgent",
      "body": "Dear ClearTech Glass Supply,\n\nWe are YamaTech, a manufacturer of precision control modules. Our primary supplier for Tempered Glass Panels (RAW-004) has experienced a stockout and recommended your organisation as an alternative.\n\nWe require approximately 850 units of SKU-A-grade Tempered Glass Panel. Could you please confirm:\n\n1. Unit pricing for 850 units\n2. Confirmed lead time from order placement\n3. Quality certification (ISO 9001 or equivalent)\n4. Minimum order quantity\n\nThis is urgent — we have active customer commitments with a May 5th deadline.\n\nRegards,\nYamaTech Procurement",
      "reason": "Missing supplier lead time and pricing. ClearTech is unverified — guardrail requires qualification data before PO."
    }
  },
  {
    "email_id": "MSG-007",
    "date": "2026-04-25 10:12",
    "work_name": "Update Sales ORD-104 SKU-C quantity from 150 to 250",
    "affected_source": "sales.csv",
    "agent_description": "Agent updated sales.csv: revised ORD-104 from 150 → 250 units of SKU-C (Industrial Sensor Pack). Flagged for manager approval — revised order value of $52,500 exceeds the configured approval threshold. Production feasibility check run: WO-002 (SKU-C manufacturing) currently halted due to RAW-003 shortage — revision acceptance is conditional on RAW-003 procurement completing (WI-003). ORD-105 unchanged.",
    "reasoning_detail": "Deterministic Rule #1 (Urgent Customer Demand) triggered: NexGen Robotics is a high-priority new customer with investor presentation in mid-May. Accepting revision protects relationship and future order pipeline. Order value $52,500 exceeds approval threshold — escalated for manager review per PO Budget Range configuration. Manufacturing feasibility check: WO-002 currently halted due to RAW-003 shortage — cannot begin producing additional 100 units of SKU-C until raw material procurement completes.",
    "preference_refs": ["Urgent Customer Demand rule", "Approval threshold exceeded", "Production Blockage rule", "Fulfilment Rate KPI"],
    "kpi_alignment": ["Fulfilment rate: new customer critical", "Stockout risk: RAW-003 dependency", "Production: WO-002 blocked"],
    "confidence": "Medium",
    "guardrail_status": "Needs Review",
    "alternative_considered": "Considered rejecting the increase and manufacturing only 150 units to avoid raw material procurement risk, but rejected — NexGen Robotics is presenting to investors in mid-May and losing this customer would impact future revenue pipeline. Fulfilment Rate KPI outweighs short-term production pressure.",
    "status": "In Progress",
    "follow_up": null
  },
  {
    "email_id": "MSG-011",
    "date": "2026-04-25 10:20",
    "work_name": "Modify Sales ORD-102 SKU-B from 200 to 100, Create ORD-103",
    "affected_source": "sales.csv",
    "agent_description": "Agent modified sales.csv: reduced ORD-102 from 200 → 100 units of SKU-B and created new line item ORD-103 for 100 units of SKU-D (Compact Drive Unit). Updated manufacturing.csv: reduced WO-003 (SKU-B production) scope from 200 to 100 units, created WO-004 for manufacturing 100 units of SKU-D. Freed up RAW-001 allocation previously reserved for WO-003. Net order value unchanged — no budget impact.",
    "reasoning_detail": "Deterministic Rule #1 (Urgent Customer Demand) triggered: existing customer order modification. Net order value unchanged — budget impact neutral. Manufacturing impact assessed: WO-003 (SKU-B production) scope reduced from 200 to 100 units, freeing RAW-001 allocation for other production runs. New WO-004 created to manufacture 100 units of SKU-D — requires RAW-002 and RAW-003 per BOM. No new raw material procurement needed for the SKU-B reduction.",
    "preference_refs": ["Urgent Customer Demand rule", "Budget Constraints (neutral)", "Production Blockage rule", "Low Stock Replenishment rule"],
    "kpi_alignment": ["Fulfilment rate: maintained", "Production: RAW-001 freed", "Lead time: no change"],
    "confidence": "High",
    "guardrail_status": "Passed",
    "alternative_considered": "Considered rejecting the substitution to simplify production planning, but rejected — customer explicitly stated final revision and total order value is unchanged. Rejecting would damage customer relationship with no manufacturing benefit.",
    "status": "Completed",
    "follow_up": null
  },
  {
    "email_id": "MSG-008",
    "date": "2026-04-25 10:35",
    "work_name": "Escalate Production Blockage — WO-002 & WO-003 halted",
    "affected_source": "manufacturing.csv",
    "agent_description": "Agent cross-referenced production floor alert with existing work items and confirmed: WI-002 (RAW-001 PO) and WI-003 (RAW-003 PO) already in progress. Updated manufacturing.csv: marked WO-002 status as 'Halted — RAW-003 Exhausted' at 50/120 units and WO-004 as 'Not Started — Awaiting Materials'. Escalated to operations manager — 50% production capacity loss triggers multi-line blockage guardrail. RAW-004 procurement pending ClearTech qualification (WI-004).",
    "reasoning_detail": "Deterministic Rule #3 (Production Blockage) triggered with highest urgency: 50% of work orders stopped. This email corroborates WI-002 (RAW-001 PO) and WI-003 (RAW-003 PO) — both already in progress. RAW-004 procurement blocked by Supplier Whitelisting guardrail (WI-004 follow-up pending). Escalation to operations manager required per guardrail policy when multiple production lines are simultaneously blocked.",
    "preference_refs": ["Production Blockage rule", "Supplier Whitelisting guardrail", "Manufacturing Alert trigger", "Stockout Risk KPI"],
    "kpi_alignment": ["Stockout risk: critical across 3 materials", "Fulfilment rate: 2 deadlines at risk", "Production: 50% capacity loss"],
    "confidence": "High",
    "guardrail_status": "Needs Review",
    "alternative_considered": "Considered prioritising only RAW-001 procurement to unblock WO-003 first, but rejected — RAW-003 is also at 0 units and blocks both WO-002 and WO-004. Parallel procurement of all three materials required to restore production capacity per Production Blockage rule priority.",
    "status": "In Progress",
    "follow_up": null
  },
  {
    "email_id": "MSG-010",
    "date": "2026-04-25 10:42",
    "work_name": "Request Remaining RAW-003 Allocation from FastComp Metals",
    "affected_source": "suppliers.csv",
    "agent_description": "Agent drafted a follow-up email to FastComp Metals (sales@fastcompmetals.com) requesting earlier delivery of the remaining 600 units of RAW-003 and asking for recommended Southeast Asia regional distributors. Evaluated cost impact: new pricing at $10.50/unit represents a +20% premium ($6,300 vs $5,250). Agent cannot auto-approve alternative distributors — Supplier Whitelisting guardrail requires verification first.",
    "reasoning_detail": "Deterministic Rule #4 (Supplier Delay) active: partial allocation insufficient for full production recovery. Budget Constraints rule evaluates cost impact: 600 units at new price = $6,300 vs $5,250 at current price (+$1,050 premium). Total RAW-003 cost within medium-budget threshold. Supplier preference: FastComp is sole qualified supplier — Southeast Asia distributors mentioned but unverified.",
    "preference_refs": ["Supplier Delay rule", "Budget Constraints rule", "Supplier Whitelisting guardrail", "Supplier Delay Notice trigger"],
    "kpi_alignment": ["Stockout risk: partial mitigation only", "Budget utilisation: +$1,050 premium", "Lead time: May 15+ for remainder"],
    "confidence": "Low",
    "guardrail_status": "Needs Review",
    "alternative_considered": "Considered accepting May 15th delivery at new pricing, but rejected — WO-002 and WO-004 cannot wait 3 weeks. Agent is exploring Southeast Asia regional distributors as recommended by FastComp, pending supplier qualification.",
    "status": "Follow-Up Required",
    "follow_up": {
      "to": "sales@fastcompmetals.com",
      "subject": "RFQ — Copper Winding Coil (RAW-003) — Alternative Distributors",
      "body": "Dear FastComp Metals,\n\nWe accept the partial allocation of 600 units at $8.75/unit. Regarding the remaining 600 units needed, a May 15th delivery is too late for our production schedule.\n\nYou mentioned Southeast Asia regional distributors. Could you please provide contact information for any verified distributors that might have stock available immediately?\n\nThank you,\nYamaTech Procurement",
      "reason": "Exploring alternative suppliers to avoid production delays. Manager review needed for unverified suppliers."
    }
  }
];

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
        let logData = null;
        let statusData = { status: "Idle", current_email: null };
        try {
          const [logRes, statusRes] = await Promise.all([
            fetch(`${API}/api/agent/audit-log`),
            fetch(`${API}/api/agent/status`),
          ]);
          logData = await logRes.json();
          statusData = await statusRes.json();
        } catch (fetchErr) {
          // Fallback to mock data if backend is offline
          console.warn("Backend unavailable, using mock data.", fetchErr);
          logData = MOCK_AUDIT_LOG;
        }

        if (Array.isArray(logData) && logData.length > 0) {
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
        } else if (Array.isArray(logData)) {
           // Emtpy state from backend
           setWorkItems([]);
        }
        setAgentStatus(statusData);
      } catch (err) {
        console.error("Failed to fetch control centre data:", err);
        // Ensure mock data loads on complete failure
        if (workItems.length === 0) {
           const mappedMock = MOCK_AUDIT_LOG.map((entry, idx) => ({
             id: entry.email_id || `WI-${idx}`,
             emailId: entry.email_id || "",
             emailTime: entry.date || "",
             name: entry.work_name || "Processing...",
             source: entry.affected_source || "emails.csv",
             description: entry.agent_description || "",
             reasoning: entry.reasoning_detail || "",
             prefRefs: entry.preference_refs || [],
             kpis: entry.kpi_alignment || [],
             confidence: entry.confidence || "Medium",
             guardrail: entry.guardrail_status || "Needs Review",
             alternative: entry.alternative_considered || "",
             status: entry.status || "In Progress",
             followUp: entry.follow_up || null,
           }));
           setWorkItems(mappedMock.reverse());
        }
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
