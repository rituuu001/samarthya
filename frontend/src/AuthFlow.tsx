import { useState } from "react";
import AuthForm from "@/auth/forms/AuthForm";
import CandidateOnboarding from "@/auth/forms/CandidateOnboarding";
import EmployerOnboarding from "@/auth/forms/EmployerOnboarding";
import type { AuthFlowProps, AuthRole, AuthStep } from "@/auth/types";
import { registerUser, loginUser, getCurrentUser } from "@/api/auth";
import { saveAccessToken } from "@/api/client";
import { updateMyProfile, getMyProfile} from "@/api/profile";
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
  const [registeredEmail, setRegisteredEmail] = useState("");

  const switchRole = () => {
    setRole((current) => (current === "candidate" ? "employer" : "candidate"));
  };

  if (step === "onboarding") {
    if (role === "candidate") {
      return (
        <CandidateOnboarding
          fullName={registeredName}
          email={registeredEmail}
          onBack={() => setStep("auth")}
          onComplete={async (profile) => {
            await updateMyProfile({
             full_name: profile.fullName,
             bio: profile.introduction,
             skills: profile.skills,
             website: profile.portfolioUrl || null,
  });

  onComplete("candidate", profile, profile.fullName);
}}
        />
      );
    }
    return (
      <EmployerOnboarding
        fullName={registeredName}
        onBack={() => setStep("auth")}
        onComplete={async (profile) => {
    await updateMyProfile(profile);
    setRegisteredName(profile.full_name);
    onComplete("employer", undefined, profile.full_name, {
  email: registeredEmail,
  organization_name: profile.organization_name,
  website: profile.website,
  bio: profile.bio,
  position: profile.position,
  organization_type: profile.organization_type,
  organization_size: profile.organization_size,
  phone_number: profile.phone_number,
});
}}
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
      
onRegistered={async (name, email, password) => {
  const backendRole = role === "candidate" ? "CONTRIBUTOR" : "EMPLOYER";

  await registerUser({
    full_name: name,
    email,
    password,
    role: backendRole,
  });

  const tokenResponse = await loginUser({ email, password });
  saveAccessToken(tokenResponse.access_token);

  setRegisteredName(name);
  setRegisteredEmail(email);
  setStep("onboarding");
}}
onLoggedIn={async (email, password) => {
  const tokenResponse = await loginUser({ email, password });
  saveAccessToken(tokenResponse.access_token);

  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getMyProfile(),
  ]);
  const userRole: AuthRole =
    user.role === "CONTRIBUTOR" ? "candidate" : "employer";

  setRegisteredName(user.full_name);
  setRegisteredEmail(user.email);

  if (userRole === "candidate") {
    onComplete("candidate", {
      fullName: profile.full_name,
      email: user.email,
      headline: "",
      location: profile.location ?? "",
      skills: profile.skills ?? [],
      portfolioUrl: profile.website ?? "",
      introduction: profile.bio ?? "",
    }, user.full_name);
  } else {
  onComplete("employer", undefined, user.full_name, {
    email: user.email,
    organization_name: profile.organization_name ?? "",
    website: profile.website,
    bio: profile.bio,
    position: profile.position ?? "",
    organization_type: profile.organization_type ?? "",
    organization_size: profile.organization_size ?? "",
    phone_number: profile.phone_number ?? "",
  });
}
}}

      onNavigateInfo={onNavigateInfo}
    />
  );
}
