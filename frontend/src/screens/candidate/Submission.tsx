import { useCallback, useEffect, useState } from "react";
import {
  createSubmission,
  getApplicationSubmission,
  resubmitSubmission,
  type SubmissionDetailResponse,
} from "@/api/submission";
import { Badge } from "@/components/portal/Badge";
import { PageHeading } from "@/components/portal/PageHeading";
import { PortalCard } from "@/components/portal/PortalCard";
import { PinkButton, OutlineButton } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/FormFields";
import { Textarea } from "@/components/ui/Textarea";

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
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

export function Screen3({
  applicationId,
  sprintTitle,
  sprintDescription,
  onSubmitted,
}: {
  applicationId: string;
  sprintTitle: string;
  sprintDescription: string;
  onSubmitted?: () => void;
}) {
  const [tab, setTab] = useState<"link" | "description">("link");
  const [description, setDescription] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submission, setSubmission] =
    useState<SubmissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const revisionRequested =
    submission?.status === "REVISION_REQUESTED";
  const editable =
    !loading && !error && (!submission || revisionRequested);

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const data = await getApplicationSubmission(applicationId);
      setSubmission(data);
      setDescription(data.description ?? "");
      if (data.status === "REVISION_REQUESTED") {
        setTab("description");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Submission not found") {
        setSubmission(null);
        setDescription("");
        setGithubLink("");
        setNotes("");
        setTab("link");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your submission.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadSubmission();
  }, [loadSubmission]);

  const submitWork = async () => {
    if (saving || !editable) return;

    const submissionDescription = [
      githubLink.trim() ? `Work link: ${githubLink.trim()}` : "",
      description.trim(),
      notes.trim() ? `Notes to evaluator:\n${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!submissionDescription) {
      setActionError(
        "Add a work link or describe your solution before submitting.",
      );
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      if (revisionRequested && submission) {
        await resubmitSubmission(submission.id, {
          description: submissionDescription,
        });
      } else {
        await createSubmission(applicationId, {
          description: submissionDescription,
        });
      }
      onSubmitted?.();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to submit your work.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="SPRINT WORK"
        title="Submit Your Work"
        subtitle={sprintTitle}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <PortalCard>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: "38px",
                height: "38px",
                flexShrink: 0,
                borderRadius: "11px",
                color: "#D4537E",
                background: "#fdf0f5",
                fontSize: "18px",
              }}
            >
              🔒
            </span>
            <div>
              <Badge>Identity protected</Badge>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#6b6866",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Your name and photo stay hidden from the employer during
                evaluation.
              </p>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="portal-eyebrow">SPRINT BRIEF</div>
          <h2
            style={{
              margin: "6px 0 8px",
              fontSize: "17px",
              fontWeight: 600,
              letterSpacing: "-0.015em",
            }}
          >
            What you are building
          </h2>
          <p
            style={{
              margin: 0,
              color: "#6b6866",
              fontSize: "13px",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {sprintDescription || "Share your completed work for review."}
          </p>
        </PortalCard>

        {loading && (
          <PortalCard>
            <p role="status" style={{ margin: 0, color: "#6b6866" }}>
              Loading your submission…
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

        {!loading && !error && revisionRequested && (
          <PortalCard>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <Badge tone="amber">Revision requested</Badge>
              <span style={{ color: "#8a8480", fontSize: "12px" }}>
                Revision {submission.current_revision_number}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: "#514b48",
                fontSize: "13px",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {submission.revision?.requested_changes ||
                "The employer asked you to update your submission."}
            </p>
          </PortalCard>
        )}

        {editable && (
          <>
            <PortalCard>
              <div className="portal-eyebrow">
                {revisionRequested ? "UPDATE YOUR DELIVERY" : "YOUR DELIVERY"}
              </div>
              <h2
                style={{
                  margin: "6px 0 4px",
                  fontSize: "17px",
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                }}
              >
                {revisionRequested ? "Make your revisions" : "Share your work"}
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  color: "#8a8480",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Add a project link, describe your solution, or include both.
              </p>

              <div
                role="group"
                aria-label="Submission details"
                style={{
                  display: "inline-flex",
                  gap: "4px",
                  padding: "4px",
                  marginBottom: "18px",
                  borderRadius: "10px",
                  background: "#f3f2f1",
                }}
              >
                {(
                  [
                    ["link", "Project link"],
                    ["description", "Description"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = tab === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTab(value)}
                      style={{
                        border: selected ? "1px solid #e8e4e1" : "1px solid transparent",
                        borderRadius: "7px",
                        padding: "8px 12px",
                        background: selected ? "#ffffff" : "transparent",
                        color: selected ? "#1a1a1a" : "#77716d",
                        boxShadow: selected ? "0 1px 2px #1a1a1a0d" : "none",
                        cursor: "pointer",
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "12px",
                        fontWeight: selected ? 600 : 500,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {tab === "link" ? (
                <div>
                  <Label>GitHub or hosted project URL</Label>
                  <Input
                    type="url"
                    value={githubLink}
                    onChange={(event) => setGithubLink(event.target.value)}
                    placeholder="https://github.com/you/project"
                  />
                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#8a8480",
                      fontSize: "12px",
                    }}
                  >
                    Make sure the employer can access the link.
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Describe your solution</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={7}
                    placeholder="Explain your approach, key decisions, and how to run or view your work."
                  />
                </div>
              )}
            </PortalCard>

            <PortalCard>
              <Label>Notes to the evaluator · optional</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Mention assumptions, setup instructions, or known limitations."
              />
            </PortalCard>

            {actionError && (
              <PortalCard>
                <div role="alert" style={{ color: "#8f3856", fontSize: "13px" }}>
                  {actionError}
                </div>
              </PortalCard>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
                paddingBottom: "12px",
              }}
            >
              <span style={{ color: "#8a8480", fontSize: "12px", lineHeight: 1.5 }}>
                Your identity remains private while the employer reviews your
                work.
              </span>
              <PinkButton
                onClick={() => void submitWork()}
                disabled={saving}
              >
                {saving
                  ? "Submitting…"
                  : revisionRequested
                    ? "Resubmit work"
                    : "Submit for review"}
              </PinkButton>
            </div>
          </>
        )}

        {!loading && !error && submission && !revisionRequested && (
          <>
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
                  <div className="portal-eyebrow">SUBMISSION STATUS</div>
                  <h2
                    style={{
                      margin: "6px 0 0",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    {submission.status === "APPROVED"
                      ? "Work approved"
                      : "Work submitted"}
                  </h2>
                </div>
                <Badge tone={submissionTone(submission.status)}>
                  {submission.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "14px",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid #eeeae7",
                }}
              >
                <div>
                  <div className="portal-eyebrow">REVISION</div>
                  <div style={{ marginTop: "5px", fontSize: "13px" }}>
                    {submission.current_revision_number}
                  </div>
                </div>
                <div>
                  <div className="portal-eyebrow">SUBMITTED</div>
                  <div style={{ marginTop: "5px", fontSize: "13px" }}>
                    {formatDate(submission.submitted_at)}
                  </div>
                </div>
                {submission.approved_at && (
                  <div>
                    <div className="portal-eyebrow">APPROVED</div>
                    <div style={{ marginTop: "5px", fontSize: "13px" }}>
                      {formatDate(submission.approved_at)}
                    </div>
                  </div>
                )}
              </div>
            </PortalCard>

            <PortalCard>
              <div className="portal-eyebrow">YOUR DELIVERY</div>
              <h2
                style={{
                  margin: "6px 0 10px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Work description
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "#6b6866",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {submission.description || "No description provided."}
              </p>
            </PortalCard>

            {submission.payment && (
              <PortalCard>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div className="portal-eyebrow">SPRINT PAYMENT</div>
                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "18px",
                        fontWeight: 600,
                      }}
                    >
                      {submission.payment.currency}{" "}
                      {submission.payment.amount.toLocaleString()}
                    </div>
                  </div>
                  <Badge tone={paymentTone(submission.payment.status)}>
                    {submission.payment.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {submission.payment.completed_at && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "#8a8480",
                      fontSize: "12px",
                    }}
                  >
                    Released {formatDate(submission.payment.completed_at)}
                  </p>
                )}
              </PortalCard>
            )}

            {submission.proof && (
              <PortalCard>
                <div className="portal-eyebrow">VERIFIED PROOF</div>
                <h2
                  style={{
                    margin: "6px 0 6px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {submission.proof.title}
                </h2>
                {submission.proof.description && (
                  <p
                    style={{
                      margin: 0,
                      color: "#6b6866",
                      fontSize: "13px",
                      lineHeight: 1.6,
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
          </>
        )}
      </div>
    </div>
  );
}
