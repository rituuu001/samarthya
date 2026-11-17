import type { AssessmentQuestionResponse } from "@/api/assessment"

type AssessmentQuestionProps = {
  question: AssessmentQuestionResponse

  questionNumber: number

  value: string

  disabled: boolean

  onChange: (value: string) => void
}

type Choice = {
  id: string

  text: string
}

function getChoices(question: AssessmentQuestionResponse): Choice[] {
  const choices = question.candidate_config.choices

  if (!Array.isArray(choices)) return []

  return choices.filter(
    (choice): choice is Choice =>
      typeof choice === "object" &&
      choice !== null &&
      "id" in choice &&
      typeof choice.id === "string" &&
      "text" in choice &&
      typeof choice.text === "string",
  )
}

function getStarterContent(question: AssessmentQuestionResponse) {
  for (const key of ["starter_code", "starter_expression"]) {
    const value = question.candidate_config[key]

    if (typeof value === "string") return value
  }

  return null
}

function getResponsePrompt(
  questionType: AssessmentQuestionResponse["question_type"],
) {
  switch (questionType) {
    case "CODE_OUTPUT":
      return "Enter the output"

    case "DEBUGGING":
      return "Enter the corrected code or expression"

    case "PRACTICAL":
      return "Enter your response"

    case "CONCEPT":

    case "SHORT_ANSWER":
      return "Type your answer"

    case "MCQ":
      return "Select one answer"
  }
}

export function AssessmentQuestion({
  question,

  questionNumber,

  value,

  disabled,

  onChange,
}: AssessmentQuestionProps) {
  const isCodeResponse =
    question.question_type === "CODE_OUTPUT" ||
    question.question_type === "DEBUGGING" ||
    question.question_type === "PRACTICAL"

  const starterContent = getStarterContent(question)

  const choices = question.question_type === "MCQ" ? getChoices(question) : []

  return (
    <article className="assessment-question-card">
      <div className="assessment-question-meta">
        <span>
          Question {questionNumber} ·{" "}
          {question.question_type.replace(/_/g, " ")}
        </span>
        <span>{question.points} points</span>
      </div>
      <h2 className="assessment-question-prompt">{question.prompt}</h2>
      {question.instructions && (
        <p className="assessment-question-instructions">
          {question.instructions}
        </p>
      )}
      {starterContent !== null && (
        <div className="assessment-starter">
          <div className="assessment-field-label">Provided starting point</div>
          <pre>
            <code>{starterContent}</code>
          </pre>
        </div>
      )}

      {question.question_type === "MCQ" ? (
        <fieldset className="assessment-choices" disabled={disabled}>
          <legend className="assessment-field-label">
            {getResponsePrompt(question.question_type)}
          </legend>
          {choices.length > 0 ? (
            choices.map((choice) => (
              <label className="assessment-choice" key={choice.id}>
                <input
                  type="radio"
                  name={`assessment-question-${question.id}`}
                  value={choice.id}
                  checked={value === choice.id}
                  onChange={() => onChange(choice.id)}
                />
                <span>{choice.text}</span>
              </label>
            ))
          ) : (
            <p className="assessment-choice-error" role="alert">
              Answer choices are unavailable for this question.
            </p>
          )}
        </fieldset>
      ) : (
        <label className="assessment-response">
          <span className="assessment-field-label">
            {getResponsePrompt(question.question_type)}
          </span>
          <textarea
            aria-label={`Response to question ${questionNumber}`}
            className={
              isCodeResponse
                ? "assessment-response-input is-code"
                : "assessment-response-input"
            }
            rows={isCodeResponse ? 7 : 4}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      )}
    </article>
  )
}
