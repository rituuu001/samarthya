import { useState } from "react";
import { PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/FormFields";
import { PageShell } from "@/components/layout/PageShell";
import { Textarea } from "@/components/ui/Textarea";

export function Screen3({ onSubmitted }: { onSubmitted?: () => void }) {
  const [tab, setTab] = useState<"upload" | "text">("upload");
  const [dragging, setDragging] = useState(false);

  return (
    <PageShell
      title="Submit Your Work"
      subtitle="Build an Inventory Dashboard in React"
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Card style={{ background: "#fdf0f5", border: "1px solid #f0c4d4", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔒</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#D4537E" }}>
                Identity Protected
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                Your name and photo are hidden from the employer during evaluation. You appear as an anonymous contributor.
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
              Task Summary
            </div>
            <div style={{ fontSize: "13px", color: "#6b6866", lineHeight: 1.7 }}>
              Build a responsive inventory management dashboard using React and TypeScript. Include product listing with sorting/filtering, low-stock alerts, and a summary chart using Recharts. Use mock JSON data. Submit as a GitHub repository link or zipped source.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "#f3f2f1",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "16px",
            }}
          >
            {(["upload", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "Outfit, sans-serif",
                  background: tab === t ? "#ffffff" : "transparent",
                  color: tab === t ? "#1a1a1a" : "#8a8480",
                  boxShadow: tab === t ? "0 0 0 1px #e8e4e1" : "none",
                  transition: "all 0.15s",
                }}
              >
                {t === "upload" ? "📎 File / Link" : "✍️ Text Entry"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={() => setDragging(false)}
                style={{
                  border: `2px dashed ${dragging ? "#D4537E" : "#e8e4e1"}`,
                  borderRadius: "10px",
                  padding: "36px 24px",
                  textAlign: "center",
                  background: dragging ? "#fdf0f5" : "#f8f7f6",
                  transition: "all 0.15s",
                  cursor: "pointer",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a", marginBottom: "4px" }}>
                  Drop files here or click to browse
                </div>
                <div style={{ fontSize: "12px", color: "#8a8480" }}>
                  .zip, .tar.gz, or any archive up to 50 MB
                </div>
              </div>
              <div>
                <Label>Or paste a GitHub / hosted link</Label>
                <Input placeholder="https://github.com/your-username/inventory-dashboard" />
              </div>
            </div>
          ) : (
            <div>
              <Label>Describe your solution</Label>
              <Textarea
                rows={8}
                placeholder="Explain your approach, key decisions, and how to run or view the work..."
              />
            </div>
          )}
        </Card>

        <Card>
          <Label>Notes to Evaluator (optional)</Label>
          <Textarea
            rows={3}
            placeholder="Any known limitations, assumptions, or setup instructions..."
          />
        </Card>

        <PinkButton fullWidth onClick={onSubmitted}>Submit Work</PinkButton>
        <div
          style={{
            fontSize: "11px",
            color: "#8a8480",
            textAlign: "center",
            paddingBottom: "16px",
          }}
        >
          Once submitted, your identity remains hidden until the employer decides to connect.
        </div>
      </div>
    </PageShell>
  );
}
