import type React from "react";

export function SkillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#EFF6FF",
        color: "#1D4ED8",
        border: "1px solid #BFDBFE",
        borderRadius: "99px",
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
