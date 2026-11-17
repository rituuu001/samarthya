
import { useState } from "react";
import {
  getAssignedAssessment,
  lookupSprintAssessment,
  startAssessment,
  submitAssessment,
  type AssignedAssessmentResponse,
  type AssessmentAttemptResponse,
  type AssessmentResultResponse,
  type AssessmentSubmission,
} from "@/api/assessment";
import type { ApplicationResponse } from "@/api/application";

type ActiveAssessment = {
  application: ApplicationResponse;
  assessment: AssignedAssessmentResponse;
  attempt: AssessmentAttemptResponse;
};

export function useCandidateAssessment() {
  const [activeAssessment, setActiveAssessment] =
    useState<ActiveAssessment | null>(null);
  const [loadingApplicationId, setLoadingApplicationId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCandidateAssessment = async (
    application: ApplicationResponse,
  ): Promise<boolean> => {
    if (loadingApplicationId) return false;

    setLoadingApplicationId(application.id);
    setError(null);

    try {
      const lookup = await lookupSprintAssessment(application.sprint_id);

      const assessment = await getAssignedAssessment(
        lookup.sprint_assessment_id,
        application.id,
      );

      const attempt = await startAssessment(
        lookup.sprint_assessment_id,
        application.id,
      );

      setActiveAssessment({
        application,
        assessment,
        attempt,
      });

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start the assessment.",
      );
      return false;
    } finally {
      setLoadingApplicationId(null);
    }
  };

  const submitCandidateAssessment = async (
    submission: AssessmentSubmission,
  ): Promise<AssessmentResultResponse> => {
    if (!activeAssessment) {
      throw new Error("No active assessment found.");
    }

    setError(null);

    try {
      const result = await submitAssessment(
        activeAssessment.attempt.id,
        submission,
      );


      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the assessment.",
      );
      throw err;
    }
  };

  return {
    activeAssessment,
    loadingApplicationId,
    error,
    startCandidateAssessment,
    submitCandidateAssessment,
  };
}
