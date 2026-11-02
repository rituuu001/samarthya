import { useState } from "react";
import samarthyaLogo from "@/imports/image.png";
import AuthFlow, { type AuthRole } from "@/AuthFlow";
import PublicInfo, { type InfoPageKey } from "@/PublicInfo";
import RolePortal from "@/RolePortal";

// ─── Shared primitives ────────────────────────────────────────────────────────

function PinkBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#fdf0f5",
        color: "#D4537E",
        border: "1px solid #f0c4d4",
        borderRadius: "99px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function GrayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#f3f2f1",
        color: "#6b6866",
        border: "1px solid #e8e4e1",
        borderRadius: "99px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function PinkButton({
  children,
  onClick,
  fullWidth,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#D4537E",
        color: "#ffffff",
        border: "none",
        borderRadius: "10px",
        padding: small ? "7px 18px" : "12px 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 600,
        cursor: "pointer",
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        transition: "background 0.15s",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "#c0466d")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "#D4537E")
      }
    >
      {children}
    </button>
  );
}

function OutlineButton({
  children,
  onClick,
  fullWidth,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#ffffff",
        color: "#4a4a4a",
        border: "1px solid #d8d4d0",
        borderRadius: "10px",
        padding: small ? "7px 18px" : "12px 24px",
        fontSize: small ? "13px" : "14px",
        fontWeight: 500,
        cursor: "pointer",
        width: fullWidth ? "100%" : undefined,
        fontFamily: "Outfit, sans-serif",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#b0aca8";
        e.currentTarget.style.background = "#f8f7f6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#d8d4d0";
        e.currentTarget.style.background = "#ffffff";
      }}
    >
      {children}
    </button>
  );
}

function Card({
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "#8a8480",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}
    >
      {children}
    </div>
  );
}

function Input({
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        border: "1px solid #e8e4e1",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#1a1a1a",
        background: "#ffffff",
        transition: "border-color 0.15s",
        fontFamily: "Outfit, sans-serif",
      }}
    />
  );
}

function Textarea({
  placeholder,
  rows = 4,
}: {
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        border: "1px solid #e8e4e1",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#1a1a1a",
        background: "#ffffff",
        resize: "vertical",
        transition: "border-color 0.15s",
        fontFamily: "Outfit, sans-serif",
        lineHeight: 1.6,
      }}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
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

