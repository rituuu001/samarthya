
import { apiRequest } from "./client";

export type SubmissionStatus =
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED";

export type SubmissionResponse = {
  id: string;
  application_id: string;
  description: string | null;
  file_ids: string[];
  current_revision_number: number;
  status: SubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type SubmissionCreate = {
  description?: string;
  file_ids?: string[];
};

export type RevisionRequest = {
  requested_changes?: string;
};

export type SubmissionResubmit = {
  description?: string;
  file_ids?: string[];
};

export function createSubmission(
  applicationId: string,
  data: SubmissionCreate,
) {
  return apiRequest<SubmissionResponse>(
    `/applications/${applicationId}/submission`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function getSubmission(applicationId: string) {
  return apiRequest<SubmissionResponse>(
    `/applications/${applicationId}/submission`,
  );
}

export function resubmitWork(
  submissionId: string,
  data: SubmissionResubmit,
) {
  return apiRequest<SubmissionResponse>(
    `/submissions/${submissionId}/resubmissions`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}
