import React from 'react';
import { useMockData } from '../context/MockDataContext';
import { History as HistoryIcon, Clock } from 'lucide-react';

const History = () => {
  const { history } = useMockData();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Recommendation History</h1>
        <p className="page-subtitle">Past AI recommendations and planning decisions.</p>
      </header>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>
          <HistoryIcon size={20} /> Decision Log
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No history available yet. Generate a recommendation to see it here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map((item, index) => (
              <div key={index} style={{
                padding: '1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: item.decision === 'RESTOCK & PRODUCE' ? '#FFFAEB' : '#F8F9FA'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: item.decision === 'RESTOCK & PRODUCE' ? 'var(--bosch-red)' : 'var(--bosch-green)' 
                    }}>
                      {item.decision}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} /> {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {item.explanation}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{item.recommendedQuantity} units</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Prod. Quantity</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
