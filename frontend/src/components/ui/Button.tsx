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
      className="ui-button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        background: disabled ? "var(--accent)" : "var(--rose-primary)",
        color: "#ffffff",
        border: "none",
        borderRadius: "var(--radius)",
        padding: small ? "0 16px" : "0 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        height: "44px",
        transition: "background 0.15s",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.filter = "brightness(0.9)";
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.filter = "none";
      }}
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
      className="ui-button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        background: "#ffffff",
        color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        border: `1px solid ${disabled ? "#e8e4e1" : "var(--border-default)"}`,
        borderRadius: "var(--radius)",
        padding: small ? "0 16px" : "0 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        height: "44px",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--background)";
          e.currentTarget.style.borderColor = "var(--border-default)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = "var(--border-default)";
        }
      }}
    >
      {children}
    </button>
  );
}

export function DestructiveButton({
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
      className="ui-button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        background: "#ffffff",
        color: disabled ? "var(--text-muted)" : "var(--destructive)",
        border: `1px solid ${disabled ? "var(--border-default)" : "var(--destructive)"}`,
        borderRadius: "var(--radius)",
        padding: small ? "0 16px" : "0 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        height: "44px",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--destructive)";
          e.currentTarget.style.color = "#ffffff";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.color = "var(--destructive)";
        }
      }}
    >
      {children}
    </button>
  );
}
