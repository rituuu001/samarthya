
import { apiRequest } from "./client";

export type SubmissionStatus =
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED";

export type SubmissionRevisionStatus =
  | "REVISION_REQUESTED"
  | "RESUBMITTED";

export type PaymentSummary = {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  completed_at: string | null;
};

export type ProofSummary = {
  id: string;
  title: string;
  description: string | null;
  skills_demonstrated: string[] | null;
  verified_at: string | null;
};

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
  functionality_score: number | null;
  code_quality_score: number | null;
  completeness_score: number | null;
  timeliness_score: number | null;
  average_score: number | null;
};

export type SubmissionRevisionResponse = {
  id: string;
  submission_id: string;
  revision_number: number;
  requested_changes: string | null;
  resubmission_description: string | null;
  file_ids: string[] | null;
  status: SubmissionRevisionStatus;
  requested_at: string | null;
  resubmitted_at: string | null;
};

export type SubmissionDetailResponse = SubmissionResponse & {
  payment: PaymentSummary | null;
  proof: ProofSummary | null;
  revision: SubmissionRevisionResponse | null;
};

export type SubmissionCreate = {
  description?: string;
  file_ids?: string[];
};

export type RevisionRequest = {
  requested_changes?: string;
  functionality_score: number;
  code_quality_score: number;
  completeness_score: number;
  timeliness_score: number;
};

export type SubmissionResubmit = {
  description?: string;
  file_ids?: string[];
};

export function getApplicationSubmission(applicationId: string) {
  return apiRequest<SubmissionDetailResponse>(
    `/applications/${applicationId}/submission`,
  );
}

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

export function requestSubmissionRevision(
  submissionId: string,
  requestedChanges: string,
  scores: {
    functionality_score: number;
    code_quality_score: number;
    completeness_score: number;
    timeliness_score: number;
  },
) {
  return apiRequest<SubmissionRevisionResponse>(
    `/submissions/${submissionId}/revision-requests`,
    {
      method: "POST",
      body: JSON.stringify({
        requested_changes: requestedChanges,
        ...scores,
      }),
    },
  );
}

export function getSubmission(applicationId: string) {
  return apiRequest<SubmissionResponse>(
    `/applications/${applicationId}/submission`,
  );
}

export function resubmitSubmission(
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

export function approveSubmission(
  submissionId: string,
  scores: {
    functionality_score: number;
    code_quality_score: number;
    completeness_score: number;
    timeliness_score: number;
  },
) {
  return apiRequest<SubmissionResponse>(
    `/submissions/${submissionId}/approve`,
    {
      method: "POST",
      body: JSON.stringify(scores),
    },
  );
}
