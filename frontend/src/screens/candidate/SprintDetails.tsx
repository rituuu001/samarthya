import type React from "react";
import { useEffect, useState } from "react";

import type { ApplicationResponse } from "@/api/application";
import type { MarketplaceSprintResponse } from "@/api/sprint";
import type { Application } from "@/data/portalData";
import {
  formatDeadline,
  isApplicationOpen,
  sprints,
} from "@/data/portalData";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { ReportUserButton } from "@/components/portal/ReportUserModal";
import { SprintFactCell } from "@/components/portal/SprintFactCell";
import { SkillBadge } from "@/components/ui/SkillBadge";
import {
  EmployerPublicProfile,
  getEmployerProfile,
} from "@/api/profile";

export type SprintDetailsProps = {
  sprintId: string | number;
  publishedSprints: MarketplaceSprintResponse[];
  applications: Application[];
  backendApplications: ApplicationResponse[];
  applyingSprintId: string | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onApply: (sprintId: string | number) => void;
  formatBackendDeadline: (value: string) => string;
  BackendMoney: React.ComponentType<{ amount: number; currency: string }>;
};

export function SprintDetails({
  sprintId,
  publishedSprints,
  applications,
  backendApplications,
  applyingSprintId,
  loading,
  error,
  onBack,
  onApply,
  formatBackendDeadline,
  BackendMoney: BackendMoneyComponent,
}: SprintDetailsProps) {
  const backendSprint =
    typeof sprintId === "string"
      ? publishedSprints.find((sprint) => sprint.id === sprintId)
      : undefined;

  const [employerProfile, setEmployerProfile] = useState<
    EmployerPublicProfile | null
  >(null);
  const [employerProfileLoading, setEmployerProfileLoading] = useState(false);
  const [employerProfileError, setEmployerProfileError] = useState<
    string | null
  >(null);

  const employerId =
    typeof backendSprint?.employer_id === "string"
      ? backendSprint.employer_id
      : backendSprint?.employer_id != null
        ? String(backendSprint.employer_id)
        : null;

  useEffect(() => {
    setEmployerProfile(null);
    setEmployerProfileError(null);

    if (!employerId) {
      setEmployerProfileLoading(false);
      return;
    }

    setEmployerProfileLoading(true);
    getEmployerProfile(employerId)
      .then((profile) => {
        setEmployerProfile(profile);
        setEmployerProfileLoading(false);
      })
      .catch((error) => {
        setEmployerProfileError(
          error instanceof Error ? error.message : "Failed to load employer profile",
        );
        setEmployerProfileLoading(false);
      });
  }, [employerId]);

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
    const isExpired = new Date(backendSprint.application_deadline) < new Date();

    const now = new Date();
    const msRemaining =
      new Date(backendSprint.application_deadline).getTime() - now.getTime();
    const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    const timeRemainingLabel =
      !isExpired
        ? daysRemaining > 0
          ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
          : "Due today"
        : null;

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

        <div className="details-layout sprint-details-layout">
          <div style={{ gridColumn: "1 / -1" }}>
            <PortalCard className="sprint-details-card">
              <div className="sprint-details-section-heading">
                Complete Task Description
              </div>
              <p className="sprint-details-body">
                {backendSprint.description}
              </p>
            </PortalCard>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <PortalCard className="sprint-details-card sprint-facts">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <SprintFactCell
                  label="Payment"
                  value={
                    <BackendMoneyComponent
                      amount={backendSprint.budget}
                      currency={backendSprint.currency}
                    />
                  }
                />
                <SprintFactCell
                  label="Application Deadline"
                  value={
                    <>
                      {formatBackendDeadline(
                        backendSprint.application_deadline,
                      )}
                      {timeRemainingLabel && (
                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 13,
                            color: "#6B7280",
                            lineHeight: 1.4,
                          }}
                        >
                          {timeRemainingLabel}
                        </span>
                      )}
                    </>
                  }
                />
                <SprintFactCell
                  label="Sprint Completion Deadline"
                  value={formatBackendDeadline(backendSprint.deadline)}
                />
                <SprintFactCell
                  label="Positions Available"
                  value={backendSprint.number_of_positions}
                />
                <SprintFactCell
                  label="Difficulty"
                  value={backendSprint.difficulty}
                />
                <SprintFactCell
                  label="Task Type"
                  value={backendSprint.task_type}
                />
                <SprintFactCell
                  label="Required Skills"
                  value={
                    <span className="sprint-details-badge-row">
                      {backendSprint.skill_category.map((skill) => (
                        <SkillBadge key={skill}>{skill}</SkillBadge>
                      ))}
                    </span>
                  }
                />
              </div>

              {isExpired && !alreadyApplied && (
                <div className="deadline-ended-message">
                  Application deadline has ended.
                </div>
              )}
              {!isExpired && (
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
              )}
            </PortalCard>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <PortalCard className="sprint-details-card">
              <div className="sprint-details-heading-row">
                <div className="sprint-details-section-heading">
                  About the Employer
                </div>
                <ReportUserButton
                  reportedUser={
                    backendSprint.organization_name || "Independent employer"
                  }
                />
              </div>

              <div className="sprint-details-employer-mini">
                <span className="sprint-details-employer-avatar">
                  {(
                    (employerProfile?.organization_name ??
                      backendSprint.organization_name) ||
                      "IE"
                  ).slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {(
                      employerProfile?.organization_name ??
                      backendSprint.organization_name
                    ) ||
                      "Independent employer"}
                  </strong>
                  {employerProfileLoading ? (
                    <small>Loading employer details…</small>
                  ) : employerProfileError ? (
                    <small style={{ color: "#dc2626" }}>
                      Unable to load employer details.
                    </small>
                  ) : (
                    <>
                      {employerProfile?.bio && (
                        <p className="sprint-details-body" style={{ margin: "6px 0 0 0" }}>
                          {employerProfile.bio}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 6,
                        }}
                      >
                        {employerProfile?.organization_type && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              background: "#F3F4F6",
                              borderRadius: 6,
                              padding: "2px 8px",
                            }}
                          >
                            {employerProfile.organization_type}
                          </span>
                        )}
                        {employerProfile?.organization_size && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              background: "#F3F4F6",
                              borderRadius: 6,
                              padding: "2px 8px",
                            }}
                          >
                            {employerProfile.organization_size}
                          </span>
                        )}
                      </div>
                      {employerProfile?.website && (
                        <a
                          href={employerProfile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 6,
                            fontSize: 13,
                            color: "#1D4ED8",
                            textDecoration: "none",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          {employerProfile.website}
                        </a>
                      )}
                    </>
                  )}
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

      <div className="details-layout sprint-details-layout">
        <div style={{ gridColumn: "1 / -1" }}>
          <PortalCard className="sprint-details-card">
            <div className="sprint-details-section-heading">
              Complete Task Description
            </div>
            <p className="sprint-details-body">
              {sprint.description} Build the solution using production-minded
              structure, readable code, and responsive behavior. Include setup
              instructions and a short explanation of your key decisions.
              Submit a repository link or source archive before the deadline.
            </p>
          </PortalCard>
        </div>

        <PortalCard className="sprint-details-card sprint-facts">
          <div>
            <small style={{ color: "#6B7280", fontSize: 12, fontWeight: 400 }}>
              Payment
            </small>
            <strong
              style={{
                color: "#1F2937",
                fontSize: 15,
                fontWeight: 600,
                display: "block",
                marginTop: 4,
              }}
            >
              <BackendMoneyComponent amount={sprint.payment} currency="NPR" />
            </strong>
          </div>

          <div>
            <small style={{ color: "#6B7280", fontSize: 12, fontWeight: 400 }}>
              Application deadline
            </small>
            <strong
              style={{
                color: "#1F2937",
                fontSize: 15,
                fontWeight: 600,
                display: "block",
                marginTop: 4,
              }}
            >
              {formatDeadline(sprint.applicationDeadline)}
            </strong>
          </div>

          <div>
            <small style={{ color: "#6B7280", fontSize: 12, fontWeight: 400 }}>
              Sprint completion deadline
            </small>
            <strong
              style={{
                color: "#1F2937",
                fontSize: 15,
                fontWeight: 600,
                display: "block",
                marginTop: 4,
              }}
            >
              {sprint.deadline}
            </strong>
          </div>

          <div>
            <small style={{ color: "#6B7280", fontSize: 12, fontWeight: 400 }}>
              Applicant limit
            </small>
            <strong
              style={{
                color: "#1F2937",
                fontSize: 15,
                fontWeight: 600,
                display: "block",
                marginTop: 4,
              }}
            >
              {sprint.applicants} / {sprint.maxApplicants}
            </strong>
          </div>

          <div>
            <small style={{ color: "#6B7280", fontSize: 12, fontWeight: 400 }}>
              Required skills
            </small>
            <span className="sprint-details-badge-row">
              {sprint.skills.map((skill) => (
                <SkillBadge key={skill}>{skill}</SkillBadge>
              ))}
            </span>
          </div>
        </PortalCard>

        <PortalCard className="sprint-details-card">
          <div className="sprint-details-heading-row">
            <div className="sprint-details-section-heading">
              About the Employer
            </div>
            <ReportUserButton reportedUser={sprint.company} />
          </div>

          <div className="sprint-details-employer-mini">
            <span className="sprint-details-employer-avatar">
              {(sprint.company || "IE").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{sprint.company}</strong>
            </div>
          </div>

          <p className="sprint-details-body">
            Technology team building practical digital products for growing
            businesses.
          </p>
        </PortalCard>
      </div>
    </>
  );
}
