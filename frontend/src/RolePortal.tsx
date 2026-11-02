import type { ReactNode } from "react";
import type { AuthRole } from "@/AuthFlow";
import { CandidatePortal } from "@/screens/candidate/CandidatePortal";
import { EmployerPortal } from "@/screens/employer/EmployerPortal";

export type PortalProps = {
  role: AuthRole;
  onLogout: () => void;
  renderSubmission: (onSubmitted: () => void) => ReactNode;
  renderEvaluation: () => ReactNode;
  renderIdentity: () => ReactNode;
};

export default function RolePortal(props: PortalProps) {
  return props.role === "employer"
    ? <EmployerPortal onLogout={props.onLogout} renderEvaluation={props.renderEvaluation} />
    : <CandidatePortal onLogout={props.onLogout} renderSubmission={props.renderSubmission} renderIdentity={props.renderIdentity} />;
}
