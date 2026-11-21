import { useEffect, useState } from "react";
import { PinkBadge } from "@/components/ui/Badge";
import { PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import { formatCurrency } from "@/utils/currency";
import { getPublishedSprints, type MarketplaceSprintResponse } from "@/api/sprint";

export function SprintMarketplace() {
  const [sprints, setSprints] = useState<MarketplaceSprintResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "React", "Django", "Node.js", "Python"];

  useEffect(() => {
    let active = true;
    getPublishedSprints()
      .then((data) => {
        if (!active) return;
        setSprints(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load sprints");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = sprints.filter((sprint) => {
    const matchSearch =
      search === "" ||
      sprint.title.toLowerCase().includes(search.toLowerCase()) ||
      sprint.skill_category.some((sk) => sk.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      activeFilter === "All" || sprint.skill_category.includes(activeFilter);
    return matchSearch && matchFilter;
  });

  return (
    <PageShell
      title="Project Marketplace"
      subtitle="Browse live projects and earn verified skill badges upon completion."
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
                  border: `1px solid ${activeFilter === f ? "#D8C8F0" : "#e8e4e1"}`,
                  borderRadius: "99px",
                  padding: "5px 14px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: activeFilter === f ? "#F3EFFF" : "#ffffff",
                  color: activeFilter === f ? "#5E3A8A" : "#6b6866",
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
          Showing <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong> active projects
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
                  {sprint.organization_name ?? "Organization"} · {new Date(sprint.created_at ?? Date.now()).toLocaleDateString()}
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
{formatCurrency(Number(sprint.budget), sprint.currency)}
                </div>
              </div>
            </div>

            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}
            >
              {sprint.skill_category.map((sk, j) => (
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
                <span>📅</span> Deadline: {new Date(sprint.deadline).toLocaleDateString()}
              </div>
              <PinkButton small>Apply Now</PinkButton>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
