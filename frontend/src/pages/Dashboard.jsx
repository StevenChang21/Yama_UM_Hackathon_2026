import React from 'react';
import { useMockData } from '../context/MockDataContext';
import SummaryCard from '../components/SummaryCard';
import AlertBanner from '../components/AlertBanner';
import { Package, TrendingUp, Cpu, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Dashboard = () => {
  const { inventory, inputs } = useMockData();

  const getLowStockItems = () => {
    return [
      ...inventory.rawMaterials.filter(item => item.status === 'low' || item.status === 'critical'),
      ...inventory.finishedGoods.filter(item => item.status === 'low' || item.status === 'critical')
    ];
  };

  const lowStockItems = getLowStockItems();
  
  // Mock chart data
  const productionData = [
    { name: 'Jan', drill: 400, mower: 240 },
    { name: 'Feb', drill: 300, mower: 139 },
    { name: 'Mar', drill: 200, mower: 480 },
    { name: 'Apr', drill: 278, mower: 390 },
    { name: 'May', drill: 189, mower: 480 },
    { name: 'Jun', drill: 239, mower: 380 },
  ];

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Real-time production and inventory status.</p>
      </header>

      {lowStockItems.length > 0 && (
        <AlertBanner 
          type="danger" 
          title="Critical Inventory Alerts" 
          message={`${lowStockItems.length} item(s) are below safe thresholds. Check inventory page for details.`} 
        />
      )}

      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <SummaryCard 
          title="Demand Forecast" 
          value={inputs.demandForecast} 
          subtitle="Units next month"
          icon={<TrendingUp size={24} />}
          trend={12}
        />
        <SummaryCard 
          title="Prod. Capacity" 
          value={inputs.productionCapacity} 
          subtitle="Max units/month"
          icon={<Cpu size={24} />}
          colorClass="green"
        />
        <SummaryCard 
          title="Budget" 
          value={`$${inputs.budget.toLocaleString()}`} 
          subtitle="Available for allocation"
          icon={<DollarSign size={24} />}
        />
        <SummaryCard 
          title="Finished Goods" 
          value={inventory.finishedGoods.reduce((acc, item) => acc + item.quantity, 0)} 
          subtitle="Total items in stock"
          icon={<Package size={24} />}
          trend={-5}
        />
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3 className="card-title">Production Output Trend</h3>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E2E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: 'var(--bosch-light-blue)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="drill" name="Smart Drills" stroke="var(--bosch-red)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="mower" name="Robotic Mowers" stroke="var(--bosch-dark-blue)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Inventory Levels Overview</h3>
          <div style={{ height: '300px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory.rawMaterials.slice(0,4)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E2E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#F8F9FA'}} />
                <Bar dataKey="quantity" name="Current Stock" fill="var(--bosch-light-blue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="threshold" name="Min Threshold" fill="var(--bosch-gray-300)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
