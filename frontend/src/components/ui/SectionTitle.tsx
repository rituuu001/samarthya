import type React from "react";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "22px",
        fontWeight: 700,
        color: "#1a1a1a",
        marginBottom: "4px",
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </h2>
  );
}
