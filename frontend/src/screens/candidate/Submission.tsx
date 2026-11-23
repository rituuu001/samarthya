import { useCallback, useEffect, useState } from "react";
import type { ApplicationResponse } from "@/api/application";
import { formatCurrency } from "@/utils/currency";
import { uploadSubmissionFile } from "@/api/file";
import type { MarketplaceSprintResponse } from "@/api/sprint";
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

const MAX_REGULAR_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ZIP_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt",
  "jpg", "jpeg", "png", "zip",
]);

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function paymentTone(status: string) {
  if (status === "RELEASED") return "green";
  if (status === "HELD") return "amber";
  return "gray";
}

export function Screen3({
  onSubmitted,
  application,
  sprint,
}: {
  onSubmitted?: () => void;
  application?: ApplicationResponse;
  sprint?: MarketplaceSprintResponse;
}) {
  const [tab, setTab] = useState<"link" | "description">("link");
  const [dragging, setDragging] = useState(false);
  const [description, setDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submission, setSubmission] =
    useState<SubmissionDetailResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(application?.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const revisionRequested = submission?.status === "REVISION_REQUESTED";
  const editable = !loading && !error && (!submission || revisionRequested);

  const loadSubmission = useCallback(async () => {
    if (!application?.id) {
      setSubmission(null);
      setError("Application information is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const data = await getApplicationSubmission(application.id);
      setSubmission(data);
      setDescription(data.description ?? "");
      if (data.status === "REVISION_REQUESTED") {
        setTab("description");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Submission not found") {
        setSubmission(null);
        setDescription("");
        setExternalLink("");
        setNotes("");
        setSelectedFiles([]);
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
  }, [application?.id]);

  useEffect(() => {
    void loadSubmission();
  }, [loadSubmission]);

  function handleFiles(files: File[]) {
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const extension = getFileExtension(file.name);
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        errors.push(`${file.name}: unsupported file type.`);
        continue;
      }

      const limit = extension === "zip" ? MAX_ZIP_FILE_SIZE : MAX_REGULAR_FILE_SIZE;
      if (file.size > limit) {
        const limitMiB = extension === "zip" ? 25 : 10;
        errors.push(`${file.name}: exceeds the ${limitMiB} MiB file limit.`);
        continue;
      }

      validFiles.push(file);
    }

    setActionError(errors.length > 0 ? errors.join(" ") : null);
    setSelectedFiles((current) => {
      const combined = [...current, ...validFiles];
      const unique = new Map(combined.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      return Array.from(unique.values());
    });
  }

  const submitWork = async () => {
    if (saving || !editable) return;

    if (!application?.id) {
      setActionError("Application information is missing.");
      return;
    }

    const trimmedExternalLink = externalLink.trim();
    if (trimmedExternalLink) {
      try {
        const parsed = new URL(trimmedExternalLink);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        setActionError("Enter a valid HTTP or HTTPS link.");
        return;
      }
    }

    const submissionDescription = [
      trimmedExternalLink ? `Work link: ${trimmedExternalLink}` : "",
      description.trim(),
      notes.trim() ? `Notes to evaluator:\n${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!submissionDescription && selectedFiles.length === 0) {
      setActionError(
        "Add a work link, describe your solution, or attach a file before submitting.",
      );
      return;
    }

    const oversizedFile = selectedFiles.find((file) => {
      const extension = getFileExtension(file.name);
      return file.size > (extension === "zip" ? MAX_ZIP_FILE_SIZE : MAX_REGULAR_FILE_SIZE);
    });
    if (oversizedFile) {
      const extension = getFileExtension(oversizedFile.name);
      const limitMiB = extension === "zip" ? 25 : 10;
      setActionError(`${oversizedFile.name}: exceeds the ${limitMiB} MiB file limit.`);
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const uploadedFiles = await Promise.all(
        selectedFiles.map((file) => uploadSubmissionFile(file)),
      );
      const fileIds = selectedFiles.length
        ? uploadedFiles.map((file) => file.id)
        : (submission?.file_ids ?? []);
      const submissionData = {
        description: submissionDescription || undefined,
        file_ids: fileIds,
      };

      if (revisionRequested && submission) {
        await resubmitSubmission(submission.id, submissionData);
      } else {
        await createSubmission(application.id, submissionData);
      }

      await loadSubmission();
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
        subtitle={sprint?.title ?? "Submit your completed work"}
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
            {sprint?.description || "Share your completed work for review."}
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

        {!loading && !error && revisionRequested && submission && (
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
                Add a relevant link, attach files, describe your solution, or
                include any combination.
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
                    ["link", "External link"],
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
                        border: selected
                          ? "1px solid #e8e4e1"
                          : "1px solid transparent",
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
                  <Label>Relevant link</Label>
                  <Input
                    type="url"
                    value={externalLink}
                    onChange={(event) => setExternalLink(event.target.value)}
                    placeholder="https://example.com"
                  />
                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#8a8480",
                      fontSize: "12px",
                    }}
                  >
                    GitHub, GitLab, portfolios, live demos, Google Drive, and other relevant URLs are accepted. Make sure the employer can access the link.
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

              <div style={{ marginTop: "20px" }}>
                <Label>Attach files · PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, TXT, JPG, JPEG, PNG, or ZIP · 10 MiB per regular file, 25 MiB per ZIP</Label>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    handleFiles(Array.from(event.dataTransfer.files));
                  }}
                  onClick={() =>
                    document.getElementById("submission-files")?.click()
                  }
                  style={{
                    border: `2px dashed ${dragging ? "#D4537E" : "#e8e4e1"}`,
                    borderRadius: "10px",
                    padding: "24px",
                    textAlign: "center",
                    background: dragging ? "#fdf0f5" : "#f8f7f6",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <input
                    id="submission-files"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.zip"
                    multiple
                    hidden
                    onChange={(event) =>
                      handleFiles(Array.from(event.target.files ?? []))
                    }
                  />
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                    📁
                  </div>
                  <div style={{ fontSize: "13px", color: "#514b48" }}>
                    Drop files here or click to browse
                  </div>
                </div>
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{ marginTop: "6px", fontSize: "12px" }}
                  >
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MiB)
                  </div>
                ))}
              </div>
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
              <span
                style={{ color: "#8a8480", fontSize: "12px", lineHeight: 1.5 }}
              >
                Your identity remains private while the employer reviews your
                work.
              </span>
              <PinkButton onClick={() => void submitWork()} disabled={saving}>
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
                      {formatCurrency(submission.payment.amount, submission.payment.currency)}
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
