import { FormEvent, ReactNode, useState } from "react";
import type { PortalProps } from "@/RolePortal";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PaymentSummary } from "@/components/portal/PaymentSummary";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ReportUserButton } from "@/components/portal/ReportUserModal";
import { StatCard } from "@/components/portal/StatCard";
import type { CandidateVerification } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, Sprint } from "@/data/portalData";
import { formatDeadline, sprints } from "@/data/portalData";

function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function getDeadlineError(applicationDeadline: string, completionDeadline: string) {
  return applicationDeadline && completionDeadline && applicationDeadline > completionDeadline
    ? "Application Deadline must be on or before Sprint Completion Deadline."
    : "";
}

function EmployerDashboard({ navigate }: { navigate: (page: string) => void }) {
  const activeSprints = sprints.filter((sprint) => sprint.status === "Active");
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
        <StatCard label="Total Sprints" value={String(sprints.length)} note="Across all sprints" />
        <StatCard label="Active Sprints" value={String(activeSprints.length)} note="Currently accepting or completing work" />
        <StatCard label="Total Applicants" value={String(sprints.reduce((total, sprint) => total + sprint.applicants, 0))} note="Across all sprints" />
        <StatCard label="Completed Sprints" value={String(sprints.filter((sprint) => sprint.status === "Completed").length)} note="Completed work" />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row">
            <div><div className="card-title">Ongoing Sprints</div><div className="card-subtitle">Current tasks and applicant activity.</div></div>
            <button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button>
          </div>
          <div className="compact-list">
            {activeSprints.map((sprint) => (
              <button type="button" key={sprint.id} onClick={() => navigate("applicants")}>
                <div><strong>{sprint.title}</strong><span><Money amount={sprint.payment} /> · Sprint completion deadline {sprint.deadline}</span></div>
                <div><Badge>{sprint.status}</Badge><small>{sprint.applicants}/{sprint.maxApplicants} applicants</small></div>
              </button>
            ))}
            {activeSprints.length === 0 && <div className="empty-state compact">No ongoing sprints.</div>}
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
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [completionDeadline, setCompletionDeadline] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = getDeadlineError(applicationDeadline, completionDeadline);
    if (error) {
      setDeadlineError(error);
      return;
    }
    setDeadlineError("");
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
          <label className="portal-field"><span>Application Deadline *</span><input required type="date" max={completionDeadline || undefined} value={applicationDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
            const nextDeadline = event.target.value;
            setApplicationDeadline(nextDeadline);
            setDeadlineError(getDeadlineError(nextDeadline, completionDeadline));
          }} /><small>Last date candidates can apply.</small></label>
          <label className="portal-field"><span>Sprint Completion Deadline *</span><input required type="date" min={applicationDeadline || undefined} value={completionDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
            const nextDeadline = event.target.value;
            setCompletionDeadline(nextDeadline);
            setDeadlineError(getDeadlineError(applicationDeadline, nextDeadline));
          }} /><small>Last date accepted candidates must submit their work.</small></label>
          {deadlineError && <div className="form-error portal-span" role="alert">{deadlineError}</div>}
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
  const rows = sprints;
  return (
    <>
      <PageHeading eyebrow="Sprint Management" title="My Sprints" subtitle="Manage active, completed, and closed proof sprints." action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>} />
      <div className="filter-tabs"><button className="active" type="button">All <span>12</span></button><button type="button">Active <span>4</span></button><button type="button">Completed <span>6</span></button><button type="button">Closed <span>2</span></button></div>
      <PortalCard className="table-card">
        <div className="portal-table sprint-table">
          <div className="table-header"><span>Sprint</span><span>Applicants</span><span>Payment</span><span>Status</span><span>Actions</span></div>
          {rows.map((sprint) => (
            <div className="table-row" key={sprint.id}>
              <span><strong>{sprint.title}</strong><small>Sprint completion deadline · {sprint.deadline}</small><small>Application deadline · {formatDeadline(sprint.applicationDeadline)}</small></span>
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

const applicants = [
  ["Contributor #8041", "Sep 12, 2026", ["React", "TypeScript", "Recharts"], "Pending Review"],
  ["Contributor #5927", "Sep 12, 2026", ["React", "Zustand", "CSS"], "Submitted / Under Evaluation"],
  ["Contributor #4318", "Sep 13, 2026", ["TypeScript", "Recharts", "Testing"], "Accepted"],
  ["Contributor #2750", "Sep 14, 2026", ["React", "JavaScript", "REST API"], "Pending Review"],
] as const;

function Applicants({ candidateVerification, candidateApplications, applicantStatuses = {}, onViewApplication }: { navigate?: (page: string) => void; candidateVerification: CandidateVerification; candidateApplications: Application[]; applicantStatuses?: Record<string, ApplicationStatus>; onViewApplication: (applicantId: string, sprintId: number) => void }) {
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  const selectedApplicantData = applicants.find(([id]) => id === selectedApplicant);
  const selectedApplicantIndex = selectedApplicantData ? applicants.indexOf(selectedApplicantData) : -1;
  const selectedApplication = selectedApplicantIndex === 0
    ? candidateApplications.find((application) => application.sprintId === 1)
    : undefined;
  const selectedVerification = selectedApplicantIndex === 0 ? candidateVerification : undefined;
  return (
    <>
      <PageHeading eyebrow="Blind Applicant Review" title="Applicants" subtitle="Candidate identities stay protected throughout screening and evaluation." />
      <PortalCard className="privacy-banner"><span>Identity protected</span><p>Review contributors using skills, application status, and submitted work only. Names and photos remain hidden.</p></PortalCard>
      {selectedApplicantData && (
        <PortalCard className="anonymous-profile">
          <div className="card-heading-row">
            <div>
              <div className="card-title">{selectedApplicantData[0]}</div>
              <div className="card-subtitle">Anonymous candidate profile · Identity hidden</div>
            </div>
            <button className="portal-secondary" type="button" onClick={() => setSelectedApplicant(null)}>Close profile</button>
          </div>
          <div className="anonymous-profile-grid">
            <div>
              <span className="anonymous-avatar">🔒</span>
              <strong>Proof-of-work contributor</strong>
              <small>Personal identity is protected during screening.</small>
            </div>
            <div className="detail-list">
              <div><small>Skills</small><strong>{selectedApplicantData[2].join(" · ")}</strong></div>
              <div><small>Verification</small><strong>{selectedVerification ? `${selectedVerification.percentage.toFixed(2)}% · ${selectedVerification.status}` : "Not yet verified"}</strong></div>
              <div><small>Application status</small><strong>{selectedApplication?.status ?? selectedApplicantData[3]}</strong></div>
            </div>
          </div>
          <div className="anonymous-profile-note">
            <strong>Available for review</strong>
            <span>Skills, verification progress, application status, and submitted work can be reviewed. Name, photo, email, and location remain hidden.</span>
          </div>
        </PortalCard>
      )}
      <PortalCard className="table-card">
        <div className="card-heading-row table-title">
          <div><div className="card-title">Build an Inventory Dashboard in React</div><div className="card-subtitle">8 of 12 applicant spaces filled</div><Badge>Applications open</Badge></div>
        </div>
        <div className="portal-table applicant-table">
          <div className="table-header"><span>Contributor</span><span>Applied</span><span>Skills</span><span>Verification</span><span>Status</span><span>Action</span></div>
          {applicants.map(([id, date, skills, status], index) => {
            const sprintApplication = index === 0 ? candidateApplications.find((application) => application.sprintId === 1) : undefined;
            const verificationPercentage = index === 0 ? candidateVerification.percentage : 0;
            const verificationStatus = index === 0
              ? candidateVerification.percentage === 100 ? "Samarthya Verified" : candidateVerification.status
              : "Not yet verified";
            const applicantStatus = index === 0
              ? applicantStatuses[id] ?? sprintApplication?.status ?? "Pending Review"
              : applicantStatuses[id] ?? status;
            return (
              <div className="table-row" key={id}>
                <span data-label="Contributor"><button className="contributor-link" type="button" onClick={() => setSelectedApplicant(id)}><strong>{id}</strong></button><small>Identity hidden · View profile</small></span>
                <span data-label="Applied">{date}</span>
                <span className="table-skills" data-label="Skills">{skills.map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</span>
                <span className="applicant-verification" data-label="Verification">
                  <strong>{verificationPercentage.toFixed(2)}%</strong>
                  <span className="applicant-verification-track" role="progressbar" aria-label={`${id} verification progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={verificationPercentage}><span style={{ width: `${verificationPercentage}%` }} /></span>
                  <small>{verificationStatus}</small>
                </span>
                <span data-label="Status"><Badge tone={applicantStatus === "Accepted" || applicantStatus === "Completed" ? "green" : applicantStatus === "Rejected" ? "gray" : applicantStatus === "Under Review" || applicantStatus === "Pending Review" || applicantStatus === "Submitted / Under Evaluation" ? "amber" : "pink"}>{applicantStatus}</Badge></span>
                <span className="applicant-actions" data-label="Action"><button className="portal-small-button" type="button" onClick={() => onViewApplication(id, 1)}>View Application</button><ReportUserButton reportedUser={id} /></span>
              </div>
            );
          })}
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

export function EmployerPortal({ onLogout, renderEvaluation, onApplicationDecision, candidateVerification, candidateApplications }: Pick<PortalProps, "onLogout" | "onApplicationDecision"> & { renderEvaluation: (props: { applicantId: string; sprint: Sprint; application: Application | undefined; onBack: () => void; onDecision: (status: ApplicationStatus) => void }) => ReactNode; candidateVerification: CandidateVerification; candidateApplications: Application[] }) {
  const [page, setPage] = useState("dashboard");
  const [selectedApplication, setSelectedApplication] = useState<{ applicantId: string; sprintId: number } | null>(null);
  const [applicantStatuses, setApplicantStatuses] = useState<Record<string, ApplicationStatus>>({});
  const openApplication = (applicantId: string, sprintId: number) => {
    setSelectedApplication({ applicantId, sprintId });
    setPage("evaluation");
  };
  const decideApplication = (status: ApplicationStatus) => {
    if (!selectedApplication) return;
    setApplicantStatuses((current) => ({ ...current, [selectedApplication.applicantId]: status }));
    onApplicationDecision(selectedApplication.sprintId, status);
    setPage("applicants");
  };
  const selectedSprint = selectedApplication ? sprints.find((sprint) => sprint.id === selectedApplication.sprintId) : undefined;
  const selectedCandidateApplication = selectedApplication
    ? candidateApplications.find((application) => application.sprintId === selectedApplication.sprintId)
    : undefined;
  const content = {
    dashboard: <EmployerDashboard navigate={setPage} />,
    create: <CreateSprint onPosted={() => setPage("sprints")} />,
    sprints: <EmployerSprints navigate={setPage} />,
    applicants: <Applicants navigate={setPage} candidateVerification={candidateVerification} candidateApplications={candidateApplications} applicantStatuses={applicantStatuses} onViewApplication={openApplication} />,
    evaluation: selectedApplication && selectedSprint
      ? renderEvaluation({
        applicantId: selectedApplication.applicantId,
        sprint: selectedSprint,
        application: selectedCandidateApplication,
        onBack: () => setPage("applicants"),
        onDecision: decideApplication,
      })
      : <Applicants navigate={setPage} candidateVerification={candidateVerification} candidateApplications={candidateApplications} applicantStatuses={applicantStatuses} onViewApplication={openApplication} />,
    payments: <EmployerPayments />,
    profile: <EmployerProfile />,
  }[page] ?? <EmployerDashboard navigate={setPage} />;
  return <PortalShell role="employer" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
