import React, { useEffect } from 'react';
import { useMockData } from '../context/MockDataContext';
import { Lightbulb, AlertCircle, PackageCheck, Truck, DollarSign } from 'lucide-react';
import AlertBanner from '../components/AlertBanner';

const Recommendations = () => {
  const { recommendation, inputs, updateInputs } = useMockData();

  useEffect(() => {
    // Generate an initial recommendation on mount if there isn't one
    if (!recommendation) {
      updateInputs(inputs);
    }
  }, []);

  if (!recommendation) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">AI Recommendations</h1>
          <p className="page-subtitle">Actionable insights based on your planning inputs.</p>
        </header>
        <AlertBanner type="info" message="Loading recommendations..." />
      </div>
    );
  }

  const isRestock = recommendation.decision === 'RESTOCK & PRODUCE';

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">AI Recommendations</h1>
        <p className="page-subtitle">Actionable insights based on your planning inputs.</p>
      </header>

      <div className="card" style={{ 
        borderTop: `4px solid ${isRestock ? 'var(--bosch-yellow)' : 'var(--bosch-green)'}`,
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div className="card-title">
              <Lightbulb size={24} color={isRestock ? 'var(--bosch-yellow)' : 'var(--bosch-green)'} />
              Recommended Decision
            </div>
            <h2 style={{ fontSize: '2rem', color: isRestock ? 'var(--bosch-red)' : 'var(--bosch-green)', margin: 0 }}>
              {recommendation.decision}
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Generated at</div>
            <div style={{ fontWeight: 500 }}>{new Date(recommendation.timestamp).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#F8F9FA', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> Explanation
          </h4>
          <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {recommendation.explanation}
          </p>
        </div>

        <div className="grid-cols-4">
          <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg-color)' }}>
            <div className="card-title" style={{ fontSize: '1rem' }}><PackageCheck size={18} /> Finished Goods</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{recommendation.recommendedQuantity} units</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target Production</div>
          </div>
          
          <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg-color)' }}>
            <div className="card-title" style={{ fontSize: '1rem' }}><Truck size={18} /> Supplier</div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{recommendation.supplier}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{recommendation.transport}</div>
          </div>

          <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg-color)' }}>
            <div className="card-title" style={{ fontSize: '1rem' }}><DollarSign size={18} /> Est. Cost</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>${recommendation.estimatedCost.toLocaleString()}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Procurement Cost</div>
          </div>

          <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg-color)' }}>
             <div className="card-title" style={{ fontSize: '1rem' }}>Raw Materials</div>
             {recommendation.rawMaterialsNeeded.length > 0 ? (
               <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--bosch-red)', fontWeight: 500 }}>
                 {recommendation.rawMaterialsNeeded.map((rm, i) => (
                   <li key={i}>{rm.quantity} {rm.unit} {rm.name}</li>
                 ))}
               </ul>
             ) : (
               <div style={{ color: 'var(--bosch-green)', fontWeight: 500 }}>Sufficient</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
