import type React from "react";
import samarthyaLogo from "@/imports/image.webp";

export function PageShell({
  title,
  subtitle,
  role,
  children,
}: {
  title: string;
  subtitle?: string;
  role: "employer" | "candidate";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f7f6",
        padding: "32px 24px",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "6px",
          }}
        >
          <img
            src={samarthyaLogo}
            alt="Samarthya logo"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#D4537E",
              letterSpacing: "-0.01em",
              fontFamily: "'Noto Sans Devanagari', 'Outfit', sans-serif",
              lineHeight: 1,
            }}
          >
            सामर्थ्य
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: role === "employer" ? "#6b6866" : "#D4537E",
              background: role === "employer" ? "#f0eeed" : "#fdf0f5",
              border: `1px solid ${role === "employer" ? "#e0dbd8" : "#f0c4d4"}`,
              borderRadius: "99px",
              padding: "2px 10px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {role === "employer" ? "Employer" : "Candidate"}
          </span>
        </div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: subtitle ? "4px" : "0",
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "14px", color: "#8a8480" }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
