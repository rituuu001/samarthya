import { useCallback, useEffect, useMemo, useState } from "react";
import { getSprintApplications, getSprintAssessmentResults, selectApplication, shortlistApplication } from "@/api/application";
import type {
  EmployerApplicationResponse,
  EmployerAssessmentResult,
} from "@/api/application";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import type { SprintResponse } from "@/api/sprint";

type ApplicationReviewProps = {
  sprint: SprintResponse;
  onBack: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusTone(status: EmployerApplicationResponse["status"]) {
  switch (status) {
    case "SELECTED":
      return "green";
    case "SHORTLISTED":
      return "yellow";
    case "ASSESSMENT_SUBMITTED":
      return "blue";
    default:
      return "gray";
  }
}

export function ApplicationReview({
  sprint,
  onBack,
}: ApplicationReviewProps) {
  const [applications, setApplications] = useState<
    EmployerApplicationResponse[]
  >([]);
  const [assessmentResults, setAssessmentResults] = useState<
    EmployerAssessmentResult[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingApplicationId, setActingApplicationId] = useState<string | null>(
    null,
  );

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
    void loadReviewData();
  }, [loadReviewData]);

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
              <p>{actionError}</p>
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

              const canShortlist =
                application.status === "ASSESSMENT_SUBMITTED";

              const canSelect =
                application.status === "SHORTLISTED";

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
                        Contributor {index + 1}
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
                      {application.status.replaceAll("_", " ")}
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
                          ? assessment.attempt_status.replaceAll(
                              "_",
                              " ",
                            )
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
                        ? `${assessment.score} / ${assessment.max_score} (${assessment.percentage ?? "—"}%)`
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
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#777",
                        }}
                      >
                        This contributor has been selected.
                      </span>
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
