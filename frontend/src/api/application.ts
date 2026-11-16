import { apiRequest } from "@/api/client";

export type EmployerApplicationStatus =
  | "APPLIED"
  | "ASSESSMENT_SUBMITTED"
  | "SHORTLISTED"
  | "SELECTED";

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
    {
      method: "POST",
    },
  );
}

export function selectApplication(applicationId: string) {
  return apiRequest<EmployerApplicationResponse>(
    `/applications/${applicationId}/select`,
    {
      method: "POST",
    },
  );
}
