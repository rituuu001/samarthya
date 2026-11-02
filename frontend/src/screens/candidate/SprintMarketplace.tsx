import { useState } from "react";
import { PinkBadge } from "@/components/ui/Badge";
import { PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";

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

export function SprintMarketplace() {
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
