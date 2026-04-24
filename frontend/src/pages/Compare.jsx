import { useState } from "react";
import { useMockData } from "../context/useMockData";
import { GitCompare, Package, ShoppingCart, Factory, DollarSign, Truck, Lightbulb, AlertCircle, FileText, CheckCircle } from "lucide-react";

// ── Static scenario metadata (mirrors the CSV data) ──────────────────────────
const SCENARIO_A = {
  id: "a",
  label: "Scenario A",
  subtitle: "Growth Mode",
  tagline: "Healthy stock · Standard demand · Full logistics",
  color: "#16a34a",
  budget: 120000,
  logistics: "All resources available",
  woSummary: "4 WOs planned — no blockers",
  inventory: [
    { id: "RAW-001", name: "Microcontroller V2",   stock: 650,  reorder: 300 },
    { id: "RAW-002", name: "Steel Housing",         stock: 900,  reorder: 400 },
    { id: "RAW-003", name: "Copper Winding Coil",  stock: 1200, reorder: 500 },
    { id: "RAW-004", name: "Tempered Glass Panel", stock: 550,  reorder: 400 },
    { id: "RAW-005", name: "Circuit Board Assy",   stock: 480,  reorder: 200 },
  ],
  orders: [
    { id: "ORD-A01", customer: "AutoParts Corp",  sku: "SKU-A", qty: 300, due: "May 15" },
    { id: "ORD-A02", customer: "AutoParts Corp",  sku: "SKU-B", qty: 150, due: "May 15" },
    { id: "ORD-A03", customer: "NexGen Robotics", sku: "SKU-C", qty: 200, due: "May 20" },
    { id: "ORD-A04", customer: "NexGen Robotics", sku: "SKU-D", qty:  80, due: "May 20" },
  ],
};

