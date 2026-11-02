import { useState } from "react";
import type { FormEvent } from "react";
import AuthShell from "@/auth/components/AuthShell";
import Field from "@/auth/components/Field";

export default function EmployerOnboarding({
  fullName,
  onBack,
  onComplete,
}: {
  fullName: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [values, setValues] = useState({
    name: fullName,
    position: "",
    organization: "",
    type: "",
    website: "",
    size: "",
    description: "",
    verification: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Please enter your full name.";
    if (!values.position.trim()) nextErrors.position = "Please enter your position.";
    if (!values.organization.trim()) nextErrors.organization = "Enter your organization name.";
    if (!values.type) nextErrors.type = "Select an organization type.";
    if (!values.size) nextErrors.size = "Select an organization size.";
    if (!values.description.trim()) nextErrors.description = "Add a short organization description.";
    if (values.website && !/^https?:\/\/.+/.test(values.website)) {
      nextErrors.website = "Add a full URL beginning with http:// or https://.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onComplete();
  };

  return (
    <AuthShell
      role="employer"
      step="onboarding"
      onBack={onBack}
      onSwitchRole={() => undefined}
    >
      <div className="onboarding-progress">
        <div>
          <span>Account created</span>
          <strong>Organization setup</strong>
        </div>
        <span>Step 2 of 2</span>
        <div className="progress-track"><span /></div>
      </div>

      <div className="onboarding-heading">
        <div className="auth-title">Set Up Your Organization</div>
        <div className="auth-subtitle">
          Tell us about your organization so contributors know who they&apos;re working with.
        </div>
      </div>

      <form className="onboarding-card" onSubmit={submit} noValidate>
        <div className="form-section-heading">
          <span>01</span>
          <div>
            <strong>Personal / Professional Details</strong>
            <small>Your role as the accountable employer contact.</small>
          </div>
        </div>
        <div className="onboarding-grid">
          <Field
            label="Full Name"
            name="employer-profile-name"
            value={values.name}
            placeholder="Enter your full name"
            onChange={(value) => update("name", value)}
            error={errors.name}
          />
          <Field
            label="Your Position / Designation"
            name="employer-position"
            value={values.position}
            placeholder="e.g. Founder, HR Manager, Recruiter"
            onChange={(value) => update("position", value)}
            error={errors.position}
          />
        </div>

        <div className="form-divider" />
        <div className="form-section-heading">
          <span>02</span>
          <div>
            <strong>Organization Details</strong>
            <small>Help contributors understand who they&apos;ll work with.</small>
          </div>
        </div>
        <div className="onboarding-grid">
          <Field
            label="Organization Name"
            name="organization-name"
            value={values.organization}
            placeholder="Enter your organization name"
            onChange={(value) => update("organization", value)}
            error={errors.organization}
          />
          <label className="auth-field">
            <span className="auth-label">Organization Type <b>*</b></span>
            <select
              className={errors.type ? "auth-input auth-input-error" : "auth-input"}
              value={values.type}
              onChange={(event) => update("type", event.target.value)}
            >
              <option value="">Select organization type</option>
              <option>Startup</option>
              <option>Company</option>
              <option>NGO / INGO</option>
              <option>Educational Institution</option>
              <option>Individual / Independent Employer</option>
              <option>Other</option>
            </select>
            {errors.type && <span className="auth-error">{errors.type}</span>}
          </label>
          <Field
            label="Organization Website"
            name="organization-website"
            value={values.website}
            placeholder="https://yourorganization.com"
            onChange={(value) => update("website", value)}
            error={errors.website}
            optional
            type="url"
          />
          <label className="auth-field">
            <span className="auth-label">Organization Size <b>*</b></span>
            <select
              className={errors.size ? "auth-input auth-input-error" : "auth-input"}
              value={values.size}
              onChange={(event) => update("size", event.target.value)}
            >
              <option value="">Select team size</option>
              <option>Solo</option>
              <option>2–10</option>
              <option>11–50</option>
              <option>51–200</option>
              <option>200+</option>
            </select>
            {errors.size && <span className="auth-error">{errors.size}</span>}
          </label>
          <label className="auth-field onboarding-span">
            <span className="auth-label">Short Organization Description <b>*</b></span>
            <textarea
              className={errors.description ? "auth-input auth-input-error auth-textarea" : "auth-input auth-textarea"}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What does your organization do, and what kind of contributors do you work with?"
              rows={3}
            />
            {errors.description && <span className="auth-error">{errors.description}</span>}
          </label>
          <label className="auth-field onboarding-span">
            <span className="auth-label">
              Verification Information <small>Optional</small>
            </span>
            <textarea
              className="auth-input auth-textarea"
              value={values.verification}
              onChange={(event) => update("verification", event.target.value)}
              placeholder="Add an official registration reference, verification document link, or other public organization information."
              rows={2}
            />
          </label>
        </div>

        <div className="philosophy-note">
          <span>✓</span>
          Verified employers help create a safer and more trustworthy marketplace for everyone.
        </div>
        <div className="onboarding-actions employer-actions">
          <span>Verification can be completed later.</span>
          <button type="submit" className="auth-primary onboarding-primary">
            Complete Organization Profile <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
