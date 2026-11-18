export type SprintStatus = "Active" | "Closed" | "Completed";

export type Sprint = {
  id: number;
  title: string;
  description: string;
  payment: number;
  skills: string[];
  deadline: string;
  applicationDeadline?: string | null;
  company: string;
  applicants: number;
  maxApplicants: number;
  status: SprintStatus;
};

export const sprints: Sprint[] = [
  {
    id: 1,
    title: "Build an Inventory Dashboard in React",
    description: "Create a responsive inventory dashboard with product filters, stock alerts, and a clear summary visualization.",
    payment: 12000,
    skills: ["React", "TypeScript", "Recharts"],
    deadline: "Sep 20, 2026",
    applicationDeadline: "2026-09-15",
    status: "Active",
    company: "TechNova Pvt. Ltd.",
    applicants: 8,
    maxApplicants: 12,
  },
  {
    id: 2,
    title: "REST API for Payment Gateway Integration",
    description: "Build and document secure payment endpoints with webhook verification, retries, and transaction logging.",
    payment: 9500,
    skills: ["Django", "PostgreSQL", "Stripe API"],
    deadline: "Sep 18, 2026",
    status: "Closed",
    company: "FinBridge Nepal",
    applicants: 10,
    maxApplicants: 10,
  },
  {
    id: 3,
    title: "Design & Implement Auth Flow",
    description: "Create a complete JWT and OTP authentication flow with clear error states and secure refresh handling.",
    payment: 7000,
    skills: ["Node.js", "JWT", "Redis"],
    deadline: "Sep 24, 2026",
    status: "Active",
    company: "Bazar Digital",
    applicants: 5,
    maxApplicants: 8,
  },
  {
    id: 4,
    title: "Analyze Customer Retention Dataset",
    description: "Explore a customer dataset, identify retention patterns, and present practical recommendations.",
    payment: 8500,
    skills: ["Python", "Pandas", "Data Analysis"],
    deadline: "Sep 28, 2026",
    status: "Completed",
    company: "Naya Insights",
    applicants: 3,
    maxApplicants: 10,
  },
];

export type ApplicationStatus = "Pending Review" | "Under Review" | "Accepted" | "Rejected" | "Completed" | "Submitted / Under Evaluation";
export type Application = {
  sprintId: number;
  status: ApplicationStatus;
  submitted: boolean;
  employerApproved: boolean;
};

export type PersonalProject = {
  id: number;
  title: string;
  description: string;
  technologies: string[];
  zipFile: File | null;
  liveDemoUrl: string;
};

export function isApplicationOpen(sprint: Sprint, now = new Date()) {
  if (sprint.status !== "Active") return false;
  if (!sprint.applicationDeadline) return true;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return sprint.applicationDeadline >= today;
}

export function formatDeadline(date: string | null | undefined) {
  if (!date) return "Not specified";
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export type StatusTone = "pink" | "gray" | "amber" | "green";

export const employerNav = [
  ["dashboard", "Dashboard"],
  ["create", "Create Sprint"],
  ["sprints", "My Sprints"],
  ["applicants", "Applicants"],
  ["payments", "Payments"],
  ["profile", "Organization Profile"],
] as const;

export const candidateNav = [
  ["dashboard", "Dashboard"],
  ["explore", "Explore Sprints"],
  ["applications", "My Applications"],
  ["connection-requests", "Connection Requests"],
  ["sprints", "My Sprints"],
  ["payments", "Payments"],
  ["profile", "My Profile"],
] as const;
