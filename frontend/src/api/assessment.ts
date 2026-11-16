import { apiRequest } from "./client"

export type AssessmentQuestionType = "CONCEPT" | "SHORT_ANSWER" | "MCQ" | "CODE_OUTPUT" | "DEBUGGING" | "PRACTICAL"

export type AssessmentQuestionResponse = {
  id: string

  question_type: AssessmentQuestionType

  prompt: string

  instructions: string | null

  position: number

  points: AssessmentDecimal

  candidate_config: Record<string, unknown>
}

export type AssignedAssessmentResponse = {
  sprint_assessment_id: string

  sprint_id: string

  title: string

  description: string | null

  duration_minutes: number

  deadline: string

  questions: AssessmentQuestionResponse[]
}

export type AssessmentAnswerSubmission = {
  question_id: string

  response: string
}

export type AssessmentDecimal = number | string

export type AssessmentResultResponse = {
  attempt_id: string

  status: string

  score: AssessmentDecimal

  max_score: AssessmentDecimal

  percentage: AssessmentDecimal

  passed: boolean

  submitted_at: string
}

export function submitAssessment(
  attemptId: string,

  answers: AssessmentAnswerSubmission[],
) {
  return apiRequest<AssessmentResultResponse>(
    `/assessments/attempts/${encodeURIComponent(attemptId)}/submit`,

    {
      method: "POST",

      body: JSON.stringify({ answers }),
    },
  )
}
