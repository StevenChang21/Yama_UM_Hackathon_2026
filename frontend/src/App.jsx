import { useState, useEffect, useRef } from 'react';
import './index.css';

function App() {
  const [inputText, setInputText] = useState("Hey Raj, supplier says the Microcontroller V2 might be delayed to next week. Also, we just got two big orders for Premium and Standard Widgets. Should we order more raw materials?");
  const [timeline, setTimeline] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Initialize WebSocket
    ws.current = new WebSocket('ws://localhost:8000/ws/orchestrator');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setTimeline(prev => [...prev, { time: new Date().toLocaleTimeString(), message: data.message, type: 'status' }]);
      } else if (data.type === 'error') {
        setTimeline(prev => [...prev, { time: new Date().toLocaleTimeString(), message: data.message, type: 'error' }]);
        setIsProcessing(false);
      } else if (data.type === 'result') {
        setRecommendation(data.data);
        setIsProcessing(false);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setTimeline([]);
    setRecommendation(null);
    setIsProcessing(true);
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(inputText);
    } else {
      setTimeline([{ time: new Date().toLocaleTimeString(), message: 'Error: WebSocket not connected to backend. Is FastAPI running?', type: 'error' }]);
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    alert("Purchase Order and Work Order have been officially sent via integrations.");
    setRecommendation(null);
    setTimeline([]);
  };

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <div>
          <h1>Z.AI Orchestrator</h1>
          <p>Autonomous Supply Chain Decision Engine</p>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.5rem', marginBottom: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span className="pulse-dot" style={{ backgroundColor: 'var(--status-low)' }}></span>
            Z.AI Engine Online
          </span>
        </div>
      </header>

      <div className="dashboard-grid">
        
        {/* Input Area */}
        <div className="glass-card col-span-12 delay-1">
          <h2 className="card-title">Unstructured Input Ingestion</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Paste emails, WhatsApp messages, or drop documents.</p>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ 
              width: '100%', 
              height: '100px', 
              background: 'rgba(0,0,0,0.2)', 
              border: '1px solid var(--border-glass)', 
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '1rem'
            }}
          />
          <button 
            onClick={handleAnalyze}
            disabled={isProcessing}
            style={{
              background: isProcessing ? 'var(--bg-secondary)' : 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isProcessing ? 'Z.AI is analyzing...' : 'Run Z.AI Analysis'}
          </button>
        </div>

        {/* Timeline Panel */}
        <div className="glass-card col-span-4 delay-2" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <h2 className="card-title">Agent Reasoning Trace</h2>
          {timeline.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Awaiting input to begin reasoning...</p>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {timeline.map((item, i) => (
              <div key={i} style={{ 
                padding: '0.75rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderLeft: `2px solid ${item.type === 'error' ? 'var(--status-high)' : 'var(--accent-purple)'}`,
                borderRadius: '0 8px 8px 0',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>{item.time}</span>
                <span style={{ color: item.type === 'error' ? 'var(--status-high)' : 'var(--text-primary)' }}>{item.message}</span>
              </div>
            ))}
            {isProcessing && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <span className="pulse-dot" style={{ backgroundColor: 'var(--accent-purple)' }}></span>
              </div>
            )}
          </div>
        </div>

        {/* Human-in-the-loop Panel */}
        <div className="glass-card col-span-8 delay-3">
          <h2 className="card-title">Recommendation & Drafts</h2>
          
          {!recommendation ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No recommendation generated yet.
            </div>
          ) : (
            <div className="animation-fade-in">
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div>
                  <h3 style={{ color: 'var(--status-low)', marginBottom: '0.5rem' }}>Action Recommended</h3>
                  <p>Order <strong>{recommendation.recommended_quantity}</strong> units of <strong>{recommendation.chosen_raw_materials}</strong> from <strong>{recommendation.chosen_supplier}</strong>.</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Est. Cost: ${recommendation.estimated_cost} | ETA: {recommendation.estimated_delivery_date}</p>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Z.AI Justification (Cross-SKU Check)</h3>
                <p style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {recommendation.justification}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Draft Purchase Order</h3>
                  <pre style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#a1a1aa' }}>
                    {recommendation.drafts.purchase_order}
                  </pre>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Draft RFQ Email</h3>
                  <pre style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#a1a1aa' }}>
                    {recommendation.drafts.rfq_email}
                  </pre>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                <button style={{ padding: '0.5rem 1.5rem', background: 'transparent', border: '1px solid var(--status-high)', color: 'var(--status-high)', borderRadius: '6px', cursor: 'pointer' }}>Reject</button>
                <button style={{ padding: '0.5rem 1.5rem', background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Edit Drafts</button>
                <button onClick={handleApprove} style={{ padding: '0.5rem 2rem', background: 'var(--status-low)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Approve & Send</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
