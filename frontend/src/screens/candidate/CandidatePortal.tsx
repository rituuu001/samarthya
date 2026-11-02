import { ReactNode, useMemo, useState } from "react";
import type { PortalProps } from "@/RolePortal";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PaymentSummary } from "@/components/portal/PaymentSummary";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";
import {
  Application,
  ApplicationStatus,
  formatDeadline,
  isApplicationOpen,
  sprints,
} from "@/data/portalData";

function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function CandidateDashboard({
  navigate,
  applications,
  onView,
  onSubmit,
}: {
  navigate: (page: string) => void;
  applications: Application[];
  onView: (sprintId: number) => void;
  onSubmit: (sprintId: number) => void;
}) {
  const active = applications.filter((item) => item.status === "Accepted");
  return (
    <>
      <PageHeading eyebrow="Candidate Dashboard" title="Welcome back, Aaisha." subtitle="Build your proof trail through real work and verified skills." action={<button className="portal-primary" type="button" onClick={() => navigate("explore")}>Explore Sprints</button>} />
      <PortalCard className="profile-summary candidate-summary">
        <div className="profile-summary-person"><span className="large-avatar">AS</span><div><strong>Aaisha Shrestha</strong><span>Full-Stack Developer · Kathmandu</span><small>Profile completion · 85%</small></div></div>
        <div className="profile-progress"><div><span>Profile completion</span><strong>85%</strong></div><div><span /></div><button type="button" onClick={() => navigate("profile")}>Complete profile</button></div>
      </PortalCard>
      <div className="skills-summary">
        <PortalCard><div className="card-title">Self-declared Skills</div><div className="badge-row">{["Node.js", "PostgreSQL", "REST API"].map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</div></PortalCard>
        <PortalCard><div className="card-title">Verified Skills</div><div className="badge-row">{["React", "TypeScript", "Recharts", "Django"].map((skill) => <Badge key={skill}>✓ {skill}</Badge>)}</div></PortalCard>
      </div>
      <div className="portal-stat-grid">
        <StatCard label="Total Applications" value={String(applications.length)} note="Across all sprints" />
        <StatCard label="Pending Applications" value={String(applications.filter((item) => item.status === "Pending Review").length)} note="Awaiting employer review" />
        <StatCard label="Accepted & Completed Sprints" value={String(applications.filter((item) => ["Accepted", "Submitted / Under Evaluation", "Completed"].includes(item.status)).length)} note="In progress or added to your proof trail" />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row"><div><div className="card-title">My Active Sprints</div><div className="card-subtitle">Accepted work currently in progress.</div></div><button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button></div>
          {active.length ? active.map((application) => {
            const sprint = sprints.find((item) => item.id === application.sprintId);
            if (!sprint) return null;
            return <div className="active-sprint-card" key={application.sprintId}>
              <div><Badge>{application.status}</Badge><strong>{sprint.title}</strong><span><Money amount={sprint.payment} /> · Sprint completion deadline: {sprint.deadline}</span></div>
              <div><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View Sprint</button><button className="portal-primary" type="button" onClick={() => onSubmit(sprint.id)}>Submit Work</button></div>
            </div>;
          }) : <div className="empty-state">No active sprints yet. Explore opportunities to begin.</div>}
        </PortalCard>
        <PaymentSummary held="NPR 12,000" pending="NPR 0" released="NPR 21,500" />
      </div>
    </>
  );
}

function Marketplace({
  onView,
  onApply,
  applications,
}: {
  onView: (id: number) => void;
  onApply: (id: number) => void;
  applications: Application[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => sprints.filter((sprint) => sprint.status === "Active").filter((sprint) => {
    const matchesSearch = sprint.title.toLowerCase().includes(search.toLowerCase()) || sprint.skills.some((skill) => skill.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && (filter === "All" || sprint.skills.includes(filter));
  }), [search, filter]);
  return (
    <>
      <PageHeading eyebrow="Proof Sprint Marketplace" title="Explore Sprints" subtitle="Find paid tasks that match your skills and build verified proof." />
      <PortalCard className="marketplace-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or skills..." />
        <div>{["All", "React", "Django", "Node.js", "Python"].map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      </PortalCard>
      <div className="marketplace-count">Showing <strong>{visible.length}</strong> active proof sprints</div>
      <div className="marketplace-grid">
        {visible.map((sprint) => {
          const application = applications.find((item) => item.sprintId === sprint.id);
          const full = sprint.applicants >= sprint.maxApplicants;
          const applicationOpen = isApplicationOpen(sprint);
          return (
            <PortalCard className="market-card" key={sprint.id}>
              <div className="market-card-top"><div><strong>{sprint.title}</strong><span>{sprint.company}</span></div><div><Money amount={sprint.payment} /></div></div>
              <p>{sprint.description}</p>
              <div className="badge-row">{sprint.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
              <div className="market-meta"><span>Application deadline · {formatDeadline(sprint.applicationDeadline)}</span><span>Sprint completion deadline · {sprint.deadline}</span><span className={full ? "limit-full" : ""}>{sprint.applicants} / {sprint.maxApplicants} applicants</span></div>
              <div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View</button><button className="portal-primary" type="button" disabled={Boolean(application) || full || !applicationOpen} onClick={() => onApply(sprint.id)}>{application ? "Applied" : full || !applicationOpen ? "Applications Closed" : "Apply"}</button></div>
            </PortalCard>
          );
        })}
      </div>
    </>
  );
}

function SprintDetails({
  sprintId,
  applications,
  onBack,
  onApply,
}: {
  sprintId: number;
  applications: Application[];
  onBack: () => void;
  onApply: (id: number) => void;
}) {
  const sprint = sprints.find((item) => item.id === sprintId)!;
  const application = applications.find((item) => item.sprintId === sprintId);
  const full = sprint.applicants >= sprint.maxApplicants;
  const applicationOpen = isApplicationOpen(sprint);
  return (
    <>
      <button className="portal-back-link" type="button" onClick={onBack}>← Back to marketplace</button>
      <PageHeading eyebrow="Sprint Details" title={sprint.title} subtitle={`Posted by ${sprint.company} · Applications reviewed blindly`} />
      <div className="details-layout">
        <div>
          <PortalCard><div className="card-title">Complete Task Description</div><p className="detail-copy">{sprint.description} Build the solution using production-minded structure, readable code, and responsive behavior. Include setup instructions and a short explanation of your key decisions. Submit a repository link or source archive before the deadline.</p></PortalCard>
          <PortalCard><div className="card-title">Expected Deliverables</div><ul className="deliverable-list"><li>Working implementation covering the complete task scope</li><li>Clear setup and run instructions</li><li>Short summary of technical decisions and known limitations</li><li>Source link or downloadable archive</li></ul></PortalCard>
        </div>
        <div>
          <PortalCard className="sprint-facts">
            <div><small>Payment</small><strong><Money amount={sprint.payment} /></strong></div>
            <div><small>Application deadline</small><strong>{formatDeadline(sprint.applicationDeadline)}</strong></div>
            <div><small>Sprint completion deadline</small><strong>{sprint.deadline}</strong></div>
            <div><small>Applicant limit</small><strong>{sprint.applicants} / {sprint.maxApplicants}</strong></div>
            <div><small>Required skills</small><span className="badge-row">{sprint.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</span></div>
            <button className="portal-primary" type="button" disabled={Boolean(application) || full || !applicationOpen} onClick={() => onApply(sprint.id)}>{application ? `Application ${application.status}` : full || !applicationOpen ? "Applications Closed" : "Apply for This Sprint"}</button>
          </PortalCard>
          <PortalCard><div className="card-title">About the Employer</div><div className="employer-mini"><span>TN</span><div><strong>{sprint.company}</strong><small>Verified organization · Kathmandu</small></div></div><p className="detail-copy">Technology team building practical digital products for growing businesses.</p></PortalCard>
        </div>
      </div>
    </>
  );
}

function CandidateApplications({ applications, navigate }: { applications: Application[]; navigate: (page: string) => void }) {
  const groups: { title: string; statuses: ApplicationStatus[] }[] = [
    { title: "Review Pending", statuses: ["Pending Review"] },
    { title: "Accepted", statuses: ["Accepted", "Submitted / Under Evaluation", "Completed"] },
    { title: "Rejected", statuses: ["Rejected"] },
  ];
  return (
    <>
      <PageHeading eyebrow="Application Tracking" title="My Applications" subtitle="Track every application from review through completion." />
      <div className="application-groups">
        {groups.map((group) => {
          const items = applications.filter((item) => group.statuses.includes(item.status));
          return (
            <PortalCard key={group.title}>
              <div className="card-heading-row"><div className="card-title">{group.title}</div><Badge tone="gray">{items.length}</Badge></div>
              {items.length ? <div className="application-list">{items.map((application) => {
                const sprint = sprints.find((item) => item.id === application.sprintId)!;
                return <div key={application.sprintId}><div><strong>{sprint.title}</strong><span>{sprint.company} · <Money amount={sprint.payment} /></span></div><Badge tone={application.status === "Rejected" ? "gray" : application.status === "Completed" ? "green" : application.status === "Pending Review" ? "amber" : "pink"}>{application.status}</Badge>{application.status === "Accepted" && <button className="portal-small-button" type="button" onClick={() => navigate("sprints")}>Open Sprint</button>}</div>;
              })}</div> : <div className="empty-state compact">No items in this section.</div>}
            </PortalCard>
          );
        })}
      </div>
    </>
  );
}

function CandidateSprints({ applications, onView, onSubmit }: { applications: Application[]; onView: (sprintId: number) => void; onSubmit: (sprintId: number) => void }) {
  const active = applications.filter((item) => item.status === "Accepted");
  return (
    <>
      <PageHeading eyebrow="My Work" title="Active Sprints" subtitle="Work on accepted sprints that are active and have not been submitted." />
      <div className="marketplace-grid">
        {active.map((application) => {
          const sprint = sprints.find((item) => item.id === application.sprintId);
          if (!sprint) return null;
          return <PortalCard className="market-card" key={application.sprintId}><div className="market-card-top"><div><Badge>{application.status}</Badge><strong>{sprint.title}</strong><span>{sprint.company}</span></div><div><Money amount={sprint.payment} /></div></div><div className="market-meta"><span>Sprint completion deadline · {sprint.deadline}</span><span>Identity protected</span></div><div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View Sprint</button><button className="portal-primary" type="button" onClick={() => onSubmit(sprint.id)}>Submit Work</button></div></PortalCard>;
        })}
      </div>
      {active.length === 0 && <div className="empty-state">No active sprints yet. Accepted work appears here until you submit it.</div>}
    </>
  );
}

function CandidatePayments() {
  const payments = [
    ["Build an Inventory Dashboard in React", 12000, "Held", "After approval"],
    ["REST API for Payment Gateway", 9500, "Released", "Aug 29, 2026"],
    ["Authentication Flow with JWT", 7000, "Released", "Aug 12, 2026"],
    ["Landing Page Accessibility Audit", 5000, "Pending", "Awaiting evaluation"],
  ] as const;
  return (
    <>
      <PageHeading eyebrow="Earnings" title="Payments" subtitle="Track protected sprint payments and your total verified earnings." />
      <div className="portal-stat-grid four"><StatCard label="Total Earnings" value="NPR 21,500" note="Across completed sprints" /><StatCard label="Held" value="NPR 12,000" note="Work in progress" /><StatCard label="Pending" value="NPR 5,000" note="Awaiting approval" /><StatCard label="Released" value="NPR 16,500" note="Available earnings" /></div>
      <PortalCard className="table-card">
        <div className="portal-table candidate-payment-table">
          <div className="table-header"><span>Sprint</span><span>Amount</span><span>Status</span><span>Release Date</span></div>
          {payments.map(([title, amount, status, date]) => <div className="table-row" key={title}><span><strong>{title}</strong></span><span><strong><Money amount={amount} /></strong></span><span><Badge tone={status === "Released" ? "green" : status === "Held" ? "amber" : "pink"}>{status}</Badge></span><span>{date}</span></div>)}
        </div>
      </PortalCard>
    </>
  );
}

function CandidateProfile({ navigate }: { navigate: (page: string) => void }) {
  return (
    <>
      <PageHeading eyebrow="Proof-Based Profile" title="My Profile" subtitle="Your skills and completed work tell the story." action={<button className="portal-secondary" type="button">Edit Profile</button>} />
      <div className="portal-two-column profile-layout">
        <PortalCard><div className="profile-detail-head"><span className="large-avatar">AS</span><div><strong>Aaisha Shrestha</strong><span>Full-Stack Developer · Kathmandu</span><Badge>Identity private</Badge></div></div><p className="profile-description">I enjoy building reliable web products and learning through practical, well-scoped challenges.</p><div className="detail-list"><div><small>Email</small><strong>aaisha@example.com</strong></div><div><small>Portfolio</small><strong>github.com/aaisha</strong></div><div><small>Profile completion</small><strong>85%</strong></div></div></PortalCard>
        <PortalCard><div className="card-title">Verified Skills</div><div className="badge-row profile-skills">{["React", "TypeScript", "Recharts", "Django", "Node.js", "JWT", "PostgreSQL"].map((skill) => <Badge key={skill}>✓ {skill}</Badge>)}</div><div className="form-divider" /><div className="card-title">Proof Trail</div><div className="proof-list"><div><span /><p><strong>REST API for Payment Gateway</strong><small>Score 9.0 · FinBridge Nepal</small></p></div><div><span /><p><strong>Authentication Flow with JWT</strong><small>Score 8.0 · Bazar Digital</small></p></div></div><button className="portal-secondary full" type="button" onClick={() => navigate("identity")}>View Connection Request</button></PortalCard>
      </div>
    </>
  );
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return <PortalCard className="access-denied"><Badge tone="amber">Submission unavailable</Badge><div>Only accepted candidates can submit work.</div><p>This sprint has already been submitted, or your application has not yet been accepted.</p><button className="portal-primary" type="button" onClick={onBack}>Return to My Sprints</button></PortalCard>;
}

export function CandidatePortal({
  onLogout,
  renderSubmission,
  renderIdentity,
}: Pick<PortalProps, "onLogout" | "renderSubmission" | "renderIdentity">) {
  const [page, setPage] = useState("dashboard");
  const [selectedSprint, setSelectedSprint] = useState(1);
  const [detailReturnPage, setDetailReturnPage] = useState("explore");
  const [applications, setApplications] = useState<Application[]>([
    { sprintId: 1, status: "Accepted" },
    { sprintId: 3, status: "Pending Review" },
    { sprintId: 4, status: "Rejected" },
    { sprintId: 2, status: "Completed" },
  ]);
  const apply = (sprintId: number) => {
    const sprint = sprints.find((item) => item.id === sprintId);
    if (!sprint || !isApplicationOpen(sprint) || sprint.applicants >= sprint.maxApplicants || applications.some((item) => item.sprintId === sprintId)) return;
    setApplications((current) => [...current, { sprintId, status: "Pending Review" }]);
    setPage("applications");
  };
  const view = (sprintId: number) => {
    setSelectedSprint(sprintId);
    setDetailReturnPage("explore");
    setPage("detail");
  };
  const submit = (sprintId: number) => {
    setApplications((current) => current.map((item) => item.sprintId === sprintId && item.status === "Accepted" ? { ...item, status: "Submitted / Under Evaluation" } : item));
    setPage("sprints");
  };
  let content: ReactNode;
  switch (page) {
    case "explore": content = <Marketplace onView={view} onApply={apply} applications={applications} />; break;
    case "detail": content = <SprintDetails sprintId={selectedSprint} applications={applications} onBack={() => setPage(detailReturnPage)} onApply={apply} />; break;
    case "applications": content = <CandidateApplications applications={applications} navigate={setPage} />; break;
    case "sprints": content = <CandidateSprints applications={applications} onView={(sprintId) => {
      setSelectedSprint(sprintId);
      setDetailReturnPage("sprints");
      setPage("detail");
    }} onSubmit={(sprintId) => {
      setSelectedSprint(sprintId);
      setPage("submission");
    }} />; break;
    case "payments": content = <CandidatePayments />; break;
    case "profile": content = <CandidateProfile navigate={setPage} />; break;
    case "submission": {
      const canSubmit = applications.some((item) => item.sprintId === selectedSprint && item.status === "Accepted");
      content = canSubmit ? renderSubmission(() => submit(selectedSprint)) : <AccessDenied onBack={() => setPage("sprints")} />;
      break;
    }
    case "identity": content = renderIdentity(); break;
    default: content = <CandidateDashboard applications={applications} navigate={setPage} onView={(sprintId) => {
      setSelectedSprint(sprintId);
      setDetailReturnPage("dashboard");
      setPage("detail");
    }} onSubmit={(sprintId) => {
      setSelectedSprint(sprintId);
      setPage("submission");
    }} />;
  }
  return <PortalShell role="candidate" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
