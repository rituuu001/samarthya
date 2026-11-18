import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { PortalProps } from "@/RolePortal";
import { SubmissionReview } from "@/components/portal/SubmissionReview";
import { ApplicationReview } from "@/components/portal/ApplicationReview";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PaymentSummary } from "@/components/portal/PaymentSummary";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ReportUserButton } from "@/components/portal/ReportUserModal";
import { StatCard } from "@/components/portal/StatCard";
import { createSprint, getMySprints, publishSprint } from "@/api/sprint";
import type { SprintCreateRequest, SprintResponse } from "@/api/sprint";
import { getMyPayments, type PaymentHistoryResponse } from "@/api/payment";
import type { CandidateVerification } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, Sprint } from "@/data/portalData";
import { formatDeadline, sprints } from "@/data/portalData";
import { formatCurrency } from "@/utils/currency";
import type { EmployerProfileData } from "@/auth/types";


function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function formatBackendDate(value: string | null | undefined) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatSprintStatus(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Published";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

function getSprintStatusTone(status: string): "pink" | "gray" | "green" | "amber" {
  switch (status) {
    case "PUBLISHED":
      return "pink";
    case "DRAFT":
      return "gray";
    default:
      return "gray";
  }
}

function getDeadlineError(applicationDeadline: string, completionDeadline: string) {
  return applicationDeadline && completionDeadline && applicationDeadline > completionDeadline
    ? "Application Deadline must be on or before Sprint Completion Deadline."
    : "";
}

function EmployerDashboard({
  navigate,
  fullName,
  employerProfile,
  sprints: employerSprints,
  loading,
  error,
}: {
  navigate: (page: string) => void;
  fullName: string;
  employerProfile: EmployerProfileData | null;
  sprints: SprintResponse[];
  loading: boolean;
  error: string | null;
}) {
  const activeSprints = employerSprints.filter((sprint) => sprint.status === "PUBLISHED");
  const draftSprints = employerSprints.filter((sprint) => sprint.status === "DRAFT");
  return (
    <>
      <PageHeading
        eyebrow="Employer Dashboard"
        title={`Welcome back, ${fullName.split(" ")[0]}.`}
        subtitle="Here's what's happening across your proof sprints."
        action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>}
       />
      <PortalCard className="profile-summary">
        <div className="profile-summary-person">
          <span className="large-avatar">
             {fullName
               .split(" ")
               .filter(Boolean)
               .slice(0, 2)
               .map((part) => part[0].toUpperCase())
              .join("")}
          </span>
          <div>
  <strong>{fullName}</strong>
  <span>{employerProfile?.organization_name || "Organization not provided"}</span>
  <small>{employerProfile?.email || "Email not available"}</small>
</div>
        </div>
        <div className="organization-summary">
  <div>
    <small>Organization</small>
    <strong>{employerProfile?.organization_name || "Not provided"}</strong>
  </div>
  <div>
    <small>Website</small>
    <strong>{employerProfile?.website || "Not provided"}</strong>
  </div>
  <div>
    <small>About</small>
    <strong>{employerProfile?.bio || "Not provided"}</strong>
  </div>
</div>
      </PortalCard>
      <div className="portal-stat-grid">
        <StatCard
          label="Total Sprints"
          value={loading ? "..." : String(employerSprints.length)}
          note="Created by your organization"
        />
        <StatCard
          label="Active Sprints"
          value={loading ? "..." : String(activeSprints.length)}
          note="Published and live"
        />
        <StatCard
          label="Draft Sprints"
          value={loading ? "..." : String(draftSprints.length)}
          note="Awaiting publication"
        />
        <StatCard
          label="Total Applicants"
          value="—"
          note="Applicant tracking not yet available"
        />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row">
            <div><div className="card-title">Ongoing Sprints</div><div className="card-subtitle">Published tasks accepting or completing work.</div></div>
            <button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button>
          </div>
          {loading && <div className="empty-state compact">Loading Sprints...</div>}
          {!loading && error && <div className="empty-state compact">{error}</div>}
          {!loading && !error && (
            <div className="compact-list">
              {activeSprints.map((sprint) => (
                <button type="button" key={sprint.id} onClick={() => navigate("sprints")}>
                  <div>
                    <strong>{sprint.title}</strong>
                    <span>{sprint.currency} {sprint.budget.toLocaleString()} · Sprint completion deadline {formatBackendDate(sprint.deadline)}</span>
                  </div>
                  <div>
                    <Badge tone="pink">Published</Badge>
                    <small>{sprint.number_of_positions} position{sprint.number_of_positions === 1 ? "" : "s"}</small>
                  </div>
                </button>
              ))}
              {activeSprints.length === 0 && <div className="empty-state compact">No ongoing sprints.</div>}
            </div>
          )}
        </PortalCard>
        <PaymentSummary held="NPR 28,500" pending="NPR 12,000" released="NPR 86,000" />
      </div>
    </>
  );
}

