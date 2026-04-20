import React, { useState } from 'react';
import { useMockData } from '../context/MockDataContext';
import { FileEdit, Save } from 'lucide-react';
import AlertBanner from '../components/AlertBanner';

const Inputs = () => {
  const { inputs, updateInputs } = useMockData();
  const [formData, setFormData] = useState(inputs);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateInputs(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Planning Inputs</h1>
        <p className="page-subtitle">Update forecasts, capacities, and notes to generate recommendations.</p>
      </header>

      {showSuccess && (
        <AlertBanner type="success" title="Success" message="Inputs saved successfully! Recommendations have been updated." />
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>
          <FileEdit size={20} /> Input Parameters
        </div>

        <div className="grid-cols-3">
          <div className="form-group">
            <label className="form-label">Demand Forecast (units)</label>
            <input 
              type="number" 
              className="form-control" 
              name="demandForecast" 
              value={formData.demandForecast} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Production Capacity (units/month)</label>
            <input 
              type="number" 
              className="form-control" 
              name="productionCapacity" 
              value={formData.productionCapacity} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Budget ($)</label>
            <input 
              type="number" 
              className="form-control" 
              name="budget" 
              value={formData.budget} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="grid-cols-3">
          <div className="form-group">
            <label className="form-label">Sales Notes</label>
            <textarea 
              className="form-control" 
              name="salesNotes" 
              value={formData.salesNotes} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Notes</label>
            <textarea 
              className="form-control" 
              name="supplierNotes" 
              value={formData.supplierNotes} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Logistics Notes</label>
            <textarea 
              className="form-control" 
              name="logisticsNotes" 
              value={formData.logisticsNotes} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save & Generate Recommendation
          </button>
        </div>
      </form>
    </div>
  );
};

export default Inputs;
