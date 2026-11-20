import type React from "react";

export function SprintFactCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 400,
          color: "#6B7280",
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#1F2937",
          lineHeight: 1.4,
        }}
      >
        {value}
      </span>
    </div>
  );
}
