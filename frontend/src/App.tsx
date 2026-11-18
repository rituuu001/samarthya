import { useEffect, useState } from "react";
import AuthFlow, { type AuthRole } from "@/AuthFlow";
import PublicInfo, { type InfoPageKey } from "@/PublicInfo";
import RolePortal from "@/RolePortal";
import { calculateCandidateVerification, initialCandidateProfile } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, PersonalProject } from "@/data/portalData";
import { Screen3 } from "@/screens/candidate/Submission";
import { Screen4 } from "@/screens/employer/BlindEvaluation";
import { Screen6 } from "@/screens/candidate/IdentityReveal";
import { WelcomeScreen } from "@/screens/shared/WelcomeScreen";
import { clearAccessToken, getAccessToken } from "@/api/client";
import { getCurrentUser } from "@/api/auth";
import { getMyProfile } from "@/api/profile";
import type { EmployerProfileData } from "@/auth/types";

// ─── Role-gated application root ─────────────────────────────────────────────

type AppView =
  | "home"
  | `auth-${AuthRole}`
  | `portal-${AuthRole}`
  | `info-${InfoPageKey}`;

export default function App() {
  const [active, setActive] = useState<AppView>("home");
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [returnView, setReturnView] = useState<AppView>("home");
  const [candidateProfile, setCandidateProfile] = useState(initialCandidateProfile);
  const [authenticatedFullName, setAuthenticatedFullName] = useState(initialCandidateProfile.fullName);
  const [employerProfile, setEmployerProfile] = useState<EmployerProfileData | null>(null);
  const [projects, setProjects] = useState<PersonalProject[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<Record<string, string>>({});
  const [applications, setApplications] = useState<Application[]>([
    { sprintId: 1, status: "Accepted", submitted: false, employerApproved: false },
    { sprintId: 3, status: "Pending Review", submitted: false, employerApproved: false },
    { sprintId: 4, status: "Rejected", submitted: false, employerApproved: false },
    { sprintId: 2, status: "Completed", submitted: true, employerApproved: true },
  ]);
  const candidateVerification = calculateCandidateVerification(candidateProfile, projects, applications);
  
useEffect(() => {
  const restoreSession = async () => {
    const token = getAccessToken();

    if (!token) {
      setIsRestoringSession(false);
      return;
    }

    try {
      const user = await getCurrentUser();
      const profile = await getMyProfile();

      setAuthenticatedFullName(user.full_name);

      if (user.role === "CONTRIBUTOR") {
        setCandidateProfile({
          fullName: profile.full_name,
          email: user.email,
          headline: "",
          location: profile.location ?? "",
          skills: profile.skills ?? [],
          portfolioUrl: profile.website ?? "",
          introduction: profile.bio ?? "",
        });

        setActive("portal-candidate");
      } else {
        setEmployerProfile({
          email: user.email,
          organization_name: profile.organization_name ?? "",
          website: profile.website,
          bio: profile.bio,
        });

        setActive("portal-employer");
      }
    } catch {
      clearAccessToken();
      setActive("home");
    } finally {
      setIsRestoringSession(false);
    }
  };

  void restoreSession();
}, []);

if (isRestoringSession) {
  return null;
}
  const openInfo = (page: InfoPageKey, from: AppView) => {
    setReturnView(from);
    setActive(`info-${page}`);
  };

  if (active === "home") {
    return (
      <WelcomeScreen
        onCandidate={() => setActive("auth-candidate")}
        onEmployer={() => setActive("auth-employer")}
        onNavigate={(page) => openInfo(page, "home")}
      />
    );
  }

  if (active.startsWith("info-")) {
    const page = active.replace("info-", "") as InfoPageKey;
    return <PublicInfo page={page} onBack={() => setActive(returnView)} />;
  }

  if (active.startsWith("auth-")) {
    const role = active.replace("auth-", "") as AuthRole;
    return (
      <AuthFlow
        initialRole={role}
        onBackHome={() => setActive("home")}
        onNavigateInfo={(page) => openInfo(page, active)}
        onComplete={(completedRole, profile, fullName, employerData) => {
         if (completedRole === "candidate" && profile) {
             setCandidateProfile(profile);}

         if (fullName) {
            setAuthenticatedFullName(fullName);}

         if (completedRole === "employer" && employerData) {
                 setEmployerProfile(employerData);}
          
          setActive(`portal-${completedRole}`);
        }}
      />
    );
  }

  const role = active.replace("portal-", "") as AuthRole;
  const updateApplicationStatus = (sprintId: number, status: ApplicationStatus) => {
    setApplications((current) => current.map((application) =>
      application.sprintId === sprintId
        ? { ...application, status, employerApproved: status === "Completed" }
        : application,
    ));
  };
  return (
    <RolePortal
      fullName={authenticatedFullName}
      employerProfile={employerProfile}
      role={role}
      onLogout={() => {
  clearAccessToken();
  setActive("home");
}}
      candidateProfile={candidateProfile}
      onCandidateProfileChange={setCandidateProfile}
      projects={projects}
      setProjects={setProjects}
      applications={applications}
      setApplications={setApplications}
      candidateVerification={candidateVerification}
      onApplicationDecision={updateApplicationStatus}
      connectionRequests={connectionRequests}
      onSendConnectionRequest={(applicantId, employerName) => setConnectionRequests((current) => (
        applicantId in current ? current : { ...current, [applicantId]: employerName }
      ))}
      renderSubmission={(onSubmitted, context) => (
  <Screen3
    onSubmitted={onSubmitted}
    application={context?.application}
    sprint={context?.sprint}
  />
)}
      renderEvaluation={(props) => <Screen4 {...props} />}
      renderIdentity={() => <Screen6 connectionRequest={connectionRequests["Contributor #8041"] ?? null} />}
    />
  );
}
