import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AuthRole } from "@/AuthFlow";
import type { CandidateProfileData, CandidateVerification } from "@/data/candidateVerification";
import type { Application, PersonalProject } from "@/data/portalData";
import { CandidatePortal } from "@/screens/candidate/CandidatePortal";
import { EmployerPortal } from "@/screens/employer/EmployerPortal";

export type PortalProps = {
  role: AuthRole;
  onLogout: () => void;
  renderSubmission: (onSubmitted: () => void) => ReactNode;
  renderEvaluation: (onApproved: () => void, onRejected: () => void) => ReactNode;
  renderIdentity: () => ReactNode;
  onApproveSubmission: () => void;
  onRejectSubmission: () => void;
  candidateProfile: CandidateProfileData;
  onCandidateProfileChange: (profile: CandidateProfileData) => void;
  projects: PersonalProject[];
  setProjects: Dispatch<SetStateAction<PersonalProject[]>>;
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
  candidateVerification: CandidateVerification;
};

export default function RolePortal(props: PortalProps) {
  return props.role === "employer"
    ? <EmployerPortal onLogout={props.onLogout} renderEvaluation={() => props.renderEvaluation(props.onApproveSubmission, props.onRejectSubmission)} candidateVerification={props.candidateVerification} candidateApplications={props.applications} />
    : <CandidatePortal onLogout={props.onLogout} renderSubmission={props.renderSubmission} renderIdentity={props.renderIdentity} candidateProfile={props.candidateProfile} onCandidateProfileChange={props.onCandidateProfileChange} projects={props.projects} setProjects={props.setProjects} applications={props.applications} setApplications={props.setApplications} />;
}
