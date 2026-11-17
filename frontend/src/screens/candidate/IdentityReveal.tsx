import { useState } from "react";
import { GrayBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/FormFields";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { proofTrail } from "@/screens/candidate/proofTrail";

export function Screen6({ connectionRequest }: { connectionRequest: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const displayedConnectionRequest = connectionRequest ?? "An employer";

  return (
    <PageShell
      title="Your Candidate Profile"
      subtitle="Verified by proof-of-work, not credentials."
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Card
          style={{
            background: "#fdf0f5",
            border: "1px solid #f0c4d4",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "20px" }}>💌</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                An employer wants to connect with you
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480" }}>
                {displayedConnectionRequest} reviewed your project and is interested in your profile.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <PinkButton onClick={() => setRevealed(true)}>
              {revealed ? "Identity Revealed ✓" : "Reveal Identity"}
            </PinkButton>
            <OutlineButton onClick={() => setRevealed(false)}>Stay Private</OutlineButton>
          </div>
        </Card>

        {/* Identity card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: revealed ? "#f0c4d4" : "#f3f2f1",
                border: `1px solid ${revealed ? "#e8a0b8" : "#e8e4e1"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0,
                filter: revealed ? "none" : "grayscale(1)",
                transition: "all 0.4s",
              }}
            >
              {revealed ? "👤" : "🔒"}
            </div>
            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: revealed ? "#1a1a1a" : "transparent",
                  background: revealed
                    ? "none"
                    : "linear-gradient(90deg, #c0bbb8 0%, #dedad8 100%)",
                  WebkitBackgroundClip: revealed ? "unset" : "text",
                  WebkitTextFillColor: revealed ? "#1a1a1a" : "transparent",
                  borderRadius: "6px",
                  letterSpacing: "-0.02em",
                  filter: revealed ? "none" : "blur(6px)",
                  transition: "filter 0.4s",
                  userSelect: revealed ? "auto" : "none",
                }}
              >
                Aaisha Shrestha
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: revealed ? "#8a8480" : "transparent",
                  filter: revealed ? "none" : "blur(4px)",
                  transition: "filter 0.4s",
                }}
              >
                Full-Stack Developer · Kathmandu, Nepal
              </div>
            </div>
          </div>

          {/* Verified skills */}
          <div style={{ marginBottom: "8px" }}>
            <Label>Verified Skills</Label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {["React", "TypeScript", "Recharts", "Django", "Node.js", "JWT", "Redis", "PostgreSQL"].map(
              (sk) => (
                <span
                  key={sk}
                  style={{
                    background: "#fdf0f5",
                    color: "#D4537E",
                    border: "1px solid #f0c4d4",
                    borderRadius: "99px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ fontSize: "10px" }}>✓</span> {sk}
                </span>
              )
            )}
          </div>
        </Card>

        {/* My Journey */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>
            My Journey
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {proofTrail.map((item, i) => (
              <div key={i}>
                <div style={{ display: "flex", gap: "14px", paddingBottom: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#D4537E",
                        marginTop: "4px",
                        flexShrink: 0,
                      }}
                    />
                    {i < proofTrail.length - 1 && (
                      <div
                        style={{
                          width: "1px",
                          flex: 1,
                          background: "#e8e4e1",
                          marginTop: "4px",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < proofTrail.length - 1 ? "0" : "0" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        marginBottom: "2px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.sprint}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8a8480", marginBottom: "8px" }}>
                      {item.company} · {item.date}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {item.skills.map((sk) => (
                        <GrayBadge key={sk}>{sk}</GrayBadge>
                      ))}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#D4537E",
                          marginLeft: "4px",
                        }}
                      >
                        {item.score} / 10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div
          style={{
            fontSize: "11px",
            color: "#8a8480",
            textAlign: "center",
            paddingBottom: "24px",
          }}
        >
          {revealed
            ? `Your identity has been shared with ${displayedConnectionRequest}.`
            : "Your identity will only be shared with employers you approve."}
        </div>
      </div>
    </PageShell>
  );
}
