
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
