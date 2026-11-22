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
import type {
  AssessmentCategory,
  AssessmentDifficulty,
  SprintCreateRequest,
  SprintResponse,
} from "@/api/sprint";
import { getMyPayments, type PaymentHistoryResponse } from "@/api/payment";
import { getMySprintApplicantCounts } from "@/api/application";
import { updateMyProfile } from "@/api/profile";
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

function formatBackendTimestamp(value: string | null | undefined) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
  const today = getNepalToday();
  return applicationDeadline && completionDeadline && applicationDeadline > completionDeadline
    ? "Application Deadline must be on or before Sprint Completion Deadline."
    : applicationDeadline && applicationDeadline < today
      ? "Application Deadline cannot be before today."
      : completionDeadline && completionDeadline < today
        ? "Sprint Completion Deadline cannot be before today."
        : "";
}

function getNepalToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function EmployerDashboard({
  navigate,
  fullName,
  employerProfile,
  sprints: employerSprints,
  loading,
  error,
  totalApplicants,
  applicantsLoading,
  onReleasedTotalChange,
}: {
  navigate: (page: string) => void;
  fullName: string;
  employerProfile: EmployerProfileData | null;
  sprints: SprintResponse[];
  loading: boolean;
  error: string | null;
  totalApplicants: number | null;
  applicantsLoading: boolean;
  onReleasedTotalChange: (releasedTotal: number | null) => void;
}) {
  const activeSprints = employerSprints.filter((sprint) => sprint.status === "PUBLISHED");
const draftSprints = employerSprints.filter((sprint) => sprint.status === "DRAFT");
const [payments, setPayments] = useState<PaymentHistoryResponse[]>([]);
const [paymentsLoading, setPaymentsLoading] = useState(true);
const [paymentsError, setPaymentsError] = useState<string | null>(null);

useEffect(() => {
  let active = true;
  getMyPayments()
    .then((data) => {
      if (!active) return;
      setPayments(data);
      setPaymentsError(null);
    })
    .catch((err: unknown) => {
      if (!active) return;
      setPaymentsError(err instanceof Error ? err.message : "Failed to load payments");
    })
    .finally(() => {
      if (active) setPaymentsLoading(false);
    });
  return () => {
    active = false;
  };
}, []);

const heldTotal = payments.reduce(
  (sum, payment) => sum + (payment.status === "HELD" ? Number(payment.amount) : 0),
  0,
);
const pendingTotal = payments.reduce(
  (sum, payment) => sum + (payment.status === "PENDING" ? Number(payment.amount) : 0),
  0,
);
const releasedTotal = payments.reduce(
  (sum, payment) => sum + (payment.status === "RELEASED" ? Number(payment.amount) : 0),
  0,
);

useEffect(() => {
  onReleasedTotalChange(
    paymentsLoading || paymentsError ? null : releasedTotal,
  );
}, [onReleasedTotalChange, paymentsError, paymentsLoading, releasedTotal]);

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
          label="Total Applicants"
          value={
            applicantsLoading
              ? "..."
              : totalApplicants === null
                ? "—"
                : String(totalApplicants)
          }
          note={
            totalApplicants === null
              ? "Applicant tracking unavailable"
              : "Applications across your Sprints"
          }
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
        {paymentsLoading || paymentsError ? (
          <PortalCard>
            <div className="card-heading-row">
              <div><div className="card-title">Payment Progress</div><div className="card-subtitle">Escrow and release status across your projects.</div></div>
              <Badge tone="gray">Protected payments</Badge>
            </div>
            <div className="empty-state compact">{paymentsLoading ? "Loading payments…" : paymentsError}</div>
          </PortalCard>
        ) : (
          <PaymentSummary
            held={formatCurrency(heldTotal, "NPR")}
            pending={formatCurrency(pendingTotal, "NPR")}
            released={formatCurrency(releasedTotal, "NPR")}
          />
        )}
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
  const [difficulty, setDifficulty] = useState<AssessmentDifficulty | "">("");
  const [taskType, setTaskType] = useState("");
  const [numberOfPositions, setNumberOfPositions] = useState("10");
  const [revisionLimit, setRevisionLimit] = useState("0");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [completionDeadline, setCompletionDeadline] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assessmentCategory, setAssessmentCategory] = useState<AssessmentCategory | "">("");
  const [draftSprintId, setDraftSprintId] = useState<string | null>(null);
  const [lockPaymentStep, setLockPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | "bank" | "">("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const formLocked = draftSprintId !== null;
  const today = getNepalToday();

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
          assessment_category: assessmentCategory,
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
        setLockPaymentStep(true);
        setSubmitting(false);
        return;
      }

      if (!paymentMethod || !accountNumber.trim() || !pin.trim()) {
        setFormError("Please fill in all payment details.");
        setSubmitting(false);
        return;
      }

      await publishSprint(sprintId, paymentMethod, accountNumber.trim());
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
  if (lockPaymentStep) {
    return (
      <>
        <PageHeading eyebrow="Employer Workspace" title="Create Proof Sprint" subtitle="Define a focused paid task and lock payment before publishing." />
<form onSubmit={submit} className="portal-form-card create-sprint-form">
          <div className="form-section-heading create-sprint-heading"><span>02</span><div><strong>Lock Payment</strong><small>Confirm the payment method and amount to be held in escrow.</small></div></div>
          <div className="portal-form-grid">
            <div className="portal-field portal-span">
              <span>Payment Summary</span>
              <div className="detail-list">
                <div><small>Sprint</small><strong>{title}</strong></div>
                <div><small>Amount to lock</small><strong>{formatCurrency(budget, "NPR")}</strong></div>
              </div>
              <small>This amount will be held in escrow until you approve the selected contributor's work.</small>
            </div>
            <label className="portal-field"><span>Payment Method *</span><select className="portal-select" required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "esewa" | "khalti" | "bank")}><option value="">Select payment method</option><option value="esewa">eSewa</option><option value="khalti">Khalti</option><option value="bank">Bank Account</option></select></label>
            <label className="portal-field"><span>Account / Mobile Number *</span><input required type="text" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Enter eSewa/Khalti mobile or bank account number" /></label>
            <label className="portal-field portal-span"><span>PIN *</span><input required type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter your PIN (simulated, not stored)" autoComplete="off" /></label>
            {formError && <div className="form-error portal-span" role="alert">{formError}</div>}
          </div>
          <div className="escrow-panel">
            <div><span className="escrow-mark">✓</span><div><strong>Escrow Protection</strong><small>Payment is locked until you approve the submitted work.</small></div></div>
            <button className="portal-primary" type="submit" disabled={submitting}>{submitting ? "Locking Payment..." : "Confirm & Lock Payment"}</button>
          </div>
        </form>
      </>
    );
  }
  return (
    <>
      <PageHeading eyebrow="Employer Workspace" title="Create Proof Sprint" subtitle="Define a focused paid task and lock payment before publishing." />
      <form onSubmit={submit} className="portal-form-card create-sprint-form">
        <div className="form-section-heading create-sprint-heading"><span>01</span><div><strong>Task Details</strong><small>Keep the scope practical and achievable.</small></div></div>
        <div className="portal-form-grid">
          {formLocked && <div className="form-error portal-span" role="status">A draft has been saved. The form is locked, and retrying will publish the saved version without applying edits.</div>}
          <label className="portal-field portal-span"><span>Sprint Title *</span><input disabled={formLocked} required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Build an inventory dashboard in React" /></label>
          <label className="portal-field portal-span"><span>Description *</span><textarea disabled={formLocked} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the task, expected output, constraints, and how the work will be reviewed." /></label>
          <label className="portal-field"><span>Payment Amount (NPR) *</span><input disabled={formLocked} required type="number" min="0.01" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="12,000" /></label>
          <label className="portal-field"><span>Difficulty *</span><select className="portal-select" disabled={formLocked} required value={difficulty} onChange={(event) => setDifficulty(event.target.value as AssessmentDifficulty | "")}><option value="">Select difficulty</option><option>Beginner</option><option>Intermediate</option></select></label>
          <label className="portal-field">
  <span>Assessment Category *</span>
  <select
    className="portal-select"
    disabled={formLocked}
    required
    value={assessmentCategory}
    onChange={(event) => setAssessmentCategory(event.target.value as AssessmentCategory | "")}
  >
    <option value="">Select assessment category</option>
    <option value="Python">Python</option>
    <option value="Junior Accountant">Junior Accountant</option>
    <option value="Graphic Design">Graphic Design</option>
  </select>
</label>
          <label className="portal-field"><span>Task Type *</span><select className="portal-select" disabled={formLocked} required value={taskType} onChange={(event) => setTaskType(event.target.value)}><option value="">Select task type</option><option>Frontend Development</option><option>Backend Development</option><option>Full-Stack Development</option><option>Python / Data Science</option><option>Graphic Design</option><option>Other</option></select></label>
          <label className="portal-field"><span>Application Deadline *</span><input disabled={formLocked} required type="date" min={today} max={completionDeadline || undefined} value={applicationDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
            const nextDeadline = event.target.value;
            setApplicationDeadline(nextDeadline);
            setDeadlineError(getDeadlineError(nextDeadline, completionDeadline));
          }} /><small>Last date candidates can apply.</small></label>
          <label className="portal-field"><span>Sprint Completion Deadline *</span><input disabled={formLocked} required type="date" min={applicationDeadline || today} value={completionDeadline} aria-invalid={Boolean(deadlineError)} onChange={(event) => {
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
          <button className="portal-primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : draftSprintId ? "Retry Publishing Draft →" : "Lock Payment & Post Sprint →"}</button>
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
  const [filter, setFilter] = useState<"All" | "PUBLISHED">("All");
  const [search, setSearch] = useState("");
  const [selectedSprint, setSelectedSprint] = useState<SprintResponse | null>(
    null,
  );

  useEffect(() => {
    if (!selectedSprint) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedSprint(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedSprint]);

  const publishedCount = useMemo(
    () => employerSprints.filter((sprint) => sprint.status === "PUBLISHED").length,
    [employerSprints]
  );

  const filteredSprints = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return employerSprints.filter((sprint) => {
      const matchesFilter = filter === "All" || sprint.status === filter;
      const matchesSearch = sprint.title.toLowerCase().includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
  }, [employerSprints, filter, search]);

  return (
    <>
      <PageHeading
        eyebrow="Sprint Management"
        title="My Sprints"
        subtitle="View and track your published proof sprints."
        action={<button className="portal-primary" type="button" onClick={() => navigate("create")}>+ Create Sprint</button>}
      />
      <label className="portal-field sprint-search">
        <span>Search by sprint title</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search sprints"
        />
      </label>
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
          <div className="empty-state">
            {search.trim()
              ? "No Sprints match your search and selected filter."
              : "No Sprints match the selected filter."}
          </div>
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
                  <small>{sprint.status !== "PUBLISHED" && "Draft"}</small>
                </span>
                <span>
                  <Badge tone={getSprintStatusTone(sprint.status)}>
                    {formatSprintStatus(sprint.status)}
                  </Badge>
                </span>
                <span className="table-actions">
                  <button className="portal-small-button sprint-action-button" type="button" onClick={() => setSelectedSprint(sprint)}>View Details</button>
                  <button className="portal-small-button sprint-action-button sprint-applicants-button" type="button" onClick={() => onViewApplicants(sprint)}>View Applicants</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </PortalCard>
      {selectedSprint && (
        <div
          className="report-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSprint(null);
          }}
        >
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sprint-detail-title"
          >
            <div className="report-modal-header">
              <div>
                <span className="report-eyebrow">Sprint Details</span>
                <h2 id="sprint-detail-title">{selectedSprint.title}</h2>
                <p>
                  <Badge tone={getSprintStatusTone(selectedSprint.status)}>
                    {formatSprintStatus(selectedSprint.status)}
                  </Badge>
                </p>
              </div>
              <button
                className="report-close"
                type="button"
                aria-label="Close sprint details"
                onClick={() => setSelectedSprint(null)}
              >
                ×
              </button>
            </div>
            <div className="sprint-facts">
              <div>
                <small>Description</small>
                <p className="detail-copy">{selectedSprint.description}</p>
              </div>
              <div>
                <small>Required Skills</small>
                <span className="table-skills">
                  {selectedSprint.skill_category.length > 0 ? (
                    selectedSprint.skill_category.map((item) => (
                      <Badge tone="gray" key={item}>
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span>No skills specified</span>
                  )}
                </span>
              </div>
              <div>
                <small>Task Type</small>
                <strong>{selectedSprint.task_type}</strong>
              </div>
              <div>
                <small>Difficulty</small>
                <strong>{selectedSprint.difficulty}</strong>
              </div>
              <div>
                <small>Assessment Category</small>
                <strong>{selectedSprint.assessment_category}</strong>
              </div>
              <div>
                <small>Budget</small>
                <strong>
                  {selectedSprint.currency}{" "}
                  {selectedSprint.budget.toLocaleString()}
                </strong>
              </div>
              <div>
                <small>Number of Contributors</small>
                <strong>{selectedSprint.number_of_positions}</strong>
              </div>
              <div>
                <small>Revision Limit</small>
                <strong>{selectedSprint.revision_limit}</strong>
              </div>
              <div>
                <small>Application Deadline</small>
                <strong>
                  {formatBackendDate(selectedSprint.application_deadline)}
                </strong>
              </div>
              <div>
                <small>Sprint Completion Deadline</small>
                <strong>{formatBackendDate(selectedSprint.deadline)}</strong>
              </div>
              <div>
                <small>Created</small>
                <strong>{formatBackendTimestamp(selectedSprint.created_at)}</strong>
              </div>
              <div>
                <small>Last Updated</small>
                <strong>{formatBackendTimestamp(selectedSprint.updated_at)}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
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
          {loading && <div className="table-row table-row-full"><span>Loading payments…</span></div>}
          {error && <div className="table-row table-row-full"><span>{error}</span></div>}
          {!loading && !error && payments.length === 0 && <div className="table-row table-row-full"><span>No payments found.</span></div>}
          {!loading && !error && payments.map((payment) => (
            <div className="table-row" key={payment.id}><span><strong>{payment.sprint_title}</strong><small>{payment.payment_type} · Transaction: {payment.transaction_reference || "—"}</small></span><span>
  {payment.contributor_code?.replace(/^Contributor\s*/i, "") ?? "—"}
</span><span><strong>{formatCurrency(payment.amount, payment.currency)}</strong></span><span><Badge tone={payment.status === "RELEASED" ? "green" : payment.status === "HELD" ? "amber" : "pink"}>{payment.status}</Badge></span></div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}

type EmployerProfileForm = {
  organization_name: string;
  position: string;
  organization_type: string;
  organization_size: string;
  website: string;
  phone_number: string;
  bio: string;
};

function EmployerProfile({
  fullName,
  employerProfile,
  sprintCount,
  totalApplicants,
  selectedApplicants,
  releasedTotal,
  onUpdateEmployerProfile,
}: {
  fullName: string;
  employerProfile: EmployerProfileData | null;
  sprintCount: number;
  totalApplicants: number | null;
  selectedApplicants: number | null;
  releasedTotal: number | null;
  onUpdateEmployerProfile: (profile: EmployerProfileData) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EmployerProfileForm>({
    organization_name: "",
    position: "",
    organization_type: "",
    organization_size: "",
    website: "",
    phone_number: "",
    bio: "",
  });
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const value = (field: string | null | undefined) =>
    field && field.trim() ? field : "Not provided";

  const startEditing = () => {
    setForm({
      organization_name: employerProfile?.organization_name ?? "",
      position: employerProfile?.position ?? "",
      organization_type: employerProfile?.organization_type ?? "",
      organization_size: employerProfile?.organization_size ?? "",
      website: employerProfile?.website ?? "",
      phone_number: employerProfile?.phone_number ?? "",
      bio: employerProfile?.bio ?? "",
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const organizationName = form.organization_name.trim();
    const position = form.position.trim();
    if (!organizationName || !position) {
      setSaveError("Organization name and position are required.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const response = await updateMyProfile({
        organization_name: organizationName,
        position,
        organization_type: form.organization_type || undefined,
        organization_size: form.organization_size || undefined,
        website: form.website.trim() || null,
        phone_number: form.phone_number.trim() || undefined,
        bio: form.bio.trim(),
      });

      onUpdateEmployerProfile({
        email: employerProfile?.email ?? "",
        organization_name: response.organization_name ?? "",
        website: response.website,
        bio: response.bio,
        position: response.position ?? "",
        organization_type: response.organization_type ?? "",
        organization_size: response.organization_size ?? "",
        phone_number: response.phone_number ?? "",
      });
      setIsEditing(false);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to update profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  return (
    <>
      <PageHeading
        eyebrow="Account & Trust"
        title="Organization Profile"
        subtitle="Manage public organization details and employer verification."
        action={!isEditing && (
          <button className="portal-secondary" type="button" onClick={startEditing}>
            Edit Profile
          </button>
        )}
      />
      {isEditing ? (
        <form className="portal-two-column profile-layout" onSubmit={handleSave}>
          <PortalCard>
            <div className="profile-detail-head">
              <span className="large-avatar">{initials || "?"}</span>
              <div>
                <strong>{fullName || "Not provided"}</strong>
                <span>{value(employerProfile?.email)}</span>
              </div>
            </div>
            <div className="portal-form-grid">
              <label className="portal-field portal-span">
                <span>Position *</span>
                <input
                  required
                  value={form.position}
                  onChange={(event) => setForm({ ...form, position: event.target.value })}
                />
              </label>
            </div>
          </PortalCard>
          <PortalCard>
            <div className="portal-form-grid">
              <label className="portal-field portal-span">
                <span>Organization name *</span>
                <input
                  required
                  value={form.organization_name}
                  onChange={(event) => setForm({ ...form, organization_name: event.target.value })}
                />
              </label>
              <label className="portal-field">
                <span>Organization type</span>
                <select
                  className="portal-select"
                  value={form.organization_type}
                  onChange={(event) => setForm({ ...form, organization_type: event.target.value })}
                >
                  <option value="">Select type</option>
                  <option value="Startup">Startup</option>
                  <option value="Company">Company</option>
                  <option value="NGO / INGO">NGO / INGO</option>
                  <option value="Educational Institution">Educational Institution</option>
                  <option value="Individual / Independent Employer">Individual / Independent Employer</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="portal-field">
                <span>Organization size</span>
                <select
                  className="portal-select"
                  value={form.organization_size}
                  onChange={(event) => setForm({ ...form, organization_size: event.target.value })}
                >
                  <option value="">Select size</option>
                  <option value="Solo">Solo</option>
                  <option value="2–10">2–10</option>
                  <option value="11–50">11–50</option>
                  <option value="51–200">51–200</option>
                  <option value="200+">200+</option>
                </select>
              </label>
              <label className="portal-field">
                <span>Website</span>
                <input
                  type="url"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                  placeholder="https://example.com"
                />
              </label>
              <label className="portal-field">
                <span>Phone number</span>
                <input
                  type="tel"
                  value={form.phone_number}
                  onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
                />
              </label>
              <label className="portal-field portal-span">
                <span>Bio</span>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                />
              </label>
            </div>
            {saveError && <p className="form-error" role="alert">{saveError}</p>}
            <div className="project-form-actions">
              <button className="portal-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="portal-secondary" type="button" onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
            </div>
          </PortalCard>
        </form>
      ) : (
        <div className="portal-two-column profile-layout">
          <PortalCard>
            <div className="profile-detail-head"><span className="large-avatar">{initials || "?"}</span><div><strong>{fullName || "Not provided"}</strong><span>{value(employerProfile?.position)}</span></div></div>
            <div className="detail-list"><div><small>Work email</small><strong>{value(employerProfile?.email)}</strong></div><div><small>Position</small><strong>{value(employerProfile?.position)}</strong></div></div>
          </PortalCard>
          <PortalCard>
            <div className="card-heading-row"><div><div className="card-title">{value(employerProfile?.organization_name)}</div><div className="card-subtitle">{value(employerProfile?.organization_type)} · {value(employerProfile?.organization_size)}</div></div></div>
            <p className="profile-description">{value(employerProfile?.bio)}</p>
            <div className="detail-list"><div><small>Website</small><strong>{value(employerProfile?.website)}</strong></div><div><small>Phone</small><strong>{value(employerProfile?.phone_number)}</strong></div><div><small>Sprints created</small><strong>{sprintCount}</strong></div></div>
          </PortalCard>
        </div>
      )}
      <div className="card-heading-row">
        <div className="card-title">Employer Credibility</div>
      </div>
      <div className="portal-stat-grid">
        <StatCard
          label="Sprints Created"
          value={String(sprintCount)}
          note="Created by your organization"
        />
        <StatCard
          label="Total Applicants"
          value={totalApplicants === null ? "—" : String(totalApplicants)}
          note="Across your sprints"
        />
        <StatCard
          label="Applicants Selected"
          value={selectedApplicants === null ? "—" : String(selectedApplicants)}
          note="Marked as selected"
        />
        <StatCard
          label="Funds Released"
          value={releasedTotal === null ? "—" : formatCurrency(releasedTotal, "NPR")}
          note="Released payments"
        />
      </div>
      <PortalCard>
        <div className="card-title">Employer Activity</div>
        <p className="profile-description">
          Your organization has created {sprintCount} sprints, received{" "}
          {totalApplicants ?? "—"} applicants, and selected {selectedApplicants ?? "—"} applicants.
          {releasedTotal !== null && releasedTotal > 0 && (
            <> {formatCurrency(releasedTotal, "NPR")} has been released through completed payouts.</>
          )}
        </p>
      </PortalCard>
    </>
  );
}

export function EmployerPortal({ fullName, employerProfile, onLogout, onUpdateEmployerProfile }: Pick<PortalProps, "fullName" | "employerProfile" | "onLogout" | "onUpdateEmployerProfile">) {
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem("employer_portal_page");
    return savedPage === "create" || savedPage === "sprints" ? savedPage : "dashboard";
  });

  useEffect(() => {
    sessionStorage.setItem("employer_portal_page", page);
  }, [page]);

  const [mySprints, setMySprints] = useState<SprintResponse[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState<string | null>(null);
  const [totalApplicants, setTotalApplicants] = useState<number | null>(null);
  const [selectedApplicants, setSelectedApplicants] = useState<number | null>(null);
  const [releasedTotal, setReleasedTotal] = useState<number | null>(null);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
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

  useEffect(() => {
    let active = true;

    const loadApplicants = async () => {
      if (mySprints.length === 0) {
        setTotalApplicants(0);
        setSelectedApplicants(0);
        setApplicantsLoading(false);
        return;
      }

      setApplicantsLoading(true);
      try {
        const results = await getMySprintApplicantCounts();
        if (active) {
          setTotalApplicants(
            results.reduce((sum, counts) => sum + counts.total_applicants, 0),
          );
          setSelectedApplicants(
            results.reduce(
              (sum, counts) => sum + counts.selected_applicants,
              0,
            ),
          );
        }
      } catch {
        if (active) {
          setTotalApplicants(null);
          setSelectedApplicants(null);
        }
      } finally {
        if (active) {
          setApplicantsLoading(false);
        }
      }
    };

    void loadApplicants();
    return () => {
      active = false;
    };
  }, [mySprints]);

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
  const content = {
    dashboard: (
      <EmployerDashboard
        navigate={setPage}
        fullName={fullName}
        employerProfile={employerProfile}
        sprints={mySprints}
        loading={sprintsLoading}
        error={sprintsError}
        totalApplicants={totalApplicants}
        applicantsLoading={applicantsLoading}
        onReleasedTotalChange={setReleasedTotal}
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
  <div />
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

    payments: <EmployerPayments />,
    profile: <EmployerProfile fullName={fullName} employerProfile={employerProfile} sprintCount={mySprints.length} totalApplicants={totalApplicants} selectedApplicants={selectedApplicants} releasedTotal={releasedTotal} onUpdateEmployerProfile={onUpdateEmployerProfile} />,
  }[page] ?? (
    <EmployerDashboard
      navigate={setPage}
      fullName={fullName}
      employerProfile={employerProfile}
      sprints={mySprints}
      loading={sprintsLoading}
      error={sprintsError}
      totalApplicants={totalApplicants}
      applicantsLoading={applicantsLoading}
      onReleasedTotalChange={setReleasedTotal}
    />
  );

  return <PortalShell fullName={fullName} role="employer" active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