function CreateSprint({ onPosted }: { onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [skills, setSkills] = useState(["React", "TypeScript"]);
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [taskType, setTaskType] = useState("");
  const [numberOfPositions, setNumberOfPositions] = useState("10");
  const [revisionLimit, setRevisionLimit] = useState("0");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [completionDeadline, setCompletionDeadline] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assessmentCategory, setAssessmentCategory] = useState("");
  const [draftSprintId, setDraftSprintId] = useState<string | null>(null);
  const formLocked = draftSprintId !== null;

  const toNepalEndOfDay = (date: string) => `${date}T23:59:59+05:45`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const error = getDeadlineError(applicationDeadline, completionDeadline);
    if (error) {
      setDeadlineError(error);
      return;
    }

    const parsedBudget = Number(budget);
    const parsedPositions = Number(numberOfPositions);
    const parsedRevisionLimit = Number(revisionLimit);
    if (!title.trim() || title.length > 200) {
      setFormError("Sprint Title is required and must be 200 characters or fewer.");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setFormError("Payment Amount must be a positive number.");
      return;
    }
    if (!assessmentCategory) {
      setFormError("Assessment Category is required.");
      return;
    }
    if (!difficulty || !taskType) {
      setFormError("Difficulty and Task Type are required.");
      return;
    }
    if (skills.length === 0) {
      setFormError("Add at least one required skill.");
      return;
    }
    if (!Number.isInteger(parsedPositions) || parsedPositions <= 0) {
      setFormError("Number of Contributors Needed must be a positive whole number.");
      return;
    }
    if (!Number.isInteger(parsedRevisionLimit) || parsedRevisionLimit < 0) {
      setFormError("Revision Limit must be zero or greater.");
      return;
    }
    if (!applicationDeadline || !completionDeadline) {
      setFormError("Both deadlines are required.");
      return;
    }

    setDeadlineError("");
    setFormError("");
    setSubmitting(true);

    let publishingDraft = Boolean(draftSprintId);
    try {
      let sprintId = draftSprintId;
      if (!sprintId) {
        const request: SprintCreateRequest = {
          title: title.trim(),
          description: description.trim(),
          skill_category: skills,
          assessment_category: assessmentCategory as SprintCreateRequest["assessment_category"],
          difficulty,
          task_type: taskType,
          budget: parsedBudget,
          currency: "NPR",
          number_of_positions: parsedPositions,
          revision_limit: parsedRevisionLimit,
          deadline: toNepalEndOfDay(completionDeadline),
          application_deadline: toNepalEndOfDay(applicationDeadline),
        };
        const createdSprint = await createSprint(request);
        sprintId = createdSprint.id;
        setDraftSprintId(sprintId);
        publishingDraft = true;
      }

      await publishSprint(sprintId);
      onPosted();
    } catch (requestError) {
      setFormError(
        publishingDraft
          ? `Sprint was saved as a draft but could not be published. ${requestError instanceof Error ? requestError.message : "Please try again."}`
          : requestError instanceof Error
            ? requestError.message
            : "Unable to create the Sprint. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <PageHeading eyebrow="Employer Workspace" title="Create Proof Sprint" subtitle="Define a focused paid task and lock payment before publishing." />
      <form onSubmit={submit} className="portal-form-card">
        <div className="form-section-heading"><span>01</span><div><strong>Task Details</strong><small>Keep the scope practical and achievable.</small></div></div>
        <div className="portal-form-grid">
          {formLocked && <div className="form-error portal-span" role="status">A draft has been saved. The form is locked, and retrying will publish the saved version without applying edits.</div>}
          <label className="portal-field portal-span"><span>Sprint Title *</span><input disabled={formLocked} required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Build an inventory dashboard in React" /></label>
          <label className="portal-field portal-span"><span>Description *</span><textarea disabled={formLocked} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the task, expected output, constraints, and how the work will be reviewed." /></label>
          <label className="portal-field"><span>Payment Amount (NPR) *</span><input disabled={formLocked} required type="number" min="0.01" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="12,000" /></label>
          <label className="portal-field"><span>Difficulty *</span><select disabled={formLocked} required value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">Select difficulty</option><option>Beginner</option><option>Intermediate</option></select></label>
          <label className="portal-field">
  <span>Assessment Category *</span>
  <select
    disabled={formLocked}
    required
    value={assessmentCategory}
    onChange={(event) => setAssessmentCategory(event.target.value)}
  >
    <option value="">Select assessment category</option>
    <option value="Python">Python</option>
    <option value="Frontend">Frontend</option>
    <option value="Graphic Design">Graphic Design</option>
  </select>
</label>
          <label className="portal-field"><span>Task Type *</span><select disabled={formLocked} required value={taskType} onChange={(event) => setTaskType(event.target.value)}><option value="">Select task type</option><option>Frontend Development</option><option>Backend Development</option><option>Full-Stack Development</option><option>Python / Data Science</option><option>Graphic Design</option><option>Other</option></select></label>
          <label className="portal-field"><span>Application Deadline *</span><input disabled={formLocked} required type="date" max={completionDeadline || undefined} value={applicationDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
            const nextDeadline = event.target.value;
            setApplicationDeadline(nextDeadline);
            setDeadlineError(getDeadlineError(nextDeadline, completionDeadline));
          }} /><small>Last date candidates can apply.</small></label>
          <label className="portal-field"><span>Sprint Completion Deadline *</span><input disabled={formLocked} required type="date" min={applicationDeadline || undefined} value={completionDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
            const nextDeadline = event.target.value;
            setCompletionDeadline(nextDeadline);
            setDeadlineError(getDeadlineError(applicationDeadline, nextDeadline));
          }} /><small>Last date accepted candidates must submit their work.</small></label>
          {deadlineError && <div className="form-error portal-span" role="alert">{deadlineError}</div>}
          <label className="portal-field portal-span"><span>Required Skills *</span>
            <div className="portal-tag-input">
              {skills.map((item) => <span key={item}>{item}<button disabled={formLocked} type="button" onClick={() => setSkills(skills.filter((value) => value !== item))}>×</button></span>)}
              <input disabled={formLocked} value={skill} placeholder="Add skill, press Enter" onChange={(event) => setSkill(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && skill.trim()) {
                  event.preventDefault();
                  setSkills([...skills, skill.trim()]);
                  setSkill("");
                }
              }} />
            </div>
          </label>
          <label className="portal-field"><span>Number of Contributors Needed *</span><input disabled={formLocked} required type="number" min="1" step="1" value={numberOfPositions} onChange={(event) => setNumberOfPositions(event.target.value)} /></label>
          <label className="portal-field"><span>Revision Limit *</span><input disabled={formLocked} required type="number" min="0" step="1" value={revisionLimit} onChange={(event) => setRevisionLimit(event.target.value)} /></label>
          {formError && <div className="form-error portal-span" role="alert">{formError}</div>}
        </div>
        <div className="escrow-panel">
          <div><span className="escrow-mark">✓</span><div><strong>Escrow Protection</strong><small>Payment is locked until you approve the submitted work.</small></div></div>
          <button className="portal-primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : draftSprintId ? "Retry Publishing Draft →" : "Lock Payment &amp; Post Sprint →"}</button>
        </div>
      </form>
    </>
  );
}

