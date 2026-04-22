import React from "react";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";

const AlertBanner = ({ type = "warning", message, title }) => {
  const getStyles = () => {
    switch (type) {
      case "danger":
        return {
          bg: "#FCE6E8",
          border: "var(--bosch-red)",
          icon: <AlertTriangle color="var(--bosch-red)" />,
        };
      case "success":
        return {
          bg: "#E6F3EC",
          border: "var(--bosch-green)",
          icon: <CheckCircle color="var(--bosch-green)" />,
        };
      case "info":
        return {
          bg: "#E6F6F9",
          border: "var(--bosch-light-blue)",
          icon: <Info color="var(--bosch-light-blue)" />,
        };
      case "warning":
      default:
        return {
          bg: "#FFF8E6",
          border: "var(--bosch-yellow)",
          icon: <AlertTriangle color="#B38200" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        backgroundColor: styles.bg,
        borderLeft: `4px solid ${styles.border}`,
        padding: "1rem",
        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
        display: "flex",
        alignItems: "flex-start",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ marginTop: "0.125rem" }}>{styles.icon}</div>
      <div>
        {title && (
          <h4
            style={{
              margin: "0 0 0.25rem 0",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h4>
        )}
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--text-primary)",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default AlertBanner;
