import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSprintApplications,
  getSprintAssessmentResults,
  getSharedEvidence,
  selectApplication,
  shortlistApplication,
} from "@/api/application";
import type {
  EmployerApplicationResponse,
  EmployerAssessmentResult,
  SharedEvidenceResponse,
} from "@/api/application";
import {
  createConnectionRequest,
  getSprintConnectionRequests,
  getRevealedIdentity,
  type ConnectionRequestResponse,
  type ContributorIdentityResponse,
} from "@/api/connectionRequest";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import type { SprintResponse } from "@/api/sprint";

type ApplicationReviewProps = {
  sprint: SprintResponse;
  onBack: () => void;
  onReviewSubmission: (applicationId: string) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAssessmentPercentage(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";
  return numeric.toFixed(1);
}

function getStatusTone(status: EmployerApplicationResponse["status"]) {
  switch (status) {
    case "SELECTED":
      return "green";
    case "SHORTLISTED":
      return "amber";
    case "ASSESSMENT_SUBMITTED":
      return "pink";
    default:
      return "gray";
  }
}

export function ApplicationReview({
  sprint,
  onBack,
  onReviewSubmission,
}: ApplicationReviewProps) {
  const [applications, setApplications] = useState<
    EmployerApplicationResponse[]
  >([]);
  const [assessmentResults, setAssessmentResults] = useState<
    EmployerAssessmentResult[]
  >([]);
  const [connectionRequests, setConnectionRequests] = useState<
    Record<string, ConnectionRequestResponse>
  >({});
  const [revealedIdentities, setRevealedIdentities] = useState<
    Record<string, ContributorIdentityResponse>
  >({});
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(
    new Set(),
  );
  const [evidenceByApplication, setEvidenceByApplication] = useState<
    Record<string, SharedEvidenceResponse>
  >({});
  const [evidenceLoading, setEvidenceLoading] = useState<Set<string>>(
    new Set(),
  );
  const [evidenceError, setEvidenceError] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actingApplicationId, setActingApplicationId] = useState<string | null>(
    null,
  );
  const [requestingApplicationId, setRequestingApplicationId] = useState<
    string | null
  >(null);
  const [revealingApplicationId, setRevealingApplicationId] = useState<
    string | null
  >(null);
  const effectLoadedSprintId = useRef<string | null>(null);

  const loadReviewData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [applicationData, assessmentData] = await Promise.all([
        getSprintApplications(sprint.id),
        getSprintAssessmentResults(sprint.id),
      ]);

      setApplications(applicationData);
      setAssessmentResults(assessmentData);

      // Fetch connection request statuses for applications
      const requestData = await getSprintConnectionRequests(sprint.id);
      const requestMap: Record<string, ConnectionRequestResponse> = {};
      for (const request of requestData) {
        requestMap[request.application_id] = request;
      }
      setConnectionRequests(requestMap);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load applications.",
      );
    } finally {
      setLoading(false);
    }
  }, [sprint.id]);

  useEffect(() => {
    if (effectLoadedSprintId.current === sprint.id) return;
    effectLoadedSprintId.current = sprint.id;
    void loadReviewData();
  }, [loadReviewData, sprint.id]);

  const assessmentByApplicationId = useMemo(() => {
    return new Map(
      assessmentResults.map((result) => [
        result.application_id,
        result,
      ]),
    );
  }, [assessmentResults]);

  const handleShortlist = async (applicationId: string) => {
    setActingApplicationId(applicationId);
    setActionError(null);

    try {
      const updatedApplication = await shortlistApplication(applicationId);

      setApplications((current) =>
        current.map((application) =>
          application.id === updatedApplication.id
            ? updatedApplication
            : application,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to shortlist the application.",
      );
    } finally {
      setActingApplicationId(null);
    }
  };

  const handleSelect = async (applicationId: string) => {
    setActingApplicationId(applicationId);
    setActionError(null);

    try {
      const updatedApplication = await selectApplication(applicationId);

      setApplications((current) =>
        current.map((application) =>
          application.id === updatedApplication.id
            ? updatedApplication
            : application,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to select the application.",
      );
    } finally {
      setActingApplicationId(null);
    }
  };

  const handleRequestConnection = async (applicationId: string) => {
    setRequestingApplicationId(applicationId);
    setConnectionError(null);

    try {
      const created = await createConnectionRequest(applicationId);
      setConnectionRequests((prev) => ({
        ...prev,
        [applicationId]: created,
      }));
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : "Failed to request connection.",
      );
    } finally {
      setRequestingApplicationId(null);
    }
  };

  const handleViewIdentity = async (applicationId: string) => {
    setRevealingApplicationId(applicationId);
    setConnectionError(null);

    try {
      const response = await getRevealedIdentity(applicationId);
      setRevealedIdentities((prev) => ({
        ...prev,
        [applicationId]: response.contributor,
      }));
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : "Failed to retrieve contributor identity.",
      );
    } finally {
      setRevealingApplicationId(null);
    }
  };

  const handleToggleEvidence = async (applicationId: string) => {
    setExpandedEvidence((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });

    if (!evidenceByApplication[applicationId] && !evidenceLoading.has(applicationId)) {
      setEvidenceLoading((current) => new Set(current).add(applicationId));
      setEvidenceError((current) => {
        const next = { ...current };
        delete next[applicationId];
        return next;
      });
      try {
        const data = await getSharedEvidence(applicationId);
        setEvidenceByApplication((current) => ({
          ...current,
          [applicationId]: data,
        }));
      } catch (err) {
        setEvidenceError((current) => ({
          ...current,
          [applicationId]:
            err instanceof Error ? err.message : "Failed to load shared evidence.",
        }));
      } finally {
        setEvidenceLoading((current) => {
          const next = new Set(current);
          next.delete(applicationId);
          return next;
        });
      }
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="APPLICATION REVIEW"
        title={sprint.title}
        subtitle="Review applications and assessment results without seeing contributor identity."
        action={
          <OutlineButton onClick={onBack}>
            Back to My Sprints
          </OutlineButton>
        }
      />

      {loading && (
        <PortalCard>
          <p>Loading applications...</p>
        </PortalCard>
      )}

      {!loading && error && (
        <PortalCard>
          <p>{error}</p>
          <div style={{ marginTop: "16px" }}>
            <PinkButton small onClick={() => void loadReviewData()}>
              Try Again
            </PinkButton>
          </div>
        </PortalCard>
      )}

      {!loading && !error && applications.length === 0 && (
        <PortalCard>
          <p>No applications have been submitted for this Sprint yet.</p>
        </PortalCard>
      )}

      {!loading && !error && applications.length > 0 && (
        <>
          {actionError && (
            <PortalCard>
              <p style={{ color: "#b91c1c" }}>{actionError}</p>
            </PortalCard>
          )}

          {connectionError && (
            <PortalCard>
              <p style={{ color: "#b91c1c" }}>{connectionError}</p>
            </PortalCard>
          )}

          <div
            style={{
              display: "grid",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {applications.map((application, index) => {
              const assessment = assessmentByApplicationId.get(
                application.id,
              );

              const isActing =
                actingApplicationId === application.id;
              const isRequestingConnection =
                requestingApplicationId === application.id;
              const isRevealingIdentity =
                revealingApplicationId === application.id;

              const canShortlist =
                application.status === "ASSESSMENT_SUBMITTED";

              const canSelect =
                application.status === "SHORTLISTED";

              // Assessment is completed and scored
              const isAssessmentCompletedAndScored = Boolean(
                assessment &&
                  assessment.score !== null &&
                  assessment.submitted_at !== null,
              );

              const connectionRequest = connectionRequests[application.id];
              const canRequestConnection =
                isAssessmentCompletedAndScored && !connectionRequest;

              const revealedIdentity = revealedIdentities[application.id];

              return (
                <PortalCard key={application.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#777",
                          marginBottom: "6px",
                        }}
                      >
                        {application.contributor_code}
                      </div>

                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                        }}
                      >
                        Application
                      </div>
                    </div>

                    <Badge tone={getStatusTone(application.status)}>
                      {application.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "16px",
                      marginTop: "20px",
                    }}
                  >
                    <div>
                      <div className="portal-eyebrow">
                        APPLIED
                      </div>
                      <div>
                        {formatDate(application.applied_at)}
                      </div>
                    </div>

                    <div>
                      <div className="portal-eyebrow">
                        ASSESSMENT
                      </div>
                      <div>
                        {assessment
                          ? assessment.attempt_status.replace(/_/g, " ")
                          : "Not available"}
                      </div>
                    </div>

                    <div>
                      <div className="portal-eyebrow">
                        SCORE
                      </div>
                      <div>
                        {assessment?.score !== null &&
                        assessment?.score !== undefined &&
                        assessment?.max_score !== null &&
                        assessment?.max_score !== undefined
                          ? `${assessment.score} / ${assessment.max_score} (${formatAssessmentPercentage(assessment.percentage)}%)`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="portal-eyebrow">
                        RESULT
                      </div>
                      <div>
                        {assessment?.passed === true
                          ? "Passed"
                          : assessment?.passed === false
                            ? "Not passed"
                            : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="portal-eyebrow">
                        SUBMITTED
                      </div>
                      <div>
                        {formatDate(
                          assessment?.submitted_at ?? null,
                        )}
                      </div>
                    </div>
                  </div>

                   {/* Shared Evidence */}
                   <div style={{ marginTop: "16px", borderTop: "1px solid #f0eeed", paddingTop: "12px" }}>
                     <button type="button" onClick={() => void handleToggleEvidence(application.id)}>
                       {expandedEvidence.has(application.id) ? "Hide candidate evidence" : "View candidate evidence"}
                     </button>
                     {expandedEvidence.has(application.id) && (
                       <div style={{ marginTop: "12px" }}>
                         {evidenceLoading.has(application.id) ? (
                           <p>Loading shared evidence...</p>
                         ) : evidenceError[application.id] ? (
                           <p style={{ color: "#b91c1c" }}>{evidenceError[application.id]}</p>
                         ) : (() => {
                           const evidence = evidenceByApplication[application.id];
                           const hasEvidence = (evidence?.proof_records.length ?? 0) > 0 || (evidence?.projects.length ?? 0) > 0;
                           if (!hasEvidence) return <p>No shared evidence.</p>;
                           return (
                             <div style={{ display: "grid", gap: "16px" }}>
                               <div>
                                 <div style={{ fontSize: "12px", fontWeight: 700, color: "#8a8480", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Proof Trail</div>
                                 <div style={{ position: "relative", paddingLeft: "20px" }}>
                                   <div style={{ position: "absolute", left: "6px", top: "4px", bottom: "4px", width: "1px", background: "#e5e0dc" }} />
                                   {evidence!.proof_records.map((record, index) => (
                                     <div key={index} style={{ position: "relative", marginBottom: "12px" }}>
                                       <span style={{ position: "absolute", left: "-17px", top: "6px", width: "8px", height: "8px", borderRadius: "50%", background: "#D4537E" }} />
                                       <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{record.title}</div>
                                       <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                                         {record.verified_at ? new Date(record.verified_at).toLocaleDateString() : "Date unavailable"}
                                       </div>
                                       {record.description && <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>{record.description}</p>}
                                       <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                                         {(record.skills_demonstrated ?? []).map((skill) => (
                                           <span key={skill} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#f5f0ed", color: "#6b6560", border: "1px solid #e5e0dc" }}>{skill}</span>
                                         ))}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                               {evidence!.projects.length > 0 && (
                                 <div>
                                   <div style={{ fontSize: "12px", fontWeight: 700, color: "#8a8480", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Personal Projects</div>
                                   <div style={{ display: "grid", gap: "12px" }}>
                                     {evidence!.projects.map((project, index) => (
                                       <div key={index} style={{ padding: "10px 12px", border: "1px solid #e5e0dc", borderRadius: "8px", background: "#fff" }}>
                                         <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{project.title}</div>
                                         {project.description && <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>{project.description}</p>}
                                         <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                                           {(project.skills_used ?? []).map((skill) => (
                                             <span key={skill} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#f5f0ed", color: "#6b6560", border: "1px solid #e5e0dc" }}>{skill}</span>
                                           ))}
                                         </div>
                                         {project.project_url && (
                                           <a href={project.project_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "6px", fontSize: "12px", color: "#D4537E" }}>Project link</a>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })()}
                       </div>
                     )}
                   </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    {canShortlist && (
                      <PinkButton
                        small
                        disabled={isActing}
                        onClick={() =>
                          void handleShortlist(application.id)
                        }
                      >
                        {isActing ? "Updating..." : "Shortlist"}
                      </PinkButton>
                    )}

                    {canSelect && (
                      <PinkButton
                        small
                        disabled={isActing}
                        onClick={() =>
                          void handleSelect(application.id)
                        }
                      >
                        {isActing ? "Selecting..." : "Select"}
                      </PinkButton>
                    )}

                    {!canShortlist &&
                      !canSelect &&
                      application.status !== "SELECTED" && (
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#777",
                          }}
                        >
                          No action available for this application.
                        </span>
                      )}

                    {application.status === "SELECTED" && (
                      <PinkButton
                        small
                        onClick={() => onReviewSubmission(application.id)}
                      >
                        Review Submission
                      </PinkButton>
                    )}
                  </div>

                  {/* Connection Request & Identity Reveal Section */}
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop: "1px solid #f0eeed",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#1a1a1a",
                        }}
                      >
                        Connection Request
                      </div>

                      {connectionRequest ? (
                        <Badge
                          tone={
                            connectionRequest.status === "ACCEPTED"
                              ? "green"
                              : connectionRequest.status === "PENDING"
                                ? "amber"
                                : "gray"
                          }
                        >
                          {connectionRequest.status === "ACCEPTED"
                            ? "Connection Accepted"
                            : connectionRequest.status === "PENDING"
                              ? "Connection Pending"
                              : "Connection Rejected"}
                        </Badge>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#8a8480" }}>
                          {isAssessmentCompletedAndScored
                            ? "Eligible to connect"
                            : "Assessment not yet completed and scored"}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      {canRequestConnection && (
                        <OutlineButton
                          small
                          disabled={isRequestingConnection}
                          onClick={() => void handleRequestConnection(application.id)}
                        >
                          {isRequestingConnection
                            ? "Sending Request..."
                            : "Request Connection"}
                        </OutlineButton>
                      )}

                      {connectionRequest?.status === "PENDING" && (
                        <span style={{ fontSize: "13px", color: "#8a8480" }}>
                          Waiting for contributor to accept or decline. Contributor identity remains strictly protected.
                        </span>
                      )}

                      {connectionRequest?.status === "REJECTED" && (
                        <span style={{ fontSize: "13px", color: "#8a8480" }}>
                          Contributor declined this connection request. Identity remains anonymous.
                        </span>
                      )}

                      {connectionRequest?.status === "ACCEPTED" && !revealedIdentity && (
                        <PinkButton
                          small
                          disabled={isRevealingIdentity}
                          onClick={() => void handleViewIdentity(application.id)}
                        >
                          {isRevealingIdentity
                            ? "Retrieving Identity..."
                            : "View Contributor Identity"}
                        </PinkButton>
                      )}
                    </div>

                    {/* Revealed Identity Card - only visible after acceptance and when fetched */}
                    {connectionRequest?.status === "ACCEPTED" && revealedIdentity && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "16px 20px",
                          background: "#fdf0f5",
                          border: "1px solid #f0c4d4",
                          borderRadius: "10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#D4537E",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: "8px",
                          }}
                        >
                          ✓ Contributor Consented & Verified Identity
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "50%",
                              background: "#D4537E",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "16px",
                              fontWeight: 700,
                            }}
                          >
                            {revealedIdentity.full_name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((n) => n[0].toUpperCase())
                              .join("") || "C"}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {revealedIdentity.full_name}
                            </div>
                            <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>
                              Email: <a href={`mailto:${revealedIdentity.email}`} style={{ color: "#D4537E", textDecoration: "underline" }}>{revealedIdentity.email}</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </PortalCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