function EmployerSprints({
  navigate,
  sprints: employerSprints,
  loading,
  error,
  onViewApplicants,
}: {
  navigate: (page: string) => void;
  sprints: SprintResponse[];
  loading: boolean;
  error: string | null;
  onViewApplicants: (sprint: SprintResponse) => void;
}) {
  const [filter, setFilter] = useState<"All" | "PUBLISHED" | "DRAFT">("All");

  const publishedCount = useMemo(
    () => employerSprints.filter((sprint) => sprint.status === "PUBLISHED").length,
    [employerSprints]
  );
  const draftCount = useMemo(
    () => employerSprints.filter((sprint) => sprint.status === "DRAFT").length,
    [employerSprints]
  );

  const filteredSprints = useMemo(() => {
    if (filter === "All") return employerSprints;
    return employerSprints.filter((sprint) => sprint.status === filter);
  }, [employerSprints, filter]);

  return (
    <>
      <PageHeading
        eyebrow="Sprint Management"
        title="My Sprints"
        subtitle="Manage your published and draft proof sprints."
        action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>}
      />
      <div className="filter-tabs">
        <button
          className={filter === "All" ? "active" : ""}
          type="button"
          onClick={() => setFilter("All")}
        >
          All <span>{employerSprints.length}</span>
        </button>
        <button
          className={filter === "PUBLISHED" ? "active" : ""}
          type="button"
          onClick={() => setFilter("PUBLISHED")}
        >
          Published <span>{publishedCount}</span>
        </button>
        <button
          className={filter === "DRAFT" ? "active" : ""}
          type="button"
          onClick={() => setFilter("DRAFT")}
        >
          Draft <span>{draftCount}</span>
        </button>
      </div>
      <PortalCard className="table-card">
        {loading && <div className="empty-state">Loading your Sprints...</div>}
        {!loading && error && <div className="empty-state">{error}</div>}
        {!loading && !error && employerSprints.length === 0 && (
          <div className="empty-state">
            <strong>No Sprints created yet</strong>
            <span>Click &quot;+ Create Sprint&quot; to post your first task.</span>
          </div>
        )}
        {!loading && !error && employerSprints.length > 0 && filteredSprints.length === 0 && (
          <div className="empty-state">No Sprints match the selected filter.</div>
        )}
        {!loading && !error && filteredSprints.length > 0 && (
          <div className="portal-table sprint-table">
            <div className="table-header">
              <span>Sprint</span>
              <span>Positions</span>
              <span>Payment</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filteredSprints.map((sprint) => (
              <div className="table-row" key={sprint.id}>
                <span>
                  <strong>{sprint.title}</strong>
                  <small>Sprint completion deadline · {formatBackendDate(sprint.deadline)}</small>
                  <small>Application deadline · {formatBackendDate(sprint.application_deadline)}</small>
                </span>
                <span>
                  <strong>{sprint.number_of_positions}</strong>
                  <small>{sprint.number_of_positions === 1 ? "position" : "positions"} needed</small>
                </span>
                <span>
                  <strong>{sprint.currency} {sprint.budget.toLocaleString()}</strong>
                  <small>{sprint.status === "PUBLISHED" ? "Payment details unavailable" : "Draft"}</small>
                </span>
                <span>
                  <Badge tone={getSprintStatusTone(sprint.status)}>
                    {formatSprintStatus(sprint.status)}
                  </Badge>
                </span>
                <span className="table-actions">
                  <button type="button" onClick={() => onViewApplicants(sprint)}>View Applicants</button>
                  <button type="button">Manage</button>
                  {sprint.status === "PUBLISHED" && <button type="button">Close</button>}
                </span>
              </div>
            ))}
          </div>
        )}
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

