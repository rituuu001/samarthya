import { useState } from "react";
import AuthFlow, { type AuthRole } from "@/AuthFlow";
import PublicInfo, { type InfoPageKey } from "@/PublicInfo";
import RolePortal from "@/RolePortal";
import { calculateCandidateVerification, initialCandidateProfile } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, PersonalProject } from "@/data/portalData";
import { Screen3 } from "@/screens/candidate/Submission";
import { Screen4 } from "@/screens/employer/BlindEvaluation";
import { Screen6 } from "@/screens/candidate/IdentityReveal";
import { WelcomeScreen } from "@/screens/shared/WelcomeScreen";

// ─── Role-gated application root ─────────────────────────────────────────────

type AppView =
  | "home"
  | `auth-${AuthRole}`
  | `portal-${AuthRole}`
  | `info-${InfoPageKey}`;

export default function App() {
  const [active, setActive] = useState<AppView>("home");
  const [returnView, setReturnView] = useState<AppView>("home");
  const [candidateProfile, setCandidateProfile] = useState(initialCandidateProfile);
  const [projects, setProjects] = useState<PersonalProject[]>([]);
  const [applications, setApplications] = useState<Application[]>([
    { sprintId: 1, status: "Accepted", submitted: false, employerApproved: false },
    { sprintId: 3, status: "Pending Review", submitted: false, employerApproved: false },
    { sprintId: 4, status: "Rejected", submitted: false, employerApproved: false },
    { sprintId: 2, status: "Completed", submitted: true, employerApproved: true },
  ]);
  const candidateVerification = calculateCandidateVerification(candidateProfile, projects, applications);

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
        onComplete={(completedRole, profile) => {
          if (completedRole === "candidate" && profile) setCandidateProfile(profile);
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
      role={role}
      onLogout={() => setActive("home")}
      candidateProfile={candidateProfile}
      onCandidateProfileChange={setCandidateProfile}
      projects={projects}
      setProjects={setProjects}
      applications={applications}
      setApplications={setApplications}
      candidateVerification={candidateVerification}
      onApplicationDecision={updateApplicationStatus}
      renderSubmission={(onSubmitted) => <Screen3 onSubmitted={onSubmitted} />}
      renderEvaluation={(props) => <Screen4 {...props} />}
      renderIdentity={() => <Screen6 />}
    />
  );
}
