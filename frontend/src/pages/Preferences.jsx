import React, { useState, useCallback, useEffect } from "react";

const API = "http://localhost:8000";
import {
  Settings2,
  GripVertical,
  DollarSign,
  Truck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  AlertTriangle,
  Clock,
  Wallet,
  Star,
  TrendingDown,
  TrendingUp,
  Package,
  Timer,
  PiggyBank,
  Factory,
  BadgeDollarSign,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Lock,
  ArrowUpDown,
  Layers,
  CalendarClock,
  ArrowLeftRight,
  ShieldCheck,
  Target,
  Ban,
  Cog,
} from "lucide-react";

/* ───────── helpers ───────── */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ───────── CollapsibleSection ───────── */
const CollapsibleSection = ({ icon, title, subtitle, accentColor, children, defaultOpen = true, id }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pref-section" id={id}>
      <button
        className="pref-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ "--accent": accentColor }}
      >
        <div className="pref-section-header-left">
          <div className="pref-section-icon" style={{ background: accentColor }}>
            {icon}
          </div>
          <div>
            <h2 className="pref-section-title">{title}</h2>
            <p className="pref-section-subtitle">{subtitle}</p>
          </div>
        </div>
        <span className="pref-chevron">{open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
      </button>
      <div className={`pref-section-body ${open ? "open" : ""}`}>{children}</div>
    </section>
  );
};

/* ───────── SliderControl ───────── */
const SliderControl = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = "", color, description }) => (
  <div className="pref-slider-row">
    <div className="pref-slider-meta">
      <span className="pref-slider-label">{label}</span>
      <span className="pref-slider-value" style={{ color }}>{value}{unit}</span>
    </div>
    {description && <p className="pref-slider-desc">{description}</p>}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="pref-range"
      style={{ "--range-color": color }}
    />
    <div className="pref-slider-minmax">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);

/* ───────── ToggleChip ───────── */
const ToggleChip = ({ label, active, onClick, icon, color }) => (
  <button
    className={`pref-chip ${active ? "active" : ""}`}
    onClick={onClick}
    style={active ? { "--chip-active": color, borderColor: color, background: `${color}12` } : {}}
  >
    {icon && <span className="pref-chip-icon" style={active ? { color } : {}}>{icon}</span>}
    {label}
  </button>
);

/* ───────── WeightBar ───────── */
const WeightBar = ({ label, weight, onChange, color, icon }) => (
  <div className="pref-weight-row">
    <div className="pref-weight-label">
      {icon}
      <span>{label}</span>
    </div>
    <div className="pref-weight-bar-wrap">
      <div className="pref-weight-track">
        <div className="pref-weight-fill" style={{ width: `${weight}%`, background: color }} />
      </div>
      <input
        type="number"
        className="pref-weight-input"
        value={weight}
        min={0}
        max={100}
        onChange={(e) => onChange(clamp(Number(e.target.value), 0, 100))}
      />
      <span className="pref-weight-pct">%</span>
    </div>
  </div>
);

