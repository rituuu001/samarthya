import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AssessmentRunner } from "./AssessmentRunner";
import type { PortalProps } from "@/RolePortal";
import { Badge } from "@/components/portal/Badge";
import { ConnectionRequests } from "@/components/portal/ConnectionRequests";
import { PageHeading } from "@/components/portal/PageHeading";
import { PaymentSummary } from "@/components/portal/PaymentSummary";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ReportUserButton } from "@/components/portal/ReportUserModal";
import { StatCard } from "@/components/portal/StatCard";
import { useCandidateAssessment } from "@/hooks/useCandidateAssessment";
import {
  getPublishedSprints,
  type MarketplaceSprintResponse,
} from "@/api/sprint";
import {
  applyToSprint,
  getMyApplications,
  type ApplicationResponse,
} from "@/api/application";
import { formatCurrency } from "@/utils/currency";
import { calculateCandidateVerification, isHttpUrl, type CandidateProfileData, type CandidateVerification } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, PersonalProject } from "@/data/portalData";
import { formatDeadline, isApplicationOpen, sprints } from "@/data/portalData";
import { formatBackendDeadline, BackendMoney } from "@/utils/display";
import { SprintDetails } from "./SprintDetails";
import { SprintMarketplace } from "./SprintMarketplace";
import type {
  AssessmentSubmission,
  AssessmentResultResponse,
} from "@/api/assessment";

import {
  getMyPayments,
  type PaymentHistoryResponse,
} from "@/api/payment";
import { updateMyProfile } from "@/api/profile";
import {
  getMyProofRecords,
  updateProofRecordSharing,
  type ProofRecordResponse,
} from "@/api/proofRecord";

function maskAccount(account?: string) {
  if (!account) return "Not set";
  const digits = account.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return "•••• " + digits.slice(-4);
}

function getMethodLabel(method?: string) {
  switch (method) {
    case "esewa": return "eSewa";
    case "khalti": return "Khalti";
    case "bank": return "Bank Account";
    default: return "Not configured";
  }
}

type ProjectValues = Omit<PersonalProject, "id">;

const PROJECT_ZIP_MAX_SIZE = 25 * 1024 * 1024;

function formatFileSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function CandidateDashboard({
  navigate,
  backendApplications,
  publishedSprints,
  proofRecords,
  profile,
  verification,
  onView,
  onSubmit,
}: {
  navigate: (page: string) => void;
  backendApplications: ApplicationResponse[];
  publishedSprints: MarketplaceSprintResponse[];
  proofRecords: ProofRecordResponse[];
  profile: CandidateProfileData;
  verification: CandidateVerification;
  onView: (sprintId: string) => void;
  onSubmit: (application: ApplicationResponse) => void;
}) {
  const activeApplications = backendApplications.filter((application) => application.status === "SELECTED");
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

  const releasedTotal = payments.reduce((sum, payment) => sum + (payment.status === "RELEASED" ? Number(payment.amount) : 0), 0);
  const pendingTotal = payments.reduce((sum, payment) => sum + (payment.status === "PENDING" ? Number(payment.amount) : 0), 0);
  return (
    <>
      <PageHeading eyebrow="Candidate Dashboard" title={`Welcome back, ${profile.fullName.split(" ")[0] || "Candidate"}.`} subtitle="Build your proof trail through real work and verified skills." action={<button className="portal-primary" type="button" onClick={() => navigate("explore")}>Explore Sprints</button>} />
      <PortalCard className="profile-summary candidate-summary">
        <div className="profile-summary-person"><span className="large-avatar">{profile.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{profile.fullName}</strong><span>{[profile.headline, profile.location].filter(Boolean).join(" · ") || "Candidate profile"}</span><small>Verification status · {verification.status}</small></div></div>
        <div className="profile-progress"><div><span>Verification progress</span><strong>{verification.percentage.toFixed(2)}%</strong></div><div><span style={{ width: `${verification.percentage}%` }} /></div><button type="button" onClick={() => navigate("profile")}>View verification</button></div>
      </PortalCard>
      <div className="skills-summary">
        <PortalCard><div className="card-title">Profile Skills</div><div className="badge-row">{profile.skills.map((skill) => <span className="profile-skill-chip" key={skill}>{skill}</span>)}</div></PortalCard>
        <PortalCard><div className="card-title">Approved Proof Sprints</div><div className="badge-row">{proofRecords.filter((record) => record.verified_at).length ? proofRecords.filter((record) => record.verified_at).map((record) => <Badge key={record.id}>✓ {record.title}</Badge>) : <span className="card-subtitle">No employer-approved sprints yet.</span>}</div></PortalCard>
      </div>
      <div className="portal-stat-grid four">
        <StatCard label="Applied" value={String(backendApplications.filter((item) => item.status === "APPLIED").length)} note="Awaiting assessment" />
        <StatCard label="Assessment Submitted" value={String(backendApplications.filter((item) => item.status === "ASSESSMENT_SUBMITTED").length)} note="Under review" />
        <StatCard label="Shortlisted" value={String(backendApplications.filter((item) => item.status === "SHORTLISTED").length)} note="Progressing" />
        <StatCard label="Selected" value={String(backendApplications.filter((item) => item.status === "SELECTED").length)} note="Ready to submit work" />
      </div>
      <div className="portal-two-column">
        <PortalCard>
          <div className="card-heading-row"><div><div className="card-title">My Active Sprints</div><div className="card-subtitle">Sprints you've been selected for.</div></div><button className="portal-link" type="button" onClick={() => navigate("sprints")}>View all</button></div>
          {activeApplications.length ? activeApplications.map((application) => {
            const sprint = publishedSprints.find((item) => item.id === application.sprint_id);
            if (!sprint) {
              return <div className="active-sprint-card" key={application.id}>
                <div><Badge>{application.status}</Badge><strong>Sprint details unavailable</strong><span>Selected application · Sprint ID {application.sprint_id}</span></div>
              </div>;
            }
            return <div className="active-sprint-card" key={application.id}>
              <div><span className={application.status === "SELECTED" ? "selected-status-badge" : undefined}><Badge>{application.status}</Badge></span><strong>{sprint.title}</strong><span><BackendMoney amount={sprint.budget} currency={sprint.currency} /> · Sprint completion deadline: {formatBackendDeadline(sprint.deadline)}</span></div>
              <div><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View Sprint</button><button className="portal-primary" type="button" onClick={() => onSubmit(application)}>Submit Work</button></div>
            </div>;
          }) : <div className="empty-state">No active sprints yet. Explore opportunities to begin.</div>}
        </PortalCard>
        <PortalCard>
          <div className="card-heading-row"><div><div className="card-title">Payment Tracking</div><div className="card-subtitle">Recent payments from your completed work.</div></div><button className="portal-link" type="button" onClick={() => navigate("payments")}>View all</button></div>
          {paymentsLoading && <div className="empty-state compact">Loading payments…</div>}
          {paymentsError && <div className="empty-state compact">{paymentsError}</div>}
          {!paymentsLoading && !paymentsError && payments.length === 0 && <div className="empty-state compact">No payments yet.</div>}
          {!paymentsLoading && !paymentsError && payments.length > 0 && (
            <div className="payment-summary-grid">
              <div><span className="payment-dot released" /><small>Released earnings</small><strong>{formatCurrency(releasedTotal, "NPR")}</strong></div>
              <div><span className="payment-dot pending" /><small>Pending payments</small><strong>{formatCurrency(pendingTotal, "NPR")}</strong></div>
              {payments.slice(0, 3).map((payment) => (
                <div key={payment.id}>
                  <span className={`payment-dot ${payment.status === "RELEASED" ? "released" : payment.status === "HELD" ? "held" : "pending"}`} />
                  <small>{payment.sprint_title}</small>
                  <strong>{formatCurrency(Number(payment.amount), payment.currency)} · {payment.status}</strong>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>
    </>
  );
}


function CandidateApplications({
  backendApplications,
  publishedSprints,
  applicationsLoading,
  applicationsError,
  onStartAssessment,
  onSubmitWork,
}: {
  backendApplications: ApplicationResponse[];
  publishedSprints: MarketplaceSprintResponse[];
  applicationsLoading: boolean;
  applicationsError: string | null;
  onStartAssessment: (application: ApplicationResponse) => void;
  onSubmitWork: (application: ApplicationResponse) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ApplicationResponse["status"] | "ALL">("ALL");

  const statusLabels: Record<ApplicationResponse["status"], string> = {
    APPLIED: "Applied",
    ASSESSMENT_SUBMITTED: "Assessment Submitted",
    SHORTLISTED: "Shortlisted",
    SELECTED: "Selected",
  };

  const filteredApplications = statusFilter === "ALL"
    ? backendApplications
    : backendApplications.filter((application) => application.status === statusFilter);

  const counts = {
    APPLIED: backendApplications.filter((application) => application.status === "APPLIED").length,
    ASSESSMENT_SUBMITTED: backendApplications.filter((application) => application.status === "ASSESSMENT_SUBMITTED").length,
    SHORTLISTED: backendApplications.filter((application) => application.status === "SHORTLISTED").length,
    SELECTED: backendApplications.filter((application) => application.status === "SELECTED").length,
  };

  return (
    <>
      <PageHeading
        eyebrow="Application Tracking"
        title="My Applications"
        subtitle="Track every application from review through completion."
      />

      <div className="portal-stat-grid">
        <StatCard label="Applied" value={String(counts.APPLIED)} note="Awaiting assessment" />
        <StatCard label="Assessment Submitted" value={String(counts.ASSESSMENT_SUBMITTED)} note="Under review" />
        <StatCard label="Shortlisted" value={String(counts.SHORTLISTED)} note="Progressing" />
        <StatCard label="Selected" value={String(counts.SELECTED)} note="Ready to submit work" />
      </div>

      <PortalCard>
        <div className="card-heading-row">
          <div className="card-title">Published Sprint Applications</div>
          <Badge tone="gray">{backendApplications.length}</Badge>
        </div>

        <div className="filter-tabs">
          {(["ALL", "APPLIED", "ASSESSMENT_SUBMITTED", "SHORTLISTED", "SELECTED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? "active" : ""}
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All" : statusLabels[status]}
            </button>
          ))}
        </div>

        {applicationsLoading ? (
          <div className="empty-state compact">Loading applications...</div>
        ) : applicationsError ? (
          <p className="project-form-error" role="alert">{applicationsError}</p>
        ) : backendApplications.length === 0 ? (
          <div className="empty-state compact">You haven't applied to any published Sprints yet.</div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state compact">No applications match the selected filter.</div>
        ) : (
          <div className="application-cards">
            {filteredApplications.map((application) => {
              const sprint = publishedSprints.find((item) => item.id === application.sprint_id);
              const isExpired = sprint && new Date(sprint.application_deadline) < new Date();
              const showDeadlineEnded = isExpired && application.status === "APPLIED";
              const isSubmitted = application.status !== "APPLIED";
              return (
                <div key={application.id} className={`application-card${isSubmitted ? " submitted" : ""}`}>
                  <div className="application-card-header">
                    <div className="application-card-main">
                      <strong>{sprint?.title ?? "Sprint application"}</strong>
                      <span className="application-card-meta">
                        {sprint?.organization_name ?? "Employer"}
                        {sprint && (
                          <>
                            {" · "}
                            <BackendMoney amount={sprint.budget} currency={sprint.currency} />
                          </>
                        )}
                      </span>
                      <span className="application-card-date">Applied on {formatBackendDeadline(application.applied_at)}</span>
                    </div>
                    <div className="application-card-status">
                      <Badge
                        tone={
                          application.status === "SELECTED"
                            ? "green"
                            : application.status === "APPLIED"
                              ? "amber"
                              : "pink"
                        }
                      >
                        {statusLabels[application.status]}
                      </Badge>
                      {showDeadlineEnded && (
                        <span className="deadline-ended-inline">
                          Application deadline ended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="application-card-actions">
                    {application.status === "APPLIED" && !showDeadlineEnded && (
                      <button
                        className="portal-small-button"
                        type="button"
                        onClick={() => onStartAssessment(application)}
                      >
                        Start Assessment
                      </button>
                    )}
                    {application.status === "SELECTED" && (
                      <button
                        className="portal-small-button"
                        type="button"
                        onClick={() => onSubmitWork(application)}
                      >
                        Submit Work
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PortalCard>
    </>
  );
}

function CandidateSprints({ backendApplications, publishedSprints, onView, onSubmit }: { backendApplications: ApplicationResponse[]; publishedSprints: MarketplaceSprintResponse[]; onView: (sprintId: string) => void; onSubmit: (application: ApplicationResponse) => void }) {
  const selectedApplications = backendApplications.filter((application) => application.status === "SELECTED");
  return (
    <>
      <PageHeading eyebrow="My Work" title="Active Sprints" subtitle="Work on sprints you've been selected for that are active and have not been submitted." />
      <div className="marketplace-grid">
        {selectedApplications.map((application) => {
          const sprint = publishedSprints.find((item) => item.id === application.sprint_id);
          if (!sprint) return null;
          return <PortalCard className="market-card" key={application.id}><div className="market-card-top"><div><Badge>{application.status === "SELECTED" ? "Selected" : application.status}</Badge><strong>{sprint.title}</strong><span>{sprint.organization_name || "Employer"}</span></div><div><BackendMoney amount={sprint.budget} currency={sprint.currency} /></div></div><div className="market-meta"><span>Sprint completion deadline · {formatBackendDeadline(sprint.deadline)}</span><span>Identity protected</span></div><div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View Sprint</button><button className="portal-primary" type="button" onClick={() => onSubmit(application)}>Submit Work</button></div></PortalCard>;
        })}
      </div>
      {selectedApplications.length === 0 && <div className="empty-state">No active sprints yet. Sprints you've applied to appear here until you submit your work.</div>}
      {selectedApplications.some((application) => !publishedSprints.some((sprint) => sprint.id === application.sprint_id)) && <div className="empty-state compact">Some selected sprints are unavailable.</div>}
    </>
  );
}

function CandidatePayments({ candidateProfile, navigate }: { candidateProfile: CandidateProfileData; navigate: (page: string) => void }) {
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

  const totalReleased = payments.reduce((sum, payment) => sum + (payment.status === "RELEASED" ? Number(payment.amount) : 0), 0);
  const totalHeld = payments.reduce((sum, payment) => sum + (payment.status === "HELD" ? Number(payment.amount) : 0), 0);
  const totalPending = payments.reduce((sum, payment) => sum + (payment.status === "PENDING" ? Number(payment.amount) : 0), 0);

  return (
    <>
      <PageHeading eyebrow="Earnings" title="Payments" subtitle="Track protected sprint payments and your total verified earnings." />
      <div className="portal-stat-grid four"><StatCard label="Total Earnings" value={formatCurrency(totalReleased, "NPR")} note="Released payments" /><StatCard label="Held" value={formatCurrency(totalHeld, "NPR")} note="Work in progress" /><StatCard label="Pending" value={formatCurrency(totalPending, "NPR")} note="Awaiting approval" /><StatCard label="Released" value={formatCurrency(totalReleased, "NPR")} note="Available earnings" /></div>
      <PortalCard className="table-card">
        <p className="payment-table-disclosure">
          Payment records currently reflect simulated funding and are not
          gateway-verified.
        </p>
        <div className="portal-table candidate-payment-table">
          <div className="table-header"><span>Sprint</span><span>Type</span><span>Source</span><span>Amount</span><span>Status</span><span>Release Date</span></div>
          {loading && <div className="table-row table-row-full"><span>Loading payments…</span></div>}
          {error && <div className="table-row table-row-full"><span>{error}</span></div>}
          {!loading && !error && payments.length === 0 && <div className="table-row table-row-full"><span>No payments found.</span></div>}
          {!loading && !error && payments.map((payment) => (
            <div className="table-row" key={payment.id}>
              <span>
                <strong>{payment.sprint_title}</strong>
                <small>Transaction: {payment.transaction_reference || "—"}</small>
              </span>
              <span>{payment.payment_type}</span>
              <span>
                {payment.source_identifier
                  ? `${payment.payment_method === "bank" ? "Source account" : "Source phone"}: ${maskAccount(payment.source_identifier)}`
                  : "—"}
              </span>
              <span><strong>{formatCurrency(payment.amount, payment.currency)}</strong></span>
              <span><Badge tone={payment.status === "RELEASED" ? "green" : payment.status === "HELD" ? "amber" : "pink"}>{payment.status}</Badge></span>
              <span>{payment.completed_at ? new Date(payment.completed_at).toLocaleDateString() : "Not released"}</span>
            </div>
          ))}
        </div>
      </PortalCard>
      <PortalCard className="payment-destination">
        <div className="card-title">Payment Destination</div>
        {candidateProfile.payoutMethod ? (
          <div className="detail-list">
            <div><small>Method</small><strong>{getMethodLabel(candidateProfile.payoutMethod)}</strong></div>
            <div><small>Account</small><strong>{maskAccount(candidateProfile.payoutAccount)}</strong></div>
            {candidateProfile.payoutMethod === "bank" && (
              <>
                <div><small>Account Holder</small><strong>{candidateProfile.payoutAccountHolder || "Not set"}</strong></div>
                <div><small>Bank</small><strong>{candidateProfile.payoutBankName || "Not set"}</strong></div>
              </>
            )}
          </div>
        ) : (
          <div className="empty-state compact">No payment destination configured.</div>
        )}
        <div className="project-form-actions">
          <button className="portal-secondary" type="button" onClick={() => navigate("profile")}>
            {candidateProfile.payoutMethod ? "Edit in Profile" : "Set up in Profile"}
          </button>
        </div>
      </PortalCard>
    </>
  );
}

function CandidateProfile({
  profile,
  verification,
  projects,
  proofRecords,
  proofRecordsLoading,
  proofRecordsError,
  onUpdateProfile,
  onSaveProject,
  onDeleteProject,
  onUpdateProofRecordSharing,
}: {
  profile: CandidateProfileData;
  verification: CandidateVerification;
  projects: PersonalProject[];
  proofRecords: ProofRecordResponse[];
  proofRecordsLoading: boolean;
  proofRecordsError: string | null;
  onUpdateProfile: (profile: CandidateProfileData) => void;
  onSaveProject: (values: ProjectValues, projectId?: number) => void;
  onDeleteProject: (projectId: number) => void;
  onUpdateProofRecordSharing: (proofRecordId: string, isShared: boolean) => Promise<void>;
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    ...profile,
    skills: profile.skills.join(", "),
  });
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    technologies: "",
    zipFile: null as File | null,
    liveDemoUrl: "",
  });
  const [projectError, setProjectError] = useState("");
  const [zipError, setZipError] = useState("");
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const [sharingPendingIds, setSharingPendingIds] = useState<Set<string>>(new Set());
  const [sharingErrors, setSharingErrors] = useState<Record<string, string>>({});
  const zipInputRef = useRef<HTMLInputElement>(null);
  const profileSubtitle = [profile.headline, profile.location].filter(Boolean).join(" · ") || "Candidate profile";

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updatedProfile: CandidateProfileData = {
      ...profileDraft,
      fullName: profileDraft.fullName.trim(),
      email: profileDraft.email.trim(),
      headline: profileDraft.headline.trim(),
      location: profileDraft.location.trim(),
      skills: profileDraft.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      portfolioUrl: profileDraft.portfolioUrl.trim(),
      introduction: profileDraft.introduction.trim(),
      payoutMethod: profileDraft.payoutMethod,
      payoutAccount: profileDraft.payoutAccount,
      payoutAccountHolder: profileDraft.payoutAccountHolder,
      payoutBankName: profileDraft.payoutBankName,
    };
    if (!updatedProfile.fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedProfile.email) || !updatedProfile.skills.length) {
      setProfileError("Enter a name, valid email, and at least one skill.");
      return;
    }
    if (updatedProfile.portfolioUrl && !isHttpUrl(updatedProfile.portfolioUrl)) {
      setProfileError("Portfolio URL must start with http:// or https://.");
      return;
    }

    try {
      await updateMyProfile({
        full_name: updatedProfile.fullName,
        location: updatedProfile.location.trim() || undefined,
        skills: updatedProfile.skills,
        bio: updatedProfile.introduction.trim() || undefined,
        website: updatedProfile.portfolioUrl || null,
      });
      onUpdateProfile(updatedProfile);
      setProfileDraft({ ...updatedProfile, skills: updatedProfile.skills.join(", ") });
      setProfileError("");
      setIsEditingProfile(false);
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to update profile. Please try again.",
      );
    }
  };

  const resetProjectForm = () => {
    setDraft({ title: "", description: "", technologies: "", zipFile: null, liveDemoUrl: "" });
    if (zipInputRef.current) zipInputRef.current.value = "";
    setEditingProject(null);
    setShowProjectForm(false);
    setProjectError("");
    setZipError("");
  };

  const editProject = (project: PersonalProject) => {
    setDraft({
      title: project.title,
      description: project.description,
      technologies: project.technologies.join(", "),
      zipFile: project.zipFile,
      liveDemoUrl: project.liveDemoUrl,
    });
    if (zipInputRef.current) zipInputRef.current.value = "";
    setEditingProject(project.id);
    setShowProjectForm(true);
    setProjectError("");
    setZipError("");
  };

  const acceptProjectZip = (file?: File) => {
    if (!file) return;
    const zipType = !file.type || ["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(file.type);
    if (!file.name.toLowerCase().endsWith(".zip") || !zipType) {
      setZipError("Choose a ZIP archive (.zip).");
      return;
    }
    if (file.size > PROJECT_ZIP_MAX_SIZE) {
      setZipError("ZIP files must be 25 MB or smaller.");
      return;
    }
    setDraft((current) => ({ ...current, zipFile: file }));
    setZipError("");
  };

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const liveDemoUrl = draft.liveDemoUrl.trim();
    if (!draft.title.trim() || !draft.description.trim() || !draft.technologies.trim()) {
      setProjectError("Project title, description, and tech stack are required.");
      return;
    }
    if (liveDemoUrl && !isHttpUrl(liveDemoUrl)) {
      setProjectError("Live demo URL must start with http:// or https://.");
      return;
    }
    onSaveProject({
      title: draft.title.trim(),
      description: draft.description.trim(),
      technologies: draft.technologies.split(",").map((technology) => technology.trim()).filter(Boolean),
      zipFile: draft.zipFile,
      liveDemoUrl,
    }, editingProject ?? undefined);
    resetProjectForm();
  };

  const downloadProjectZip = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

return (
    <>
      <PageHeading
        eyebrow="Proof-Based Profile"
        title="My Profile"
        subtitle="Your skills and completed work tell the story."
        action={<button className="portal-secondary" type="button" onClick={() => {
          setProfileDraft({ ...profile, skills: profile.skills.join(", ") });
          setProfileError("");
          setIsEditingProfile((current) => !current);
        }}>{isEditingProfile ? "Cancel Edit" : "Edit Profile"}</button>}
      />
      {isEditingProfile ? (
        <PortalCard className="candidate-profile-editor">
          <form onSubmit={saveProfile} noValidate>
            <div className="portal-form-grid">
              <label className="portal-field"><span>Full name *</span><input value={profileDraft.fullName} onChange={(event) => setProfileDraft({ ...profileDraft, fullName: event.target.value })} /></label>
              <label className="portal-field"><span>Email *</span><input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })} /></label>
              <label className="portal-field"><span>Professional headline <small>(optional)</small></span><input value={profileDraft.headline} onChange={(event) => setProfileDraft({ ...profileDraft, headline: event.target.value })} /></label>
              <label className="portal-field"><span>Location <small>(optional)</small></span><input value={profileDraft.location} onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })} /></label>
              <label className="portal-field portal-span"><span>Skills * (comma-separated)</span><input value={profileDraft.skills} onChange={(event) => setProfileDraft({ ...profileDraft, skills: event.target.value })} /></label>
              <label className="portal-field portal-span"><span>Portfolio URL <small>(optional)</small></span><input type="url" value={profileDraft.portfolioUrl} onChange={(event) => setProfileDraft({ ...profileDraft, portfolioUrl: event.target.value })} placeholder="https://..." /></label>
              <label className="portal-field portal-span"><span>Short introduction <small>(optional)</small></span><textarea rows={3} value={profileDraft.introduction} onChange={(event) => setProfileDraft({ ...profileDraft, introduction: event.target.value })} /></label>
              <div className="form-divider portal-span" />
              <label className="portal-field"><span>Preferred Payout Method</span><select className="portal-select" value={profileDraft.payoutMethod || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutMethod: (event.target.value as "esewa" | "khalti" | "bank") || undefined })}><option value="">Select…</option><option value="esewa">eSewa</option><option value="khalti">Khalti</option><option value="bank">Bank Account</option></select></label>
              {profileDraft.payoutMethod === "esewa" && <label className="portal-field"><span>eSewa Mobile Number</span><input value={profileDraft.payoutAccount || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutAccount: event.target.value })} placeholder="98XXXXXXXX" /></label>}
              {profileDraft.payoutMethod === "khalti" && <label className="portal-field"><span>Khalti Mobile Number</span><input value={profileDraft.payoutAccount || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutAccount: event.target.value })} placeholder="98XXXXXXXX" /></label>}
              {profileDraft.payoutMethod === "bank" && (
                <>
                  <label className="portal-field"><span>Bank Account Holder Name</span><input value={profileDraft.payoutAccountHolder || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutAccountHolder: event.target.value })} /></label>
                  <label className="portal-field"><span>Bank Name</span><input value={profileDraft.payoutBankName || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutBankName: event.target.value })} /></label>
                  <label className="portal-field portal-span"><span>Account Number</span><input value={profileDraft.payoutAccount || ""} onChange={(event) => setProfileDraft({ ...profileDraft, payoutAccount: event.target.value })} placeholder="0000000000000000" /></label>
                </>
              )}
              <div className="form-divider portal-span" />
              <p className="portal-field portal-span" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                No PIN, password, or OTP is stored. Payment details are kept in this session only and are not sent to any external service.
              </p>
            </div>
            {profileError && <p className="project-form-error" role="alert">{profileError}</p>}
            <div className="project-form-actions"><button className="portal-primary" type="submit">Save Profile</button><button className="portal-secondary" type="button" onClick={() => setIsEditingProfile(false)}>Cancel</button></div>
          </form>
        </PortalCard>
      ) : (
        <>
          <div className="portal-two-column profile-layout">
            <div className="profile-left-column">
              <PortalCard>
                <div className="profile-detail-head"><span className="large-avatar">{profile.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{profile.fullName || "Candidate"}</strong><span>{profileSubtitle}</span><Badge>Identity private</Badge></div></div>
                {profile.introduction && <p className="profile-description">{profile.introduction}</p>}
                <div className="detail-list"><div><small>Email</small><strong>{profile.email}</strong></div><div><small>Skills</small><strong>{profile.skills.length}</strong></div><div><small>Basic profile</small><strong>{verification.basicProfileComplete ? "Validated" : "Incomplete"}</strong></div></div>
              </PortalCard>

              <PortalCard>
                <div className="card-title">Payment Information</div>
                {profile.payoutMethod ? (
                  <div className="detail-list">
                    <div><small>Method</small><strong>{getMethodLabel(profile.payoutMethod)}</strong></div>
                    <div><small>Account</small><strong>{maskAccount(profile.payoutAccount)}</strong></div>
                    {profile.payoutMethod === "bank" && (
                      <>
                        <div><small>Account Holder</small><strong>{profile.payoutAccountHolder || "Not set"}</strong></div>
                        <div><small>Bank</small><strong>{profile.payoutBankName || "Not set"}</strong></div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="empty-state compact">No payment destination configured.</div>
                )}
                <div className="form-divider" />
                <div className="project-form-actions">
                  <button className="portal-secondary" type="button" onClick={() => {
                    setProfileDraft({ ...profile, skills: profile.skills.join(", ") });
                    setProfileError("");
                    setIsEditingProfile(true);
                  }}>
                    {profile.payoutMethod ? "Edit Payment Information" : "Set up Payment Information"}
                  </button>
                </div>
              </PortalCard>
            </div>

            <div className="profile-right-column">
              <PortalCard>
                <div className="card-title">Skills</div>
                <div className="badge-row profile-skills">{profile.skills.map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</div>
                <div className="form-divider" />
                <div className="card-title">Proof Trail</div>

{proofRecordsLoading ? (
  <div className="empty-state compact">Loading your verified work...</div>
) : proofRecordsError ? (
  <div className="empty-state compact">
    Unable to load your Proof Trail: {proofRecordsError}
  </div>
) : proofRecords.length > 0 ? (
  <div className="proof-list">
    {proofRecords.map((record) => (
      <div key={record.id}>
        <span />
        <p>
          <strong>{record.title}</strong>
          {record.description && <small>{record.description}</small>}
          <small>
            Skills: {record.skills_demonstrated?.join(", ") || "Not specified"}
          </small>
          <small>
            Verified on: {record.verified_at
              ? new Date(record.verified_at).toLocaleDateString()
              : "Date unavailable"}
            {" · Verified completion"}
          </small>
          <small>Visibility: {record.is_shared ? "Shared" : "Private"}</small>
          {sharingErrors[record.id] && <p className="project-form-error" role="alert">{sharingErrors[record.id]}</p>}
          <button
            className="portal-small-button"
            type="button"
            disabled={sharingPendingIds.has(record.id)}
            onClick={async () => {
              if (sharingPendingIds.has(record.id)) return;
              setSharingPendingIds((current) => new Set(current).add(record.id));
              setSharingErrors((current) => {
                const next = { ...current };
                delete next[record.id];
                return next;
              });
              try {
                await onUpdateProofRecordSharing(record.id, !record.is_shared);
              } catch (error) {
                setSharingErrors((current) => ({
                  ...current,
                  [record.id]: error instanceof Error ? error.message : "Unable to update sharing.",
                }));
              } finally {
                setSharingPendingIds((current) => {
                  const next = new Set(current);
                  next.delete(record.id);
                  return next;
                });
              }
            }}
          >
            {sharingPendingIds.has(record.id)
              ? "Updating..."
              : record.is_shared
                ? "Make private"
                : "Share"}
          </button>
        </p>
      </div>
    ))}
  </div>
) : (
  <div className="empty-state compact">
    No verified Proof Sprints yet.
  </div>
)}
              </PortalCard>

              <PortalCard className="verification-progress-card">
                <button className="verification-summary" type="button" aria-expanded={showVerificationDetails} onClick={() => setShowVerificationDetails((current) => !current)}>
                  <span><span className="card-title">Verification Progress</span><span className="card-subtitle">View your verification status and requirements.</span></span>
                  <span className="verification-toggle" aria-hidden="true">{showVerificationDetails ? "−" : "+"}</span>
                </button>
                {showVerificationDetails && <div className="verification-details">
                <div className="card-heading-row">
                  <div><div className="card-subtitle">Earn verification through profile details, project evidence, and completed Proof Sprints.</div></div>
                  {verification.percentage === 100 && <Badge tone="green">Samarthya Verified</Badge>}
                </div>
                <div className="verification-score-row"><strong>{verification.percentage.toFixed(2)}%</strong><span>{verification.status}</span></div>
                <div className="verification-track" role="progressbar" aria-label="Candidate verification progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={verification.percentage}><span style={{ width: `${verification.percentage}%` }} /></div>
                <div className="verification-points"><span>Earned <strong>{verification.percentage.toFixed(2)} points</strong></span><span>Outstanding <strong>{(100 - verification.percentage).toFixed(2)} points</strong></span></div>
                <div className="verification-requirements">
                  {verification.requirements.map((requirement) => (
                    <div key={requirement.label} className={requirement.complete ? "verification-requirement is-complete" : "verification-requirement"}>
                      <span aria-hidden="true">{requirement.complete ? "✓" : "○"}</span><span>{requirement.label}</span><strong>{requirement.points.toFixed(2)}%</strong>
                    </div>
                  ))}
                </div>
                </div>}
              </PortalCard>
            </div>
          </div>
          <PortalCard className="personal-projects">
            <div className="card-heading-row">
              <div><div className="card-title">Personal Projects</div><div className="card-subtitle">Showcase independent work with technology details and supporting evidence.</div></div>
              {!showProjectForm && <button className="portal-primary" type="button" onClick={() => {
                setDraft({ title: "", description: "", technologies: "", zipFile: null, liveDemoUrl: "" });
                setEditingProject(null);
                setProjectError("");
                setZipError("");
                setShowProjectForm(true);
              }}>+ Add Project</button>}
            </div>
            {showProjectForm && (
              <form className="personal-project-form" onSubmit={saveProject} noValidate>
                <div className="portal-form-grid">
                  <label className="portal-field"><span>Project title *</span><input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                  <label className="portal-field"><span>Technologies / tech stack *</span><input value={draft.technologies} onChange={(event) => setDraft({ ...draft, technologies: event.target.value })} placeholder="React, TypeScript, PostgreSQL" /></label>
                  <label className="portal-field portal-span"><span>Short description *</span><textarea rows={3} maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                  <label className="portal-field"><span>Live demo link</span><input type="url" value={draft.liveDemoUrl} onChange={(event) => setDraft({ ...draft, liveDemoUrl: event.target.value })} placeholder="https://..." /></label>
                  <div className="portal-field portal-span">
                    <span>Project ZIP <small>(optional, max 25 MB)</small></span>
                    <div className={`project-zip-dropzone${isDraggingZip ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDraggingZip(true); }} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDraggingZip(false); }} onDrop={(event) => { event.preventDefault(); setIsDraggingZip(false); acceptProjectZip(event.dataTransfer.files[0]); }}>
                      <input ref={zipInputRef} className="project-zip-input" type="file" accept=".zip,application/zip,application/x-zip-compressed" aria-label="Choose project ZIP" onChange={(event) => { acceptProjectZip(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                      {draft.zipFile
                        ? <div className="project-zip-selected"><div><strong>{draft.zipFile.name}</strong><span>{formatFileSize(draft.zipFile.size)}</span></div><div><button className="portal-secondary" type="button" onClick={() => zipInputRef.current?.click()}>Replace</button><button className="portal-small-button project-delete-button" type="button" onClick={() => { setDraft({ ...draft, zipFile: null }); if (zipInputRef.current) zipInputRef.current.value = ""; setZipError(""); }}>Remove</button></div></div>

                        : <div className="project-zip-prompt"><span className="project-zip-icon" aria-hidden="true">↑</span><div><strong>Drag and drop your ZIP here</strong><span>ZIP archive only · up to 25 MB</span></div><button className="portal-secondary" type="button" onClick={() => zipInputRef.current?.click()}>Browse files</button></div>}
                    </div>
                    {zipError && <p className="project-form-error" role="alert">{zipError}</p>}
                  </div>
                </div>
                {projectError && <p className="project-form-error" role="alert">{projectError}</p>}
                <div className="project-form-actions"><button className="portal-primary" type="submit">{editingProject === null ? "Save Project" : "Update Project"}</button><button className="portal-secondary" type="button" onClick={resetProjectForm}>Cancel</button></div>
              </form>
            )}
            {projects.length === 0
              ? <div className="empty-state personal-projects-empty"><strong>No personal projects yet</strong><span>Add a project with a tech stack and ZIP or live demo evidence to earn project verification.</span></div>
              : <div className="personal-project-grid">{projects.map((project) => {
                const evidenceComplete = Boolean(project.title.trim() && project.description.trim() && project.technologies.some((technology) => technology.trim()) && (project.zipFile || isHttpUrl(project.liveDemoUrl)));
                return <article className="personal-project-card" key={project.id}>
                  <div className="personal-project-card-heading"><h3>{project.title}</h3><div className="personal-project-actions"><button className="portal-small-button" type="button" onClick={() => editProject(project)}>Edit</button><button className="portal-small-button project-delete-button" type="button" onClick={() => { onDeleteProject(project.id); if (editingProject === project.id) resetProjectForm(); }}>Delete</button></div></div>
                  <p>{project.description}</p>
                  <div className="badge-row">{project.technologies.map((technology) => <Badge tone="gray" key={technology}>{technology}</Badge>)}</div>
                  <div className="project-evidence-status"><Badge tone={evidenceComplete ? "green" : "amber"}>{evidenceComplete ? "Evidence submitted" : "Evidence incomplete"}</Badge></div>
                  <div className="personal-project-meta"><div>{project.zipFile && <button className="project-download-link" type="button" onClick={() => project.zipFile && downloadProjectZip(project.zipFile)}>Download {project.zipFile.name} · {formatFileSize(project.zipFile.size)}</button>}{project.liveDemoUrl && <a href={project.liveDemoUrl} target="_blank" rel="noreferrer">Live demo</a>}</div></div>
                </article>;
              })}</div>}
          </PortalCard>
        </>
      )}
    </>
  );
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return <PortalCard className="access-denied"><Badge tone="amber">Submission unavailable</Badge><div>Only accepted candidates can submit work.</div><p>This sprint has already been submitted, or your application has not yet been accepted.</p><button className="portal-primary" type="button" onClick={onBack}>Return to My Sprints</button></PortalCard>;
}

export function CandidatePortal({
  fullName,
  onLogout,
  renderSubmission,
  renderIdentity,
  candidateProfile,
  onCandidateProfileChange,
  projects,
  setProjects,
  applications,
  setApplications,
}: Pick<PortalProps,"fullName" | "onLogout" | "renderSubmission" | "renderIdentity" | "candidateProfile" | "onCandidateProfileChange" | "projects" | "setProjects" | "applications" | "setApplications">) {
  const [page, setPage] = useState(() => {
  const savedPage = sessionStorage.getItem("candidate_portal_page") || "dashboard";
  return savedPage === "assessment" ? "applications" : savedPage;
});

useEffect(() => {
  sessionStorage.setItem("candidate_portal_page", page);
}, [page]);
const [publishedSprints, setPublishedSprints] = useState<MarketplaceSprintResponse[]>([]);
const [sprintsLoading, setSprintsLoading] = useState(true);
const [sprintsError, setSprintsError] = useState<string | null>(null);
const [selectedSprint, setSelectedSprint] = useState(1);
const [selectedPublishedSprintId, setSelectedPublishedSprintId] = useState<string | null>(null);
const [detailReturnPage, setDetailReturnPage] = useState("explore");
const [backendApplications, setBackendApplications] = useState<ApplicationResponse[]>([]);
const [selectedSubmissionApplicationId, setSelectedSubmissionApplicationId] =
  useState<string | null>(null);

const [proofRecords, setProofRecords] = useState<ProofRecordResponse[]>([]);
const [proofRecordsLoading, setProofRecordsLoading] = useState(true);
const [proofRecordsError, setProofRecordsError] = useState<string | null>(null);
const [selectedBackendApplication, setSelectedBackendApplication] =
  useState<ApplicationResponse | null>(null);
const [applicationsLoading, setApplicationsLoading] = useState(false);
const [applicationsError, setApplicationsError] = useState<string | null>(null);
const [applyingSprintId, setApplyingSprintId] = useState<string | null>(null);
const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
const baseVerification = calculateCandidateVerification(candidateProfile, projects, []);
const verification = {
  ...baseVerification,
  approvedSprints: proofRecords.filter((record) => record.verified_at).map((record) => record.title),
};
const {
  activeAssessment,
  loadingApplicationId,
  error: assessmentError,
  startCandidateAssessment,
  submitCandidateAssessment,
} = useCandidateAssessment();

useEffect(() => {
  if (!["dashboard", "explore", "detail", "applications"].includes(page)) return;

  let active = true;

  async function loadPublishedSprints() {
    setSprintsLoading(true);
    setSprintsError(null);
    try {
      const data = await getPublishedSprints();
      if (active) setPublishedSprints(data);
    } catch (error) {
      if (active) {
        setSprintsError(error instanceof Error ? error.message : "Unable to load published Sprints.");
      }
    } finally {
      if (active) setSprintsLoading(false);
    }
  }

  void loadPublishedSprints();
  return () => {
    active = false;
  };
}, [page]);

useEffect(() => {
  let active = true;

  async function loadApplications() {
    setApplicationsLoading(true);
    setApplicationsError(null);

    try {
      const data = await getMyApplications();
      if (active) setBackendApplications(data);
    } catch (error) {
      if (active) {
        setApplicationsError(
          error instanceof Error ? error.message : "Unable to load applications.",
        );
      }
    } finally {
      if (active) setApplicationsLoading(false);
    }
  }

  void loadApplications();

  return () => {
    active = false;
  };
}, []);
useEffect(() => {
  let active = true;

  async function loadProofRecords() {
    setProofRecordsLoading(true);
    setProofRecordsError(null);

    try {
      const data = await getMyProofRecords();
      if (active) setProofRecords(data);
    } catch (error) {
      if (active) {
        setProofRecordsError(
          error instanceof Error
            ? error.message
            : "Unable to load your Proof Trail.",
        );
      }
    } finally {
      if (active) setProofRecordsLoading(false);
    }
  }

  void loadProofRecords();

  return () => {
    active = false;
  };
}, []);
const handleUpdateProofRecordSharing = async (proofRecordId: string, isShared: boolean) => {
  const updated = await updateProofRecordSharing(proofRecordId, isShared);
  setProofRecords((current) => current.map((record) => (record.id === proofRecordId ? updated : record)));
};

const applyToPublishedSprint = async (sprintId: string) => {
  if (applyingSprintId) return;

  setApplyingSprintId(sprintId);
  setApplicationsError(null);

  try {
    const application = await applyToSprint(sprintId);
    setBackendApplications((current) => [
      application,
      ...current.filter((item) => item.id !== application.id),
    ]);
    setPage("applications");
  } catch (error) {
    setApplicationsError(
      error instanceof Error ? error.message : "Unable to apply for this Sprint.",
    );
  } finally {
    setApplyingSprintId(null);
  }
};

const handleStartAssessment = async (
  application: ApplicationResponse,
) => {
  const started = await startCandidateAssessment(application);

  if (started) {
    setAssessmentSubmitted(false);
    setPage("assessment");
  }
};

const handleSubmitWork = (application: ApplicationResponse) => {
  setSelectedBackendApplication(application);
  setSelectedSubmissionApplicationId(application.id);
  setPage("submission");
};

const handleAssessmentSubmit = async (
  submission: AssessmentSubmission,
): Promise<AssessmentResultResponse> => {
  const result = await submitCandidateAssessment(submission);

  setAssessmentSubmitted(true);

  try {
    const updatedApplications = await getMyApplications();
    setBackendApplications(updatedApplications);
  } catch (error) {
    setApplicationsError(
      error instanceof Error
        ? `Assessment submitted, but application history could not refresh: ${error.message}`
        : "Assessment submitted, but application history could not refresh.",
    );
  }

  return result;
};
const openSubmission = (application: ApplicationResponse) => {
  setSelectedSubmissionApplicationId(application.id);
  setPage("submission");
};
const handleSubmissionComplete = () => {
  setPage("applications");
  void getMyApplications()
    .then(setBackendApplications)
    .catch((error: unknown) => {
      setApplicationsError(
        error instanceof Error
          ? `Submission saved, but applications could not refresh: ${error.message}`
          : "Submission saved, but applications could not refresh.",
      );
    });
};
const apply = (sprintId: number) => {
    const sprint = sprints.find((item) => item.id === sprintId);
    if (!sprint || sprint.applicants >= sprint.maxApplicants || applications.some((item) => item.sprintId === sprintId)) return;
    setApplications((current) => [...current, { sprintId, status: "Pending Review", submitted: false, employerApproved: false }]);
    setPage("applications");
  };
  const view = (sprintId: number) => {
    setSelectedPublishedSprintId(null);
    setSelectedSprint(sprintId);
    setDetailReturnPage("explore");
    setPage("detail");
  };
  const viewPublishedSprint = (sprintId: string) => {
    setSelectedPublishedSprintId(sprintId);
    setDetailReturnPage("explore");
    setPage("detail");
  };
  const submit = (sprintId: number) => {
   setApplications((current) =>
    current.map((item) =>
      item.sprintId === sprintId && item.status === "Accepted"
        ? { ...item, status: "Submitted / Under Evaluation", submitted: true, employerApproved: false }
        : item
    )
  );
  setPage("sprints");
};
  const saveProject = (values: ProjectValues, projectId?: number) => {
    setProjects((current) => projectId === undefined
      ? [...current, { ...values, id: current.reduce((maxId, project) => Math.max(maxId, project.id), 0) + 1 }]
      : current.map((project) => project.id === projectId ? { ...values, id: projectId } : project));
  };
  let content: ReactNode;
  switch (page) {
        case "explore":
      content = (
        <SprintMarketplace
          onView={viewPublishedSprint}
          onApply={applyToPublishedSprint}
          publishedSprints={publishedSprints}
          backendApplications={backendApplications}
          applyingSprintId={applyingSprintId}
          loading={sprintsLoading}
          error={sprintsError}
        />
      );
      break;

    case "detail":
  content = (
    <SprintDetails
      sprintId={selectedPublishedSprintId ?? selectedSprint}
      publishedSprints={publishedSprints}
      applications={applications}
      backendApplications={backendApplications}
      applyingSprintId={applyingSprintId}
      loading={sprintsLoading}
      error={sprintsError}
      onBack={() => setPage(detailReturnPage)}
      onApply={(id) =>
        typeof id === "string"
          ? applyToPublishedSprint(id)
          : apply(id)
      }
      formatBackendDeadline={formatBackendDeadline}
      BackendMoney={BackendMoney}
    />
  );
  break;
  case "assessment":
  content = activeAssessment ? (
    <>
      <AssessmentRunner
        assessment={activeAssessment.assessment}
        attempt={activeAssessment.attempt}
        onSubmit={handleAssessmentSubmit}
        onCancel={() => setPage("applications")}
      />
      {assessmentSubmitted && (
        <div className="assessment-actions">
          <button
            className="portal-primary"
            type="button"
            onClick={() => setPage("applications")}
          >
            Back to My Applications
          </button>
        </div>
      )}
    </>
  ) : (
    <PortalCard>
      <p>{assessmentError || "No active assessment found."}</p>
      <button
        className="portal-secondary"
        type="button"
        onClick={() => setPage("applications")}
      >
        Back to My Applications
      </button>
    </PortalCard>
  );
  break;
    case "applications":
  content = (
    <>
      <CandidateApplications
        backendApplications={backendApplications}
        publishedSprints={publishedSprints}
        applicationsLoading={applicationsLoading}
        applicationsError={applicationsError}
        onStartAssessment={handleStartAssessment}
        onSubmitWork={handleSubmitWork}
      />
      {assessmentError && (
        <p className="assessment-error" role="alert">
          {assessmentError}
        </p>
      )}
    </>
  );
  break;
  case "connection-requests":
  content = (
    <>
      <PageHeading
        eyebrow="Connections"
        title="Connection Requests"
        subtitle="Employers who reviewed your scored assessments and requested to connect."
      />
      <ConnectionRequests
        backendApplications={backendApplications}
        publishedSprints={publishedSprints}
      />
    </>
  );
  break;
case "sprints": content = <CandidateSprints backendApplications={backendApplications} publishedSprints={publishedSprints} onView={(sprintId) => {
                                                    setSelectedPublishedSprintId(sprintId);
                                                    setDetailReturnPage("sprints");
                                                    setPage("detail");
                                                  }} onSubmit={handleSubmitWork} />; break;
    case "payments": content = <CandidatePayments candidateProfile={candidateProfile} navigate={setPage} />; break;
case "profile":
  content = (
    <CandidateProfile
      profile={candidateProfile}
      verification={verification}
      projects={projects}
      proofRecords={proofRecords}
      proofRecordsLoading={proofRecordsLoading}
      proofRecordsError={proofRecordsError}
      onUpdateProfile={onCandidateProfileChange}
      onSaveProject={saveProject}
      onDeleteProject={(projectId) =>
        setProjects((current) =>
          current.filter((project) => project.id !== projectId),
        )
      }
      onUpdateProofRecordSharing={handleUpdateProofRecordSharing}
    />
  );
  break;

case "submission": {
  const selectedApplication = backendApplications.find(
    (application) => application.id === selectedSubmissionApplicationId,
  );

  const selectedSprint = selectedApplication
    ? publishedSprints.find(
        (sprint) => sprint.id === selectedApplication.sprint_id,
      )
    : undefined;

  if (
    selectedApplication?.status === "SELECTED" &&
    selectedSprint
  ) {
    content = renderSubmission(
      async () => {
        try {
          const updatedApplications = await getMyApplications();
          setBackendApplications(updatedApplications);
          setPage("applications");
        } catch (error) {
          setApplicationsError(
            error instanceof Error
              ? error.message
              : "Work submitted, but applications could not refresh.",
          );
        }
      },
      {
        application: selectedApplication,
        sprint: selectedSprint,
      },
    );
  } else {
    content = <AccessDenied onBack={() => setPage("applications")} />;
  }

  break;
}
    case "identity": content = renderIdentity(); break;
    default: content = <CandidateDashboard
                                           navigate={setPage}
                                           backendApplications={backendApplications}
                                           publishedSprints={publishedSprints}
                                           proofRecords={proofRecords}
                                           profile={candidateProfile}
                                           verification={verification}
                                           onView={viewPublishedSprint}
                                           onSubmit={handleSubmitWork} />;
  }
  return <PortalShell role="candidate" fullName={fullName} active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
