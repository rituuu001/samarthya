import { useCallback, useRef, useState } from "react"

import {
  submitAssessment,
  type AssessmentAnswerSubmission,
  type AssessmentDecimal,
  type AssessmentResultResponse,
  type AssignedAssessmentResponse,
} from "@/api/assessment"

import { PortalCard } from "@/components/portal/PortalCard"

import { AssessmentQuestion } from "./AssessmentQuestion"

import { AssessmentTimer } from "./AssessmentTimer"

export type AssessmentRunnerProps = {
  assessment: AssignedAssessmentResponse

  attemptId: string

  expiresAt: string

  onSubmitted: (result: AssessmentResultResponse) => void
}

export function AssessmentRunner(props: AssessmentRunnerProps) {
  return (
    <AssessmentRunnerAttempt
      key={`${props.attemptId}:${props.expiresAt}`}
      {...props}
    />
  )
}

function formatScore(value: AssessmentDecimal) {
  const numericValue = typeof value === "number" ? value : Number(value)

  return Number.isFinite(numericValue)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
        numericValue,
      )
    : String(value)
}

function AssessmentRunnerAttempt({
  assessment,

  attemptId,

  expiresAt,

  onSubmitted,
}: AssessmentRunnerProps) {
  const expiryMs = Date.parse(expiresAt)

  const [expired, setExpired] = useState(
    () => !Number.isFinite(expiryMs) || expiryMs <= Date.now(),
  )

  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [currentIndex, setCurrentIndex] = useState(0)

  const [submitting, setSubmitting] = useState(false)

  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const [result, setResult] = useState<AssessmentResultResponse | null>(null)

  const submissionInFlight = useRef(false)

  const handleExpire = useCallback(() => setExpired(true), [])

  const isPastExpiry = () =>
    !Number.isFinite(expiryMs) || Date.now() >= expiryMs

  const locked = expired || submitting || result !== null

  const question = assessment.questions[currentIndex]

  const answeredCount = assessment.questions.filter(
    (item) => (answers[item.id] ?? "").trim().length > 0,
  ).length

  const updateAnswer = (questionId: string, value: string) => {
    if (isPastExpiry()) {
      setExpired(true)

      return
    }

    if (locked) return

    setAnswers((current) => ({ ...current, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (submissionInFlight.current) return

    if (isPastExpiry()) {
      setExpired(true)

      return
    }

    submissionInFlight.current = true

    const submittedAnswers: AssessmentAnswerSubmission[] = assessment.questions

      .filter((item) => (answers[item.id] ?? "").trim().length > 0)

      .map((item) => ({
        question_id: item.id,

        response: answers[item.id],
      }))

    setSubmitting(true)

    setSubmissionError(null)

    let submittedResult: AssessmentResultResponse

    try {
      submittedResult = await submitAssessment(attemptId, submittedAnswers)
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to submit the assessment. Please try again.",
      )

      submissionInFlight.current = false

      setSubmitting(false)

      return
    }

    submissionInFlight.current = false

    setResult(submittedResult)

    setSubmitting(false)

    onSubmitted(submittedResult)
  }

  return (
    <main className="assessment-page" aria-labelledby="assessment-title">
      <header className="assessment-header">
        <div>
          <div className="portal-eyebrow">Assessment</div>
          <h1 className="portal-title" id="assessment-title">
            {assessment.title}
          </h1>
          {assessment.description && (
            <p className="portal-subtitle assessment-description">
              {assessment.description}
            </p>
          )}
        </div>
        <div className="assessment-timer-panel">
          <span>Time remaining</span>
          <AssessmentTimer expiresAt={expiresAt} onExpire={handleExpire} />
        </div>
      </header>

      {assessment.questions.length === 0 ? (
        <PortalCard className="assessment-empty">
          <p>This assessment has no questions available.</p>
        </PortalCard>
      ) : result ? (
        <section
          className="portal-card assessment-result"
          role="status"
          aria-live="polite"
        >
          <div className="portal-eyebrow">Submission complete</div>
          <h2>
            {result.passed ? "Assessment passed" : "Assessment submitted"}
          </h2>
          <p>
            Score:{" "}
            <strong>
              {formatScore(result.score)} / {formatScore(result.max_score)}
            </strong>
            {" · "}
            <strong>{formatScore(result.percentage)}%</strong>
          </p>
          <p className="assessment-result-status">
            {result.passed
              ? "You met the passing score."
              : "Your result has been recorded."}
          </p>
        </section>
      ) : (
        <>
          <PortalCard className="assessment-progress">
            <div className="assessment-progress-copy">
              <span>
                Question {currentIndex + 1} of {assessment.questions.length}
              </span>
              <span>{answeredCount} answered</span>
            </div>
            <div
              className="assessment-progress-track"
              role="progressbar"
              aria-label="Assessment question progress"
              aria-valuemin={1}
              aria-valuemax={assessment.questions.length}
              aria-valuenow={currentIndex + 1}
            >
              <span
                style={{
                  width: `${((currentIndex + 1) / assessment.questions.length) * 100}%`,
                }}
              />
            </div>
            <nav
              className="assessment-question-nav"
              aria-label="Assessment questions"
            >
              {assessment.questions.map((item, index) => {
                const isAnswered = (answers[item.id] ?? "").trim().length > 0

                return (
                  <button
                    className={[
                      "assessment-question-jump",

                      index === currentIndex ? "is-current" : "",

                      isAnswered ? "is-answered" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    key={item.id}
                    aria-label={`Question ${index + 1}${
                      isAnswered ? ", answered" : ", unanswered"
                    }`}
                    aria-current={index === currentIndex ? "step" : undefined}
                    disabled={submitting}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </nav>
          </PortalCard>

          {question && (
            <AssessmentQuestion
              question={question}
              questionNumber={currentIndex + 1}
              value={answers[question.id] ?? ""}
              disabled={locked}
              onChange={(value) => updateAnswer(question.id, value)}
            />
          )}

          {expired && (
            <p className="assessment-expired-message" role="status">
              The assessment time has expired. Your answers can no longer be
              changed or submitted.
            </p>
          )}
          {submissionError && (
            <p className="assessment-error" role="alert">
              {submissionError}
            </p>
          )}

          <div className="assessment-actions">
            <button
              className="portal-secondary"
              type="button"
              disabled={currentIndex === 0 || submitting}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            >
              Previous
            </button>
            {currentIndex < assessment.questions.length - 1 && (
              <button
                className="portal-secondary"
                type="button"
                disabled={submitting}
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(assessment.questions.length - 1, index + 1),
                  )
                }
              >
                Next
              </button>
            )}
            <button
              className="portal-primary assessment-submit"
              type="button"
              disabled={locked || isPastExpiry()}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit assessment"}
            </button>
          </div>
          {answeredCount < assessment.questions.length && !expired && (
            <p className="assessment-unanswered-note">
              {assessment.questions.length - answeredCount} unanswered
              question(s) will be submitted as blank.
            </p>
          )}
        </>
      )}
    </main>
  )
}
