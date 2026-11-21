import type React from "react";

export function SkillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#F3EFFF",
        color: "#5E3A8A",
        border: "1px solid #D8C8F0",
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
