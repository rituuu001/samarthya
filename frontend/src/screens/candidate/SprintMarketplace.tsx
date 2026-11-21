import { useMemo, useState } from "react";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { Badge } from "@/components/portal/Badge";
import { formatCurrency } from "@/utils/currency";
import { formatBackendDeadline } from "@/utils/display";
import type { MarketplaceSprintResponse } from "@/api/sprint";
import type { ApplicationResponse } from "@/api/application";

export function SprintMarketplace({
  onView,
  onApply,
  publishedSprints,
  backendApplications,
  applyingSprintId,
  loading,
  error,
}: {
  onView: (id: string) => void;
  onApply: (id: string) => void;
  publishedSprints: MarketplaceSprintResponse[];
  backendApplications: ApplicationResponse[];
  applyingSprintId: string | null;
  loading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const filters = useMemo(
    () => ["All", ...Array.from(new Set(publishedSprints.flatMap((sprint) => sprint.skill_category))).sort()],
    [publishedSprints]
  );
  const appliedSprintIds = useMemo(
    () => new Set(backendApplications.map((app) => app.sprint_id)),
    [backendApplications]
  );
  const now = useMemo(() => new Date(), []);
  const visible = useMemo(
    () =>
      publishedSprints.filter((sprint) => {
        if (appliedSprintIds.has(sprint.id)) return false;
        if (new Date(sprint.application_deadline) < now) return false;
        const query = search.toLowerCase();
        const matchesSearch =
          sprint.title.toLowerCase().includes(query) ||
          sprint.description.toLowerCase().includes(query) ||
          sprint.skill_category.some((skill) => skill.toLowerCase().includes(query));
        return matchesSearch && (filter === "All" || sprint.skill_category.includes(filter));
      }),
    [filter, publishedSprints, search, appliedSprintIds]
  );
  return (
    <>
      <PageHeading eyebrow="Proof Sprint Marketplace" title="Explore Sprints" subtitle="Find paid tasks that match your skills and build verified proof." />
      <PortalCard className="marketplace-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or skills..." />
        <div className="filter-tabs">{filters.map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      </PortalCard>
      {loading && <div className="empty-state">Loading available sprints...</div>}
      {!loading && error && <div className="empty-state">{error}</div>}
      {!loading && !error && publishedSprints.length === 0 && <div className="empty-state">No published sprints are available yet.</div>}
      {!loading && !error && publishedSprints.length > 0 && <div className="marketplace-count">Showing <strong>{visible.length}</strong> active proof sprints</div>}
      {!loading && !error && publishedSprints.length > 0 && visible.length === 0 && <div className="empty-state">No sprints match your search or selected filter.</div>}
      {!loading && !error && (
        <div className="marketplace-grid">
          {visible.map((sprint) => (
            <PortalCard className="market-card" key={sprint.id}>
              <div className="market-card-top">
                <div>
                  <strong>{sprint.title}</strong>
                  <span>{sprint.organization_name || "Independent employer"}</span>
                </div>
                <div>{formatCurrency(Number(sprint.budget), sprint.currency)}</div>
              </div>
              <div className="badge-row">{sprint.skill_category.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
              <p>{formatBackendDeadline(sprint.deadline)}</p>
              <div className="market-actions">
                <button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View</button>
                <button className="portal-primary" type="button" disabled={applyingSprintId === sprint.id} onClick={() => onApply(sprint.id)}>
                  {applyingSprintId === sprint.id ? "Applying..." : "Apply"}
                </button>
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </>
  );
}
