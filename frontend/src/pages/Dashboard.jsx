import React from "react";
import { useData } from "../context/useData";
import SummaryCard from "../components/SummaryCard";
import AlertBanner from "../components/AlertBanner";
import { Package, TrendingUp, Cpu, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const Dashboard = () => {
  const { inventory, inputs, manufacturing } = useData();

  const getLowStockItems = () => {
    return [
      ...inventory.rawMaterials.filter(
        (item) => item.status === "low" || item.status === "critical",
      ),
      ...inventory.finishedGoods.filter(
        (item) => item.status === "low" || item.status === "critical",
      ),
    ];
  };

  const lowStockItems = getLowStockItems();

  const productionData = React.useMemo(() => {
    if (!manufacturing) return [];
    
    // Group pending_units by sku
    const aggregated = manufacturing.reduce((acc, curr) => {
      // Only count units that are pending
      if (curr.pending_units > 0) {
        const existing = acc.find(item => item.name === curr.sku);
        if (existing) {
          existing.units += curr.pending_units;
        } else {
          acc.push({ name: curr.sku, units: curr.pending_units });
        }
      }
      return acc;
    }, []);
    
    return aggregated;
  }, [manufacturing]);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">
          Real-time production and inventory status.
        </p>
      </header>

      {lowStockItems.length > 0 && (
        <AlertBanner
          type="danger"
          title="Critical Inventory Alerts"
          message={`${lowStockItems.length} item(s) are below safe thresholds.`}
        />
      )}

      <div className="grid-cols-2" style={{ marginBottom: "2rem" }}>
        <SummaryCard
          title="Budget"
          value={`$${inputs.budget.toLocaleString()}`}
          subtitle="Available for allocation"
          icon={<DollarSign size={24} />}
        />
        <SummaryCard
          title="Finished Goods"
          value={inventory.finishedGoods.reduce(
            (acc, item) => acc + item.quantity,
            0,
          )}
          subtitle="Total items in stock"
          icon={<Package size={24} />}
          trend={-5}
        />
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3 className="card-title">Current Production Status</h3>
          <div style={{ height: "300px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E0E2E5"
                />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F8F9FA" }} />
                <Bar
                  dataKey="units"
                  name="Pending Units"
                  fill="var(--bosch-red)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Inventory Levels Overview</h3>
          <div style={{ height: "300px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory.rawMaterials.slice(0, 4)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E0E2E5"
                />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#F8F9FA" }} />
                <Bar
                  dataKey="quantity"
                  name="Current Stock"
                  fill="var(--bosch-light-blue)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="threshold"
                  name="Min Threshold"
                  fill="var(--bosch-gray-300)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
