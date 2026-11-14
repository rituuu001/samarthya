import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AuthRole } from "@/AuthFlow";
import type { CandidateProfileData, CandidateVerification } from "@/data/candidateVerification";
import type { Application, ApplicationStatus, PersonalProject, Sprint } from "@/data/portalData";
import { CandidatePortal } from "@/screens/candidate/CandidatePortal";
import { EmployerPortal } from "@/screens/employer/EmployerPortal";
import type { EmployerProfileData } from "@/auth/types";

export type PortalProps = {
  role: AuthRole;
  onLogout: () => void;
  fullName: string;
  employerProfile: EmployerProfileData | null;
  renderSubmission: (onSubmitted: () => void) => ReactNode;
  renderEvaluation: (props: {
    applicantId: string;
    sprint: Sprint;
    application: Application | undefined;
    onBack: () => void;
    onDecision: (status: ApplicationStatus) => void;
  }) => ReactNode;
  renderIdentity: () => ReactNode;
  onApplicationDecision: (sprintId: number, status: ApplicationStatus) => void;
  candidateProfile: CandidateProfileData;
  onCandidateProfileChange: (profile: CandidateProfileData) => void;
  projects: PersonalProject[];
  setProjects: Dispatch<SetStateAction<PersonalProject[]>>;
  applications: Application[];
  setApplications: Dispatch<SetStateAction<Application[]>>;
  candidateVerification: CandidateVerification;
  connectionRequests: Record<string, string>;
  onSendConnectionRequest: (applicantId: string, employerName: string) => void;
};

export default function RolePortal(props: PortalProps) {
  return props.role === "employer"
    ? <EmployerPortal fullName={props.fullName} employerProfile={props.employerProfile} onLogout={props.onLogout} renderEvaluation={props.renderEvaluation} onApplicationDecision={props.onApplicationDecision} candidateVerification={props.candidateVerification} candidateApplications={props.applications} connectionRequests={props.connectionRequests} onSendConnectionRequest={props.onSendConnectionRequest} />
    : <CandidatePortal fullName={props.fullName} onLogout={props.onLogout} renderSubmission={props.renderSubmission} renderIdentity={props.renderIdentity} candidateProfile={props.candidateProfile} onCandidateProfileChange={props.onCandidateProfileChange} projects={props.projects} setProjects={props.setProjects} applications={props.applications} setApplications={props.setApplications} />;
}
