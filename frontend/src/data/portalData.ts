export const sprints = [
  {
    id: 1,
    title: "Build an Inventory Dashboard in React",
    description: "Create a responsive inventory dashboard with product filters, stock alerts, and a clear summary visualization.",
    payment: 12000,
    skills: ["React", "TypeScript", "Recharts"],
    deadline: "Sep 20, 2026",
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
    company: "Naya Insights",
    applicants: 3,
    maxApplicants: 10,
  },
];

export type ApplicationStatus = "Pending Review" | "Accepted" | "Rejected" | "Completed" | "Submitted / Under Evaluation";
export type Application = { sprintId: number; status: ApplicationStatus };

export type StatusTone = "pink" | "gray" | "amber" | "green";

export const employerNav = [
  ["dashboard", "Dashboard"],
  ["create", "Create Project"],
  ["sprints", "My Projects"],
  ["applicants", "Applicants"],
  ["evaluation", "Evaluation"],
  ["payments", "Payments"],
  ["profile", "Organization Profile"],
] as const;

export const candidateNav = [
  ["dashboard", "Dashboard"],
  ["explore", "Explore Projects"],
  ["applications", "My Applications"],
  ["sprints", "My Projects"],
  ["payments", "Payments"],
  ["profile", "My Profile"],
] as const;
