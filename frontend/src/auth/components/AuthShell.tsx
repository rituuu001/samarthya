import BrandLockup from "@/auth/components/BrandLockup";
import type { AuthShellProps } from "@/auth/types";

export default function AuthShell({
  role,
  step,
  onBack,
  onSwitchRole,
  children,
}: AuthShellProps) {
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
