import { useState } from "react";
import { useMockData } from "../context/useMockData";
import { FileEdit, Save, Clock, Mail, ShoppingCart, Factory, Package, Truck, ChevronDown, ChevronRight, Layers } from "lucide-react";
import AlertBanner from "../components/AlertBanner";
import { useNavigate } from "react-router-dom";

// ── Inventory snapshots at each checkpoint (full state, not just deltas) ──────
const INV = {
  RAW_ITEMS: [
    { id: "RAW-001", name: "Microcontroller V2", reorder: 300 },
    { id: "RAW-002", name: "Steel Housing",      reorder: 400 },
    { id: "RAW-003", name: "Copper Winding Coil",reorder: 500 },
    { id: "RAW-004", name: "Tempered Glass Panel",reorder: 400 },
    { id: "RAW-005", name: "Circuit Board Assy", reorder: 200 },
  ],
  SKU_ITEMS: [
    { id: "SKU-A", name: "Premium Control Module", reorder: 150 },
    { id: "SKU-B", name: "Standard Control Module",reorder: 100 },
    { id: "SKU-C", name: "Industrial Sensor Pack", reorder: 100 },
    { id: "SKU-D", name: "Compact Drive Unit",     reorder:  50 },
  ],
};

// Stock levels keyed by checkpoint value
const INVENTORY_SNAPSHOTS = {
  "2026-04-14 09:15": { "RAW-001":700,"RAW-002":900,"RAW-003":1500,"RAW-004":600,"RAW-005":500,"SKU-A":0,"SKU-B":0,"SKU-C":0,"SKU-D":0 },
  "2026-04-16 14:30": { "RAW-001":700,"RAW-002":900,"RAW-003":1500,"RAW-004":600,"RAW-005":500,"SKU-A":0,"SKU-B":0,"SKU-C":0,"SKU-D":0 },
  "2026-04-18 10:00": { "RAW-001":580,"RAW-002":880,"RAW-003":1500,"RAW-004":600,"RAW-005":490,"SKU-A":30,"SKU-B":45,"SKU-C":20,"SKU-D":0 },
  "2026-04-20 09:00": { "RAW-001":580,"RAW-002":880,"RAW-003":1500,"RAW-004":600,"RAW-005":490,"SKU-A":30,"SKU-B":45,"SKU-C":20,"SKU-D":0 },
  "2026-04-21 08:00": { "RAW-001":120,"RAW-002":820,"RAW-003":280,"RAW-004":150,"RAW-005":420,"SKU-A":30,"SKU-B":45,"SKU-C":20,"SKU-D":0 },
  "2026-04-22 13:00": { "RAW-001":120,"RAW-002":800,"RAW-003":80,"RAW-004":150,"RAW-005":390,"SKU-A":30,"SKU-B":45,"SKU-C":20,"SKU-D":0 },
  "2026-04-23 08:00": { "RAW-001":120,"RAW-002":800,"RAW-003":0,"RAW-004":150,"RAW-005":370,"SKU-A":30,"SKU-B":45,"SKU-C":50,"SKU-D":0 },
};

// ── Bill of Materials (static — BOM never changes in this scenario) ──────────
const BOM_DATA = [
  { sku: "SKU-A", name: "Premium Control Module", materials: [
    { id: "RAW-001", name: "Microcontroller V2",    qtyPer: 2 },
    { id: "RAW-002", name: "Steel Housing",         qtyPer: 1 },
    { id: "RAW-004", name: "Tempered Glass Panel",  qtyPer: 2 },
  ]},
  { sku: "SKU-B", name: "Standard Control Module", materials: [
    { id: "RAW-001", name: "Microcontroller V2",    qtyPer: 1 },
    { id: "RAW-002", name: "Steel Housing",         qtyPer: 2 },
    { id: "RAW-005", name: "Circuit Board Assy",    qtyPer: 1 },
  ]},
  { sku: "SKU-C", name: "Industrial Sensor Pack", materials: [
    { id: "RAW-001", name: "Microcontroller V2",    qtyPer: 1 },
    { id: "RAW-003", name: "Copper Winding Coil",   qtyPer: 3 },
    { id: "RAW-005", name: "Circuit Board Assy",    qtyPer: 1 },
  ]},
  { sku: "SKU-D", name: "Compact Drive Unit", materials: [
    { id: "RAW-002", name: "Steel Housing",         qtyPer: 1 },
    { id: "RAW-003", name: "Copper Winding Coil",   qtyPer: 2 },
  ]},
];