const SCENARIO_B = {
  id: "b",
  label: "Scenario B",
  subtitle: "Crisis Mode",
  tagline: "Critical shortages · Tight budget · 3 WOs halted",
  color: "#dc2626",
  budget: 38000,
  logistics: "Dock A: maintenance · Trucks: busy until Apr 20",
  woSummary: "3 of 4 WOs halted or blocked",
  inventory: [
    { id: "RAW-001", name: "Microcontroller V2",   stock:  50, reorder: 300 },
    { id: "RAW-002", name: "Steel Housing",         stock: 820, reorder: 400 },
    { id: "RAW-003", name: "Copper Winding Coil",  stock:   0, reorder: 500 },
    { id: "RAW-004", name: "Tempered Glass Panel", stock:  80, reorder: 400 },
    { id: "RAW-005", name: "Circuit Board Assy",   stock: 180, reorder: 200 },
  ],
  orders: [
    { id: "ORD-B01", customer: "AutoParts Corp",  sku: "SKU-A", qty: 300, due: "May 5 🚨" },
    { id: "ORD-B02", customer: "AutoParts Corp",  sku: "SKU-B", qty: 150, due: "May 5 🚨" },
    { id: "ORD-B03", customer: "NexGen Robotics", sku: "SKU-C", qty: 200, due: "May 8 🚨" },
    { id: "ORD-B04", customer: "NexGen Robotics", sku: "SKU-D", qty:  80, due: "May 8 🚨" },
    { id: "ORD-B05", customer: "AutoParts Corp",  sku: "SKU-D", qty:  50, due: "May 3 🔴" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function stockBadge(stock, reorder) {
  if (stock === 0)           return { label: "ZERO",     bg: "#fef2f2", text: "#dc2626" };
  if (stock <= reorder)      return { label: "CRITICAL", bg: "#fef3c7", text: "#b45309" };
  if (stock <= reorder * 1.5) return { label: "LOW",    bg: "#eff6ff", text: "#2563eb" };
  return                            { label: "OK",       bg: "#f0fdf4", text: "#16a34a" };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScenarioCard({ scenario }) {
  const c = scenario.color;
  return (
    <div className="card" style={{ borderTop: `4px solid ${c}`, flex: 1 }}>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: c, letterSpacing: "0.06em", textTransform: "uppercase" }}>{scenario.label}</div>
        <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--bosch-dark-blue)" }}>{scenario.subtitle}</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{scenario.tagline}</div>
      </div>

      {/* Inventory */}
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.375rem" }}>
        <Package size={11} style={{ display: "inline", marginRight: "4px" }} />Raw Materials
      </div>
      {scenario.inventory.map(({ id, name, stock, reorder }) => {
        const { label, bg, text } = stockBadge(stock, reorder);
        const pct = Math.min(100, Math.round((stock / (reorder * 2.5)) * 100));
        return (
          <div key={id} style={{ marginBottom: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-primary)", fontWeight: 500 }}>{id} · {name}</span>
              <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.1rem 0.375rem", borderRadius: "4px", backgroundColor: bg, color: text }}>{stock.toLocaleString()} · {label}</span>
            </div>
            <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "#e5e7eb" }}>
              <div style={{ height: "100%", width: `${pct}%`, backgroundColor: text, borderRadius: "2px", transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}

      {/* Orders */}
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0.875rem 0 0.375rem" }}>
        <ShoppingCart size={11} style={{ display: "inline", marginRight: "4px" }} />Orders
      </div>
      {scenario.orders.map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", padding: "0.25rem 0", borderBottom: "1px solid var(--border-color)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{o.id} · {o.sku}</span>
          <span style={{ fontWeight: 600 }}>{o.qty} units — {o.due}</span>
        </div>
      ))}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.875rem" }}>
        <div style={{ padding: "0.5rem", backgroundColor: "#F8F9FA", borderRadius: "6px", fontSize: "0.75rem" }}>
          <div style={{ color: "var(--text-secondary)", marginBottom: "0.1rem" }}><DollarSign size={11} style={{ display: "inline" }} /> Budget</div>
          <div style={{ fontWeight: 700, color: scenario.budget < 50000 ? "#dc2626" : "#16a34a" }}>${scenario.budget.toLocaleString()}</div>
        </div>
        <div style={{ padding: "0.5rem", backgroundColor: "#F8F9FA", borderRadius: "6px", fontSize: "0.75rem" }}>
          <div style={{ color: "var(--text-secondary)", marginBottom: "0.1rem" }}><Factory size={11} style={{ display: "inline" }} /> Work Orders</div>
          <div style={{ fontWeight: 700, color: scenario.id === "b" ? "#dc2626" : "#16a34a" }}>{scenario.woSummary}</div>
        </div>
      </div>
      <div style={{ marginTop: "0.5rem", padding: "0.5rem", backgroundColor: "#F8F9FA", borderRadius: "6px", fontSize: "0.75rem" }}>
        <span style={{ color: "var(--text-secondary)" }}><Truck size={11} style={{ display: "inline", marginRight: "4px" }} />Logistics: </span>
        <span style={{ fontWeight: 500 }}>{scenario.logistics}</span>
      </div>
    </div>
  );
}

function ResultCard({ label, color, result }) {
  if (!result) return null;
  if (result.error) return (
    <div className="card" style={{ flex: 1, borderTop: `4px solid ${color}` }}>
      <div style={{ color: "#dc2626" }}>{result.error}</div>
    </div>
  );

  const drafts = result.drafts || {};
  return (
    <div className="card" style={{ flex: 1, borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{label} — AI Recommendation</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
        {[
          { icon: <Package size={14} />, label: "Quantity", value: `${result.recommended_quantity?.toLocaleString() ?? "—"} units` },
          { icon: <DollarSign size={14} />, label: "Est. Cost", value: `$${result.estimated_cost?.toLocaleString() ?? "—"}` },
          { icon: <Truck size={14} />, label: "Delivery", value: result.estimated_delivery_date ?? "TBD" },
          { icon: <CheckCircle size={14} />, label: "Supplier", value: result.chosen_supplier ?? "N/A" },
        ].map(({ icon, label: l, value }) => (
          <div key={l} style={{ padding: "0.5rem 0.625rem", backgroundColor: "#F8F9FA", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>{icon}{l}</div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
          </div>
        ))}
      </div>

      {result.chosen_raw_materials && (
        <div style={{ padding: "0.5rem 0.625rem", backgroundColor: "#FFF7ED", borderRadius: "6px", marginBottom: "0.75rem", fontSize: "0.75rem" }}>
          <span style={{ color: "#b45309", fontWeight: 600 }}>Materials needed: </span>
          <span style={{ color: "var(--text-primary)" }}>{result.chosen_raw_materials}</span>
        </div>
      )}

      <div style={{ padding: "0.75rem", backgroundColor: "#F8F9FA", borderRadius: "6px", marginBottom: "0.75rem", border: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>
          <AlertCircle size={13} /> Justification
        </div>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.65 }}>{result.justification}</p>
      </div>

      {Object.keys(drafts).length > 0 && (
        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.375rem" }}>
            <FileText size={11} style={{ display: "inline", marginRight: "4px" }} />Generated Drafts
          </div>
          {Object.entries(drafts).map(([key, content]) => (
            <details key={key} style={{ marginBottom: "0.375rem" }}>
              <summary style={{ fontSize: "0.75rem", fontWeight: 600, color, cursor: "pointer", padding: "0.3rem 0" }}>
                {key.replace(/_/g, " ")}
              </summary>
              <pre style={{ margin: "0.25rem 0 0 0.75rem", fontSize: "0.6875rem", fontFamily: "inherit", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {content}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const Compare = () => {
  const { generateComparison, comparison, isCompareLoading, compareStatuses } = useMockData();
  const [hasRun, setHasRun] = useState(false);

  const handleAnalyze = () => {
    setHasRun(true);
    generateComparison(
      "Analyze the supply chain and provide a full recommendation. Check all emails, inventory levels, sales orders, work orders, finance, and logistics before deciding."
    );
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <GitCompare size={28} /> Scenario Comparison
        </h1>
        <p className="page-subtitle">
          Same BOM, different supply chain conditions. Run Z.AI on both simultaneously and compare recommendations.
        </p>
      </header>

      {/* Scenario overview cards */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <ScenarioCard scenario={SCENARIO_A} />
        <ScenarioCard scenario={SCENARIO_B} />
      </div>

      {/* BOM reminder */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--bosch-dark-blue)", marginBottom: "0.5rem" }}>
          <Lightbulb size={15} color="var(--bosch-light-blue)" /> Identical BOM across both scenarios
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {[
            "SKU-A: 2×RAW-001 + 1×RAW-002 + 2×RAW-004",
            "SKU-B: 1×RAW-001 + 2×RAW-002 + 1×RAW-005",
            "SKU-C: 1×RAW-001 + 3×RAW-003 + 1×RAW-005",
            "SKU-D: 1×RAW-002 + 2×RAW-003",
          ].map((s) => (
            <span key={s} style={{ padding: "0.2rem 0.5rem", backgroundColor: "#F8F9FA", borderRadius: "4px", border: "1px solid var(--border-color)", fontFamily: "monospace" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Analyze button */}
      {!hasRun && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button className="btn btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }} onClick={handleAnalyze}>
            <GitCompare size={18} /> Analyze Both Scenarios
          </button>
          <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Z.AI will run both orchestrators in parallel and produce independent recommendations.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isCompareLoading && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ width: "20px", height: "20px", border: "3px solid #e5e7eb", borderTop: "3px solid var(--bosch-light-blue)", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <span style={{ fontWeight: 600 }}>Z.AI is analyzing both scenarios simultaneously...</span>
          </div>
          <div style={{ maxHeight: "220px", overflowY: "auto", backgroundColor: "#0f172a", borderRadius: "6px", padding: "0.75rem 1rem" }}>
            {compareStatuses.map((msg, i) => (
              <div key={i} style={{ fontSize: "0.75rem", fontFamily: "monospace", color: msg.includes("Scenario A") ? "#34d399" : msg.includes("Scenario B") ? "#f87171" : "#94a3b8", lineHeight: 1.7 }}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-run button after first run */}
      {hasRun && !isCompareLoading && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button className="btn btn-primary" onClick={handleAnalyze}>
            <GitCompare size={15} /> Re-run Comparison
          </button>
        </div>
      )}

      {/* Side-by-side results */}
      {comparison && (
        <>
          <div style={{ display: "flex", gap: "1rem" }}>
            <ResultCard label="Scenario A — Growth Mode" color={SCENARIO_A.color} result={comparison.a} />
            <ResultCard label="Scenario B — Crisis Mode"  color={SCENARIO_B.color} result={comparison.b} />
          </div>

          {/* Delta summary */}
          {!comparison.a?.error && !comparison.b?.error && (
            <div className="card" style={{ marginTop: "1rem", borderTop: "4px solid var(--bosch-light-blue)" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--bosch-dark-blue)", marginBottom: "0.75rem" }}>
                <GitCompare size={16} style={{ display: "inline", marginRight: "6px" }} />Decision Delta
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
                {[
                  {
                    label: "Quantity",
                    a: `${comparison.a.recommended_quantity?.toLocaleString()} units`,
                    b: `${comparison.b.recommended_quantity?.toLocaleString()} units`,
                    higher: comparison.b.recommended_quantity > comparison.a.recommended_quantity ? "b" : "a",
                  },
                  {
                    label: "Est. Cost",
                    a: `$${comparison.a.estimated_cost?.toLocaleString()}`,
                    b: `$${comparison.b.estimated_cost?.toLocaleString()}`,
                    higher: comparison.b.estimated_cost > comparison.a.estimated_cost ? "b" : "a",
                  },
                  {
                    label: "Delivery",
                    a: comparison.a.estimated_delivery_date ?? "TBD",
                    b: comparison.b.estimated_delivery_date ?? "TBD",
                    higher: null,
                  },
                  {
                    label: "Materials",
                    a: comparison.a.chosen_raw_materials ?? "—",
                    b: comparison.b.chosen_raw_materials ?? "—",
                    higher: null,
                  },
                ].map(({ label, a, b, higher }) => (
                  <div key={label} style={{ padding: "0.625rem", backgroundColor: "#F8F9FA", borderRadius: "6px", fontSize: "0.75rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>{label}</div>
                    <div style={{ color: SCENARIO_A.color, fontWeight: higher === "a" ? 700 : 500, marginBottom: "0.2rem" }}>A: {a}</div>
                    <div style={{ color: SCENARIO_B.color, fontWeight: higher === "b" ? 700 : 500 }}>B: {b}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Compare;