function Applicants({ candidateVerification, candidateApplications, applicantStatuses = {}, connectionRequests, onSendConnectionRequest, onViewApplication }: { navigate?: (page: string) => void; candidateVerification: CandidateVerification; candidateApplications: Application[]; applicantStatuses?: Record<string, ApplicationStatus>; connectionRequests: Record<string, string>; onSendConnectionRequest: (applicantId: string, employerName: string) => void; onViewApplication: (applicantId: string, sprintId: number) => void }) {
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
          <div className="form-divider" />
          <div className="card-title">Proof Trail</div>
          {selectedVerification?.approvedSprints.length
            ? <div className="proof-list">{selectedVerification.approvedSprints.map((title) => {
              const sprint = sprints.find((item) => item.title === title);
              return <div key={title}><span /><p><strong>{title}</strong><small>{sprint?.company ?? "Employer organization"} · Employer approved · Completed</small></p></div>;
            })}</div>
            : <div className="empty-state compact">No completed Proof Sprints available yet.</div>}
          <button
            className="portal-primary"
            type="button"
            disabled={Boolean(connectionRequests[selectedApplicantData[0]])}
            onClick={() => onSendConnectionRequest(selectedApplicantData[0], "TechNova Pvt. Ltd.")}
          >
            {connectionRequests[selectedApplicantData[0]] ? "Request Sent" : "Send Connection Request"}
          </button>
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
  const [payments, setPayments] = useState<PaymentHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyPayments()
      .then((data) => {
        if (!active) return;
        setPayments(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load payments");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalHeld = payments.reduce((sum, payment) => sum + (payment.status === "HELD" ? Number(payment.amount) : 0), 0);
  const totalPending = payments.reduce((sum, payment) => sum + (payment.status === "PENDING" ? Number(payment.amount) : 0), 0);
  const totalReleased = payments.reduce((sum, payment) => sum + (payment.status === "RELEASED" ? Number(payment.amount) : 0), 0);

  return (
    <>
      <PageHeading eyebrow="Payment Management" title="Payments" subtitle="Track escrow, approval, and released sprint payments." />
      <div className="portal-stat-grid three"><StatCard label="Currently Held" value={formatCurrency(totalHeld, "NPR")} note="Held payments" /><StatCard label="Pending Approval" value={formatCurrency(totalPending, "NPR")} note="Pending payments" /><StatCard label="Total Released" value={formatCurrency(totalReleased, "NPR")} note="Released payments" /></div>
      <PortalCard className="table-card">
        <div className="portal-table payment-table">
          <div className="table-header"><span>Sprint</span><span>Contributor</span><span>Amount</span><span>Status</span></div>
          {loading && <div className="table-row"><span>Loading payments…</span></div>}
          {error && <div className="table-row"><span>{error}</span></div>}
          {!loading && !error && payments.length === 0 && <div className="table-row"><span>No payments found.</span></div>}
          {!loading && !error && payments.map((payment) => (
            <div className="table-row" key={payment.id}><span><strong>{payment.sprint_title}</strong></span><span>{payment.application_id ?? "—"}</span><span><strong>{formatCurrency(payment.amount, payment.currency)}</strong></span><span><Badge tone={payment.status === "RELEASED" ? "green" : payment.status === "HELD" ? "amber" : "pink"}>{payment.status}</Badge></span></div>
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

export function EmployerPortal({ fullName, employerProfile, onLogout, renderEvaluation, onApplicationDecision, candidateVerification, candidateApplications, connectionRequests, onSendConnectionRequest }: Pick<PortalProps, "fullName" | "employerProfile" | "onLogout" | "onApplicationDecision" | "connectionRequests" | "onSendConnectionRequest"> & { renderEvaluation: (props: { applicantId: string; sprint: Sprint; application: Application | undefined; onBack: () => void; onDecision: (status: ApplicationStatus) => void }) => ReactNode; candidateVerification: CandidateVerification; candidateApplications: Application[] }) {
  const [page, setPage] = useState(
    () => sessionStorage.getItem("employer_portal_page") || "dashboard"
  );

  useEffect(() => {
    sessionStorage.setItem("employer_portal_page", page);
  }, [page]);

  const [mySprints, setMySprints] = useState<SprintResponse[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadSprints = async (isActive?: () => boolean) => {
    setSprintsLoading(true);
    setSprintsError(null);
    try {
      const data = await getMySprints();
      if (isMountedRef.current && (!isActive || isActive())) {
        setMySprints(data);
      }
    } catch (err) {
      if (isMountedRef.current && (!isActive || isActive())) {
        setSprintsError(err instanceof Error ? err.message : "Failed to load Sprints");
      }
    } finally {
      if (isMountedRef.current && (!isActive || isActive())) {
        setSprintsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;
    void loadSprints(() => active && isMountedRef.current);
    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, []);
  const [selectedReviewSprint, setSelectedReviewSprint] =
    useState<SprintResponse | null>(null);
  const [selectedSubmissionApplicationId, setSelectedSubmissionApplicationId] =
    useState<string | null>(null);


const openApplicants = (sprint: SprintResponse) => {
  setSelectedReviewSprint(sprint);
  setPage("applicants");
};
const openSubmissionReview = (applicationId: string) => {
  setSelectedSubmissionApplicationId(applicationId);
  setPage("submission-review");
};
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
    dashboard: (
      <EmployerDashboard
        navigate={setPage}
        fullName={fullName}
        employerProfile={employerProfile}
        sprints={mySprints}
        loading={sprintsLoading}
        error={sprintsError}
      />
    ),
    create: (
      <CreateSprint
        onPosted={() => {
          void loadSprints();
          setPage("sprints");
        }}
      />
    ),
    sprints: (
  <EmployerSprints
    navigate={setPage}
    sprints={mySprints}
    loading={sprintsLoading}
    error={sprintsError}
    onViewApplicants={openApplicants}
  />
),
    applicants: selectedReviewSprint ? (
  <ApplicationReview
    sprint={selectedReviewSprint}
    onBack={() => setPage("sprints")}
    onReviewSubmission={openSubmissionReview}
  />
) : (
  <Applicants
    navigate={setPage}
    candidateVerification={candidateVerification}
    candidateApplications={candidateApplications}
    applicantStatuses={applicantStatuses}
    connectionRequests={connectionRequests}
    onSendConnectionRequest={onSendConnectionRequest}
    onViewApplication={openApplication}
  />
),
"submission-review":
  selectedReviewSprint && selectedSubmissionApplicationId ? (
    <SubmissionReview
      sprint={selectedReviewSprint}
      applicationId={selectedSubmissionApplicationId}
      onBack={() => setPage("applicants")}
    />
  ) : (
    <div />
  ),

evaluation: selectedApplication && selectedSprint
      ? renderEvaluation({
        applicantId: selectedApplication.applicantId,
        sprint: selectedSprint,
        application: selectedCandidateApplication,
        onBack: () => setPage("applicants"),
        onDecision: decideApplication,
      })
      : <Applicants navigate={setPage} candidateVerification={candidateVerification} candidateApplications={candidateApplications} applicantStatuses={applicantStatuses} connectionRequests={connectionRequests} onSendConnectionRequest={onSendConnectionRequest} onViewApplication={openApplication} />,
    payments: <EmployerPayments />,
    profile: <EmployerProfile />,
  }[page] ?? (
    <EmployerDashboard
      navigate={setPage}
      fullName={fullName}
      employerProfile={employerProfile}
      sprints={mySprints}
      loading={sprintsLoading}
      error={sprintsError}
    />
  );

  return <PortalShell fullName={fullName} role="employer" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
