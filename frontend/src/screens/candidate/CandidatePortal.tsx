import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AssessmentRunner } from "./AssessmentRunner";
import type { PortalProps } from "@/RolePortal";
import { Badge } from "@/components/portal/Badge";
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
import { calculateCandidateVerification, isHttpUrl, type CandidateProfileData, type CandidateVerification } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, PersonalProject } from "@/data/portalData";
import { formatDeadline, isApplicationOpen, sprints } from "@/data/portalData";
import type {
  AssessmentSubmission,
  AssessmentResultResponse,
} from "@/api/assessment";

import {
  getMyProofRecords,
  type ProofRecordResponse,
} from "@/api/proofRecord";

type ProjectValues = Omit<PersonalProject, "id">;

const PROJECT_ZIP_MAX_SIZE = 25 * 1024 * 1024;

function formatFileSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

function Money({ amount }: { amount: number }) {
  return <>NPR {amount.toLocaleString()}</>;
}

function BackendMoney({ amount, currency }: { amount: number; currency: string }) {
  return <>{currency} {amount.toLocaleString()}</>;
}

function formatBackendDeadline(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CandidateDashboard({
  navigate,
  applications,
  profile,
  verification,
  onView,
  onSubmit,
}: {
  navigate: (page: string) => void;
  applications: Application[];
  profile: CandidateProfileData;
  verification: CandidateVerification;
  onView: (sprintId: number) => void;
  onSubmit: (sprintId: number) => void;
}) {
  const active = applications.filter((item) => item.status === "Accepted");
  return (
    <>
      <PageHeading eyebrow="Candidate Dashboard" title={`Welcome back, ${profile.fullName.split(" ")[0] || "Candidate"}.`} subtitle="Build your proof trail through real work and verified skills." action={<button className="portal-primary" type="button" onClick={() => navigate("explore")}>Explore Sprints</button>} />
      <PortalCard className="profile-summary candidate-summary">
        <div className="profile-summary-person"><span className="large-avatar">{profile.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{profile.fullName}</strong><span>{[profile.headline, profile.location].filter(Boolean).join(" · ") || "Candidate profile"}</span><small>Verification status · {verification.status}</small></div></div>
        <div className="profile-progress"><div><span>Verification progress</span><strong>{verification.percentage.toFixed(2)}%</strong></div><div><span style={{ width: `${verification.percentage}%` }} /></div><button type="button" onClick={() => navigate("profile")}>View verification</button></div>
      </PortalCard>
      <div className="skills-summary">
        <PortalCard><div className="card-title">Profile Skills</div><div className="badge-row">{profile.skills.map((skill) => <Badge tone="gray" key={skill}>{skill}</Badge>)}</div></PortalCard>
        <PortalCard><div className="card-title">Approved Proof Sprints</div><div className="badge-row">{verification.approvedSprints.length ? verification.approvedSprints.map((title) => <Badge key={title}>✓ {title}</Badge>) : <span className="card-subtitle">No employer-approved sprints yet.</span>}</div></PortalCard>
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
  const filters = useMemo(() => ["All", ...Array.from(new Set(publishedSprints.flatMap((sprint) => sprint.skill_category))).sort()], [publishedSprints]);
  const visible = useMemo(() => publishedSprints.filter((sprint) => {
    const query = search.toLowerCase();
    const matchesSearch =
      sprint.title.toLowerCase().includes(query) ||
      sprint.description.toLowerCase().includes(query) ||
      sprint.skill_category.some((skill) => skill.toLowerCase().includes(query));
    return matchesSearch && (filter === "All" || sprint.skill_category.includes(filter));
  }), [filter, publishedSprints, search]);
  return (
    <>
      <PageHeading eyebrow="Proof Sprint Marketplace" title="Explore Sprints" subtitle="Find paid tasks that match your skills and build verified proof." />
      <PortalCard className="marketplace-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or skills..." />
        <div>{filters.map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      </PortalCard>
      {loading && <div className="empty-state">Loading available sprints...</div>}
      {!loading && error && <div className="empty-state">{error}</div>}
      {!loading && !error && publishedSprints.length === 0 && <div className="empty-state">No published sprints are available yet.</div>}
      {!loading && !error && publishedSprints.length > 0 && <div className="marketplace-count">Showing <strong>{visible.length}</strong> active proof sprints</div>}
      {!loading && !error && publishedSprints.length > 0 && visible.length === 0 && <div className="empty-state">No sprints match your search or selected filter.</div>}
      {!loading && !error && <div className="marketplace-grid">
        {visible.map((sprint) => (
          <PortalCard className="market-card" key={sprint.id}>
            <div className="market-card-top"><div><strong>{sprint.title}</strong><span>{sprint.organization_name || "Independent employer"}</span></div><div><BackendMoney amount={sprint.budget} currency={sprint.currency} /></div></div>
            <p>{sprint.description}</p>
            <div className="badge-row">{sprint.skill_category.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
            <div className="market-meta"><span>Application deadline · {formatBackendDeadline(sprint.application_deadline)}</span><span>Sprint completion deadline · {formatBackendDeadline(sprint.deadline)}</span><span>{sprint.number_of_positions} position{sprint.number_of_positions === 1 ? "" : "s"}</span></div>
            <div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View</button><button
  className="portal-primary"
  type="button"
  disabled={
    backendApplications.some((application) => application.sprint_id === sprint.id) ||
    applyingSprintId === sprint.id
  }
  onClick={() => onApply(sprint.id)}
>
  {applyingSprintId === sprint.id
    ? "Applying..."
    : backendApplications.some((application) => application.sprint_id === sprint.id)
      ? "Applied"
      : "Apply"}
</button></div>
          </PortalCard>
        ))}
      </div>}
    </>
  );
}


function SprintDetails({
  sprintId,
  publishedSprints,
  applications,
  backendApplications,
  applyingSprintId,
  loading,
  error,
  onBack,
  onApply,
}: {
  sprintId: string | number;
  publishedSprints: MarketplaceSprintResponse[];
  applications: Application[];
  backendApplications: ApplicationResponse[];
  applyingSprintId: string | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onApply: (sprintId: string | number) => void;
}) {
  const backendSprint =
    typeof sprintId === "string"
      ? publishedSprints.find((sprint) => sprint.id === sprintId)
      : undefined;

  if (typeof sprintId === "string") {
    if (loading) {
      return (
        <>
          <button className="portal-back-link" type="button" onClick={onBack}>
            ← Back to Explore Sprints
          </button>
          <div className="empty-state">Loading Sprint details...</div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <button className="portal-back-link" type="button" onClick={onBack}>
            ← Back to Explore Sprints
          </button>
          <div className="empty-state">{error}</div>
        </>
      );
    }

    if (!backendSprint) {
      return (
        <>
          <button className="portal-back-link" type="button" onClick={onBack}>
            ← Back to Explore Sprints
          </button>
          <div className="empty-state">
            This Sprint is no longer available.
          </div>
        </>
      );
    }

    const alreadyApplied = backendApplications.some(
      (application) => application.sprint_id === backendSprint.id,
    );

    const isApplying = applyingSprintId === backendSprint.id;

    return (
      <>
        <button className="portal-back-link" type="button" onClick={onBack}>
          ← Back to Explore Sprints
        </button>

        <PageHeading
          eyebrow="Sprint Details"
          title={backendSprint.title}
          subtitle={`Posted by ${
            backendSprint.organization_name || "Independent employer"
          } · Applications reviewed blindly`}
        />

        <div className="details-layout">
          <div>
            <PortalCard>
              <div className="card-title">Complete Task Description</div>
              <p className="detail-copy">{backendSprint.description}</p>
            </PortalCard>
          </div>

          <div>
            <PortalCard className="sprint-facts">
              <div>
                <small>Payment</small>
                <strong>
                  <BackendMoney
                    amount={backendSprint.budget}
                    currency={backendSprint.currency}
                  />
                </strong>
              </div>

              <div>
                <small>Application deadline</small>
                <strong>
                  {formatBackendDeadline(backendSprint.application_deadline)}
                </strong>
              </div>

              <div>
                <small>Sprint completion deadline</small>
                <strong>{formatBackendDeadline(backendSprint.deadline)}</strong>
              </div>

              <div>
                <small>Positions available</small>
                <strong>{backendSprint.number_of_positions}</strong>
              </div>

              <div>
                <small>Difficulty</small>
                <strong>{backendSprint.difficulty}</strong>
              </div>

              <div>
                <small>Task type</small>
                <strong>{backendSprint.task_type}</strong>
              </div>

              <div>
                <small>Required skills</small>
                <span className="badge-row">
                  {backendSprint.skill_category.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </span>
              </div>

              <button
                className="portal-primary"
                type="button"
                disabled={alreadyApplied || isApplying}
                onClick={() => onApply(backendSprint.id)}
              >
                {isApplying
                  ? "Applying..."
                  : alreadyApplied
                    ? "Applied"
                    : "Apply for This Sprint"}
              </button>
            </PortalCard>

            <PortalCard>
              <div className="card-heading-row">
                <div className="card-title">About the Employer</div>
                <ReportUserButton
                  reportedUser={
                    backendSprint.organization_name || "Independent employer"
                  }
                />
              </div>

              <div className="employer-mini">
                <span>
                  {(backendSprint.organization_name || "IE")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <strong>
                    {backendSprint.organization_name || "Independent employer"}
                  </strong>
                  <small>
                    Organization information provided by the employer
                  </small>
                </div>
              </div>
            </PortalCard>
          </div>
        </div>
      </>
    );
  }

  // Existing mock Sprint details — preserved
  const sprint = sprints.find((item) => item.id === sprintId)!;
  const application = applications.find(
    (item) => item.sprintId === sprintId,
  );
  const full = sprint.applicants >= sprint.maxApplicants;
  const applicationOpen = isApplicationOpen(sprint);

  return (
    <>
      <button className="portal-back-link" type="button" onClick={onBack}>
        ← Back to Explore Sprints
      </button>

      <PageHeading
        eyebrow="Sprint Details"
        title={sprint.title}
        subtitle={`Posted by ${sprint.company} · Applications reviewed blindly`}
      />

      <div className="details-layout">
        <div>
          <PortalCard>
            <div className="card-title">Complete Task Description</div>
            <p className="detail-copy">
              {sprint.description} Build the solution using production-minded
              structure, readable code, and responsive behavior. Include setup
              instructions and a short explanation of your key decisions.
              Submit a repository link or source archive before the deadline.
            </p>
          </PortalCard>

          <PortalCard>
            <div className="card-title">Expected Deliverables</div>
            <ul className="deliverable-list">
              <li>Working implementation covering the complete task scope</li>
              <li>Clear setup and run instructions</li>
              <li>
                Short summary of technical decisions and known limitations
              </li>
              <li>Source link or downloadable archive</li>
            </ul>
          </PortalCard>
        </div>

        <div>
          <PortalCard className="sprint-facts">
            <div>
              <small>Payment</small>
              <strong>
                <Money amount={sprint.payment} />
              </strong>
            </div>

            <div>
              <small>Application deadline</small>
              <strong>{formatDeadline(sprint.applicationDeadline)}</strong>
            </div>

            <div>
              <small>Sprint completion deadline</small>
              <strong>{sprint.deadline}</strong>
            </div>

            <div>
              <small>Applicant limit</small>
              <strong>
                {sprint.applicants} / {sprint.maxApplicants}
              </strong>
            </div>

            <div>
              <small>Required skills</small>
              <span className="badge-row">
                {sprint.skills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </span>
            </div>

            <button
              className="portal-primary"
              type="button"
              disabled={Boolean(application) || full || !applicationOpen}
              onClick={() => onApply(sprint.id)}
            >
              {application
                ? `Application ${application.status}`
                : full || !applicationOpen
                  ? "Applications Closed"
                  : "Apply for This Sprint"}
            </button>
          </PortalCard>

          <PortalCard>
            <div className="card-heading-row">
              <div className="card-title">About the Employer</div>
              <ReportUserButton reportedUser={sprint.company} />
            </div>

            <div className="employer-mini">
              <span>TN</span>
              <div>
                <strong>{sprint.company}</strong>
                <small>Verified organization · Kathmandu</small>
              </div>
            </div>

            <p className="detail-copy">
              Technology team building practical digital products for growing
              businesses.
            </p>
          </PortalCard>
        </div>
      </div>
    </>
  );
}

function CandidateApplications({
  applications,
  backendApplications,
  publishedSprints,
  applicationsLoading,
  applicationsError,
  navigate,
  onStartAssessment,
  onSubmitWork,
}: {
  applications: Application[];
  backendApplications: ApplicationResponse[];
  publishedSprints: MarketplaceSprintResponse[];
  applicationsLoading: boolean;
  applicationsError: string | null;
  navigate: (page: string) => void;
  onStartAssessment: (application: ApplicationResponse) => void;
  onSubmitWork: (application: ApplicationResponse) => void;
}) {
  const groups: { title: string; statuses: ApplicationStatus[] }[] = [
    { title: "Review Pending", statuses: ["Pending Review"] },
    {
      title: "Accepted",
      statuses: ["Accepted", "Submitted / Under Evaluation", "Completed"],
    },
    { title: "Rejected", statuses: ["Rejected"] },
  ];

  const statusLabels: Record<ApplicationResponse["status"], string> = {
    APPLIED: "Review Pending",
    ASSESSMENT_SUBMITTED: "Assessment Submitted",
    SHORTLISTED: "Shortlisted",
    SELECTED: "Selected",
  };

  return (
    <>
      <PageHeading
        eyebrow="Application Tracking"
        title="My Applications"
        subtitle="Track every application from review through completion."
      />

      {/* Existing mock applications */}
      <div className="application-groups">
        {groups.map((group) => {
          const items = applications.filter((item) =>
            group.statuses.includes(item.status),
          );

          return (
            <PortalCard key={group.title}>
              <div className="card-heading-row">
                <div className="card-title">{group.title}</div>
                <Badge tone="gray">{items.length}</Badge>
              </div>

              {items.length ? (
                <div className="application-list">
                  {items.map((application) => {
                    const sprint = sprints.find(
                      (item) => item.id === application.sprintId,
                    );

                    if (!sprint) return null;

                    return (
                      <div key={application.sprintId}>
                        <div>
                          <strong>{sprint.title}</strong>
                          <span>
                            {sprint.company} · <Money amount={sprint.payment} />
                          </span>
                        </div>

                        <Badge
                          tone={
                            application.status === "Rejected"
                              ? "gray"
                              : application.status === "Completed"
                                ? "green"
                                : application.status === "Pending Review"
                                  ? "amber"
                                  : "pink"
                          }
                        >
                          {application.status}
                        </Badge>

                        {application.status === "Accepted" && (
                          <button
                            className="portal-small-button"
                            type="button"
                            onClick={() => navigate("sprints")}
                          >
                            Open Sprint
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state compact">
                  No items in this section.
                </div>
              )}
            </PortalCard>
          );
        })}
      </div>

      {/* Real backend applications */}
      <PortalCard>
        <div className="card-heading-row">
          <div className="card-title">Published Sprint Applications</div>
          <Badge tone="gray">{backendApplications.length}</Badge>
        </div>

        {applicationsLoading ? (
          <div className="empty-state compact">
            Loading applications...
          </div>
        ) : applicationsError ? (
          <p className="project-form-error" role="alert">
            {applicationsError}
          </p>
        ) : backendApplications.length === 0 ? (
          <div className="empty-state compact">
            You haven't applied to any published Sprints yet.
          </div>
        ) : (
          <div className="application-list">
            {backendApplications.map((application) => {
              const sprint = publishedSprints.find(
                (item) => item.id === application.sprint_id,
              );

              return (
                <div key={application.id}>
                  <div>
                    <strong>{sprint?.title ?? "Sprint application"}</strong>
                    <span>
                      {sprint?.organization_name ?? "Employer"}
                      {sprint && (
                        <>
                          {" · "}
                          <BackendMoney
                            amount={sprint.budget}
                            currency={sprint.currency}
                          />
                        </>
                      )}
                    </span>
                    <span>
                      Applied on {formatBackendDeadline(application.applied_at)}
                    </span>
                  </div>

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
                  {application.status === "APPLIED" && (
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
              );
            })}
          </div>
        )}
      </PortalCard>
    </>
  );
}

function CandidateSprints({ applications, onView, onSubmit }: { applications: Application[]; onView: (sprintId: number) => void; onSubmit: (sprintId: number) => void }) {
  const active = applications.filter((item) => item.status === "Accepted");
  return (
    <>
      <PageHeading eyebrow="My Work" title="Active Sprints" subtitle="Work on sprints you've applied to that are active and have not been submitted." />
      <div className="marketplace-grid">
        {active.map((application) => {
          const sprint = sprints.find((item) => item.id === application.sprintId);
          if (!sprint) return null;
          return <PortalCard className="market-card" key={application.sprintId}><div className="market-card-top"><div><Badge>{application.status === "Accepted" ? "Applied" : application.status}</Badge><strong>{sprint.title}</strong><span>{sprint.company}</span></div><div><Money amount={sprint.payment} /></div></div><div className="market-meta"><span>Sprint completion deadline · {sprint.deadline}</span><span>Identity protected</span></div><div className="market-actions"><button className="portal-secondary" type="button" onClick={() => onView(sprint.id)}>View Sprint</button><button className="portal-primary" type="button" onClick={() => onSubmit(sprint.id)}>Submit Work</button></div></PortalCard>;
        })}
      </div>
      {active.length === 0 && <div className="empty-state">No active sprints yet. Sprints you've applied to appear here until you submit your work.</div>}
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

function CandidateProfile({
  navigate,
  profile,
  verification,
  projects,
  proofRecords,
  proofRecordsLoading,
  proofRecordsError,
  onUpdateProfile,
  onSaveProject,
  onDeleteProject,
}: {
  navigate: (page: string) => void;
  profile: CandidateProfileData;
  verification: CandidateVerification;
  projects: PersonalProject[];
  proofRecords: ProofRecordResponse[];
  proofRecordsLoading: boolean;
  proofRecordsError: string | null;
  onUpdateProfile: (profile: CandidateProfileData) => void;
  onSaveProject: (values: ProjectValues, projectId?: number) => void;
  onDeleteProject: (projectId: number) => void;
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
  const zipInputRef = useRef<HTMLInputElement>(null);
  const profileSubtitle = [profile.headline, profile.location].filter(Boolean).join(" · ") || "Candidate profile";

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
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
    };
    if (!updatedProfile.fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedProfile.email) || !updatedProfile.skills.length) {
      setProfileError("Enter a name, valid email, and at least one skill.");
      return;
    }
    if (updatedProfile.portfolioUrl && !isHttpUrl(updatedProfile.portfolioUrl)) {
      setProfileError("Portfolio URL must start with http:// or https://.");
      return;
    }
    onUpdateProfile(updatedProfile);
    setProfileDraft({ ...updatedProfile, skills: updatedProfile.skills.join(", ") });
    setProfileError("");
    setIsEditingProfile(false);
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
      {isEditingProfile && (
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
            </div>
            {profileError && <p className="project-form-error" role="alert">{profileError}</p>}
            <div className="project-form-actions"><button className="portal-primary" type="submit">Save Profile</button><button className="portal-secondary" type="button" onClick={() => setIsEditingProfile(false)}>Cancel</button></div>
          </form>
        </PortalCard>
      )}
      <div className="portal-two-column profile-layout">
        <PortalCard>
          <div className="profile-detail-head"><span className="large-avatar">{profile.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{profile.fullName || "Candidate"}</strong><span>{profileSubtitle}</span><Badge>Identity private</Badge></div></div>
          {profile.introduction && <p className="profile-description">{profile.introduction}</p>}
          <div className="detail-list"><div><small>Email</small><strong>{profile.email}</strong></div><div><small>Skills</small><strong>{profile.skills.length}</strong></div><div><small>Basic profile</small><strong>{verification.basicProfileComplete ? "Validated" : "Incomplete"}</strong></div></div>
        </PortalCard>
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
        </p>
      </div>
    ))}
  </div>
) : (
  <div className="empty-state compact">
    No verified Proof Sprints yet.
  </div>
)}
          <button className="portal-secondary full" type="button" onClick={() => navigate("identity")}>View Connection Request</button>
        </PortalCard>
      </div>
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
const [proofRecords, setProofRecords] = useState<ProofRecordResponse[]>([]);
const [proofRecordsLoading, setProofRecordsLoading] = useState(true);
const [proofRecordsError, setProofRecordsError] = useState<string | null>(null);
const [selectedBackendApplication, setSelectedBackendApplication] =
  useState<ApplicationResponse | null>(null);
const [applicationsLoading, setApplicationsLoading] = useState(false);
const [applicationsError, setApplicationsError] = useState<string | null>(null);
const [applyingSprintId, setApplyingSprintId] = useState<string | null>(null);
const [assessmentSubmitted, setAssessmentSubmitted] = useState(false);
const verification = calculateCandidateVerification(candidateProfile, projects, applications);
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
        <Marketplace
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
        applications={applications}
        backendApplications={backendApplications}
        publishedSprints={publishedSprints}
        applicationsLoading={applicationsLoading}
        applicationsError={applicationsError}
        navigate={setPage}
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
    case "sprints": content = <CandidateSprints applications={applications} onView={(sprintId) => {
      setSelectedSprint(sprintId);
      setDetailReturnPage("sprints");
      setPage("detail");
    }} onSubmit={(sprintId) => {
      setSelectedSprint(sprintId);
      setPage("submission");
    }} />; break;
    case "payments": content = <CandidatePayments />; break;
    case "profile": content = <CandidateProfile navigate={setPage} profile={candidateProfile} verification={verification} projects={projects} proofRecords={proofRecords} proofRecordsLoading={proofRecordsLoading} proofRecordsError={proofRecordsError}onUpdateProfile={onCandidateProfileChange} onSaveProject={saveProject} onDeleteProject={(projectId) => setProjects((current) => current.filter((project) => project.id !== projectId))} />; break;
case "submission": {
  const selectedSprintData = selectedBackendApplication
    ? publishedSprints.find(
        (item) => item.id === selectedBackendApplication.sprint_id,
      )
    : undefined;

  if (selectedBackendApplication && selectedSprintData) {
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
        application: selectedBackendApplication,
        sprint: selectedSprintData,
      },
    );
  } else {
    const canSubmit = applications.some(
      (item) =>
        item.sprintId === selectedSprint && item.status === "Accepted",
    );

    content = canSubmit
      ? renderSubmission(() => submit(selectedSprint))
      : <AccessDenied onBack={() => setPage("applications")} />;
  }

  break;
}
    case "identity": content = renderIdentity(); break;
    default: content = <CandidateDashboard applications={applications} 
                                           navigate={setPage} 
                                           profile={candidateProfile} 
                                           verification={verification}
                                           onView={view}
                                           onSubmit={(sprintId) => {
                                                    setSelectedSprint(sprintId);
                                                    setPage("submission");
                                                   }} />;
  }
  return <PortalShell role="candidate" fullName={fullName} active={page} setActive={setPage} onLogout={onLogout}>{content}</PortalShell>;
}
