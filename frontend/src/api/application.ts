
import { apiRequest } from "./client";

export type ApplicationStatus =
  | "APPLIED"
  | "ASSESSMENT_SUBMITTED"
  | "SHORTLISTED"
  | "SELECTED";

export type ApplicationResponse = {
  id: string;
  sprint_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
};

export function applyToSprint(sprintId: string) {
  return apiRequest<ApplicationResponse>(
    `/sprints/${sprintId}/applications`,
    { method: "POST" },
  );
}

export function getMyApplications() {
  return apiRequest<ApplicationResponse[]>("/applications");
}

export type EmployerApplicationStatus = ApplicationStatus;

export type EmployerApplicationResponse = {
  id: string;
  sprint_id: string;
  status: EmployerApplicationStatus;
  applied_at: string | null;
  updated_at: string | null;
};

export type EmployerAssessmentResult = {
  application_id: string;
  attempt_status: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  submitted_at: string | null;
};

export function getSprintApplications(sprintId: string) {
  return apiRequest<EmployerApplicationResponse[]>(
    `/sprints/${sprintId}/applications`,
  );
}

export function getSprintAssessmentResults(sprintId: string) {
  return apiRequest<EmployerAssessmentResult[]>(
    `/assessments/sprints/${sprintId}/results`,
  );
}

export function shortlistApplication(applicationId: string) {
  return apiRequest<EmployerApplicationResponse>(
    `/applications/${applicationId}/shortlist`,
    { method: "POST" },
  );
}

export function selectApplication(applicationId: string) {
  return apiRequest<EmployerApplicationResponse>(
    `/applications/${applicationId}/select`,
    { method: "POST" },
  );
}
