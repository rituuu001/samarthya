import { FormEvent, KeyboardEvent, useState } from "react";
import samarthyaLogo from "@/imports/image.png";
import type { InfoPageKey } from "@/PublicInfo";

export type AuthRole = "candidate" | "employer";

type AuthMode = "signup" | "login";
type AuthStep = "auth" | "onboarding";

type AuthFlowProps = {
  initialRole: AuthRole;
  initialMode?: AuthMode;
  onBackHome: () => void;
  onComplete: (role: AuthRole) => void;
  onNavigateInfo: (page: InfoPageKey) => void;
};

type FieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  type?: string;
};

function Field({
  label,
  name,
  value,
  placeholder,
  onChange,
  error,
  optional,
  type = "text",
}: FieldProps) {
  return (
    <label className="auth-field" htmlFor={name}>
      <span className="auth-label">
        {label}
        {optional ? <small>Optional</small> : <b>*</b>}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "auth-input auth-input-error" : "auth-input"}
      />
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}

function PasswordField({
  label,
  name,
  value,
  placeholder,
  onChange,
  error,
}: Omit<FieldProps, "type" | "optional">) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-field" htmlFor={name}>
      <span className="auth-label">
        {label}<b>*</b>
      </span>
      <span className="password-wrap">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={error ? "auth-input auth-input-error" : "auth-input"}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}

function BrandLockup() {
  return (
    <div className="auth-brand">
      <img src={samarthyaLogo} alt="Samarthya logo" />
      <div>
        <div className="auth-brand-name">सामर्थ्य</div>
        <div className="auth-brand-motto">Prove First, Connect Later.</div>
      </div>
    </div>
  );
}

function AuthShell({
  role,
  step,
  onBack,
  onSwitchRole,
  children,
}: {
  role: AuthRole;
  step: AuthStep;
  onBack: () => void;
  onSwitchRole: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <BrandLockup />
        <button type="button" className="auth-back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          {step === "auth" ? "Back to home" : "Back to account setup"}
        </button>
      </header>
      <main className={step === "onboarding" ? "auth-main auth-main-wide" : "auth-main"}>
        <div className="auth-role-context">
          <span className={`auth-role-dot auth-role-dot-${role}`} />
          {role === "candidate" ? "Candidate account" : "Employer account"}
          {step === "auth" && (
            <button type="button" onClick={onSwitchRole}>
              Switch to {role === "candidate" ? "Employer" : "Candidate"}
            </button>
          )}
        </div>
        {children}
      </main>
      <div className="auth-page-footer">© 2026 सामर्थ्य · Skills before credentials.</div>
    </div>
  );
}

