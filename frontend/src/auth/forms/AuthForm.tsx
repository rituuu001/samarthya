import { useState } from "react";
import type { FormEvent } from "react";
import AuthShell from "@/auth/components/AuthShell";
import Field from "@/auth/components/Field";
import PasswordField from "@/auth/components/PasswordField";
import type { AuthFormProps, AuthMode } from "@/auth/types";

export default function AuthForm({
  role,
  initialMode,
  onBack,
  onSwitchRole,
  onRegistered,
  onLoggedIn,
  onNavigateInfo,
}: AuthFormProps) {
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
                ? "Start showcasing your skills and building your journey."
                : "Find talent through skills, not just resumes."
              : candidate
                ? "Continue building your journey."
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
