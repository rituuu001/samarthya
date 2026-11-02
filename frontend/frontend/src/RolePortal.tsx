import { FormEvent, ReactNode, useMemo, useState } from "react";
import samarthyaLogo from "@/imports/image.png";
import type { AuthRole } from "@/AuthFlow";

type PortalProps = {
  role: AuthRole;
  onLogout: () => void;
  renderSubmission: (onSubmitted: () => void) => ReactNode;
  renderEvaluation: () => ReactNode;
  renderIdentity: () => ReactNode;
};

type StatusTone = "pink" | "gray" | "amber" | "green";

const sprints = [
  {
    id: 1,
    title: "Build an Inventory Dashboard in React",
    description: "Create a responsive inventory dashboard with product filters, stock alerts, and a clear summary visualization.",
    payment: 12000,
    skills: ["React", "TypeScript", "Recharts"],
    deadline: "Sep 20, 2026",
    company: "TechNova Pvt. Ltd.",
    applicants: 8,
    maxApplicants: 12,
  },
  {
    id: 2,
    title: "REST API for Payment Gateway Integration",
    description: "Build and document secure payment endpoints with webhook verification, retries, and transaction logging.",
    payment: 9500,
    skills: ["Django", "PostgreSQL", "Stripe API"],
    deadline: "Sep 18, 2026",
    company: "FinBridge Nepal",
    applicants: 10,
    maxApplicants: 10,
  },
  {
    id: 3,
    title: "Design & Implement Auth Flow",
    description: "Create a complete JWT and OTP authentication flow with clear error states and secure refresh handling.",
    payment: 7000,
    skills: ["Node.js", "JWT", "Redis"],
    deadline: "Sep 24, 2026",
    company: "Bazar Digital",
    applicants: 5,
    maxApplicants: 8,
  },
  {
    id: 4,
    title: "Analyze Customer Retention Dataset",
    description: "Explore a customer dataset, identify retention patterns, and present practical recommendations.",
    payment: 8500,
    skills: ["Python", "Pandas", "Data Analysis"],
    deadline: "Sep 28, 2026",
    company: "Naya Insights",
    applicants: 3,
    maxApplicants: 10,
  },
];

function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function Badge({ children, tone = "pink" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`portal-badge portal-badge-${tone}`}>{children}</span>;
}

function PortalCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`portal-card ${className}`}>{children}</div>;
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="portal-page-heading">
      <div>
        <div className="portal-eyebrow">{eyebrow}</div>
        <div className="portal-title">{title}</div>
        <div className="portal-subtitle">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <PortalCard className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </PortalCard>
  );
}

function PaymentSummary({
  held,
  pending,
  released,
}: {
  held: string;
  pending: string;
  released: string;
}) {
  return (
    <PortalCard>
      <div className="card-heading-row">
        <div>
          <div className="card-title">Payment Progress</div>
          <div className="card-subtitle">Escrow and release status across your sprints.</div>
        </div>
        <Badge tone="gray">Protected payments</Badge>
      </div>
      <div className="payment-summary-grid">
        <div><span className="payment-dot held" /><small>Held</small><strong>{held}</strong></div>
        <div><span className="payment-dot pending" /><small>Pending Approval</small><strong>{pending}</strong></div>
        <div><span className="payment-dot released" /><small>Released</small><strong>{released}</strong></div>
      </div>
    </PortalCard>
  );
}

const employerNav = [
  ["dashboard", "Dashboard"],
  ["create", "Create Sprint"],
  ["sprints", "My Sprints"],
  ["applicants", "Applicants"],
  ["evaluation", "Evaluation"],
  ["payments", "Payments"],
  ["profile", "Organization Profile"],
] as const;

const candidateNav = [
  ["dashboard", "Dashboard"],
  ["explore", "Explore Sprints"],
  ["applications", "My Applications"],
  ["sprints", "My Sprints"],
  ["payments", "Payments"],
  ["profile", "My Profile"],
] as const;

