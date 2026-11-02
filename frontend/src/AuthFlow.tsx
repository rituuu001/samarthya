import { useState } from "react";
import AuthForm from "@/auth/forms/AuthForm";
import CandidateOnboarding from "@/auth/forms/CandidateOnboarding";
import EmployerOnboarding from "@/auth/forms/EmployerOnboarding";
import type { AuthFlowProps, AuthRole, AuthStep } from "@/auth/types";

export type { AuthRole } from "@/auth/types";

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
