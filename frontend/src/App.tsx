import { useState } from "react";
import AuthFlow, { type AuthRole } from "@/AuthFlow";
import PublicInfo, { type InfoPageKey } from "@/PublicInfo";
import RolePortal from "@/RolePortal";
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
        onComplete={(completedRole) => setActive(`portal-${completedRole}`)}
      />
    );
  }

  const role = active.replace("portal-", "") as AuthRole;
  return (
    <RolePortal
      role={role}
      onLogout={() => setActive("home")}
      renderSubmission={(onSubmitted) => <Screen3 onSubmitted={onSubmitted} />}
      renderEvaluation={() => <Screen4 />}
      renderIdentity={() => <Screen6 />}
    />
  );
}
