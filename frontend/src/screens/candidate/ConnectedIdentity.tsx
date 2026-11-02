import { Card } from "@/components/ui/Card";
import { GrayBadge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/FormFields";
import { PageShell } from "@/components/layout/PageShell";
import { proofTrail } from "@/screens/candidate/proofTrail";

export function ConnectedIdentity() {
  return (
    <PageShell
      title="Your Candidate Profile"
      subtitle="Verified by proof-of-work, not credentials."
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Connected banner */}
        <Card
          style={{
            background: "#fdf0f5",
            border: "1px solid #f0c4d4",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>✅</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                You are connected with TechNova Pvt. Ltd.
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480" }}>
                Your profile is visible to this employer. They can now reach out directly.
              </div>
            </div>
            <span
              style={{
                background: "#fdf0f5",
                color: "#D4537E",
                border: "1px solid #f0c4d4",
                borderRadius: "99px",
                padding: "4px 14px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                flexShrink: 0,
              }}
            >
              Connected
            </span>
          </div>
        </Card>

        {/* Identity card — revealed */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f5cdd9 0%, #e8a0b8 100%)",
                border: "1px solid #e8a0b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
                letterSpacing: "-0.02em",
                fontWeight: 700,
                color: "#c0466d",
              }}
            >
              AS
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  letterSpacing: "-0.02em",
                  marginBottom: "2px",
                }}
              >
                Aaisha Shrestha
              </div>
              <div style={{ fontSize: "13px", color: "#8a8480" }}>
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

        {/* Proof trail */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "16px" }}>
            Proof Trail
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
                  <div style={{ flex: 1 }}>
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
          Your identity has been shared with TechNova Pvt. Ltd.
        </div>
      </div>
    </PageShell>
  );
}
