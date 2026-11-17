import { useState } from "react";
import { GrayBadge } from "@/components/ui/Badge";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import type { Application, ApplicationStatus, Sprint } from "@/data/portalData";
import { proofTrail } from "@/screens/candidate/proofTrail";

function RubricSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#D4537E",
            minWidth: "32px",
            textAlign: "right",
          }}
        >
          {value} / 10
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

export function Screen4({
  applicantId,
  sprint,
  application,
  onBack,
  onDecision,
}: {
  applicantId: string;
  sprint: Sprint;
  application: Application | undefined;
  onBack: () => void;
  onDecision: (status: ApplicationStatus) => void;
}) {
  const [scores, setScores] = useState({
    Functionality: 8,
    "Code Quality": 7,
    Completeness: 9,
    Timeliness: 10,
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const avg = (total / 4).toFixed(1);

  return (
    <PageShell
      title={`Application · ${applicantId}`}
      subtitle={`Review ${sprint.title} without seeing contributor identity.`}
      role="employer"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <OutlineButton onClick={onBack}>← Back to Applicants</OutlineButton>
        {/* Contributor card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f3f2f1",
                border: "1px solid #e8e4e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              🔒
            </div>
            <div>
              <div
                style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.01em" }}
              >
                {applicantId}
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                Identity hidden · Project: {sprint.title}
              </div>
            </div>
            <GrayBadge>{application?.status === "Under Review" ? "Under Review" : application?.status ?? "Pending Review"}</GrayBadge>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "12px" }}>
            Candidate Profile
          </div>
          <div style={{ fontSize: "12px", color: "#6b6866", lineHeight: 1.7 }}>
            This anonymous contributor has demonstrated experience through the proof trail below. Personal identity details remain hidden during evaluation.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
            {["React", "TypeScript", "Recharts", "Django", "Node.js", "JWT", "PostgreSQL"].map((skill) => <GrayBadge key={skill}>{skill}</GrayBadge>)}
          </div>
          <div style={{ marginTop: "18px", fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>Proof Trail</div>
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {proofTrail.map((item) => (
              <div key={item.sprint} style={{ borderBottom: "1px solid #e8e4e1", paddingBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{item.sprint}</div>
                <div style={{ fontSize: "11px", color: "#8a8480" }}>{item.company} · {item.date} · Score {item.score} / 10</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Submission */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "12px" }}>
            Submitted Work
          </div>
          <div
            style={{
              background: "#f8f7f6",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "12px",
              border: "1px solid #e8e4e1",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px" }}>📎</span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#D4537E",
                  fontWeight: 500,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                github.com/anonymous/{sprint.title.toLowerCase().replace(/ /g, "-")}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#6b6866", lineHeight: 1.7 }}>
              {application?.submitted ? "Submitted work: " : "Application details: "}Implemented a responsive dashboard with product table (sort/filter by category, stock level),
              real-time low-stock alert badges, and a bar chart summary using Recharts. State managed with
              Zustand. All components are fully typed in TypeScript.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <GrayBadge>React</GrayBadge>
            <GrayBadge>TypeScript</GrayBadge>
            <GrayBadge>Recharts</GrayBadge>
            <GrayBadge>Zustand</GrayBadge>
          </div>
        </Card>

        {/* Rubric */}
        <Card>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
            Score Rubric
          </div>
          <div style={{ fontSize: "12px", color: "#8a8480", marginBottom: "20px" }}>
            Rate each criterion from 0–10. Scores are final once you approve.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {(Object.keys(scores) as (keyof typeof scores)[]).map((key) => (
              <RubricSlider
                key={key}
                label={key}
                value={scores[key]}
                onChange={(v) => setScores({ ...scores, [key]: v })}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              background: "#fdf0f5",
              borderRadius: "10px",
              border: "1px solid #f0c4d4",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#D4537E" }}>
              Overall Score
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#D4537E" }}>
              {avg} / 10
            </span>
          </div>
        </Card>

        <div style={{ display: "flex", gap: "12px" }}>
          <OutlineButton fullWidth onClick={() => onDecision("Under Review")}>Review</OutlineButton>
          <PinkButton fullWidth onClick={() => onDecision("Accepted")}>✓ Accept and Release Payment</PinkButton>
          <OutlineButton fullWidth onClick={() => onDecision("Rejected")}>✗ Reject</OutlineButton>
        </div>
      </div>
    </PageShell>
  );
}
