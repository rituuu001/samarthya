import type React from "react";

export function PinkBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#fdf0f5",
        color: "#D4537E",
        border: "1px solid #f0c4d4",
        borderRadius: "99px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function GrayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#f3f2f1",
        color: "#6b6866",
        border: "1px solid #e8e4e1",
        borderRadius: "99px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