function PageShell({
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

// ─── Screen 1: Create Proof Sprint ────────────────────────────────────────────

function Screen1() {
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

// ─── Screen 2: Sprint Marketplace ─────────────────────────────────────────────

const marketplaceSprints = [
  {
    title: "Build an Inventory Dashboard in React",
    payment: "12,000",
    skills: ["React", "TypeScript", "Recharts"],
    deadline: "Sep 20, 2026",
    company: "TechNova Pvt. Ltd.",
    postedAgo: "2h ago",
  },
  {
    title: "REST API for Payment Gateway Integration",
    payment: "9,500",
    skills: ["Django", "PostgreSQL", "Stripe API"],
    deadline: "Sep 18, 2026",
    company: "FinBridge Nepal",
    postedAgo: "5h ago",
  },
  {
    title: "Design & Implement Auth Flow (JWT + OTP)",
    payment: "7,000",
    skills: ["Node.js", "JWT", "Redis"],
    deadline: "Sep 17, 2026",
    company: "Bazar Digital",
    postedAgo: "1d ago",
  },
  {
    title: "Write Unit Tests for Core Business Logic",
    payment: "5,500",
    skills: ["Python", "pytest", "CI/CD"],
    deadline: "Sep 22, 2026",
    company: "CloudStack Nepal",
    postedAgo: "2d ago",
  },
];

function Screen2() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "React", "Django", "Node.js", "Python"];

  const filtered = marketplaceSprints.filter((s) => {
    const matchSearch =
      search === "" ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.skills.some((sk) => sk.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      activeFilter === "All" || s.skills.includes(activeFilter);
    return matchSearch && matchFilter;
  });

  return (
    <PageShell
      title="Sprint Marketplace"
      subtitle="Browse live tasks and earn verified skill badges upon completion."
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Search */}
        <Card style={{ padding: "16px" }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8a8480",
                fontSize: "16px",
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or skills..."
              style={{
                width: "100%",
                border: "1px solid #e8e4e1",
                borderRadius: "10px",
                padding: "10px 14px 10px 38px",
                fontSize: "14px",
                color: "#1a1a1a",
                background: "#f8f7f6",
                fontFamily: "Outfit, sans-serif",
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  border: `1px solid ${activeFilter === f ? "#D4537E" : "#e8e4e1"}`,
                  borderRadius: "99px",
                  padding: "5px 14px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: activeFilter === f ? "#fdf0f5" : "#ffffff",
                  color: activeFilter === f ? "#D4537E" : "#6b6866",
                  transition: "all 0.15s",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </Card>

        {/* Count */}
        <div style={{ fontSize: "13px", color: "#8a8480", paddingLeft: "2px" }}>
          Showing <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong> active sprints
        </div>

        {/* Cards */}
        {filtered.map((sprint, i) => (
          <Card key={i}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <div style={{ flex: 1, paddingRight: "16px" }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    marginBottom: "4px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {sprint.title}
                </div>
                <div style={{ fontSize: "12px", color: "#8a8480" }}>
                  {sprint.company} · {sprint.postedAgo}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#D4537E",
                    letterSpacing: "-0.02em",
                  }}
                >
                  NPR {sprint.payment}
                </div>
              </div>
            </div>

            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}
            >
              {sprint.skills.map((sk, j) => (
                <PinkBadge key={j}>{sk}</PinkBadge>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#8a8480",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span>📅</span> Deadline: {sprint.deadline}
              </div>
              <PinkButton small>Apply Now</PinkButton>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Screen 3: Submission ─────────────────────────────────────────────────────

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

// ─── Screen 4: Blind Evaluation ───────────────────────────────────────────────

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

export function Screen4() {
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
      title="Blind Evaluation"
      subtitle="Review the submission without seeing contributor identity."
      role="employer"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                Contributor #8041
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                Identity hidden · Sprint: Build an Inventory Dashboard in React
              </div>
            </div>
            <GrayBadge>Submitted</GrayBadge>
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
                github.com/anonymous/inventory-dashboard-sprint
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#6b6866", lineHeight: 1.7 }}>
              Implemented a responsive dashboard with product table (sort/filter by category, stock level),
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
          <PinkButton fullWidth>✓ Approve &amp; Release Payment</PinkButton>
          <OutlineButton fullWidth>✗ Reject</OutlineButton>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Screen 5: Payment & Skill Update ─────────────────────────────────────────

function Screen5() {
  const [released, setReleased] = useState(false);

  return (
    <PageShell
      title="Payment & Skill Update"
      subtitle="Sprint completed · Build an Inventory Dashboard in React"
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

        {/* Next sprint */}
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                Ready for your next sprint?
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480" }}>
                More opportunities are waiting.
              </div>
            </div>
            <OutlineButton small>Browse Sprints</OutlineButton>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Screen 6: Identity Reveal ────────────────────────────────────────────────

const proofTrail = [
  {
    sprint: "Build an Inventory Dashboard in React",
    company: "TechNova Pvt. Ltd.",
    score: "8.5",
    date: "Sep 12, 2026",
    skills: ["React", "TypeScript", "Recharts"],
  },
  {
    sprint: "REST API for Payment Gateway",
    company: "FinBridge Nepal",
    score: "9.0",
    date: "Aug 28, 2026",
    skills: ["Django", "Stripe API"],
  },
  {
    sprint: "Auth Flow with JWT + OTP",
    company: "Bazar Digital",
    score: "8.0",
    date: "Aug 10, 2026",
    skills: ["Node.js", "JWT", "Redis"],
  },
];

export function Screen6() {
  const [revealed, setRevealed] = useState(false);

  return (
    <PageShell
      title="Your Candidate Profile"
      subtitle="Verified by proof-of-work, not credentials."
      role="candidate"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Connection banner */}
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
                TechNova Pvt. Ltd. reviewed your sprint and is interested in your profile.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <PinkButton onClick={() => setRevealed(true)}>
              {revealed ? "Identity Revealed ✓" : "Reveal Identity"}
            </PinkButton>
            <OutlineButton>Stay Private</OutlineButton>
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
            ? "Your identity has been shared with TechNova Pvt. Ltd."
            : "Your identity will only be shared with employers you approve."}
        </div>
      </div>
    </PageShell>
  );
}

// ─── Screen 6B: Identity Reveal (Connected state) ────────────────────────────

function Screen6B() {
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

// ─── Welcome screen ───────────────────────────────────────────────────────────

function CandidateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19c.35-3.45 2.55-5.25 6.25-5.25s5.9 1.8 6.25 5.25" />
      <path d="m17.25 5.25.6 1.2 1.4.2-1 1 .25 1.4-1.25-.65-1.25.65.25-1.4-1-1 1.4-.2.6-1.2Z" />
    </svg>
  );
}

function EmployerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="7.25" width="17" height="12.25" rx="2" />
      <path d="M8.5 7.25V5.5c0-.55.45-1 1-1h5c.55 0 1 .45 1 1v1.75M3.5 12.25c4.85 2.35 12.15 2.35 17 0M10 12.75h4" />
    </svg>
  );
}

function PlatformIllustration() {
  return (
    <div className="welcome-illustration" aria-label="Candidates and employers connect through verified work">
      <div className="illustration-card illustration-card-candidate">
        <div className="illustration-card-top">
          <div className="illustration-avatar">
            <CandidateIcon />
          </div>
          <div>
            <div className="illustration-label">Candidate</div>
            <div className="illustration-title">Proof in progress</div>
          </div>
        </div>
        <div className="illustration-task">
          <div className="illustration-task-row">
            <span>API integration sprint</span>
            <strong>86%</strong>
          </div>
          <div className="illustration-progress">
            <span />
          </div>
        </div>
        <div className="illustration-skills">
          <span>React</span>
          <span>API</span>
          <span>TypeScript</span>
        </div>
      </div>

      <div className="illustration-connector" aria-hidden="true">
        <span />
        <div>✓</div>
        <span />
      </div>

      <div className="illustration-card illustration-card-employer">
        <div className="illustration-card-top">
          <div className="illustration-avatar">
            <EmployerIcon />
          </div>
          <div>
            <div className="illustration-label">Employer</div>
            <div className="illustration-title">Skills verified</div>
          </div>
        </div>
        <div className="illustration-score">
          <div>
            <span>Blind evaluation</span>
            <strong>8.6</strong>
          </div>
          <div className="score-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="illustration-match">
          <span>Demonstrated ability</span>
          <strong>Strong match</strong>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  type,
  title,
  description,
  buttonLabel,
  onContinue,
}: {
  type: "candidate" | "employer";
  title: string;
  description: string;
  buttonLabel: string;
  onContinue: () => void;
}) {
  return (
    <div className="role-card">
      <div className="role-icon">
        {type === "candidate" ? <CandidateIcon /> : <EmployerIcon />}
      </div>
      <div className="role-card-title">{title}</div>
      <div className="role-card-description">{description}</div>
      <button className="role-button" onClick={onContinue}>
        <span>{buttonLabel}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function WelcomeScreen({
  onCandidate,
  onEmployer,
  onNavigate,
}: {
  onCandidate: () => void;
  onEmployer: () => void;
  onNavigate: (page: InfoPageKey) => void;
}) {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <div className="welcome-brand">
            <img src={samarthyaLogo} alt="Samarthya logo" />
            <div>
              <div className="welcome-brand-name">सामर्थ्य</div>
              <div className="welcome-motto">Prove First, Connect Later.</div>
            </div>
          </div>
          <nav className="welcome-nav" aria-label="Main navigation">
            <button type="button" onClick={() => onNavigate("how")}>How It Works</button>
            <button type="button" onClick={() => onNavigate("about")}>About Us</button>
            <button type="button" onClick={() => onNavigate("help")}>Help / FAQ</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="welcome-hero">
          <div className="welcome-hero-copy">
            <div className="welcome-eyebrow">
              <span />
              Proof-of-work hiring
            </div>
            <div className="welcome-heading">
              Welcome to <span>सामर्थ्य</span>
            </div>
            <div className="welcome-headline">
              Opportunities built on skills,
              <br />
              not just resumes.
            </div>
            <div className="welcome-description">
              A platform where talent meets opportunity through real work, verified skills,
              and fair evaluation. Whether you&apos;re looking to showcase your abilities or
              find the right talent, your journey starts here.
            </div>
          </div>
          <PlatformIllustration />
        </section>

        <section className="role-section" id="how-it-works">
          <div className="role-section-heading">
            <div>
              <div className="role-kicker">Start your journey</div>
              <div className="role-heading">How would you like to continue?</div>
            </div>
            <div className="role-subtitle">Choose your role to get started.</div>
          </div>
          <div className="role-grid">
            <RoleCard
              type="candidate"
              title="I'm a Candidate"
              description="Showcase your skills, complete real-world tasks, build your proof trail, and get recognized for what you can do."
              buttonLabel="Continue as Candidate"
              onContinue={onCandidate}
            />
            <RoleCard
              type="employer"
              title="I'm an Employer"
              description="Post paid micro-tasks, discover skilled contributors through blind evaluation, and hire based on demonstrated ability."
              buttonLabel="Continue as Employer"
              onContinue={onEmployer}
            />
          </div>
        </section>
      </main>

      <footer className="welcome-footer" id="about">
        <div className="welcome-footer-inner">
          <div className="footer-motto">Prove First, Connect Later.</div>
          <div className="footer-links" id="help">
            <button type="button" onClick={() => onNavigate("about")}>About</button>
            <button type="button" onClick={() => onNavigate("contact")}>Contact Us</button>
            <button type="button" onClick={() => onNavigate("privacy")}>Privacy Policy</button>
          </div>
          <div className="footer-copyright">© 2026 सामर्थ्य.</div>
        </div>
      </footer>
    </div>
  );
}

// ─── Role-gated application root ─────────────────────────────────────────────

type AppView =
  | "home"
  | `auth-${AuthRole}`
  | `portal-${AuthRole}`
  | `info-${InfoPageKey}`;

export default function App() {
  const [active, setActive] = useState<AppView>("home");
  const [returnView, setReturnView] = useState<AppView>("home");

  const openInfo = (page: InfoPageKey, from: AppView) => {
    setReturnView(from);
    setActive(`info-${page}`);
  };

  if (active === "home") {
    return (
      <WelcomeScreen
        onCandidate={() => setActive("auth-candidate")}
        onEmployer={() => setActive("auth-employer")}
        onNavigate={(page) => openInfo(page, "home")}
      />
    );
  }

  if (active.startsWith("info-")) {
    const page = active.replace("info-", "") as InfoPageKey;
    return <PublicInfo page={page} onBack={() => setActive(returnView)} />;
  }

  if (active.startsWith("auth-")) {
    const role = active.replace("auth-", "") as AuthRole;
    return (
      <AuthFlow
        initialRole={role}
        onBackHome={() => setActive("home")}
        onNavigateInfo={(page) => openInfo(page, active)}
        onComplete={(completedRole) => setActive(`portal-${completedRole}`)}
      />
    );
  }

  const role = active.replace("portal-", "") as AuthRole;
  return (
    <RolePortal
      role={role}
      onLogout={() => setActive("home")}
      renderSubmission={(onSubmitted) => <Screen3 onSubmitted={onSubmitted} />}
      renderEvaluation={() => <Screen4 />}
      renderIdentity={() => <Screen6 />}
    />
  );
}
