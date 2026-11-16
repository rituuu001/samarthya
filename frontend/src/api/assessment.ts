
import { apiRequest } from "./client";

export type AssessmentQuestionResponse = {
  id: string;
  question_type: string;
  prompt: string;
  instructions: string | null;
  position: number;
  points: number | string;
  candidate_config: Record<string, unknown>;
};

export type SprintAssessmentLookupResponse = {
  sprint_assessment_id: string;
  sprint_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
};

export type AssignedAssessmentResponse = {
  sprint_assessment_id: string;
  sprint_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  deadline: string;
  questions: AssessmentQuestionResponse[];
};

export type AssessmentAttemptResponse = {
  id: string;
  application_id: string;
  sprint_assessment_id: string;
  status: string;
  started_at: string;
  expires_at: string;
};

export type AssessmentAnswerSubmission = {
  question_id: string;
  response: unknown;
};

export type AssessmentSubmission = {
  answers: AssessmentAnswerSubmission[];
};

export type AssessmentResultResponse = {
  attempt_id: string;
  status: string;
  score: number | string;
  max_score: number | string;
  percentage: number | string;
  passed: boolean;
  submitted_at: string;
};

export function lookupSprintAssessment(sprintId: string) {
  return apiRequest<SprintAssessmentLookupResponse>(
    `/assessments/sprints/${sprintId}/lookup`,
  );
}

export function getAssignedAssessment(
  sprintAssessmentId: string,
  applicationId: string,
) {
  return apiRequest<AssignedAssessmentResponse>(
    `/assessments/sprint-assessments/${sprintAssessmentId}/applications/${applicationId}`,
  );
}

export function startAssessment(
  sprintAssessmentId: string,
  applicationId: string,
) {
  return apiRequest<AssessmentAttemptResponse>(
    `/assessments/sprint-assessments/${sprintAssessmentId}/applications/${applicationId}/start`,
    { method: "POST" },
  );
}

export function submitAssessment(
  attemptId: string,
  submission: AssessmentSubmission,
) {
  return apiRequest<AssessmentResultResponse>(
    `/assessments/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(submission),
    },
  );
}
