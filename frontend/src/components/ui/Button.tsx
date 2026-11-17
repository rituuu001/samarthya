import type React from "react";

export function PinkButton({
  children,
  onClick,
  fullWidth,
  small,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#D4537E",
        color: "#ffffff",
        border: "none",
        borderRadius: "10px",
        padding: small ? "7px 18px" : "12px 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        transition: "background 0.15s",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#c0466d")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#D4537E")}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  fullWidth,
  small,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#ffffff",
        color: "#4a4a4a",
        border: "1px solid #d8d4d0",
        borderRadius: "10px",
        padding: small ? "7px 18px" : "12px 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#b0aca8";
        e.currentTarget.style.background = "#f8f7f6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#d8d4d0";
        e.currentTarget.style.background = "#ffffff";
      }}
    >
      {children}
    </button>
  );
}