function AuthForm({
  role,
  initialMode,
  onBack,
  onSwitchRole,
  onRegistered,
  onLoggedIn,
  onNavigateInfo,
}: {
  role: AuthRole;
  initialMode: AuthMode;
  onBack: () => void;
  onSwitchRole: () => void;
  onRegistered: (name: string) => void;
  onLoggedIn: () => void;
  onNavigateInfo: (page: InfoPageKey) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const signup = mode === "signup";
  const candidate = role === "candidate";

  const switchMode = () => {
    setMode(signup ? "login" : "signup");
    setErrors({});
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (signup && !name.trim()) nextErrors.name = "Please enter your full name.";
    if (!email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Please enter your password.";
    } else if (password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }
    if (signup && confirmation !== password) {
      nextErrors.confirmation = "Passwords do not match.";
    }
    if (signup && !agreed) nextErrors.agreed = "Agreement is required to continue.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (signup) onRegistered(name.trim());
    else onLoggedIn();
  };

  return (
    <AuthShell
      role={role}
      step="auth"
      onBack={onBack}
      onSwitchRole={onSwitchRole}
    >
      <div className="auth-card">
        <div className="auth-card-heading">
          <div className="auth-title">
            {signup
              ? candidate
                ? "Create your Candidate Account"
                : "Create Your Employer Account"
              : "Welcome Back"}
          </div>
          <div className="auth-subtitle">
            {signup
              ? candidate
                ? "Start showcasing your skills and building your proof trail."
                : "Find talent through skills, not just resumes."
              : candidate
                ? "Continue building your proof trail."
                : "Discover talent. Create opportunities."}
          </div>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {signup && (
            <Field
              label="Full Name"
              name={`${role}-name`}
              value={name}
              placeholder="Enter your full name"
              onChange={setName}
              error={errors.name}
            />
          )}
          <Field
            label={signup && !candidate ? "Work Email Address" : "Email Address"}
            name={`${role}-email`}
            type="email"
            value={email}
            placeholder={candidate ? "you@example.com" : "you@organization.com"}
            onChange={setEmail}
            error={errors.email}
          />
          <div className="password-label-row">
            <span />
            {!signup && (
              <button type="button" className="auth-text-link" onClick={() => onNavigateInfo("forgot")}>
                Forgot Password?
              </button>
            )}
          </div>
          <PasswordField
            label="Password"
            name={`${role}-password`}
            value={password}
            placeholder={signup ? "Create a secure password" : "Enter your password"}
            onChange={setPassword}
            error={errors.password}
          />
          {signup && (
            <PasswordField
              label="Confirm Password"
              name={`${role}-confirmation`}
              value={confirmation}
              placeholder="Re-enter your password"
              onChange={setConfirmation}
              error={errors.confirmation}
            />
          )}
          {signup && (
            <label className="agreement-row">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span>
                I agree to the <button type="button" onClick={() => onNavigateInfo("terms")}>Terms &amp; Conditions</button> and{" "}
                <button type="button" onClick={() => onNavigateInfo("privacy")}>Privacy Policy</button>.
              </span>
            </label>
          )}
          {errors.agreed && <span className="auth-error agreement-error">{errors.agreed}</span>}

          <button type="submit" className="auth-primary">
            {signup
              ? candidate
                ? "Create Account"
                : "Create Employer Account"
              : "Log In"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="auth-switch">
          {signup ? "Already have an account?" : "Don't have an account?"}
          <button type="button" onClick={switchMode}>
            {signup ? "Log in" : "Sign Up"}
          </button>
        </div>
      </div>
      <div className="auth-trust-note">
        <span>✓</span>
        {candidate
          ? "No CV required. Begin with your skills and prove them through real work."
          : "Organization verification can be completed later and won't block account creation."}
      </div>
    </AuthShell>
  );
}

const suggestedSkills = ["Python", "Java", "Django", "React", "SQL", "Graphic Design"];
const interestOptions = [
  "Software Development",
  "Design",
  "Data Analysis",
  "Content Writing",
];

function CandidateOnboarding({
  fullName,
  onBack,
  onComplete,
}: {
  fullName: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [name, setName] = useState(fullName);
  const [skills, setSkills] = useState<string[]>(["React"]);
  const [skillInput, setSkillInput] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills((current) => [...current, trimmed]);
    setSkillInput("");
  };

  const onSkillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(skillInput);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Please enter your full name.";
    if (skills.length === 0) nextErrors.skills = "Add at least one current skill.";
    if (portfolio && !/^https?:\/\/.+/.test(portfolio)) {
      nextErrors.portfolio = "Add a full URL beginning with http:// or https://.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onComplete();
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  return (
    <AuthShell
      role="candidate"
      step="onboarding"
      onBack={onBack}
      onSwitchRole={() => undefined}
    >
      <div className="onboarding-progress">
        <div>
          <span>Account created</span>
          <strong>Profile setup</strong>
        </div>
        <span>Step 2 of 2</span>
        <div className="progress-track"><span /></div>
      </div>

      <div className="onboarding-heading">
        <div className="auth-title">Let&apos;s Build Your Profile</div>
        <div className="auth-subtitle">
          Tell us what you can do. Your skills are your starting point.
        </div>
      </div>

      <form className="onboarding-card" onSubmit={submit} noValidate>
        <div className="onboarding-grid">
          <Field
            label="Full Name"
            name="candidate-profile-name"
            value={name}
            placeholder="Enter your full name"
            onChange={setName}
            error={errors.name}
          />

          <label className="auth-field">
            <span className="auth-label">Skill Proficiency <small>Optional</small></span>
            <select
              className="auth-input"
              value={proficiency}
              onChange={(event) => setProficiency(event.target.value)}
            >
              <option value="">Select a general level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>

          <div className="auth-field onboarding-span">
            <span className="auth-label">Current Skills <b>*</b></span>
            <div className={errors.skills ? "tag-input tag-input-error" : "tag-input"}>
              {skills.map((skill) => (
                <span className="skill-tag" key={skill}>
                  {skill}
                  <button
                    type="button"
                    aria-label={`Remove ${skill}`}
                    onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={skillInput}
                placeholder="Type a skill and press Enter"
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={onSkillKeyDown}
                onBlur={() => addSkill(skillInput)}
              />
            </div>
            {errors.skills && <span className="auth-error">{errors.skills}</span>}
            <div className="suggested-skills">
              <span>Suggestions:</span>
              {suggestedSkills
                .filter((skill) => !skills.includes(skill))
                .slice(0, 5)
                .map((skill) => (
                  <button type="button" key={skill} onClick={() => addSkill(skill)}>
                    + {skill}
                  </button>
                ))}
            </div>
          </div>

          <div className="auth-field onboarding-span">
            <span className="auth-label">Areas of Interest <small>Optional</small></span>
            <div className="interest-grid">
              {interestOptions.map((interest) => (
                <button
                  type="button"
                  key={interest}
                  className={interests.includes(interest) ? "interest-active" : ""}
                  onClick={() => toggleInterest(interest)}
                >
                  <span>{interests.includes(interest) ? "✓" : "+"}</span>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding-span">
            <Field
              label="GitHub / Portfolio URL"
              name="candidate-portfolio"
              value={portfolio}
              placeholder="https://github.com/your-name"
              onChange={setPortfolio}
              error={errors.portfolio}
              optional
              type="url"
            />
          </div>

          <label className="auth-field onboarding-span">
            <span className="auth-label">Short Introduction <small>Optional</small></span>
            <textarea
              className="auth-input auth-textarea"
              value={introduction}
              onChange={(event) => setIntroduction(event.target.value)}
              placeholder="What do you enjoy building or learning?"
              rows={3}
            />
          </label>
        </div>

        <div className="philosophy-note">
          <span>i</span>
          You don&apos;t need an impressive resume to get started. Your work will speak for itself.
        </div>
        <div className="onboarding-actions">
          <button type="button" className="auth-secondary" onClick={onComplete}>
            Skip for Now
          </button>
          <button type="submit" className="auth-primary onboarding-primary">
            Complete Profile <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

function EmployerOnboarding({
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

export default function AuthFlow({
  initialRole,
  initialMode = "signup",
  onBackHome,
  onComplete,
  onNavigateInfo,
}: AuthFlowProps) {
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [step, setStep] = useState<AuthStep>("auth");
  const [registeredName, setRegisteredName] = useState("");

  const switchRole = () => {
    setRole((current) => (current === "candidate" ? "employer" : "candidate"));
  };

  if (step === "onboarding") {
    if (role === "candidate") {
      return (
        <CandidateOnboarding
          fullName={registeredName}
          onBack={() => setStep("auth")}
          onComplete={() => onComplete("candidate")}
        />
      );
    }
    return (
      <EmployerOnboarding
        fullName={registeredName}
        onBack={() => setStep("auth")}
        onComplete={() => onComplete("employer")}
      />
    );
  }

  return (
    <AuthForm
      key={role}
      role={role}
      initialMode={initialMode}
      onBack={onBackHome}
      onSwitchRole={switchRole}
      onRegistered={(name) => {
        setRegisteredName(name);
        setStep("onboarding");
      }}
      onLoggedIn={() => onComplete(role)}
      onNavigateInfo={onNavigateInfo}
    />
  );
}
