import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import AuditLog from "./pages/AuditLog";
import ControlCentre from "./pages/ControlCentre";
import Preferences from "./pages/Preferences";
import "./pages/Preferences.css";
import { DataProvider } from "./context/DataContext";
import "./index.css";

function App() {
  return (
    <DataProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/control-centre" element={<ControlCentre />} />
              <Route path="/preferences" element={<Preferences />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;
