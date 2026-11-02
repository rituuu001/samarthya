import { FormEvent, useEffect, useState } from "react";

const reasons = [
  "Harassment",
  "Discrimination",
  "Inappropriate Behaviour",
  "Fraud or Scam",
  "Exploitation",
  "Non-payment",
  "Other",
] as const;

export function ReportUserModal({ reportedUser, onClose }: { reportedUser: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-user-title">
        {submitted ? (
          <div className="report-success">
            <span className="report-success-icon">✓</span>
            <h2 id="report-user-title">Report submitted</h2>
            <p>Thank you for helping keep Samarthya safe. Our team will review your report.</p>
            <button className="portal-primary" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="report-modal-header">
              <div>
                <span className="report-eyebrow">Safety &amp; trust</span>
                <h2 id="report-user-title">Report User</h2>
                <p>Tell us what happened so we can review it carefully.</p>
              </div>
              <button className="report-close" type="button" aria-label="Close report form" onClick={onClose}>×</button>
            </div>
            <form className="report-form" onSubmit={submit}>
              <label className="portal-field">
                <span>Reported User</span>
                <input value={reportedUser} readOnly aria-readonly="true" />
              </label>
              <label className="portal-field">
                <span>Reason for Reporting *</span>
                <select required value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option value="" disabled>Select a reason</option>
                  {reasons.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="portal-field">
                <span>Description *</span>
                <textarea required minLength={10} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the incident, including when it happened and any relevant context." />
              </label>
              <label className="portal-field">
                <span>Evidence <small>(optional)</small></span>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} />
                {evidence && <small className="report-file-name">{evidence.name}</small>}
              </label>
              <div className="report-form-actions">
                <button className="portal-secondary" type="button" onClick={onClose}>Cancel</button>
                <button className="portal-primary" type="submit">Submit Report</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function ReportUserButton({ reportedUser }: { reportedUser: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button className="report-user-button" type="button" onClick={() => setIsOpen(true)}>Report User</button>
      {isOpen && <ReportUserModal reportedUser={reportedUser} onClose={() => setIsOpen(false)} />}
    </>
  );
}
