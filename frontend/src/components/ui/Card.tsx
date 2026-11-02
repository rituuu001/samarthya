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
        border: "1px solid #e8e4e1",
        borderRadius: "12px",
        padding: "24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
