import React from "react";

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = "primary",
}) => {
  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div className="card-title">
            {icon && (
              <span
                style={{
                  color: `var(--bosch-${colorClass === "primary" ? "dark-blue" : colorClass})`,
                }}
              >
                {icon}
              </span>
            )}
            {title}
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.25rem",
            }}
          >
            {value}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {subtitle}
          </div>
        </div>
        {trend !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              borderRadius: "99px",
              backgroundColor: trend > 0 ? "#E6F3EC" : "#FCE6E8",
              color: trend > 0 ? "var(--bosch-green)" : "var(--bosch-red)",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
