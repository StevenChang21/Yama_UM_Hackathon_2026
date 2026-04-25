import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Inputs from "./pages/Inputs";
import Recommendations from "./pages/Recommendations";
import History from "./pages/History";
import Suppliers from "./pages/Suppliers";
import AuditLog from "./pages/AuditLog";
import ControlCentre from "./pages/ControlCentre";
import Preferences from "./pages/Preferences";
import "./pages/Preferences.css";
import { MockDataProvider } from "./context/MockDataContext";
import "./index.css";

function App() {
  return (
    <MockDataProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inputs" element={<Inputs />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/history" element={<History />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/control-centre" element={<ControlCentre />} />
              <Route path="/preferences" element={<Preferences />} />
            </Routes>
          </main>
        </div>
      </Router>
    </MockDataProvider>
  );
}

export default App;
