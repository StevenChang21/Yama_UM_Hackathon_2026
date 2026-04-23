import { useMockData } from "../context/useMockData";
import {
  Lightbulb,
  AlertCircle,
  PackageCheck,
  Truck,
  DollarSign,
  FileText,
  Calendar
} from "lucide-react";
import AlertBanner from "../components/AlertBanner";

const Recommendations = () => {
  const { recommendation, isAILoading, aiStatus, error } = useMockData();

  if (isAILoading) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">AI Orchestrator</h1>
          <p className="page-subtitle">
            Agentic workflow in progress...
          </p>
        </header>
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
           <div className="spinner" style={{ margin: "0 auto 1rem auto", width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid var(--bosch-light-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
           <style>{`
             @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
           `}</style>
           <h3>Z.AI is analyzing your supply chain</h3>
           <p style={{ color: "var(--bosch-light-blue)", fontWeight: "bold" }}>{aiStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">AI Recommendations</h1>
          <p className="page-subtitle">
            Something went wrong during orchestration.
          </p>
        </header>
        <AlertBanner
          type="danger"
          title="Connection Error"
          message={error}
        />
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <a href="/inputs" className="btn btn-primary" style={{ textDecoration: "none" }}>
            ← Back to Inputs
          </a>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">AI Recommendations</h1>
          <p className="page-subtitle">
            Actionable insights based on your planning inputs.
          </p>
        </header>
        <AlertBanner type="info" title="No Recommendation Yet" message="Go to the Planning Inputs page to fill in your data and generate a recommendation." />
        <div style={{ marginTop: "1rem" }}>
          <a href="/inputs" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Go to Inputs
          </a>
        </div>
      </div>
    );
  }

  const isRestock = recommendation.decision === "RESTOCK & PRODUCE";

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">AI Recommendations</h1>
        <p className="page-subtitle">
          Actionable insights based on your planning inputs.
        </p>
      </header>

      <div
        className="card"
        style={{
          borderTop: `4px solid ${isRestock ? "var(--bosch-yellow)" : "var(--bosch-green)"}`,
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "2rem",
          }}
        >
          <div>
            <div className="card-title">
              <Lightbulb
                size={24}
                color={isRestock ? "var(--bosch-yellow)" : "var(--bosch-green)"}
              />
              Recommended Decision
            </div>
            <h2
              style={{
                fontSize: "2rem",
                color: isRestock ? "var(--bosch-red)" : "var(--bosch-green)",
                margin: 0,
              }}
            >
              {recommendation.decision}
            </h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Generated at
            </div>
            <div style={{ fontWeight: 500 }}>
              {new Date(recommendation.timestamp).toLocaleString()}
            </div>
            {recommendation.asOfDate && (
              <>
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  Data as of
                </div>
                <div style={{ fontWeight: 600, color: "var(--bosch-light-blue)" }}>
                  {recommendation.asOfDate}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#F8F9FA",
            borderRadius: "var(--radius-md)",
            marginBottom: "2rem",
            border: "1px solid var(--border-color)",
          }}
        >
          <h4
            style={{
              margin: "0 0 0.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={16} /> Explanation
          </h4>
          <p
            style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.6 }}
          >
            {recommendation.explanation}
          </p>
        </div>

        <div className="grid-cols-4">
          <div
            className="card"
            style={{ boxShadow: "none", backgroundColor: "var(--bg-color)" }}
          >
            <div className="card-title" style={{ fontSize: "1rem" }}>
              <PackageCheck size={18} /> Finished Goods
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {recommendation.recommendedQuantity} units
            </div>
            <div
              style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
            >
              Target Production
            </div>
          </div>

          <div
            className="card"
            style={{ boxShadow: "none", backgroundColor: "var(--bg-color)" }}
          >
            <div className="card-title" style={{ fontSize: "1rem" }}>
              <Truck size={18} /> Supplier
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {recommendation.supplier}
            </div>
            <div
              style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}
            >
              <Calendar size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Delivery: {recommendation.estimatedDeliveryDate || "TBD"}
            </div>
          </div>

          <div
            className="card"
            style={{ boxShadow: "none", backgroundColor: "var(--bg-color)" }}
          >
            <div className="card-title" style={{ fontSize: "1rem" }}>
              <DollarSign size={18} /> Est. Cost
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              ${recommendation.estimatedCost.toLocaleString()}
            </div>
            <div
              style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
            >
              Procurement Cost
            </div>
          </div>

          <div
            className="card"
            style={{ boxShadow: "none", backgroundColor: "var(--bg-color)" }}
          >
            <div className="card-title" style={{ fontSize: "1rem" }}>
              Raw Materials
            </div>
            {recommendation.rawMaterialsNeeded.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1rem",
                  color: "var(--bosch-red)",
                  fontWeight: 500,
                }}
              >
                {recommendation.rawMaterialsNeeded.map((rm, i) => (
                  <li key={i}>
                    {rm.quantity} {rm.unit} {rm.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "var(--bosch-green)", fontWeight: 500 }}>
                Sufficient
              </div>
            )}
          </div>
        </div>
        
        {/* Render drafts if they exist */}
        {recommendation.drafts && Object.keys(recommendation.drafts).length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={20} color="var(--bosch-light-blue)" /> Generated Drafts
            </h4>
            <div className="grid-cols-2" style={{ gap: "1rem" }}>
              {Object.entries(recommendation.drafts).map(([key, content]) => (
                <div key={key} className="card" style={{ backgroundColor: "#F8F9FA", border: "1px solid var(--border-color)", boxShadow: "none" }}>
                  <div className="card-title" style={{ textTransform: "capitalize", fontSize: "1rem", color: "var(--bosch-dark-blue)" }}>
                    {key.replace("_", " ")}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", fontFamily: "inherit", color: "var(--text-primary)", margin: 0 }}>
                    {content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
