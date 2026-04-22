import React from "react";
import { useMockData } from "../context/useMockData";
import { PackageSearch, AlertTriangle, CheckCircle } from "lucide-react";
const Inventory = () => {
  const { inventory, bom, sales, manufacturing } = useMockData();
  const getStatusBadge = (status) => {
    switch (status) {
      case "safe":
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} style={{ marginRight: "4px" }} /> Safe
          </span>
        );
      case "low":
        return (
          <span className="badge badge-warning">
            <AlertTriangle size={12} style={{ marginRight: "4px" }} /> Low
          </span>
        );
      case "critical":
        return (
          <span className="badge badge-danger">
            <AlertTriangle size={12} style={{ marginRight: "4px" }} /> Critical
          </span>
        );
      default:
        return null;
    }
  };
  const renderTable = (items, title) => (
    <div className="card" style={{ marginBottom: "2rem" }}>
      {" "}
      <h3 className="card-title" style={{ marginBottom: "1.5rem" }}>
        {" "}
        <PackageSearch size={20} /> {title}{" "}
      </h3>{" "}
      <div className="table-wrapper">
        {" "}
        <table className="table">
          {" "}
          <thead>
            {" "}
            <tr>
              {" "}
              <th>ID</th> <th>Name</th> <th>Current Stock</th> <th>Reorder Point</th>
              <th>Lead Time (days)</th> <th>Cost per unit</th> <th>Status</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {items.map((item) => (
              <tr
                key={item.id}
                style={{
                  backgroundColor:
                    item.status === "critical" ? "#FFF5F6" : "transparent",
                }}
              >
                {" "}
                <td style={{ fontWeight: 500 }}>{item.id}</td>{" "}
                <td>{item.name}</td>{" "}
                <td
                  style={{
                    fontWeight: 600,
                    color:
                      item.status === "critical"
                        ? "var(--bosch-red)"
                        : "inherit",
                  }}
                >
                  {" "}
                  {item.quantity}{" "}
                </td>{" "}
                <td>{item.threshold}</td>
                <td>{item.leadTime}</td>
                <td>{item.costPerUnit}</td>
                <td>{getStatusBadge(item.status)}</td>
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </div>
  );

  const renderBomTable = (bomItems) => {
    if (!bomItems || bomItems.length === 0) return null;
    return (
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 className="card-title" style={{ marginBottom: "1.5rem" }}>
          <PackageSearch size={20} /> Bill of Materials (BOM)
        </h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Parent SKU</th>
                <th>Required Component</th>
                <th>Quantity Required</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.map((item, idx) => (
                <tr key={`${item.parent_id}-${item.child_id}-${idx}`}>
                  <td style={{ fontWeight: 500 }}>{item.parent_id}</td>
                  <td>{item.child_id}</td>
                  <td style={{ fontWeight: 600 }}>{item.qty_required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDemandStockTable = (salesItems, manufacturingItems, finishedGoods) => {
  if (!salesItems || salesItems.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h3 className="card-title" style={{ marginBottom: "1.5rem" }}>
        <PackageSearch size={20} /> Demand vs Stock
      </h3>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Current Stock</th>
              <th>Demand</th>
              <th>Pending Production</th>
              <th>Available After Production</th>
              <th>Gap</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {salesItems.map((sale, idx) => {
              const stockItem = finishedGoods.find((item) => item.id === sale.sku);
              const manufacturingItem = manufacturingItems.find(
                (item) => item.sku === sale.sku
              );

              const currentStock = stockItem ? stockItem.quantity : 0;
              const demand = sale.qty ?? sale.quantity ?? 0;
              const pendingProduction = manufacturingItem
                ? manufacturingItem.pending_units ?? manufacturingItem.planned_units ?? 0
                : 0;

              const availableAfterProduction = currentStock + pendingProduction;
              const gap = availableAfterProduction - demand;

              let status = "Enough";
              if (gap < 0) status = "Shortage";
              else if (gap <= 10) status = "Tight";

              return (
                <tr key={`${sale.sku}-${idx}`}>
                  <td style={{ fontWeight: 500 }}>{sale.sku}</td>
                  <td>{currentStock}</td>
                  <td>{demand}</td>
                  <td>{pendingProduction}</td>
                  <td>{availableAfterProduction}</td>
                  <td
                    style={{
                      fontWeight: 600,
                      color: gap < 0 ? "var(--bosch-red)" : "inherit",
                    }}
                  >
                    {gap}
                  </td>
                  <td>
                    <span
                      className={
                        gap < 0
                          ? "badge badge-danger"
                          : gap <= 10
                          ? "badge badge-warning"
                          : "badge badge-success"
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

  return (
    <div>
      {" "}
      <header className="page-header">
        {" "}
        <h1 className="page-title">Inventory Management</h1>{" "}
        <p className="page-subtitle">
          Monitor stock levels, thresholds, and shortages.
        </p>{" "}
      </header>{" "}
      {renderTable(inventory.rawMaterials, "Raw Materials")}{" "}
      {renderTable(inventory.finishedGoods, "Finished Goods")}
      {renderBomTable(bom)}
      {renderDemandStockTable(sales, manufacturing, inventory.finishedGoods)}
    </div>
  );
};
export default Inventory;
