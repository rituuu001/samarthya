import { useState } from "react";
import { PinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/FormFields";
import { PageShell } from "@/components/layout/PageShell";
import { Textarea } from "@/components/ui/Textarea";
import type { ApplicationResponse } from "@/api/application";
import type { MarketplaceSprintResponse } from "@/api/sprint";
import { createSubmission } from "@/api/submission";
import { uploadSubmissionFile } from "@/api/file";

export function Screen3({
  onSubmitted,
  application,
  sprint,
}: {
  onSubmitted?: () => void;
  application?: ApplicationResponse;
  sprint?: MarketplaceSprintResponse;
}) {
  const [tab, setTab] = useState<"upload" | "text">("upload");
  const [dragging, setDragging] = useState(false);
  const [description, setDescription] = useState("");
const [notes, setNotes] = useState("");
const [githubLink, setGithubLink] = useState("");
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState("");

function handleFiles(files: File[]) {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  const invalidFile = files.find(
    (file) => !allowedTypes.includes(file.type)
  );

  if (invalidFile) {
    setError(`${invalidFile.name} is not a supported file type.`);
    return;
  }

  const oversizedFile = files.find(
    (file) => file.size > 5 * 1024 * 1024
  );

  if (oversizedFile) {
    setError(`${oversizedFile.name} exceeds the 5 MiB file limit.`);
    return;
  }

  setError("");
  setSelectedFiles(files);
}
async function handleSubmit() {
  if (!application?.id) {
    setError("Application information is missing.");
    return;
  }

  if (!description.trim() && !githubLink.trim() && selectedFiles.length === 0) {
    setError("Please provide a description, a GitHub link, or at least one file.");
    return;
  }

  const oversizedFile = selectedFiles.find(
    (file) => file.size > 5 * 1024 * 1024
  );

  if (oversizedFile) {
    setError(`${oversizedFile.name} exceeds the 5 MiB file limit.`);
    return;
  }

  setIsSubmitting(true);
  setError("");

  try {
    const uploadedFiles = await Promise.all(
      selectedFiles.map((file) => uploadSubmissionFile(file))
    );

    const submissionDescription = [
      description.trim(),
      githubLink.trim() ? `GitHub / hosted link: ${githubLink.trim()}` : "",
      notes.trim() ? `Notes to evaluator: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await createSubmission(application.id, {
      description: submissionDescription || undefined,
      file_ids: uploadedFiles.map((file) => file.id),
    });

    onSubmitted?.();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to submit your work."
    );
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <PageShell
  title="Submit Your Work"
  subtitle={sprint?.title ?? "Submit your completed work"}
  role="candidate"
>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Card style={{ background: "#fdf0f5", border: "1px solid #f0c4d4", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔒</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#D4537E" }}>
                Identity Protected
              </div>
              <div style={{ fontSize: "12px", color: "#8a8480", marginTop: "2px" }}>
                Your name and photo are hidden from the employer during evaluation. You appear as an anonymous contributor.
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
              Task Summary
            </div>
            <div style={{ fontSize: "13px", color: "#6b6866", lineHeight: 1.7 }}>
              {sprint?.description ?? "Review the Sprint requirements before submitting your work."}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "#f3f2f1",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "16px",
            }}
          >
            {(["upload", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "Outfit, sans-serif",
                  background: tab === t ? "#ffffff" : "transparent",
                  color: tab === t ? "#1a1a1a" : "#8a8480",
                  boxShadow: tab === t ? "0 0 0 1px #e8e4e1" : "none",
                  transition: "all 0.15s",
                }}
              >
                {t === "upload" ? "📎 File / Link" : "✍️ Text Entry"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
  <div>
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() =>
        document.getElementById("submission-files")?.click()
      }
      style={{
        border: `2px dashed ${dragging ? "#D4537E" : "#e8e4e1"}`,
        borderRadius: "10px",
        padding: "36px 24px",
        textAlign: "center",
        background: dragging ? "#fdf0f5" : "#f8f7f6",
        cursor: "pointer",
        marginBottom: "12px",
      }}
    >
      <input
        id="submission-files"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        hidden
        onChange={(e) =>
          handleFiles(Array.from(e.target.files ?? []))
        }
      />

      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a1a", marginBottom: "4px" }}>
        Drop files here or click to browse
      </div>
      <div style={{ fontSize: "12px", color: "#8a8480" }}>
        PDF, JPG or PNG · Maximum 5 MiB per file
      </div>
    </div>

    {selectedFiles.map((file, index) => (
      <div key={`${file.name}-${index}`} style={{ fontSize: "13px" }}>
        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MiB)
      </div>
    ))}

    <div>
      <Label>Or paste a GitHub / hosted link</Label>
      <Input
        placeholder="https://github.com/your-username/project"
        value={githubLink}
        onChange={(e) => setGithubLink(e.target.value)}
      />
    </div>
  </div>
) : (
            <div>
              <Label>Describe your solution</Label>
              <Textarea
                rows={8}
                placeholder="Explain your approach, key decisions, and how to run or view the work..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
        </Card>

        <Card>
          <Label>Notes to Evaluator (optional)</Label>
          <Textarea
            rows={3}
            placeholder="Any known limitations, assumptions, or setup instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        {error && (
  <div style={{ color: "#c0392b", fontSize: "13px" }}>
    {error}
  </div>
)}

<PinkButton
  fullWidth
  onClick={handleSubmit}
  disabled={isSubmitting}
>
  {isSubmitting ? "Submitting..." : "Submit Work"}
</PinkButton>
        <div
          style={{
            fontSize: "11px",
            color: "#8a8480",
            textAlign: "center",
            paddingBottom: "16px",
          }}
        >
          Once submitted, your identity remains hidden until the employer decides to connect.
        </div>
      </div>
    </PageShell>
  );
}