/* ───────── Main Component ───────── */
const Preferences = () => {
  /* ── Section 1: Decision Rule Priorities ── */
  const [rules, setRules] = useState([
    { id: "urgent-demand", label: "Urgent Customer Demand", icon: <Zap size={16} />, color: "#e20015" },
    { id: "low-stock", label: "Low Stock Replenishment", icon: <Package size={16} />, color: "#00a8cb" },
    { id: "production-block", label: "Production Blockage", icon: <Factory size={16} />, color: "#ff6b35" },
    { id: "supplier-delay", label: "Supplier Delay", icon: <Clock size={16} />, color: "#f59e0b" },
    { id: "budget-constraint", label: "Budget Constraints", icon: <Wallet size={16} />, color: "#00884a" },
  ]);
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setRules((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  /* ── Section 2: PO Budget Range ── */
  const [budget, setBudget] = useState({ low: 5000, medium: 25000, high: 75000 });
  const [approvalThreshold, setApprovalThreshold] = useState(50000);
  const [reorderQty, setReorderQty] = useState(500);

  /* ── Section 3: Supplier Preferences ── */
  const [supplierWeights, setSupplierWeights] = useState({
    preferred: 35,
    cost: 25,
    leadTime: 25,
    reliability: 15,
  });
  const updateWeight = (key, val) => setSupplierWeights((s) => ({ ...s, [key]: val }));

  /* ── Section 4: KPI Preferences ── */
  const [kpis, setKpis] = useState({
    stockout: true,
    fulfilment: true,
    holdingCost: false,
    leadTime: true,
    budgetUtil: false,
  });
  const toggleKpi = (k) => setKpis((s) => ({ ...s, [k]: !s[k] }));

  /* ── Section 5: Dynamic Stock Allocation Rules ── */
  const [allocRules, setAllocRules] = useState({
    prioritiseDeadline: true,
    allowReallocation: true,
    checkLeadTime: true,
    protectFulfilment: true,
    avoidDelays: true,
    autoWorkOrders: false,
  });
  const toggleAllocRule = (k) => setAllocRules((s) => ({ ...s, [k]: !s[k] }));

  /* ── Custom Rules Input ── */
  const [customRules, setCustomRules] = useState("");

  /* ── Fetch Preferences on Load ── */
  useEffect(() => {
    fetch(`${API}/api/preferences`)
      .then(res => res.json())
      .then(data => {
        if (data.rules) setRules(data.rules);
        if (data.budget) setBudget(data.budget);
        if (data.approvalThreshold) setApprovalThreshold(data.approvalThreshold);
        if (data.reorderQty) setReorderQty(data.reorderQty);
        if (data.supplierWeights) setSupplierWeights(data.supplierWeights);
        if (data.kpis) setKpis(data.kpis);
        if (data.allocRules) setAllocRules(data.allocRules);
        if (data.customRules) setCustomRules(data.customRules);
      })
      .catch(err => console.error("Failed to fetch preferences:", err));
  }, []);

  /* ── Save State to Backend ── */
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      rules,
      budget,
      approvalThreshold,
      reorderQty,
      supplierWeights,
      kpis,
      allocRules,
      customRules
    };
    try {
      await fetch(`${API}/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pref-page">
      {/* ── Header ── */}
      <header className="pref-page-header">
        <div className="pref-page-header-text">
          <h1 className="pref-page-title">
            <Settings2 size={28} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
            Preferences
          </h1>
          <p className="pref-page-subtitle">
            Configure deterministic decision controls for the AI inventory agent.
            <span className="pref-deterministic-badge">
              <Lock size={12} /> Same Input → Same Output
            </span>
          </p>
        </div>
        <div className="pref-header-actions">
          <button className="btn btn-outline pref-reset-btn" onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Reset All
          </button>
          <button className={`btn btn-primary pref-save-btn ${saved ? "saved" : ""}`} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Save Preferences</>}
          </button>
        </div>
      </header>

      {/* ── Section 1: Decision Rules ── */}
      <CollapsibleSection
        id="section-decision-rules"
        icon={<ArrowUpDown size={20} color="#fff" />}
        title="Deterministic Decision Rules"
        subtitle="Drag to reorder priority — higher rules take precedence. Same inputs always produce the same outputs."
        accentColor="var(--bosch-dark-blue)"
        defaultOpen={true}
      >
        <div className="pref-info-bar">
          <Info size={14} />
          <span>The agent evaluates rules top-to-bottom. The first matching condition triggers the action.</span>
        </div>
        <ol className="pref-rule-list">
          {rules.map((rule, idx) => (
            <li
              key={rule.id}
              className={`pref-rule-item ${dragIdx === idx ? "dragging" : ""}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <span className="pref-rule-grip"><GripVertical size={16} /></span>
              <span className="pref-rule-rank">{idx + 1}</span>
              <span className="pref-rule-icon" style={{ color: rule.color }}>{rule.icon}</span>
              <input 
                type="text"
                className="pref-rule-label-input"
                value={rule.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setRules(prev => prev.map((r, i) => i === idx ? { ...r, label: val } : r));
                }}
                title="Edit rule label"
              />
              <span className="pref-rule-priority-badge" style={{ background: `${rule.color}18`, color: rule.color }}>
                {idx === 0 ? "HIGHEST" : idx === rules.length - 1 ? "LOWEST" : `P${idx + 1}`}
              </span>
            </li>
          ))}
        </ol>
      </CollapsibleSection>

      {/* ── Section 2: PO Budget Range ── */}
      <CollapsibleSection
        id="section-budget"
        icon={<DollarSign size={20} color="#fff" />}
        title="PO Budget Range"
        subtitle="Set purchasing thresholds, spending caps, and reorder quantity policies."
        accentColor="#00884a"
      >
        <div className="pref-budget-grid">
          <div className="pref-budget-card" style={{ "--bcard-color": "#00a8cb" }}>
            <h4>Low Budget</h4>
            <SliderControl label="Threshold" value={budget.low} onChange={(v) => setBudget((s) => ({ ...s, low: v }))} min={1000} max={15000} step={500} unit="$" color="#00a8cb" description="Maximum value for low-tier automatic PO approval." />
          </div>
          <div className="pref-budget-card" style={{ "--bcard-color": "#f59e0b" }}>
            <h4>Medium Budget</h4>
            <SliderControl label="Threshold" value={budget.medium} onChange={(v) => setBudget((s) => ({ ...s, medium: v }))} min={10000} max={60000} step={1000} unit="$" color="#f59e0b" description="Medium-tier POs — may require manager sign-off." />
          </div>
          <div className="pref-budget-card" style={{ "--bcard-color": "#e20015" }}>
            <h4>High Budget</h4>
            <SliderControl label="Threshold" value={budget.high} onChange={(v) => setBudget((s) => ({ ...s, high: v }))} min={50000} max={200000} step={5000} unit="$" color="#e20015" description="High-tier POs — always escalated for executive approval." />
          </div>
        </div>

        <div className="pref-budget-extras">
          <SliderControl label="Approval Threshold" value={approvalThreshold} onChange={setApprovalThreshold} min={10000} max={150000} step={5000} unit="$" color="var(--bosch-dark-blue)" description="PO values above this amount require human-in-the-loop approval before execution." />
          <SliderControl label="Default Reorder Quantity" value={reorderQty} onChange={setReorderQty} min={50} max={5000} step={50} unit=" units" color="var(--bosch-light-blue)" description="Standard quantity the agent will order when stock drops below safety thresholds." />
        </div>
      </CollapsibleSection>

      {/* ── Section 3: Supplier Preferences ── */}
      <CollapsibleSection
        id="section-suppliers"
        icon={<Truck size={20} color="#fff" />}
        title="Supplier Preferences"
        subtitle="Define how the agent ranks and selects suppliers for purchase orders."
        accentColor="#00a8cb"
      >
        <div className="pref-supplier-weights">
          <WeightBar label="Preferred Supplier" weight={supplierWeights.preferred} onChange={(v) => updateWeight("preferred", v)} color="#00884a" icon={<Star size={16} color="#00884a" />} />
          <WeightBar label="Lowest Cost" weight={supplierWeights.cost} onChange={(v) => updateWeight("cost", v)} color="#f59e0b" icon={<TrendingDown size={16} color="#f59e0b" />} />
          <WeightBar label="Fastest Lead Time" weight={supplierWeights.leadTime} onChange={(v) => updateWeight("leadTime", v)} color="#00a8cb" icon={<Timer size={16} color="#00a8cb" />} />
          <WeightBar label="Reliability Score" weight={supplierWeights.reliability} onChange={(v) => updateWeight("reliability", v)} color="#7c3aed" icon={<Shield size={16} color="#7c3aed" />} />
        </div>
        <div className="pref-weight-total">
          <span>Total Weight</span>
          <span
            className={`pref-weight-total-val ${
              Object.values(supplierWeights).reduce((a, b) => a + b, 0) === 100 ? "valid" : "invalid"
            }`}
          >
            {Object.values(supplierWeights).reduce((a, b) => a + b, 0)}%
          </span>
          {Object.values(supplierWeights).reduce((a, b) => a + b, 0) !== 100 && (
            <span className="pref-weight-warn"><AlertTriangle size={14} /> Weights should sum to 100%</span>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Section 4: KPI Preferences ── */}
      <CollapsibleSection
        id="section-kpis"
        icon={<BarChart3 size={20} color="#fff" />}
        title="KPI Preferences"
        subtitle="Select which KPIs the agent should actively optimise during decision-making."
        accentColor="#7c3aed"
      >
        <div className="pref-kpi-grid">
          <ToggleChip label="Stockout Risk" active={kpis.stockout} onClick={() => toggleKpi("stockout")} icon={<AlertTriangle size={14} />} color="#e20015" />
          <ToggleChip label="Fulfilment Rate" active={kpis.fulfilment} onClick={() => toggleKpi("fulfilment")} icon={<TrendingUp size={14} />} color="#00884a" />
          <ToggleChip label="Inventory Holding Cost" active={kpis.holdingCost} onClick={() => toggleKpi("holdingCost")} icon={<PiggyBank size={14} />} color="#f59e0b" />
          <ToggleChip label="Lead Time Reduction" active={kpis.leadTime} onClick={() => toggleKpi("leadTime")} icon={<Timer size={14} />} color="#00a8cb" />
          <ToggleChip label="Budget Utilisation" active={kpis.budgetUtil} onClick={() => toggleKpi("budgetUtil")} icon={<BadgeDollarSign size={14} />} color="#7c3aed" />
        </div>
        <div className="pref-kpi-summary">
          <span className="pref-kpi-count">{Object.values(kpis).filter(Boolean).length}</span> of {Object.keys(kpis).length} KPIs active
        </div>
      </CollapsibleSection>

      {/* ── Section 5: Dynamic Stock Allocation Rules ── */}
      <CollapsibleSection
        id="section-allocation"
        icon={<Layers size={20} color="#fff" />}
        title="Dynamic Stock Allocation Rules"
        subtitle="Control how the agent allocates, reallocates, and protects inventory across orders."
        accentColor="#ff6b35"
      >
        <div className="pref-info-bar" style={{ borderLeftColor: "#ff6b35" }}>
          <Info size={14} />
          <span>These rules govern real-time stock allocation decisions. Enabled rules are enforced deterministically during every allocation cycle.</span>
        </div>
        <div className="pref-alloc-list">
          {[
            { key: "prioritiseDeadline", label: "Prioritise orders by earliest deadline", desc: "Orders with the nearest due date receive stock allocation first, regardless of order size or customer.", icon: <CalendarClock size={18} />, color: "#e20015" },
            { key: "allowReallocation", label: "Allow reserved stock reallocation when safe", desc: "Permit the agent to move reserved stock between orders if it does not create a new stockout risk.", icon: <ArrowLeftRight size={18} />, color: "#00a8cb" },
            { key: "checkLeadTime", label: "Check manufacturing lead time before reallocating", desc: "Before reallocating stock, verify that a replacement manufacturing work order can be completed in time.", icon: <Timer size={18} />, color: "#f59e0b" },
            { key: "protectFulfilment", label: "Protect fulfilment KPI", desc: "Never allow a reallocation that would drop the overall fulfilment rate below the configured KPI target.", icon: <ShieldCheck size={18} />, color: "#00884a" },
            { key: "avoidDelays", label: "Avoid delaying orders beyond committed deadlines", desc: "Block any stock movement that would push an existing order past its committed delivery date.", icon: <Ban size={18} />, color: "#7c3aed" },
            { key: "autoWorkOrders", label: "Create replacement manufacturing work orders automatically", desc: "When stock is reallocated away from an order, automatically generate a new work order to replenish it.", icon: <Cog size={18} />, color: "#0369a1" },
          ].map((rule) => (
            <div key={rule.key} className={`pref-alloc-item ${allocRules[rule.key] ? "enabled" : ""}`}>
              <div className="pref-alloc-icon" style={{ color: rule.color }}>{rule.icon}</div>
              <div className="pref-alloc-meta">
                <h4>{rule.label}</h4>
                <p>{rule.desc}</p>
              </div>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={allocRules[rule.key]}
                  onChange={() => toggleAllocRule(rule.key)}
                />
                <span className="pref-toggle-slider" />
              </label>
            </div>
          ))}
        </div>
        <div className="pref-custom-rules-container">
          <h4>Custom Allocation Rules</h4>
          <p>Provide any additional custom logic or instructions for the agent here.</p>
          <textarea
            className="pref-custom-rules-input"
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder="e.g. Always source RAW-003 from secondary suppliers if primary lead time is over 10 days..."
            rows={4}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default Preferences;
