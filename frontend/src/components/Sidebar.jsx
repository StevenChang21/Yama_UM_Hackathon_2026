import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PackageSearch,
  FileEdit,
  Lightbulb,
  GitCompare,
  History,
  Truck,
} from "lucide-react";

const Sidebar = () => {
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: <PackageSearch size={20} />,
    },
    { name: "Planning Inputs", path: "/inputs", icon: <FileEdit size={20} /> },
    {
      name: "Recommendations",
      path: "/recommendations",
      icon: <Lightbulb size={20} />,
    },
    {
      name: "Scenario Compare",
      path: "/compare",
      icon: <GitCompare size={20} />,
    },
    { name: "History", path: "/history", icon: <History size={20} /> },
    { name: "Suppliers", path: "/suppliers", icon: <Truck size={20} /> },
  ];

  return (
    <aside
      style={{
        width: "260px",
        backgroundColor: "var(--bosch-dark-blue)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: "2rem 0",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "0 2rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Simple Mock Logo using Bosch brand colors */}
        <div
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "var(--bosch-red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            borderRadius: "4px",
          }}
        >
          B
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            color: "white",
            margin: 0,
            fontWeight: 700,
          }}
        >
          what nameee
        </h2>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0 1rem",
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              color: isActive ? "white" : "var(--bosch-gray-300)",
              backgroundColor: isActive
                ? "rgba(255, 255, 255, 0.1)"
                : "transparent",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              transition: "all 0.2s ease",
            })}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "0 2rem",
          opacity: 0.5,
          fontSize: "0.75rem",
        }}
      >
        <p>Hackathon Demo V1</p>
      </div>
    </aside>
  );
};

export default Sidebar;
