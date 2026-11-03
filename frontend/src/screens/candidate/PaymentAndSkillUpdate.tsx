import { useState } from "react";
import { OutlineButton, PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";

export function PaymentAndSkillUpdate() {
  const [released, setReleased] = useState(false);

  return (
    <PageShell
      title="Payment & Skill Update"
      subtitle="Project completed · Build an Inventory Dashboard in React"
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Payment status */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>
            Payment Status
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  padding: "8px 18px",
                  borderRadius: "99px",
                  background: released ? "#f0eeed" : "#fff8e1",
                  border: `1px solid ${released ? "#d8d4d0" : "#ffd54f"}`,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: released ? "#8a8480" : "#d4a017",
                  letterSpacing: "0.06em",
                  textDecoration: released ? "line-through" : "none",
                }}
              >
                HELD
              </div>
            </div>
            <div
              style={{
                flex: 1,
                height: "1px",
                background: released ? "#D4537E" : "#e8e4e1",
                position: "relative",
                transition: "background 0.4s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-4px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: released ? "#D4537E" : "#e8e4e1",
                  transition: "background 0.4s",
                }}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  padding: "8px 18px",
                  borderRadius: "99px",
                  background: released ? "#fdf0f5" : "#f3f2f1",
                  border: `1px solid ${released ? "#f0c4d4" : "#e8e4e1"}`,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: released ? "#D4537E" : "#c0bbb8",
                  letterSpacing: "0.06em",
                  transition: "all 0.4s",
                }}
              >
                RELEASED
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              padding: "24px",
              background: released ? "#fdf0f5" : "#f8f7f6",
              borderRadius: "10px",
              border: `1px solid ${released ? "#f0c4d4" : "#e8e4e1"}`,
              transition: "all 0.4s",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: released ? "#D4537E" : "#c0bbb8",
                letterSpacing: "-0.03em",
                transition: "color 0.4s",
              }}
            >
              NPR 12,000
            </div>
            <div style={{ fontSize: "13px", color: "#8a8480", marginTop: "4px" }}>
              {released ? "Transferred to your wallet" : "Awaiting employer approval"}
            </div>
          </div>

          {!released && (
            <PinkButton fullWidth onClick={() => setReleased(true)}>
              Simulate Release (Demo)
            </PinkButton>
          )}
          {released && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                background: "#fdf0f5",
                borderRadius: "10px",
                border: "1px solid #f0c4d4",
              }}
            >
              <span style={{ fontSize: "16px" }}>✅</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#D4537E" }}>
                Payment successfully released!
              </span>
            </div>
          )}
        </Card>

        {/* Skill verified */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
            Skills Verified
          </div>
          <div style={{ fontSize: "12px", color: "#8a8480", marginBottom: "16px" }}>
            These skills are now backed by proof of completed work.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { skill: "React", score: "9.0 / 10", new: true },
              { skill: "TypeScript", score: "8.5 / 10", new: true },
              { skill: "Recharts", score: "9.0 / 10", new: true },
              { skill: "Django", score: "8.0 / 10", new: false },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: item.new ? "#fdf0f5" : "#f8f7f6",
                  border: `1px solid ${item.new ? "#f0c4d4" : "#e8e4e1"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "14px" }}>{item.new ? "✨" : "✓"}</span>
                  <div>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                      }}
                    >
                      {item.skill}
                    </span>
                    {item.new && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#D4537E",
                          background: "#fce8f0",
                          padding: "1px 7px",
                          borderRadius: "99px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#8a8480" }}>{item.score}</span>
                  <span
                    style={{
                      background: "#fdf0f5",
                      color: "#D4537E",
                      border: "1px solid #f0c4d4",
                      borderRadius: "99px",
                      padding: "2px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                    }}
                  >
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Next project */}
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                Ready for your next project?
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480" }}>
                More opportunities are waiting.
              </div>
            </div>
            <OutlineButton small>Browse Projects</OutlineButton>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
