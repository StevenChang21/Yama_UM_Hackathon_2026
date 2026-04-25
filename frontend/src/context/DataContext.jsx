import React, { createContext, useState, useEffect, useRef } from "react";

const DataContext = createContext();

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

export const DataProvider = ({ children }) => {
  const [inventory, setInventory] = useState({ rawMaterials: [], finishedGoods: [] });
  const [inputs, setInputs] = useState({ budget: 0 });
  const [recommendation, setRecommendation] = useState(null);
  const [history, setHistory] = useState([]);
  const [bom, setBom] = useState([]);
  const [sales, setSales] = useState([]);
  const [manufacturing, setManufacturing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState([]);
  const lastAlertCountRef = useRef(0);

  // The snapshot timestamp the AI will use when querying data
  const [analysisAsOfDate, setAnalysisAsOfDate] = useState("2026-04-23 08:00");

  useEffect(() => {
    async function fetchData() {
      try {
        const [bomRes, finRes, invRes, , manRes, salRes] = await Promise.all([
          fetch("http://localhost:8000/api/bom"),
          fetch("http://localhost:8000/api/finance"),
          fetch("http://localhost:8000/api/inventory"),
          fetch("http://localhost:8000/api/logistics"),
          fetch("http://localhost:8000/api/manufacturing"),
          fetch("http://localhost:8000/api/sales"),
        ]);
        const invData = await invRes.json();
        const finData = await finRes.json();
        const bomData = await bomRes.json();
        const salData = await salRes.json();
        const manData = await manRes.json();

        setInventory(transformInventory(invData));
        setBom(bomData);
        setSales(salData);
        setManufacturing(manData);

        if (Array.isArray(finData)) {
          const opCash = finData.find((item) => item.account_name === "Operating Cash");
          if (opCash) setInputs((prev) => ({ ...prev, budget: opCash.balance_usd }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateInputs = (newInputs) => {
    setInputs(newInputs);
  };

  const generateAIRecommendation = (inputText) => {
    setIsAILoading(true);
    setAiStatus("Connecting to Agent...");
    setError(null);

    let didReceiveResult = false;
    let ws;

    const connectionTimeout = setTimeout(() => {
      if (!didReceiveResult) {
        setError("Connection timed out. Make sure the backend server is running on localhost:8000.");
        setIsAILoading(false);
        try { ws.close(); } catch (_) { }
      }
    }, 15000);

    try {
      ws = new WebSocket("ws://localhost:8000/ws/orchestrator");
    } catch (err) {
      clearTimeout(connectionTimeout);
      setError("Failed to create WebSocket connection. Is the backend server running?");
      setIsAILoading(false);
      return;
    }

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      setAiStatus("Connected. Sending input to Z.AI...");
      // Send JSON envelope so the backend knows which time snapshot to use
      ws.send(JSON.stringify({ prompt: inputText, as_of_date: analysisAsOfDate }));
    };

    ws.onmessage = (event) => {
      let response;
      try {
        response = JSON.parse(event.data);
      } catch (parseErr) {
        setError("Received invalid response from server.");
        setIsAILoading(false);
        ws.close();
        return;
      }

      if (response.type === "status") {
        setAiStatus(response.message);
      } else if (response.type === "result") {
        didReceiveResult = true;
        const newRec = {
          timestamp: new Date().toISOString(),
          asOfDate: analysisAsOfDate,
          decision: response.data.recommended_quantity > 0 ? "RESTOCK & PRODUCE" : "MAINTAIN STOCK",
          recommendedQuantity: response.data.recommended_quantity,
          rawMaterialsNeeded: response.data.chosen_raw_materials
            ? [{ name: response.data.chosen_raw_materials, quantity: response.data.recommended_quantity, unit: "units" }]
            : [],
          supplier: response.data.chosen_supplier || "N/A",
          transport: "Standard",
          estimatedCost: response.data.estimated_cost || 0,
          explanation: response.data.justification,
          estimatedDeliveryDate: response.data.estimated_delivery_date,
          drafts: response.data.drafts || {},
        };
        setRecommendation(newRec);
        setHistory((prev) => [newRec, ...prev]);
        setIsAILoading(false);
        ws.close();
      } else if (response.type === "error") {
        setError(response.message || "An error occurred during orchestration.");
        setIsAILoading(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      clearTimeout(connectionTimeout);
      if (!didReceiveResult) {
        setError("WebSocket connection failed. Make sure the backend server is running (uvicorn main:app --reload).");
        setIsAILoading(false);
      }
    };

    ws.onclose = () => {
      clearTimeout(connectionTimeout);
      if (!didReceiveResult) setIsAILoading(false);
    };
  };

  useEffect(() => {
    const pollEmails = async () => {
      // Don't trigger if the AI is already processing something
      if (isAILoading) return;

      try {
        const res = await fetch("http://localhost:8000/api/emails/alerts");
        const alerts = await res.json();

        if (alerts && Array.isArray(alerts) && alerts.length > lastAlertCountRef.current) {
          console.log(`[Email Poller] New emails detected! Previous count: ${lastAlertCountRef.current}, New count: ${alerts.length}`);
          lastAlertCountRef.current = alerts.length;
          setEmailAlerts(alerts);

          // Auto-trigger the AI to analyze the new situation
          generateAIRecommendation(
            "New emails have arrived in the inbox. Please check them using get_unread_emails and update your recommendations based on the latest supply chain context."
          );
        }
      } catch (err) {
        console.error("[Email Poller] Failed to check for new emails:", err);
      }
    };

    // Poll every 10 seconds
    const interval = setInterval(pollEmails, 10000);
    // Initial check on load
    pollEmails();

    return () => clearInterval(interval);
  }, [isAILoading]);

  return (
    <DataContext.Provider
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
        analysisAsOfDate,
        setAnalysisAsOfDate,
        generateAIRecommendation,
        emailAlerts,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataContext };
