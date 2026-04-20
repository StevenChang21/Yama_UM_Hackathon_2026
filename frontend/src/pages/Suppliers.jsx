import React from 'react';
import { Truck, Star, Clock, ShieldCheck } from 'lucide-react';

const Suppliers = () => {
  const suppliers = [
    { id: 'S001', name: 'Bosch Preferred Supplier A', reliability: 98, speed: 'Fast (2 days)', costLevel: '$$$', type: 'Raw Materials' },
    { id: 'S002', name: 'Global Tech Components', reliability: 85, speed: 'Medium (5 days)', costLevel: '$$', type: 'Microcontrollers' },
    { id: 'S003', name: 'EuroPlastics Inc.', reliability: 92, speed: 'Standard (7 days)', costLevel: '$', type: 'Casings' },
    { id: 'S004', name: 'FastTrack Logistics', reliability: 95, speed: 'Express (1 day)', costLevel: '$$$$', type: 'Transport Only' },
  ];

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Supplier Network</h1>
        <p className="page-subtitle">Compare and manage component suppliers and logistics partners.</p>
      </header>

      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
           <div className="card-title"><ShieldCheck size={20} /> Active Partners</div>
           <div style={{ fontSize: '2rem', fontWeight: 700 }}>24</div>
        </div>
        <div className="card">
           <div className="card-title"><Clock size={20} /> Avg Delivery Time</div>
           <div style={{ fontSize: '2rem', fontWeight: 700 }}>3.2 Days</div>
        </div>
        <div className="card">
           <div className="card-title"><Star size={20} /> Top Rated</div>
           <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.5rem' }}>Supplier A</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>
          <Truck size={20} /> Supplier Comparison Directory
        </div>
        
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Reliability Score</th>
                <th>Delivery Speed</th>
                <th>Cost Level</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td style={{ fontWeight: 500 }}>{supplier.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{supplier.name}</td>
                  <td>{supplier.type}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '100px', 
                        height: '8px', 
                        backgroundColor: 'var(--bosch-gray-200)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${supplier.reliability}%`, 
                          height: '100%', 
                          backgroundColor: supplier.reliability > 90 ? 'var(--bosch-green)' : 'var(--bosch-yellow)' 
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.875rem' }}>{supplier.reliability}%</span>
                    </div>
                  </td>
                  <td>{supplier.speed}</td>
                  <td style={{ fontWeight: 600 }}>{supplier.costLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
