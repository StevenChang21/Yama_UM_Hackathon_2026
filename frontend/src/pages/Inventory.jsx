import React from 'react';
import { useMockData } from '../context/MockDataContext';
import { PackageSearch, AlertTriangle, CheckCircle } from 'lucide-react';

const Inventory = () => {
  const { inventory } = useMockData();

  const getStatusBadge = (status) => {
    switch(status) {
      case 'safe': return <span className="badge badge-success"><CheckCircle size={12} style={{marginRight: '4px'}}/> Safe</span>;
      case 'low': return <span className="badge badge-warning"><AlertTriangle size={12} style={{marginRight: '4px'}}/> Low</span>;
      case 'critical': return <span className="badge badge-danger"><AlertTriangle size={12} style={{marginRight: '4px'}}/> Critical</span>;
      default: return null;
    }
  };

  const renderTable = (items, title) => (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
        <PackageSearch size={20} /> {title}
      </h3>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Min. Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ backgroundColor: item.status === 'critical' ? '#FFF5F6' : 'transparent' }}>
                <td style={{ fontWeight: 500 }}>{item.id}</td>
                <td>{item.name}</td>
                <td style={{ fontWeight: 600, color: item.status === 'critical' ? 'var(--bosch-red)' : 'inherit' }}>
                  {item.quantity}
                </td>
                <td>{item.unit}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{item.threshold}</td>
                <td>{getStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">Monitor stock levels, thresholds, and shortages.</p>
      </header>

      {renderTable(inventory.rawMaterials, 'Raw Materials')}
      {renderTable(inventory.finishedGoods, 'Finished Goods')}
    </div>
  );
};

export default Inventory;