// ── Structured checkpoint data ───────────────────────────────────────────────
const CHECKPOINTS = [
  {
    label: "Apr 14 · 09:15", value: "2026-04-14 09:15",
    description: "Initial AutoParts order — healthy baseline, no crisis yet",
    delta: {
      emails: [
        { id: "MSG-001", from: "procurement@autopartscorp.com", subject: "Purchase Order ORD-101 & ORD-102 Confirmation", body: "Dear YamaTech Sales Team, please find our confirmed purchase orders for Q2.\n\nORD-101: 300 units of SKU-A (Premium Control Module)\nORD-102: 200 units of SKU-B (Standard Control Module)\n\nBoth due by May 5th 2026 for our Kuala Lumpur assembly line. Please confirm receipt and production schedule." },
      ],
      orders: [
        { id: "ORD-101", customer: "AutoParts Corp",  sku: "SKU-A", qty: 300, dueDate: "May 5",  action: "New order" },
        { id: "ORD-102", customer: "AutoParts Corp",  sku: "SKU-B", qty: 200, dueDate: "May 5",  action: "New order" },
      ],
      wos: [
        { id: "WO-001", sku: "SKU-A", qty: 80,  status: "In Progress", note: "Started production Apr 14. Consuming RAW-001 and RAW-004." },
        { id: "WO-003", sku: "SKU-B", qty: 200, status: "Planned", note: "Planned for ORD-102 original qty" },
      ],
      inventoryMovements: [],
    },
  },
  {
    label: "Apr 16 · 14:30", value: "2026-04-16 14:30",
    description: "NexGen Robotics order placed + RAW-003 global shortage warning",
    delta: {
      emails: [
        { id: "MSG-002", from: "orders@nexgenrobotics.io", subject: "New Order — SKU-C and SKU-D for Pilot Deployment", body: "Hi YamaTech team, we are kicking off our pilot deployment across 3 factory sites.\n\nORD-104: 150 units of SKU-C (Industrial Sensor Pack)\nORD-105: 100 units of SKU-D (Compact Drive Unit)\n\nRequired by May 10th. Delivery quality and timeliness is critical — we present results to investors in mid-May." },
        { id: "MSG-003", from: "alerts@fastcompmetals.com", subject: "SUPPLY ALERT: Global Copper Winding Coil Shortage", body: "Dear Valued Customer, significant tightening in the global supply of Copper Winding Coil (RAW-003) due to port disruptions in SE Asia and a mine closure in Chile.\n\nCurrent global stock is limited to ~600 units. We anticipate a 15–25% price increase effective May 1st.\n\nStrongly advise placing orders before April 28th to lock in $8.75/unit. Quantities are first-come, first-served." },
      ],
      orders: [
        { id: "ORD-104", customer: "NexGen Robotics", sku: "SKU-C", qty: 150, dueDate: "May 10", action: "New order" },
        { id: "ORD-105", customer: "NexGen Robotics", sku: "SKU-D", qty: 100, dueDate: "May 10", action: "New order" },
      ],
      wos: [
        { id: "WO-002", sku: "SKU-C", qty: 120, status: "Planned", note: "Scheduled after ORD-104 confirmed" },
      ],
      inventoryMovements: [],
    },
  },
  {
    label: "Apr 18 · 10:00", value: "2026-04-18 10:00",
    description: "AutoParts bumps SKU-A to 500 — RAW-001 RFQ sent to GlobalTech",
    delta: {
      emails: [
        { id: "MSG-004", from: "procurement@autopartscorp.com", subject: "Order Revision Request — ORD-101 SKU-A Quantity Increase", body: "Hi, we have just secured a downstream contract with a Tier-1 automotive manufacturer.\n\nPlease revise ORD-101 from 300 → 500 units of SKU-A. The May 5th due date remains unchanged.\n\nWe are prepared to pay a 5% expedite premium if needed. ORD-102 (200× SKU-B) remains as-is." },
        { id: "MSG-005", from: "inventory@yamatech.com", subject: "RFQ — Microcontroller V2 (RAW-001) Urgent Restock", body: "Dear GlobalTech Components, we require an urgent quote for Microcontroller V2 (RAW-001). We now need approximately 1,200–1,400 units.\n\nPlease provide pricing for:\n• Standard delivery (14-day)\n• Expedited delivery\n\nWe need delivery no later than April 30th to meet May 5th commitments." },
      ],
      orders: [
        { id: "ORD-101", customer: "AutoParts Corp", sku: "SKU-A", qty: 500, dueDate: "May 5", action: "Revised ↑ from 300" },
      ],
      wos: [],
      inventoryMovements: ["RAW-001: 700→580 (WO-001 consumption)","RAW-002: 900→880 (WO-001 consumption)","RAW-005: 500→490 (WO-001 consumption)","SKU-A FG: 0→30 (completed units)","SKU-B FG: 0→45 (completed units)","SKU-C FG: 0→20 (completed units)"],
    },
  },
  {
    label: "Apr 20 · 09:00", value: "2026-04-20 09:00",
    description: "GlobalTech quotes RAW-001 (expedited 6-day) + NexGen revises SKU-C to 250",
    delta: {
      emails: [
        { id: "MSG-006", from: "sales@globaltech-components.com", subject: "RE: RFQ — Microcontroller V2 (RAW-001)", body: "Dear YamaTech Procurement, we can confirm availability of up to 1,400 units of Microcontroller V2.\n\nPricing:\n• Standard 14-day delivery: $15.50/unit (arrives ~May 2)\n• Expedited air freight 6-day: $16.50/unit (arrives ~Apr 26)\n\nMinimum order: 500 units. Cut-off for expedited orders is 3pm today.\n\nTotal for 1,400 units expedited: $23,100. Please confirm PO number to proceed." },
        { id: "MSG-007", from: "orders@nexgenrobotics.io", subject: "Order Amendment — Increase SKU-C Quantity", body: "Hello YamaTech, we received early approval to expand the pilot to a fourth factory site.\n\nPlease increase ORD-104 from 150 → 250 units of SKU-C. May 10th deadline still holds. ORD-105 (100× SKU-D) is unchanged.\n\nPlease confirm the updated order is accepted." },
      ],
      orders: [
        { id: "ORD-104", customer: "NexGen Robotics", sku: "SKU-C", qty: 250, dueDate: "May 10", action: "Revised ↑ from 150" },
      ],
      wos: [],
      inventoryMovements: [],
    },
  },
  {
    label: "Apr 21 · 08:00", value: "2026-04-21 08:00",
    description: "RAW-001 hits 120 (critical). WO-003 blocked. RAW-004 OOS at PrimeMaterials.",
    delta: {
      emails: [
        { id: "MSG-008", from: "production@yamatech.com", subject: "URGENT: RAW-001 Stock Critical — Production at Risk", body: "Hi Inventory team, as of this morning RAW-001 (Microcontroller V2) is down to 120 units.\n\nWO-001 (SKU-A, 80 units) will deplete it by end of day tomorrow. WO-003 (SKU-B) cannot start until new RAW-001 arrives.\n\nRAW-003 (Copper Winding Coil) is also dropping fast — currently at 280 units.\n\nIf we do not receive a confirmed PO for RAW-001 and RAW-003 by end of week we will miss both the May 5th and May 10th deadlines." },
        { id: "MSG-009", from: "noreply@primematerials.com", subject: "RE: Tempered Glass Panel (RAW-004) — Out of Stock Notice", body: "Dear YamaTech, our stock of Tempered Glass Panel (RAW-004) is fully depleted. We do not expect replenishment until late May due to our furnace being taken offline for repairs.\n\nWe suggest contacting ClearTech Glass Supply who produces a compatible SKU-A-grade panel with a 10–12 day lead time." },
      ],
      orders: [],
      wos: [
        { id: "WO-002", sku: "SKU-C", qty: 120, status: "In Progress — Slowed", note: "Slowed due to RAW-003 availability concerns" },
        { id: "WO-003", sku: "SKU-B", qty: 0,   status: "Blocked — Awaiting RAW-001", note: "Cannot start. RAW-001 fully allocated to WO-001." },
      ],
      inventoryMovements: ["RAW-001: 580→120 ⚠ CRITICAL","RAW-002: 880→820","RAW-003: 1500→280 ⚠ LOW","RAW-004: 600→150 ⚠ LOW (supplier OOS)","RAW-005: 490→420"],
      logistics: ["Receiving Dock A → Under Maintenance until Apr 25"],
    },
  },
  {
    label: "Apr 22 · 13:00", value: "2026-04-22 13:00",
    description: "AutoParts final revision. FastComp offers only 600 of 1,150 needed RAW-003.",
    delta: {
      emails: [
        { id: "MSG-010", from: "inventory@yamatech.com", subject: "RFQ — Copper Winding Coil (RAW-003) Emergency Order", body: "Dear FastComp Metals, following your supply alert on April 16th we need to place an urgent order for Copper Winding Coil (RAW-003). We require approximately 1,000–1,200 units.\n\nCan you confirm:\n1. Units available at current price of $8.75/unit before the May 1st increase?\n2. Delivery lead time\n\nProduction runs are blocked. Please respond urgently." },
        { id: "MSG-011", from: "procurement@autopartscorp.com", subject: "Second Order Revision — SKU-B Reduction and SKU-D Addition", body: "Hi YamaTech team, our engineering team has decided to substitute 100 units of SKU-B with SKU-D for a new assembly variant.\n\nPlease revise:\n• ORD-102 (SKU-B): reduce from 200 → 100 units\n• New ORD-103 (SKU-D): 100 units\n\nMay 5th deadline applies to all three lines. This is the final revision." },
        { id: "MSG-012", from: "sales@fastcompmetals.com", subject: "RE: RFQ RAW-003 — Partial Allocation Available", body: "Dear YamaTech Procurement, due to the global shortage we can only allocate 600 units of Copper Winding Coil at $8.75/unit (delivery in 8 days, arriving ~April 30th).\n\nThe remaining 400–600 units would be available after May 15th at ~$10.50/unit.\n\nWe recommend confirming the 600-unit allocation today to secure it." },
      ],
      orders: [
        { id: "ORD-102", customer: "AutoParts Corp", sku: "SKU-B", qty: 100, dueDate: "May 5", action: "Revised ↓ from 200" },
        { id: "ORD-103", customer: "AutoParts Corp", sku: "SKU-D", qty: 100, dueDate: "May 5", action: "New order (replaces 100× SKU-B)" },
      ],
      wos: [
        { id: "WO-004", sku: "SKU-D", qty: 100, status: "Planned", note: "Planned for ORD-103. Requires RAW-002 and RAW-003." },
      ],
      inventoryMovements: ["RAW-003: 280→80 ⚠ CRITICAL","RAW-002: 820→800"],
      logistics: ["Truck Fleet A → Busy (Penang run) until Apr 27"],
    },
  },
  {
    label: "Apr 23 · 08:00", value: "2026-04-23 08:00",
    description: "Full crisis: WO-002 halted, RAW-003 = 0, 2 of 4 work orders stopped.",
    delta: {
      emails: [
        { id: "MSG-013", from: "production@yamatech.com", subject: "Production Floor Daily Update — Apr 23 Morning", body: "Good morning. Daily status:\n\n• WO-001 (SKU-A, 80 units): Still running, ETA Apr 26.\n• WO-002 (SKU-C): HALTED — RAW-003 hit zero overnight. Completed 50 of 120 planned units.\n• WO-003 (SKU-B): Still blocked, no RAW-001 available.\n• WO-004 (SKU-D): Not started — RAW-002 and RAW-003 both below safe threshold.\n\nUrgently need confirmed POs for RAW-001 (1,200+ units), RAW-003 (870+ units), and RAW-004 (850+ units)." },
      ],
      orders: [],
      wos: [
        { id: "WO-002", sku: "SKU-C", qty: 50, status: "Halted — RAW-003 Exhausted",       note: "Stopped at 50/120 units. RAW-003 = 0." },
        { id: "WO-004", sku: "SKU-D", qty: 0,  status: "Not Started — Awaiting Materials", note: "Both RAW-002 and RAW-003 below threshold." },
      ],
      inventoryMovements: ["RAW-003: 80→0 🔴 ZERO","RAW-005: 390→370","SKU-C FG: 20→50 (partial WO-002)"],
      logistics: ["Cold Storage B → Occupied until May 3"],
    },
  },
];

