import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  approveSubmission,
  getApplicationSubmission,
  requestSubmissionRevision,
} from "@/api/submission";
import type { SubmissionDetailResponse } from "@/api/submission";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { downloadSubmissionFile } from "@/api/file";
import { formatCurrency } from "@/utils/currency";
import type { SprintResponse } from "@/api/sprint";

type SubmissionReviewProps = {
  sprint: SprintResponse;
  applicationId: string;
  onBack: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function submissionTone(status: SubmissionDetailResponse["status"]) {
  switch (status) {
    case "APPROVED":
      return "green";
    case "REVISION_REQUESTED":
      return "amber";
    default:
      return "pink";
  }
}

function paymentTone(status: string) {
  if (status === "RELEASED") return "green";
  if (status === "HELD") return "amber";
  return "gray";
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div className="portal-eyebrow">{eyebrow}</div>
      <h2
        style={{
          margin: "5px 0 0",
          fontSize: "16px",
          fontWeight: 600,
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="portal-eyebrow">{label}</div>
      <div style={{ marginTop: "5px", color: "#514b48", fontSize: "13px" }}>
        {value}
      </div>
    </div>
  );
}

export function SubmissionReview({
  sprint,
  applicationId,
  onBack,
}: SubmissionReviewProps) {
  const [submission, setSubmission] =
    useState<SubmissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestedChanges, setRequestedChanges] = useState("");
  const [scores, setScores] = useState<{
    functionality_score: number | null;
    code_quality_score: number | null;
    completeness_score: number | null;
    timeliness_score: number | null;
  }>({
    functionality_score: null,
    code_quality_score: null,
    completeness_score: null,
    timeliness_score: null,
  });
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [acting, setActing] = useState(false);

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getApplicationSubmission(applicationId);
      setSubmission(data);
    } catch (err) {
      if (err instanceof Error && err.message === "Submission not found") {
        setSubmission(null);
        setError(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the submission.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadSubmission();
  }, [loadSubmission]);

  const handleRequestRevision = async () => {
    if (!submission || !requestedChanges.trim() || !scoresValid) return;
    const validScores = {
      functionality_score: scores.functionality_score as number,
      code_quality_score: scores.code_quality_score as number,
      completeness_score: scores.completeness_score as number,
      timeliness_score: scores.timeliness_score as number,
    };

    setActing(true);
    setActionError(null);
    try {
      await requestSubmissionRevision(
        submission.id,
        requestedChanges.trim(),
        validScores,
      );
      setRequestedChanges("");
      setShowRevisionForm(false);
      await loadSubmission();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to request a revision.",
      );
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async () => {
    if (!submission || !scoresValid) return;
    const validScores = {
      functionality_score: scores.functionality_score as number,
      code_quality_score: scores.code_quality_score as number,
      completeness_score: scores.completeness_score as number,
      timeliness_score: scores.timeliness_score as number,
    };

    setActing(true);
    setActionError(null);
    try {
      await approveSubmission(submission.id, validScores);
      await loadSubmission();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to approve the submission.",
      );
    } finally {
      setActing(false);
    }
  };

  const scoresValid =
    scores.functionality_score !== null &&
    scores.code_quality_score !== null &&
    scores.completeness_score !== null &&
    scores.timeliness_score !== null &&
    [scores.functionality_score, scores.code_quality_score, scores.completeness_score, scores.timeliness_score].every(
      (score) => Number.isInteger(score) && score >= 0 && score <= 10,
    );
  const average = scoresValid
    ? ((scores.functionality_score as number) +
        (scores.code_quality_score as number) +
        (scores.completeness_score as number) +
        (scores.timeliness_score as number)) /
      4
    : null;

  const canRequestRevision =
    submission?.status === "SUBMITTED" &&
    submission.current_revision_number < sprint.revision_limit;
  const canApprove =
    submission?.status === "SUBMITTED" &&
    submission.payment?.status === "HELD" &&
    submission.payment.payment_type === "DEPOSIT";

  return (
    <div>
      <PageHeading
        eyebrow="SUBMISSION REVIEW"
        title={sprint.title}
        subtitle="Review the selected contributor’s work and decide the next step."
        action={
          <OutlineButton onClick={onBack}>
            Back to Applications
          </OutlineButton>
        }
      />

      {loading && (
        <PortalCard>
          <p role="status" style={{ margin: 0, color: "#6b6866" }}>
            Loading submission…
          </p>
        </PortalCard>
      )}

      {!loading && error && (
        <PortalCard>
          <div role="alert" style={{ color: "#8f3856", fontSize: "14px" }}>
            {error}
          </div>
          <div style={{ marginTop: "14px" }}>
            <OutlineButton onClick={() => void loadSubmission()}>
              Try again
            </OutlineButton>
          </div>
        </PortalCard>
      )}

      {!loading && !error && !submission && (
        <PortalCard>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              color: "#D4537E",
              background: "#fdf0f5",
              fontSize: "20px",
              marginBottom: "14px",
            }}
            aria-hidden="true"
          >
            ◷
          </div>
          <div className="portal-eyebrow">AWAITING DELIVERY</div>
          <h2 style={{ margin: "6px 0", fontSize: "17px", fontWeight: 600 }}>
            No submission yet
          </h2>
          <p
            style={{
              margin: "0 0 16px",
              color: "#77716d",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            The selected contributor has not submitted their work. You can
            review it here once it arrives.
          </p>
          <OutlineButton onClick={onBack}>Back to Applications</OutlineButton>
        </PortalCard>
      )}

      {!loading && !error && submission && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {actionError && (
            <PortalCard>
              <div role="alert" style={{ color: "#8f3856", fontSize: "13px" }}>
                {actionError}
              </div>
            </PortalCard>
          )}

          <PortalCard>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="portal-eyebrow">CONTRIBUTOR DELIVERY</div>
                <h2
                  style={{
                    margin: "5px 0 0",
                    fontSize: "19px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Submission overview
                </h2>
              </div>
              <Badge tone={submissionTone(submission.status)}>
                {submission.status.replace(/_/g, " ")}
              </Badge>
            </div>

            {submission.status === "REVISION_REQUESTED" && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "9px",
                  border: "1px solid #f0dfb5",
                  background: "#fff8e9",
                  color: "#665332",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Waiting for the contributor to submit the requested changes.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "16px",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid #eeeae7",
              }}
            >
              <DetailItem
                label="Revision"
                value={`${submission.current_revision_number} of ${sprint.revision_limit}`}
              />
              <DetailItem
                label="Submitted"
                value={formatDate(submission.submitted_at)}
              />
              <DetailItem
                label="Last reviewed"
                value={formatDate(submission.reviewed_at)}
              />
              {submission.approved_at && (
                <DetailItem
                  label="Approved"
                  value={formatDate(submission.approved_at)}
                />
              )}
            </div>
          </PortalCard>

          <PortalCard>
            <SectionHeading eyebrow="SUBMITTED WORK" title="Description" />
            <p
              style={{
                margin: 0,
                color: "#514b48",
                fontSize: "13px",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {submission.description || "No description was provided."}
            </p>
          </PortalCard>

          <PortalCard>
            <SectionHeading
              eyebrow="DELIVERY MATERIALS"
              title={`Files${submission.file_ids?.length ? ` · ${submission.file_ids.length}` : ""}`}
            />
             {submission.file_ids?.length ? (
               <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                 {submission.file_ids.map((fileId, index) => (
                   <button
                     key={fileId}
                     type="button"
                     onClick={async () => {
                       try {
                         const blob = await downloadSubmissionFile(fileId);
                         const url = URL.createObjectURL(blob);
                         const link = document.createElement("a");
                         link.href = url;
                         link.download = `file-${index + 1}`;
                         document.body.appendChild(link);
                         link.click();
                         link.remove();
                         window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                       } catch (err) {
                         setActionError(
                           err instanceof Error
                             ? err.message
                             : "Failed to download file.",
                         );
                       }
                     }}
                     style={{
                       display: "flex",
                       alignItems: "center",
                       gap: "9px",
                       maxWidth: "100%",
                       padding: "9px 11px",
                       border: "1px solid #e8e4e1",
                       borderRadius: "9px",
                       background: "#faf9f8",
                       color: "#514b48",
                       fontSize: "12px",
                       overflowWrap: "anywhere",
                       cursor: "pointer",
                     }}
                   >
                     <span aria-hidden="true">↗</span>
                     <span>File {index + 1}</span>
                   </button>
                 ))}
               </div>
             ) : (
              <p style={{ margin: 0, color: "#8a8480", fontSize: "13px" }}>
                No files were attached to this submission.
              </p>
            )}
          </PortalCard>

          {submission.revision && (
            <PortalCard>
              <SectionHeading
                eyebrow={`REVISION ${submission.revision.revision_number}`}
                title={submission.revision.status.replace(/_/g, " ")}
              />
              {submission.revision.requested_changes && (
                <div style={{ marginBottom: "14px" }}>
                  <div className="portal-eyebrow">REQUESTED CHANGES</div>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#514b48",
                      fontSize: "13px",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {submission.revision.requested_changes}
                  </p>
                </div>
              )}
              {submission.revision.resubmission_description && (
                <div>
                  <div className="portal-eyebrow">CONTRIBUTOR RESPONSE</div>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#514b48",
                      fontSize: "13px",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {submission.revision.resubmission_description}
                  </p>
                </div>
              )}
            </PortalCard>
          )}

          <PortalCard>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <div>
                <div className="portal-eyebrow">PAYMENT</div>
                <h2
                  style={{
                    margin: "5px 0 0",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  Sprint reward
                </h2>
              </div>
              {submission.payment && (
                <Badge tone={paymentTone(submission.payment.status)}>
                  {submission.payment.status.replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            {submission.payment ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div className="portal-eyebrow">AMOUNT</div>
                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "20px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatCurrency(submission.payment.amount, submission.payment.currency)}
                    </div>
                  </div>
                  <DetailItem
                    label="Payment type"
                    value={submission.payment.payment_type.replace(/_/g, " ")}
                  />
                  {submission.payment.completed_at && (
                    <DetailItem
                      label="Completed"
                      value={formatDate(submission.payment.completed_at)}
                    />
                  )}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: "#8a8480", fontSize: "13px" }}>
                No payment record is associated with this submission.
              </p>
            )}
          </PortalCard>

          {submission.proof && (
            <PortalCard>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div className="portal-eyebrow">PROOF RECORD</div>
                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {submission.proof.title}
                  </h2>
                </div>
                <Badge tone="green">Verified</Badge>
              </div>
              {submission.proof.description && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#6b6866",
                    fontSize: "13px",
                    lineHeight: 1.65,
                  }}
                >
                  {submission.proof.description}
                </p>
              )}
              {submission.proof.skills_demonstrated?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "7px",
                    marginTop: "12px",
                  }}
                >
                  {submission.proof.skills_demonstrated.map((skill) => (
                    <Badge key={skill} tone="gray">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#8a8480",
                  fontSize: "12px",
                }}
              >
                Verified {formatDate(submission.proof.verified_at)}
              </p>
            </PortalCard>
          )}

          {submission.status === "SUBMITTED" && (
            <PortalCard>
              <SectionHeading
                eyebrow="DECISION"
                title="Complete your review"
              />
              <p
                style={{
                  margin: "-4px 0 16px",
                  color: "#77716d",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Approve the work to release the held reward, or request a
                revision with clear next steps.
              </p>

              {canRequestRevision && showRevisionForm && (
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      color: "#514b48",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    What should the contributor change?
                  </div>
                  <Textarea
                    value={requestedChanges}
                    onChange={(event) =>
                      setRequestedChanges(event.target.value)
                    }
                    placeholder="Be specific about the changes needed."
                    rows={5}
                  />
                </div>
              )}

<div style={{ display: "grid", gap: "14px", marginBottom: "16px" }}>
                  {([
                    ["functionality_score", "Functionality"],
                    ["code_quality_score", "Code Quality"],
                    ["completeness_score", "Completeness"],
                    ["timeliness_score", "Timeliness"],
                  ] as const).map(([key, label]) => {
                    const value = scores[key];
                    return (
                      <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: "13px", color: "#514b48", fontWeight: 600 }}>{label}</span>
                          <span style={{ fontSize: "13px", color: "#77716d" }}>
                            {value === null ? "—" : `${value} / 10`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={value ?? 0}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setScores((current) => ({
                              ...current,
                              [key]: Number.isInteger(next) ? next : null,
                            }));
                          }}
                          className="range-score"
                          style={{
                            width: "100%",
                            "--range-fill": `${((value ?? 0) / 10) * 100}%`,
                          } as CSSProperties}
                        />
                      </div>
                    );
                  })}
                  <div style={{ fontWeight: 600, color: "#D4537E" }}>
                    Average: {average === null ? "—" : `${average.toFixed(1)} / 10`}
                  </div>
                </div>
                <div
                 style={{
                   display: "flex",
                   gap: "10px",
                   flexWrap: "wrap",
                 }}
               >
                {canRequestRevision && !showRevisionForm && (
                  <OutlineButton
                    disabled={acting}
                    onClick={() => setShowRevisionForm(true)}
                  >
                    Request revision
                  </OutlineButton>
                )}

                {canRequestRevision && showRevisionForm && (
                  <>
                    <OutlineButton
                      disabled={acting}
                      onClick={() => {
                        setShowRevisionForm(false);
                        setRequestedChanges("");
                      }}
                    >
                      Cancel
                    </OutlineButton>
                     <PinkButton
                       onClick={() => void handleRequestRevision()}
                       disabled={acting || !requestedChanges.trim() || !scoresValid}
                     >
                      {acting ? "Sending request…" : "Send revision request"}
                    </PinkButton>
                  </>
                )}

                {!showRevisionForm && canApprove && (
                  <PinkButton
                    onClick={() => void handleApprove()}
                    disabled={acting || !scoresValid}
                  >
                    {acting ? "Approving…" : "Approve & release payment"}
                  </PinkButton>
                )}
              </div>

              {submission.status === "SUBMITTED" &&
                submission.current_revision_number >= sprint.revision_limit && (
                    <p
                    style={{
                        margin: "14px 0 0",
                        color: "#8a8480",
                        fontSize: "12px",
                    }}
                    >
                    The Sprint revision limit has been reached.
                    </p>
                )}
              {submission.status === "SUBMITTED" &&
                !showRevisionForm &&
                submission.payment?.status !== "HELD" && (
                    <p
                    style={{
                        margin: "14px 0 0",
                        color: "#8a8480",
                        fontSize: "12px",
                    }}
                    >
                    Approval requires a held deposit for this Sprint.
                    </p>
                )}
            </PortalCard>
          )}
        </div>
      )}
    </div>
  );
}
