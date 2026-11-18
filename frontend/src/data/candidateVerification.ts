import type { Application, PersonalProject } from "@/data/portalData";
import { sprints } from "@/data/portalData";

export type CandidateProfileData = {
  fullName: string;
  email: string;
  headline: string;
  location: string;
  skills: string[];
  portfolioUrl: string;
  introduction: string;
  payoutMethod?: "esewa" | "khalti" | "bank";
  payoutAccount?: string;
  payoutAccountHolder?: string;
  payoutBankName?: string;
};

export type VerificationRequirement = {
  label: string;
  points: number;
  complete: boolean;
};

export type CandidateVerification = {
  percentage: number;
  status: string;
  basicProfileComplete: boolean;
  projectEvidenceComplete: boolean;
  approvedSprints: string[];
  requirements: VerificationRequirement[];
};

export const initialCandidateProfile: CandidateProfileData = {
  fullName: "Aaisha Shrestha",
  email: "aaisha@example.com",
  headline: "Full-Stack Developer",
  location: "Kathmandu",
  skills: ["React", "TypeScript", "Recharts", "Django", "Node.js", "JWT", "PostgreSQL"],
  portfolioUrl: "",
  introduction: "I enjoy building reliable web products and learning through practical, well-scoped challenges.",
};

export function calculateCandidateVerification(
  profile: CandidateProfileData,
  projects: PersonalProject[],
  applications: Application[],
): CandidateVerification {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim());
  const validPortfolio = !profile.portfolioUrl.trim() || isHttpUrl(profile.portfolioUrl);
  const basicProfileComplete = Boolean(
    profile.fullName.trim()
    && validEmail
    && profile.skills.some((skill) => skill.trim())
    && validPortfolio,
  );

  const projectEvidenceComplete = projects.some((project) =>
    Boolean(
      project.title.trim()
      && project.description.trim()
      && project.technologies.some((technology) => technology.trim())
      && (project.zipFile || isHttpUrl(project.liveDemoUrl)),
    ),
  );

  const approvedSprints = applications
    .filter((application) => application.status === "Completed" && application.submitted && application.employerApproved)
    .map((application) => sprints.find((sprint) => sprint.id === application.sprintId)?.title)
    .filter((title): title is string => Boolean(title));
  const proofPoints = Math.min(approvedSprints.length, 3);
  const requirements: VerificationRequirement[] = [
    { label: "Basic profile completed and validated", points: 10, complete: basicProfileComplete },
    { label: "Project with required details and evidence", points: 20, complete: projectEvidenceComplete },
    { label: "First employer-approved Proof Sprint", points: 23.33, complete: proofPoints >= 1 },
    { label: "Second employer-approved Proof Sprint", points: 23.33, complete: proofPoints >= 2 },
    { label: "Third employer-approved Proof Sprint", points: 23.34, complete: proofPoints >= 3 },
  ];
  const percentage = Math.min(
    100,
    Math.round(requirements.reduce((total, requirement) => total + (requirement.complete ? requirement.points : 0), 0) * 100) / 100,
  );

  return {
    percentage,
    status: percentage === 100
      ? "Samarthya Verified"
      : percentage >= 54
        ? "Proof in progress"
        : percentage >= 30
          ? "Project evidence submitted"
          : percentage >= 10
            ? "Basic profile validated"
            : "Not yet verified",
    basicProfileComplete,
    projectEvidenceComplete,
    approvedSprints,
    requirements,
  };
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