function PortalShell({
  role,
  active,
  setActive,
  onLogout,
  children,
}: {
  role: AuthRole;
  active: string;
  setActive: (page: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const nav = role === "employer" ? employerNav : candidateNav;
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-logo">
          <img src={samarthyaLogo} alt="Samarthya logo" />
          <div><strong>सामर्थ्य</strong><small>Prove First, Connect Later.</small></div>
        </div>
        <div className="portal-role-label">{role === "employer" ? "Employer workspace" : "Candidate workspace"}</div>
        <nav className="portal-nav">
          {nav.map(([id, label], index) => (
            <button
              type="button"
              key={id}
              className={active === id ? "portal-nav-active" : ""}
              onClick={() => setActive(id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <button type="button" onClick={() => setActive("profile")}>
            <span className="portal-avatar">{role === "employer" ? "RS" : "AS"}</span>
            <span><strong>{role === "employer" ? "Rohan Sharma" : "Aaisha Shrestha"}</strong><small>View profile</small></span>
          </button>
          <button type="button" className="logout-button" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-mobile-header">
          <div className="portal-logo"><img src={samarthyaLogo} alt="" /><strong>सामर्थ्य</strong></div>
          <button type="button" onClick={onLogout}>Log out</button>
        </header>
        <nav className="portal-mobile-nav">
          {nav.map(([id, label]) => (
            <button type="button" key={id} className={active === id ? "portal-nav-active" : ""} onClick={() => setActive(id)}>
              {label}
            </button>
          ))}
        </nav>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}

function EmployerDashboard({ navigate }: { navigate: (page: string) => void }) {
  return (
    <>
      <PageHeading
        eyebrow="Employer Dashboard"
        title="Good morning, Rohan."
        subtitle="Here's what's happening across TechNova's proof sprints."
        action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>}
      />
      <PortalCard className="profile-summary">
        <div className="profile-summary-person">
          <span className="large-avatar">RS</span>
          <div><strong>Rohan Sharma</strong><span>Talent Lead · TechNova Pvt. Ltd.</span><small>rohan@technova.com</small></div>
        </div>
        <div className="organization-summary">
          <div><small>Organization</small><strong>TechNova Pvt. Ltd.</strong></div>
          <div><small>Type</small><strong>Technology Company</strong></div>
          <div><small>Team size</small><strong>51–200</strong></div>
          <Badge>Verified employer</Badge>
        </div>
      </PortalCard>
      <div className="portal-stat-grid">
        <StatCard label="Total Sprints" value="12" note="Across all time" />
        <StatCard label="Active Sprints" value="4" note="2 closing this week" />
        <StatCard label="Total Applicants" value="47" note="8 awaiting review" />
        <StatCard label="Completed Sprints" value="8" note="NPR 86,000 released" />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row">
            <div><div className="card-title">Ongoing Sprints</div><div className="card-subtitle">Current tasks and applicant activity.</div></div>
            <button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button>
          </div>
          <div className="compact-list">
            {sprints.slice(0, 3).map((sprint, index) => (
              <button type="button" key={sprint.id} onClick={() => navigate(index === 0 ? "applicants" : "sprints")}>
                <div><strong>{sprint.title}</strong><span><Money amount={sprint.payment} /> · Due {sprint.deadline}</span></div>
                <div><Badge tone={index === 1 ? "amber" : "pink"}>{index === 1 ? "Limit reached" : "Active"}</Badge><small>{sprint.applicants}/{sprint.maxApplicants} applicants</small></div>
              </button>
            ))}
          </div>
        </PortalCard>
        <PaymentSummary held="NPR 28,500" pending="NPR 12,000" released="NPR 86,000" />
      </div>
    </>
  );
}

function CreateSprint({ onPosted }: { onPosted: () => void }) {
  const [skills, setSkills] = useState(["React", "TypeScript"]);
  const [skill, setSkill] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onPosted();
  };
  return (
    <>
      <PageHeading eyebrow="Employer Workspace" title="Create Proof Sprint" subtitle="Define a focused paid task and lock payment before publishing." />
      <form onSubmit={submit} className="portal-form-card">
        <div className="form-section-heading"><span>01</span><div><strong>Task Details</strong><small>Keep the scope practical and achievable.</small></div></div>
        <div className="portal-form-grid">
          <label className="portal-field portal-span"><span>Task Title *</span><input required placeholder="e.g. Build an inventory dashboard in React" /></label>
          <label className="portal-field portal-span"><span>Description *</span><textarea required rows={5} placeholder="Describe the task, expected output, constraints, and how the work will be reviewed." /></label>
          <label className="portal-field"><span>Payment Amount (NPR) *</span><input required inputMode="numeric" placeholder="12,000" /></label>
          <label className="portal-field"><span>Deadline *</span><input required type="date" /></label>
          <label className="portal-field portal-span"><span>Required Skills *</span>
            <div className="portal-tag-input">
              {skills.map((item) => <span key={item}>{item}<button type="button" onClick={() => setSkills(skills.filter((value) => value !== item))}>×</button></span>)}
              <input value={skill} placeholder="Add skill, press Enter" onChange={(event) => setSkill(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && skill.trim()) {
                  event.preventDefault();
                  setSkills([...skills, skill.trim()]);
                  setSkill("");
                }
              }} />
            </div>
          </label>
          <label className="portal-field"><span>Maximum Number of Applicants *</span><input required type="number" min="1" defaultValue="10" /></label>
          <div className="applicant-limit-note"><span>i</span>Once the applicant limit is reached, new applications will automatically close.</div>
        </div>
        <div className="escrow-panel">
          <div><span className="escrow-mark">✓</span><div><strong>Escrow Protection</strong><small>Payment is locked until you approve the submitted work.</small></div></div>
          <button className="portal-primary" type="submit">Lock Payment &amp; Post Sprint →</button>
        </div>
      </form>
    </>
  );
}

function EmployerSprints({ navigate }: { navigate: (page: string) => void }) {
  const rows = [
    ...sprints.slice(0, 3).map((sprint, index) => ({ ...sprint, status: index === 1 ? "Closed" : "Active" })),
    { ...sprints[3], title: "Customer Retention Data Analysis", applicants: 10, maxApplicants: 10, status: "Completed" },
  ];
  return (
    <>
      <PageHeading eyebrow="Sprint Management" title="My Sprints" subtitle="Manage active, completed, and closed proof sprints." action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>} />
      <div className="filter-tabs"><button className="active" type="button">All <span>12</span></button><button type="button">Active <span>4</span></button><button type="button">Completed <span>6</span></button><button type="button">Closed <span>2</span></button></div>
      <PortalCard className="table-card">
        <div className="portal-table sprint-table">
          <div className="table-header"><span>Sprint</span><span>Applicants</span><span>Payment</span><span>Status</span><span>Actions</span></div>
          {rows.map((sprint) => (
            <div className="table-row" key={sprint.id}>
              <span><strong>{sprint.title}</strong><small>Deadline · {sprint.deadline}</small></span>
              <span><strong>{sprint.applicants} / {sprint.maxApplicants}</strong><small>{Math.round((sprint.applicants / sprint.maxApplicants) * 100)}% filled</small></span>
              <span><strong><Money amount={sprint.payment} /></strong><small>Escrow funded</small></span>
              <span><Badge tone={sprint.status === "Active" ? "pink" : sprint.status === "Completed" ? "green" : "gray"}>{sprint.status}</Badge></span>
              <span className="table-actions">
                <button type="button" onClick={() => navigate("applicants")}>View Applicants</button>
                <button type="button">Manage</button>
                {sprint.status === "Active" && <button type="button">Close</button>}
              </span>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}

function Applicants({ navigate }: { navigate: (page: string) => void }) {
  const applicants = [
    ["Contributor #8041", "Sep 12, 2026", ["React", "TypeScript", "Recharts"], "Ready to evaluate"],
    ["Contributor #5927", "Sep 12, 2026", ["React", "Zustand", "CSS"], "Submitted"],
    ["Contributor #4318", "Sep 13, 2026", ["TypeScript", "Recharts", "Testing"], "Accepted"],
    ["Contributor #2750", "Sep 14, 2026", ["React", "JavaScript", "REST API"], "Pending review"],
  ] as const;
  return (
    <>
      <PageHeading eyebrow="Blind Applicant Review" title="Applicants" subtitle="Candidate identities stay protected throughout screening and evaluation." />
      <PortalCard className="privacy-banner"><span>Identity protected</span><p>Review contributors using skills, application status, and submitted work only. Names and photos remain hidden.</p></PortalCard>
      <PortalCard className="table-card">
        <div className="card-heading-row table-title"><div><div className="card-title">Build an Inventory Dashboard in React</div><div className="card-subtitle">8 of 12 applicant spaces filled</div></div><Badge>Applications open</Badge></div>
        <div className="portal-table applicant-table">
          <div className="table-header"><span>Contributor</span><span>Applied</span><span>Skills</span><span>Status</span><span>Action</span></div>
          {applicants.map(([id, date, skills, status], index) => (
            <div className="table-row" key={id}>
              <span><strong>{id}</strong><small>Identity hidden</small></span>
              <span>{date}</span>
              <span className="table-skills">{skills.map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</span>
              <span><Badge tone={index === 0 ? "pink" : index === 2 ? "green" : "amber"}>{status}</Badge></span>
              <span><button className="portal-small-button" type="button" onClick={() => index === 0 && navigate("evaluation")}>{index === 0 ? "Evaluate Work" : "View Application"}</button></span>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}

function EmployerPayments() {
  const payments = [
    ["Build an Inventory Dashboard in React", "Contributor #8041", 12000, "Pending Approval"],
    ["REST API for Payment Gateway", "Contributor #5927", 9500, "Held"],
    ["Authentication Flow with JWT", "Contributor #4318", 7000, "Released"],
    ["Customer Retention Analysis", "Contributor #2750", 8500, "Released"],
  ] as const;
  return (
    <>
      <PageHeading eyebrow="Payment Management" title="Payments" subtitle="Track escrow, approval, and released sprint payments." />
      <div className="portal-stat-grid three"><StatCard label="Currently Held" value="NPR 21,500" note="2 funded sprints" /><StatCard label="Pending Approval" value="NPR 12,000" note="1 submitted sprint" /><StatCard label="Total Released" value="NPR 86,000" note="8 completed sprints" /></div>
      <PortalCard className="table-card">
        <div className="portal-table payment-table">
          <div className="table-header"><span>Sprint</span><span>Contributor</span><span>Amount</span><span>Status</span></div>
          {payments.map(([title, contributor, amount, status]) => (
            <div className="table-row" key={title}><span><strong>{title}</strong></span><span>{contributor}</span><span><strong><Money amount={amount} /></strong></span><span><Badge tone={status === "Released" ? "green" : status === "Held" ? "amber" : "pink"}>{status}</Badge></span></div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}

function EmployerProfile() {
  return (
    <>
      <PageHeading eyebrow="Account & Trust" title="Organization Profile" subtitle="Manage public organization details and employer verification." action={<button className="portal-secondary" type="button">Edit Profile</button>} />
      <div className="portal-two-column profile-layout">
        <PortalCard>
          <div className="profile-detail-head"><span className="large-avatar">RS</span><div><strong>Rohan Sharma</strong><span>Talent Lead</span><Badge>Verified contact</Badge></div></div>
          <div className="detail-list"><div><small>Work email</small><strong>rohan@technova.com</strong></div><div><small>Position</small><strong>Talent Lead</strong></div><div><small>Member since</small><strong>March 2026</strong></div></div>
        </PortalCard>
        <PortalCard>
          <div className="card-heading-row"><div><div className="card-title">TechNova Pvt. Ltd.</div><div className="card-subtitle">Technology Company · 51–200 employees</div></div><Badge>Verified</Badge></div>
          <p className="profile-description">TechNova builds reliable digital products for growing businesses across South Asia, with teams focused on web platforms, data, and financial technology.</p>
          <div className="detail-list"><div><small>Website</small><strong>technova.example</strong></div><div><small>Location</small><strong>Kathmandu, Nepal</strong></div><div><small>Sprints completed</small><strong>8</strong></div></div>
        </PortalCard>
      </div>
    </>
  );
}

type ApplicationStatus = "Pending Review" | "Accepted" | "Rejected" | "Completed" | "Submitted / Under Evaluation";
type Application = { sprintId: number; status: ApplicationStatus };

function CandidateDashboard({
  navigate,
  applications,
}: {
  navigate: (page: string) => void;
  applications: Application[];
}) {
  const active = applications.find((item) => item.status === "Accepted" || item.status === "Submitted / Under Evaluation");
  return (
    <>
      <PageHeading eyebrow="Candidate Dashboard" title="Welcome back, Aaisha." subtitle="Build your proof trail through real work and verified skills." action={<button className="portal-primary" type="button" onClick={() => navigate("explore")}>Explore Sprints</button>} />
      <PortalCard className="profile-summary candidate-summary">
        <div className="profile-summary-person"><span className="large-avatar">AS</span><div><strong>Aaisha Shrestha</strong><span>Full-Stack Developer · Kathmandu</span><small>Profile completion · 85%</small></div></div>
        <div className="profile-progress"><div><span>Profile strength</span><strong>85%</strong></div><div><span /></div><button type="button" onClick={() => navigate("profile")}>Complete profile</button></div>
      </PortalCard>
      <div className="skills-summary">
        <PortalCard><div className="card-title">Self-declared Skills</div><div className="badge-row">{["Node.js", "PostgreSQL", "REST API"].map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</div></PortalCard>
        <PortalCard><div className="card-title">Verified Skills</div><div className="badge-row">{["React", "TypeScript", "Recharts", "Django"].map((skill) => <Badge key={skill}>✓ {skill}</Badge>)}</div></PortalCard>
      </div>
      <div className="portal-stat-grid">
        <StatCard label="Total Applications" value={String(applications.length)} note="Across all sprints" />
        <StatCard label="Pending Applications" value={String(applications.filter((item) => item.status === "Pending Review").length)} note="Awaiting employer review" />
        <StatCard label="Accepted Sprints" value={String(applications.filter((item) => item.status === "Accepted" || item.status.includes("Submitted")).length)} note="Ready for your work" />
        <StatCard label="Completed Sprints" value={String(applications.filter((item) => item.status === "Completed").length)} note="Added to proof trail" />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row"><div><div className="card-title">My Active Sprints</div><div className="card-subtitle">Accepted work currently in progress.</div></div><button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button></div>
          {active ? (
            <div className="active-sprint-card">
              <div><Badge>{active.status}</Badge><strong>{sprints.find((item) => item.id === active.sprintId)?.title}</strong><span><Money amount={12000} /> · Due Sep 20, 2026</span></div>
              <div><button className="portal-secondary" type="button" onClick={() => navigate("sprints")}>View Sprint</button>{active.status === "Accepted" && <button className="portal-primary" type="button" onClick={() => navigate("submission")}>Submit Work</button>}</div>
            </div>
          ) : <div className="empty-state">No active sprints yet. Explore opportunities to begin.</div>}
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
  const visible = useMemo(() => sprints.filter((sprint) => {
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
          return (
            <PortalCard className="market-card" key={sprint.id}>
              <div className="market-card-top"><div><strong>{sprint.title}</strong><span>{sprint.company}</span></div><div><Money amount={sprint.payment} /></div></div>
              <p>{sprint.description}</p>
              <div className="badge-row">{sprint.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
              <div className="market-meta"><span>Deadline · {sprint.deadline}</span><span className={full ? "limit-full" : ""}>{sprint.applicants} / {sprint.maxApplicants} applicants</span></div>
              <div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View</button><button className="portal-primary" type="button" disabled={Boolean(application) || full} onClick={() => onApply(sprint.id)}>{application ? "Applied" : full ? "Applications Closed" : "Apply"}</button></div>
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
            <div><small>Deadline</small><strong>{sprint.deadline}</strong></div>
            <div><small>Applicant limit</small><strong>{sprint.applicants} / {sprint.maxApplicants}</strong></div>
            <div><small>Required skills</small><span className="badge-row">{sprint.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</span></div>
            <button className="portal-primary" type="button" disabled={Boolean(application) || full} onClick={() => onApply(sprint.id)}>{application ? `Application ${application.status}` : full ? "Applicant Limit Reached" : "Apply for This Sprint"}</button>
          </PortalCard>
          <PortalCard><div className="card-title">About the Employer</div><div className="employer-mini"><span>TN</span><div><strong>{sprint.company}</strong><small>Verified organization · Kathmandu</small></div></div><p className="detail-copy">Technology team building practical digital products for growing businesses.</p></PortalCard>
        </div>
      </div>
    </>
  );
}

function CandidateApplications({ applications, navigate }: { applications: Application[]; navigate: (page: string) => void }) {
  const groups: { title: string; statuses: ApplicationStatus[] }[] = [
    { title: "Pending Applications", statuses: ["Pending Review"] },
    { title: "Accepted Sprints", statuses: ["Accepted", "Submitted / Under Evaluation"] },
    { title: "Rejected Applications", statuses: ["Rejected"] },
    { title: "Completed Sprints", statuses: ["Completed"] },
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

function CandidateSprints({ applications, navigate }: { applications: Application[]; navigate: (page: string) => void }) {
  const accepted = applications.filter((item) => ["Accepted", "Submitted / Under Evaluation", "Completed"].includes(item.status));
  return (
    <>
      <PageHeading eyebrow="My Work" title="My Sprints" subtitle="Access accepted work, submit deliverables, and review completed proof." />
      <div className="marketplace-grid">
        {accepted.map((application) => {
          const sprint = sprints.find((item) => item.id === application.sprintId)!;
          return <PortalCard className="market-card" key={application.sprintId}><div className="market-card-top"><div><Badge tone={application.status === "Completed" ? "green" : "pink"}>{application.status}</Badge><strong>{sprint.title}</strong><span>{sprint.company}</span></div><div><Money amount={sprint.payment} /></div></div><div className="market-meta"><span>Deadline · {sprint.deadline}</span><span>Identity protected</span></div><div className="market-actions"><button className="portal-secondary" type="button" onClick={() => navigate("detail")}>View Sprint</button>{application.status === "Accepted" && <button className="portal-primary" type="button" onClick={() => navigate("submission")}>Submit Work</button>}{application.status === "Completed" && <button className="portal-primary" type="button" onClick={() => navigate("identity")}>Connection Request</button>}</div></PortalCard>;
        })}
      </div>
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

function EmployerPortal({ onLogout, renderEvaluation }: Pick<PortalProps, "onLogout" | "renderEvaluation">) {
  const [page, setPage] = useState("dashboard");
  const content = {
    dashboard: <EmployerDashboard navigate={setPage} />,
    create: <CreateSprint onPosted={() => setPage("sprints")} />,
    sprints: <EmployerSprints navigate={setPage} />,
    applicants: <Applicants navigate={setPage} />,
    evaluation: renderEvaluation(),
    payments: <EmployerPayments />,
    profile: <EmployerProfile />,
  }[page] ?? <EmployerDashboard navigate={setPage} />;
  return <PortalShell role="employer" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}

function CandidatePortal({
  onLogout,
  renderSubmission,
  renderIdentity,
}: Pick<PortalProps, "onLogout" | "renderSubmission" | "renderIdentity">) {
  const [page, setPage] = useState("dashboard");
  const [selectedSprint, setSelectedSprint] = useState(1);
  const [applications, setApplications] = useState<Application[]>([
    { sprintId: 1, status: "Accepted" },
    { sprintId: 3, status: "Pending Review" },
    { sprintId: 4, status: "Rejected" },
    { sprintId: 2, status: "Completed" },
  ]);

  const apply = (sprintId: number) => {
    const sprint = sprints.find((item) => item.id === sprintId);
    if (!sprint || sprint.applicants >= sprint.maxApplicants || applications.some((item) => item.sprintId === sprintId)) return;
    setApplications((current) => [...current, { sprintId, status: "Pending Review" }]);
    setPage("applications");
  };

  const view = (sprintId: number) => {
    setSelectedSprint(sprintId);
    setPage("detail");
  };

  const submit = () => {
    setApplications((current) => current.map((item) => item.sprintId === 1 && item.status === "Accepted" ? { ...item, status: "Submitted / Under Evaluation" } : item));
    setPage("sprints");
  };

  let content: ReactNode;
  switch (page) {
    case "explore": content = <Marketplace onView={view} onApply={apply} applications={applications} />; break;
    case "detail": content = <SprintDetails sprintId={selectedSprint} applications={applications} onBack={() => setPage("explore")} onApply={apply} />; break;
    case "applications": content = <CandidateApplications applications={applications} navigate={setPage} />; break;
    case "sprints": content = <CandidateSprints applications={applications} navigate={(next) => {
      if (next === "detail") setSelectedSprint(1);
      setPage(next);
    }} />; break;
    case "submission": {
      const canSubmit = applications.some((item) => item.sprintId === 1 && item.status === "Accepted");
      content = canSubmit ? renderSubmission(submit) : <AccessDenied onBack={() => setPage("sprints")} />;
      break;
    }
    case "payments": content = <CandidatePayments />; break;
    case "profile": content = <CandidateProfile navigate={setPage} />; break;
    case "identity": content = renderIdentity(); break;
    default: content = <CandidateDashboard navigate={setPage} applications={applications} />;
  }
  return <PortalShell role="candidate" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return <PortalCard className="access-denied"><Badge tone="amber">Submission unavailable</Badge><div>Only accepted candidates can submit work.</div><p>This sprint has already been submitted, or your application has not yet been accepted.</p><button className="portal-primary" type="button" onClick={onBack}>Return to My Sprints</button></PortalCard>;
}

export default function RolePortal(props: PortalProps) {
  return props.role === "employer"
    ? <EmployerPortal onLogout={props.onLogout} renderEvaluation={props.renderEvaluation} />
    : <CandidatePortal onLogout={props.onLogout} renderSubmission={props.renderSubmission} renderIdentity={props.renderIdentity} />;
}