// ── Build cumulative state up to a given checkpoint index ────────────────────
function buildCumulative(upToIndex) {
  const emails = [];
  const orders = {};
  const wos = {};
  const logistics = {};

  for (let i = 0; i <= upToIndex; i++) {
    const { delta } = CHECKPOINTS[i];
    if (delta.emails)    delta.emails.forEach((e) => emails.push(e));
    if (delta.orders)    delta.orders.forEach((o) => { orders[o.id] = o; });
    if (delta.wos)       delta.wos.forEach((w) => { wos[w.id] = w; });
    if (delta.logistics) delta.logistics.forEach((l) => { logistics[l.split("→")[0].trim()] = l; });
  }

  return {
    emails,
    orders: Object.values(orders),
    wos: Object.values(wos),
    logistics: Object.values(logistics),
  };
}

// ── Accordion row ─────────────────────────────────────────────────────────────
function AccordionItem({ summary, detail, tag, tagColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: "6px", border: "1px solid var(--border-color)", overflow: "hidden", marginBottom: "0.375rem" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.625rem", background: open ? "rgba(0,120,200,0.05)" : "white", border: "none", cursor: "pointer", textAlign: "left" }}>
        {open ? <ChevronDown size={13} color="var(--bosch-light-blue)" /> : <ChevronRight size={13} color="var(--text-secondary)" />}
        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{summary}</span>
        {tag && (
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: "999px", backgroundColor: tagColor || "#e5f0ff", color: "white", whiteSpace: "nowrap" }}>
            {tag}
          </span>
        )}
      </button>
      {open && (
        <div style={{ padding: "0.625rem 0.875rem 0.75rem 1.75rem", backgroundColor: "#FAFBFC", borderTop: "1px solid var(--border-color)" }}>
          <pre style={{ margin: 0, fontSize: "0.6875rem", fontFamily: "inherit", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {detail}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function PreviewSection({ icon: Icon, title, count, children, emptyLabel, isEmpty }) {
  return (
    <div style={{ padding: "0.75rem", backgroundColor: "#F8F9FA", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: isEmpty ? "0.25rem" : "0.625rem" }}>
        <Icon size={13} /> {title}
        {!isEmpty && count != null && <span style={{ fontWeight: 400, color: "var(--bosch-light-blue)" }}>({count})</span>}
      </div>
      {isEmpty
        ? <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 500 }}>{emptyLabel || "No changes"}</span>
        : children}
    </div>
  );
}

// ── Inventory stock level table ───────────────────────────────────────────────
function stockStatus(stock, reorder) {
  if (stock === 0)          return { label: "ZERO",     bg: "#fef2f2", text: "#dc2626", bar: "#dc2626" };
  if (stock <= reorder)     return { label: "CRITICAL", bg: "#fef3c7", text: "#b45309", bar: "#f59e0b" };
  if (stock <= reorder * 1.5) return { label: "LOW",   bg: "#eff6ff", text: "#2563eb", bar: "#3b82f6" };
  return                           { label: "OK",       bg: "#f0fdf4", text: "#16a34a", bar: "#22c55e" };
}

function InventoryTable({ snapshotKey }) {
  const snap = INVENTORY_SNAPSHOTS[snapshotKey];

  return (
    <div>
      {/* Raw materials */}
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", marginBottom: "0.375rem", textTransform: "uppercase" }}>Raw Materials</div>
      {INV.RAW_ITEMS.map(({ id, name, reorder }) => {
        const stock = snap[id] ?? 0;
        const { label, bg, text, bar } = stockStatus(stock, reorder);
        const pct = Math.min(100, Math.round((stock / (reorder * 2.5)) * 100));
        return (
          <div key={id} style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-primary)" }}>{id} · {name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>{stock} / {reorder} reorder</span>
                <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "4px", backgroundColor: bg, color: text }}>{label}</span>
              </div>
            </div>
            <div style={{ height: "5px", borderRadius: "3px", backgroundColor: "#e5e7eb", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, backgroundColor: bar, borderRadius: "3px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        );
      })}

      {/* Finished goods */}
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", margin: "0.75rem 0 0.375rem", textTransform: "uppercase" }}>Finished Goods</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem" }}>
        {INV.SKU_ITEMS.map(({ id, name, reorder }) => {
          const stock = snap[id] ?? 0;
          const { label, bg, text } = stockStatus(stock, reorder);
          return (
            <div key={id} style={{ padding: "0.375rem 0.5rem", borderRadius: "6px", backgroundColor: bg, border: `1px solid ${text}22` }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: text }}>{id}</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginBottom: "0.125rem" }}>{name}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: text }}>{stock} <span style={{ fontSize: "0.625rem", fontWeight: 400 }}>units</span></div>
              <div style={{ fontSize: "0.625rem", color: text, fontWeight: 600 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WO status colour ─────────────────────────────────────────────────────────
function woStatusColor(status = "") {
  const s = status.toLowerCase();
  if (s.includes("halted") || s.includes("exhausted")) return "#dc2626";
  if (s.includes("blocked") || s.includes("not started") || s.includes("awaiting")) return "#f59e0b";
  if (s.includes("in progress")) return "#3b82f6";
  return "#6b7280";
}

// ── BOM feasibility panel ────────────────────────────────────────────────────
function BomSection({ snapshotKey }) {
  const snap = INVENTORY_SNAPSHOTS[snapshotKey];
  return (
    <div>
      {BOM_DATA.map((entry) => {
        const issues = entry.materials.filter(({ id }) => {
          const meta = INV.RAW_ITEMS.find((r) => r.id === id);
          return meta && (snap[id] ?? 0) <= meta.reorder;
        });
        const hasZero = issues.some(({ id }) => (snap[id] ?? 0) === 0);
        const tagColor = issues.length > 0 ? (hasZero ? "#dc2626" : "#f59e0b") : "#22c55e";
        const tagLabel = issues.length > 0 ? `${issues.length} shortage${issues.length > 1 ? "s" : ""}` : "Feasible";
        const detail = entry.materials.map(({ id, name, qtyPer }) => {
          const stock = snap[id] ?? 0;
          const meta = INV.RAW_ITEMS.find((r) => r.id === id);
          const { label } = stockStatus(stock, meta?.reorder ?? 0);
          return `${id} · ${name}:  ${qtyPer}/unit · Stock: ${stock.toLocaleString()}  [${label}]`;
        }).join("\n");
        return (
          <AccordionItem key={entry.sku} summary={`${entry.sku} · ${entry.name}`}
            tag={tagLabel} tagColor={tagColor} detail={detail} />
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
const Inputs = () => {
  const { inputs, updateInputs, generateAIRecommendation, analysisAsOfDate, setAnalysisAsOfDate } = useMockData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(inputs);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(6);
  const [viewMode, setViewMode] = useState("cumulative");

  const handleSliderChange = (e) => {
    const idx = Number(e.target.value);
    setSliderIndex(idx);
    setAnalysisAsOfDate(CHECKPOINTS[idx].value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitized = { ...formData, demandForecast: Number(formData.demandForecast) || 0, productionCapacity: Number(formData.productionCapacity) || 0, budget: Number(formData.budget) || 0 };
    updateInputs(sanitized);
    const promptText = `Please analyze our supply chain as of ${analysisAsOfDate}.
Our current demand forecast is ${sanitized.demandForecast} units.
Production capacity is ${sanitized.productionCapacity} units/month.
Our budget is $${sanitized.budget}.
Sales Notes: ${sanitized.salesNotes}
Supplier Notes: ${sanitized.supplierNotes}
Logistics Notes: ${sanitized.logisticsNotes}
What is your recommendation?`;
    generateAIRecommendation(promptText);
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); navigate("/recommendations"); }, 1500);
  };

  const cp = CHECKPOINTS[sliderIndex];
  const cum = buildCumulative(sliderIndex);

  // Delta shorthand
  const delta = cp.delta;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Planning Inputs</h1>
        <p className="page-subtitle">Update forecasts, capacities, and notes to generate recommendations.</p>
      </header>

      {showSuccess && <AlertBanner type="success" title="Success" message="Inputs saved! Launching AI analysis..." />}

      {/* ── Timeline selector ── */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-title" style={{ marginBottom: "0.75rem" }}>
          <Clock size={20} /> Simulate Analysis As Of
        </div>
        <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Drag the slider to a point in the crisis timeline. The AI will only see data that existed up to that moment.
        </p>

        <div style={{ marginBottom: "0.5rem" }}>
          <input type="range" min={0} max={6} step={1} value={sliderIndex} onChange={handleSliderChange}
            style={{ width: "100%", accentColor: "var(--bosch-light-blue)", cursor: "pointer" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          {CHECKPOINTS.map((c, i) => (
            <button key={c.value} type="button" onClick={() => { setSliderIndex(i); setAnalysisAsOfDate(c.value); }}
              style={{ background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer", fontSize: "0.6875rem", fontWeight: i === sliderIndex ? 700 : 400, color: i === sliderIndex ? "var(--bosch-light-blue)" : "var(--text-secondary)", textAlign: "center", lineHeight: 1.3, maxWidth: "80px" }}>
              {c.label.replace(" · ", "\n")}
            </button>
          ))}
        </div>

        <div style={{ padding: "0.875rem 1rem", backgroundColor: "rgba(0,120,200,0.06)", borderRadius: "8px", borderLeft: "3px solid var(--bosch-light-blue)", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--bosch-dark-blue)", marginBottom: "0.25rem" }}>{cp.label}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{cp.description}</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginRight: "0.25rem" }}>Show:</span>
          {["cumulative", "delta"].map((mode) => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)}
              style={{ padding: "0.3125rem 0.875rem", borderRadius: "999px", border: `2px solid ${viewMode === mode ? "var(--bosch-light-blue)" : "var(--border-color)"}`, backgroundColor: viewMode === mode ? "var(--bosch-light-blue)" : "transparent", color: viewMode === mode ? "white" : "var(--text-primary)", fontWeight: viewMode === mode ? 600 : 400, fontSize: "0.8125rem", cursor: "pointer", transition: "all 0.15s ease" }}>
              {mode === "cumulative" ? "Cumulative (all info up to now)" : "Delta (new at this step only)"}
            </button>
          ))}
        </div>

        {/* Preview grid — top row: emails + orders, then WOs + inventory, then logistics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>

          {/* Emails */}
          {(() => {
            const items = viewMode === "cumulative" ? cum.emails : delta.emails;
            return (
              <PreviewSection icon={Mail} title="Emails" count={items.length} isEmpty={items.length === 0} emptyLabel="No new emails">
                {items.map((e) => (
                  <AccordionItem key={e.id} summary={`${e.id} · ${e.subject}`} detail={`From: ${e.from}\n\n${e.body}`} />
                ))}
              </PreviewSection>
            );
          })()}

          {/* Orders */}
          {(() => {
            const items = viewMode === "cumulative" ? cum.orders : delta.orders;
            return (
              <PreviewSection icon={ShoppingCart} title="Orders" count={items.length} isEmpty={items.length === 0} emptyLabel="No order changes">
                {items.map((o) => (
                  <AccordionItem key={o.id} summary={`${o.id} · ${o.customer} · ${o.sku}`}
                    tag={`${o.qty} units`} tagColor="var(--bosch-light-blue)"
                    detail={`Customer:  ${o.customer}\nSKU:       ${o.sku}\nQuantity:  ${o.qty} units\nDue date:  ${o.dueDate}\nAction:    ${o.action}`} />
                ))}
              </PreviewSection>
            );
          })()}

          {/* Work Orders */}
          {(() => {
            const items = viewMode === "cumulative" ? cum.wos : delta.wos;
            return (
              <PreviewSection icon={Factory} title="Work Orders" count={items.length} isEmpty={items.length === 0} emptyLabel="No WO changes">
                {items.map((w) => (
                  <AccordionItem key={w.id} summary={`${w.id} · ${w.sku} · ${w.status}`}
                    tag={`${w.qty} units`} tagColor={woStatusColor(w.status)}
                    detail={`Work Order: ${w.id}\nSKU:        ${w.sku}\nTarget qty: ${w.qty} units\nStatus:     ${w.status}\nNote:       ${w.note}`} />
                ))}
              </PreviewSection>
            );
          })()}

          {/* Inventory — always shows full snapshot in cumulative; movements in delta */}
          <PreviewSection icon={Package} title="Inventory Levels" isEmpty={false}
            count={viewMode === "delta" ? (delta.inventoryMovements?.length ?? 0) : null}>
            {viewMode === "cumulative"
              ? <InventoryTable snapshotKey={cp.value} />
              : delta.inventoryMovements?.length > 0
                ? <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.8 }}>
                    {delta.inventoryMovements.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                : <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 500 }}>No stock changes at this step</span>
            }
          </PreviewSection>

          {/* Logistics */}
          {(() => {
            const items = viewMode === "cumulative" ? cum.logistics : (delta.logistics ?? []);
            return (
              <PreviewSection icon={Truck} title="Logistics" count={items.length} isEmpty={items.length === 0} emptyLabel="No logistics changes">
                <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.8 }}>
                  {items.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </PreviewSection>
            );
          })()}

          {/* BOM feasibility — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <PreviewSection icon={Layers} title="Bill of Materials — Production Feasibility" isEmpty={false}>
              <BomSection snapshotKey={cp.value} />
            </PreviewSection>
          </div>

        </div>
      </div>

      {/* ── Input parameters form ── */}
      <form className="card" onSubmit={handleSubmit}>
        <div className="card-title" style={{ marginBottom: "1.5rem" }}>
          <FileEdit size={20} /> Input Parameters
        </div>
        <div className="grid-cols-3">
          <div className="form-group">
            <label className="form-label">Demand Forecast (units)</label>
            <input type="number" className="form-control" name="demandForecast" value={formData.demandForecast} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Production Capacity (units/month)</label>
            <input type="number" className="form-control" name="productionCapacity" value={formData.productionCapacity} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Budget ($)</label>
            <input type="number" className="form-control" name="budget" value={formData.budget} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid-cols-3">
          <div className="form-group">
            <label className="form-label">Sales Notes</label>
            <textarea className="form-control" name="salesNotes" value={formData.salesNotes} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Notes</label>
            <textarea className="form-control" name="supplierNotes" value={formData.supplierNotes} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Logistics Notes</label>
            <textarea className="form-control" name="logisticsNotes" value={formData.logisticsNotes} onChange={handleChange} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Analyze as of {cp.label}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Inputs;
