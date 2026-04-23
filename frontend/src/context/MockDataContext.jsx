import React, { createContext, useState, useEffect } from "react";

// central data provider for the whole web app
const MockDataContext = createContext();

function transformInventory(data) {
  return {
    rawMaterials: data
      .filter((item) => item.id.startsWith("RAW"))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.current_stock,
        threshold: item.reorder_point,
        leadTime: item.supplier_lead_time_days,
        costPerUnit: item.cost_per_unit,
        status:
          item.risk_level === "High"
            ? "critical"
            : item.risk_level === "Medium"
            ? "low"
            : "safe",
              })),

    finishedGoods: data
      .filter((item) => item.id.startsWith("SKU"))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.current_stock,
        threshold: item.reorder_point,
        leadTime: item.supplier_lead_time_days,
        costPerUnit: item.cost_per_unit,
        status:
          item.risk_level === "High"
            ? "critical"
            : item.risk_level === "Medium"
            ? "low"
            : "safe",
              })),
          };
}

export const MockDataProvider = ({ children }) => {
  const [inventory, setInventory] = useState({
    rawMaterials: [],
    finishedGoods: [],
  });

  const [inputs, setInputs] = useState({
    demandForecast: 0,
    productionCapacity: 0,
    budget: 0,
    salesNotes: "",
    supplierNotes: "",
    logisticsNotes: "",
  });

  const [recommendation, setRecommendation] = useState(null);
  const [history, setHistory] = useState([]);
  const [bom, setBom] = useState([]);
  const [sales, setSales] = useState([]);
  const [manufacturing, setManufacturing] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New state for AI orchestrator WebSocket
  const [aiStatus, setAiStatus] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bomRes, finRes, invRes, logRes, manRes, salRes] = await Promise.all([
          fetch("http://localhost:8000/api/bom"),
          fetch("http://localhost:8000/api/finance"),
          fetch("http://localhost:8000/api/inventory"),
          fetch("http://localhost:8000/api/logistics"),
          fetch("http://localhost:8000/api/manufacturing"),
          fetch("http://localhost:8000/api/sales")
        ]);
        
        const invData = await invRes.json();
        const finData = await finRes.json();
        const bomData = await bomRes.json();
        const logData = await logRes.json();
        const manData = await manRes.json();
        const salData = await salRes.json();
    
        const transformed = transformInventory(invData);
        setInventory(transformed);
        setBom(bomData);
        setSales(salData);
        setManufacturing(manData);

        if (Array.isArray(finData)) {
          const opCash = finData.find(item => item.account_name === "Operating Cash");
          if (opCash) {
            setInputs(prev => ({ ...prev, budget: opCash.balance_usd }));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const generateRecommendation = (newInputs) => {
    const drillStock =
      inventory.finishedGoods.find((item) => item.id === "SKU-A")?.quantity ||
      0;
    const needsRestock = drillStock < newInputs.demandForecast;

    const newRec = {
      timestamp: new Date().toISOString(),
      decision: needsRestock ? "RESTOCK & PRODUCE" : "MAINTAIN STOCK",
      recommendedQuantity: Math.max(0, newInputs.demandForecast - drillStock),
      rawMaterialsNeeded: [],
      supplier: "Bosch Standard Suppliers",
      transport: needsRestock ? "Air Freight" : "Standard",
      estimatedCost: 500,
      explanation: `Based on demand forecast of ${newInputs.demandForecast} and current stock of ${drillStock}.`,
    };

    setRecommendation(newRec);
    setHistory((prev) => [newRec, ...prev]);
  };

  const updateInputs = (newInputs) => {
    setInputs(newInputs);
    // Removed automatic mock recommendation generation
  };

  const generateAIRecommendation = (inputText) => {
    setIsAILoading(true);
    setAiStatus("Connecting to Agent...");
    setError(null);

    const ws = new WebSocket("ws://localhost:8000/ws/orchestrator");

    ws.onopen = () => {
      ws.send(inputText);
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === "status") {
        setAiStatus(response.message);
      } else if (response.type === "result") {
        const newRec = {
          timestamp: new Date().toISOString(),
          decision: response.data.recommended_quantity > 0 ? "RESTOCK & PRODUCE" : "MAINTAIN STOCK",
          recommendedQuantity: response.data.recommended_quantity,
          rawMaterialsNeeded: response.data.chosen_raw_materials ? [{ name: response.data.chosen_raw_materials, quantity: response.data.recommended_quantity, unit: "units" }] : [],
          supplier: response.data.chosen_supplier || "N/A",
          transport: "Standard",
          estimatedCost: response.data.estimated_cost || 0,
          explanation: response.data.justification,
          estimatedDeliveryDate: response.data.estimated_delivery_date,
          drafts: response.data.drafts || {}
        };
        setRecommendation(newRec);
        setHistory((prev) => [newRec, ...prev]);
        setIsAILoading(false);
        ws.close();
      } else if (response.type === "error") {
        setError(response.message);
        setIsAILoading(false);
        ws.close();
      }
    };

    ws.onerror = (err) => {
      setError("WebSocket connection failed.");
      setIsAILoading(false);
      ws.close();
    };
  };

  return (
    <MockDataContext.Provider
      value={{
        inventory,
        loading,
        error,
        inputs,
        updateInputs,
        recommendation,
        history,
        bom,
        sales,
        manufacturing,
        aiStatus,
        isAILoading,
        generateAIRecommendation,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
};

export { MockDataContext };
