import type React from "react";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid var(--border-default)`,
        borderRadius: "var(--radius)",
        padding: "var(--card-padding)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
