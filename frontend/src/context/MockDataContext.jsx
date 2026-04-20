import React, { createContext, useState, useContext } from 'react';

const MockDataContext = createContext();

export const useMockData = () => useContext(MockDataContext);

export const MockDataProvider = ({ children }) => {
  // Initial Mock State
  const [inventory, setInventory] = useState({
    rawMaterials: [
      { id: 'RM001', name: 'Steel Sheets', quantity: 450, unit: 'kg', threshold: 500, status: 'low' },
      { id: 'RM002', name: 'Microcontrollers', quantity: 1200, unit: 'pcs', threshold: 300, status: 'safe' },
      { id: 'RM003', name: 'Plastic Casings', quantity: 150, unit: 'pcs', threshold: 200, status: 'critical' },
      { id: 'RM004', name: 'Copper Wire', quantity: 850, unit: 'm', threshold: 500, status: 'safe' },
    ],
    finishedGoods: [
      { id: 'FG001', name: 'Bosch Smart Drill', quantity: 85, unit: 'pcs', threshold: 100, status: 'low' },
      { id: 'FG002', name: 'Robotic Lawnmower', quantity: 45, unit: 'pcs', threshold: 30, status: 'safe' },
      { id: 'FG003', name: 'Sensor Module X', quantity: 500, unit: 'pcs', threshold: 400, status: 'safe' },
    ]
  });

  const [inputs, setInputs] = useState({
    demandForecast: 150, // units needed next month
    productionCapacity: 200, // units can be produced
    budget: 50000,
    salesNotes: 'Expecting high demand for Smart Drills next quarter.',
    supplierNotes: 'Supplier A is delayed by 2 weeks.',
    logisticsNotes: 'Standard shipping only.'
  });

  const [recommendation, setRecommendation] = useState(null);
  const [history, setHistory] = useState([]);

  // Mock AI Logic to generate recommendation based on inputs and inventory
  const generateRecommendation = (newInputs) => {
    // Basic logic
    const drillStock = inventory.finishedGoods.find(item => item.id === 'FG001').quantity;
    const steelStock = inventory.rawMaterials.find(item => item.id === 'RM001').quantity;
    
    const needsRestock = drillStock < newInputs.demandForecast;
    const shortfall = Math.max(0, newInputs.demandForecast - drillStock);
    const recommendedProduction = Math.min(shortfall * 1.2, newInputs.productionCapacity); // buffer of 20%
    
    const steelNeeded = recommendedProduction * 2.5; // 2.5kg per drill
    const needsRawMaterial = steelStock < steelNeeded;

    const newRec = {
      timestamp: new Date().toISOString(),
      decision: needsRestock ? 'RESTOCK & PRODUCE' : 'MAINTAIN STOCK',
      recommendedQuantity: Math.round(recommendedProduction),
      rawMaterialsNeeded: needsRawMaterial ? [
        { name: 'Steel Sheets', quantity: Math.round(steelNeeded - steelStock), unit: 'kg' }
      ] : [],
      supplier: needsRawMaterial ? 'Bosch Preferred Supplier B (Fast Track)' : 'N/A',
      transport: needsRawMaterial ? 'Air Freight (Expedited)' : 'Standard',
      estimatedCost: needsRawMaterial ? Math.round((steelNeeded - steelStock) * 15 + 500) : 0, // mock cost logic
      explanation: needsRestock 
        ? `Demand forecast (${newInputs.demandForecast}) exceeds current stock (${drillStock}). Initiating production. ` + 
          (needsRawMaterial ? `Raw materials (Steel) are insufficient. Expedited delivery selected due to supplier delays noted.` : `Sufficient raw materials on hand.`)
        : `Current stock (${drillStock}) is sufficient to meet forecasted demand (${newInputs.demandForecast}). No immediate action required.`
    };

    setRecommendation(newRec);
    setHistory(prev => [newRec, ...prev]);
  };

  const updateInputs = (newInputs) => {
    setInputs(newInputs);
    generateRecommendation(newInputs);
  };

  return (
    <MockDataContext.Provider value={{ inventory, inputs, updateInputs, recommendation, history }}>
      {children}
    </MockDataContext.Provider>
  );
};
