import { useState } from "react";
import { PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/FormFields";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Textarea } from "@/components/ui/Textarea";
import { PageShell } from "@/components/layout/PageShell";

export function CreateProofSprint() {
  const [skills, setSkills] = useState(["Django", "PostgreSQL", "REST API"]);
  const [skillInput, setSkillInput] = useState("");
  const rubric = [
    { label: "Functionality", desc: "Does the solution work as required?" },
    { label: "Code Quality", desc: "Is the code readable and well-structured?" },
    { label: "Completeness", desc: "Are all requirements addressed?" },
    { label: "Timeliness", desc: "Was the submission made before deadline?" },
  ];
  const [checked, setChecked] = useState([true, true, true, true]);

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  return (
    <PageShell
      title="Create Proof Sprint"
      subtitle="Define a task and lock payment into escrow before posting."
      role="employer"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Card>
          <SectionTitle>Task Details</SectionTitle>
          <div style={{ height: "20px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label>Task Title</Label>
              <Input placeholder="e.g. Build a REST API endpoint for user authentication" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={5}
                placeholder="Describe the task in detail — expected inputs/outputs, tech stack, constraints, and any references..."
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <Label>Payment Amount (NPR)</Label>
                <Input placeholder="e.g. 8,000" type="text" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" />
              </div>
            </div>
            <div>
              <Label>Required Skills</Label>
              <div
                style={{
                  border: "1px solid #e8e4e1",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  background: "#ffffff",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  alignItems: "center",
                  minHeight: "46px",
                }}
              >
                {skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#fdf0f5",
                      color: "#D4537E",
                      border: "1px solid #f0c4d4",
                      borderRadius: "99px",
                      padding: "2px 10px",
                      fontSize: "12px",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {s}
                    <span
                      onClick={() =>
                        setSkills(skills.filter((_, j) => j !== i))
                      }
                      style={{ cursor: "pointer", opacity: 0.6, fontSize: "13px" }}
                    >
                      ×
                    </span>
                  </span>
                ))}
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="Add skill, press Enter"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: "#1a1a1a",
                    background: "transparent",
                    fontFamily: "Outfit, sans-serif",
                    flexGrow: 1,
                    minWidth: "140px",
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Evaluation Rubric</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              color: "#8a8480",
              marginTop: "4px",
              marginBottom: "20px",
            }}
          >
            Select criteria that will be used to score submissions blindly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {rubric.map((r, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  cursor: "pointer",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: checked[i] ? "#fdf0f5" : "#f8f7f6",
                  border: `1px solid ${checked[i] ? "#f0c4d4" : "#e8e4e1"}`,
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => {
                    const next = [...checked];
                    next[i] = !next[i];
                    setChecked(next);
                  }}
                  style={{ marginTop: "2px", width: "16px", height: "16px", accentColor: "#D4537E" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                    {r.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card style={{ background: "#fdf0f5", border: "1px solid #f0c4d4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "20px" }}>🔐</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                Escrow Protection
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480" }}>
                Payment is locked until you approve the submission.
              </div>
            </div>
          </div>
          <PinkButton fullWidth>Lock Payment &amp; Post Sprint</PinkButton>
        </Card>
      </div>
    </PageShell>
  );
}
