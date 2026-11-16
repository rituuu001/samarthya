from copy import deepcopy
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.application import Application, ApplicationStatus
from app.models.assessment import (
    AssessmentAnswer,
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentTemplate,
    SprintAssessment,
    SprintAssessmentQuestion,
)
from app.models.sprint import Sprint

PASSING_PERCENTAGE = Decimal("50")
_SENSITIVE_CONFIG_KEYS = {
    "answer",
    "correct",
    "expected",
    "grading",
    "solution",
    "assert",
    "validoutput",
}


def _is_sensitive_config_key(key: str) -> bool:
    normalized_key = re.sub(r"[^a-z0-9]", "", key.casefold())
    return any(sensitive_key in normalized_key for sensitive_key in _SENSITIVE_CONFIG_KEYS) or (
        normalized_key.startswith("test")
        or "testcase" in normalized_key
        or "testinput" in normalized_key
        or "testoutput" in normalized_key
        or "testsuite" in normalized_key
        or "testvector" in normalized_key
    )


def _candidate_config(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _candidate_config(item)
            for key, item in value.items()
            if not _is_sensitive_config_key(key)
        }
    if isinstance(value, list):
        return [_candidate_config(item) for item in value]
    return value


def _get_published_assignment(
    db: Session,
    sprint_assessment_id: UUID,
) -> tuple[SprintAssessment, Sprint]:
    statement = (
        select(SprintAssessment)
        .options(joinedload(SprintAssessment.sprint))
        .where(SprintAssessment.id == sprint_assessment_id)
    )
    assignment = db.scalar(statement)
    if assignment is None:
        raise LookupError("Assigned assessment not found")
    sprint = assignment.sprint
    if sprint.status != "PUBLISHED":
        raise PermissionError("Assessment is available only after Sprint publication")
    return assignment, sprint


def assign_assessment_to_sprint(
    db: Session,
    sprint: Sprint,
) -> SprintAssessment:
    template = db.scalar(
        select(AssessmentTemplate)
        .where(
            AssessmentTemplate.skill == sprint.assessment_category,
            AssessmentTemplate.difficulty == sprint.difficulty,
            AssessmentTemplate.is_active.is_(True),
        )
        .order_by(AssessmentTemplate.version.desc())
        .with_for_update()
    )
    if template is None:
        raise LookupError(
            "No active assessment template matches "
            "assessment category "
            f"'{sprint.assessment_category}' and difficulty '{sprint.difficulty}'"
        )

    questions = db.scalars(
        select(AssessmentQuestion)
        .where(
            AssessmentQuestion.template_id == template.id,
            AssessmentQuestion.is_active.is_(True),
        )
        .order_by(AssessmentQuestion.position)
    ).all()
    if not questions:
        raise LookupError(
            f"Active assessment template {template.id} has no active questions"
        )

    assignment = SprintAssessment(
        sprint_id=sprint.id,
        template_id=template.id,
        template_version=template.version,
        title=template.title,
        description=template.description,
        duration_minutes=template.duration_minutes,
    )
    db.add(assignment)
    db.flush()

    db.add_all(
        [
            SprintAssessmentQuestion(
                sprint_assessment_id=assignment.id,
                source_question_id=question.id,
                question_type=question.question_type,
                prompt=question.prompt,
                instructions=question.instructions,
                position=question.position,
                points=question.points,
                candidate_config=deepcopy(question.candidate_config),
                grading_config=deepcopy(question.grading_config),
            )
            for question in questions
        ]
    )
    db.flush()
    return assignment


def _completed_scored_attempt_filters():
    return (
        AssessmentAttempt.status == "SUBMITTED",
        AssessmentAttempt.submitted_at.is_not(None),
        AssessmentAttempt.score.is_not(None),
        AssessmentAttempt.max_score.is_not(None),
        AssessmentAttempt.max_score > 0,
    )


def get_completed_scored_attempt_for_application(
    db: Session,
    application_id: UUID,
    sprint_id: UUID,
) -> AssessmentAttempt | None:
    statement = (
        select(AssessmentAttempt)
        .join(
            Application,
            AssessmentAttempt.application_id == Application.id,
        )
        .join(
            SprintAssessment,
            SprintAssessment.id == AssessmentAttempt.sprint_assessment_id,
        )
        .where(
            Application.id == application_id,
            Application.sprint_id == sprint_id,
            SprintAssessment.sprint_id == sprint_id,
            *_completed_scored_attempt_filters(),
        )
    )
    return db.scalar(statement)


def get_sprint_assessment_results(
    db: Session,
    sprint_id: UUID,
    employer_id: UUID,
) -> list[dict[str, Any]]:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    if sprint.employer_id != employer_id:
        raise PermissionError("Only the Sprint's employer can view assessment results")

    statement = (
        select(Application, AssessmentAttempt)
        .join(
            AssessmentAttempt,
            AssessmentAttempt.application_id == Application.id,
        )
        .join(
            SprintAssessment,
            SprintAssessment.id == AssessmentAttempt.sprint_assessment_id,
        )
        .where(
            Application.sprint_id == sprint_id,
            SprintAssessment.sprint_id == sprint_id,
            *_completed_scored_attempt_filters(),
        )
        .order_by(
            (
                AssessmentAttempt.score
                * Decimal("100")
                / AssessmentAttempt.max_score
            ).desc(),
            AssessmentAttempt.submitted_at.asc(),
        )
    )
    results = []
    for application, attempt in db.execute(statement).all():
        percentage = None
        passed = None
        if attempt.score is not None and attempt.max_score is not None:
            max_score = Decimal(attempt.max_score)
            if max_score > 0:
                percentage = Decimal(attempt.score) * Decimal("100") / max_score
                passed = percentage >= PASSING_PERCENTAGE
        results.append(
            {
                "application_id": application.id,
                "attempt_status": attempt.status,
                "score": attempt.score,
                "max_score": attempt.max_score,
                "percentage": percentage,
                "passed": passed,
                "submitted_at": attempt.submitted_at,
            }
        )
    return results


def get_sprint_assessment_lookup(
    db: Session,
    sprint_id: UUID,
    applicant_id: UUID,
) -> dict[str, Any]:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")

    if sprint.status != "PUBLISHED":
        raise PermissionError("Assessment is available only after Sprint publication")

    application = db.scalar(
        select(Application).where(
            Application.sprint_id == sprint_id,
            Application.applicant_id == applicant_id,
        )
    )
    if application is None:
        raise LookupError("Application not found")

    allowed_statuses = {
        ApplicationStatus.APPLIED.value,
        ApplicationStatus.ASSESSMENT_SUBMITTED.value,
    }
    if application.status not in allowed_statuses:
        raise ValueError("Application is not eligible for an assessment")

    assignment = db.scalar(
        select(SprintAssessment).where(
            SprintAssessment.sprint_id == sprint_id
        )
    )
    if assignment is None:
        raise LookupError("Assigned assessment not found")

    return {
        "sprint_assessment_id": assignment.id,
        "sprint_id": sprint.id,
        "title": assignment.title,
        "description": assignment.description,
        "duration_minutes": assignment.duration_minutes,
    }


def get_assigned_assessment(
    db: Session,
    sprint_assessment_id: UUID,
    application_id: UUID,
    applicant_id: UUID,
) -> dict[str, Any]:
    assignment, sprint = _get_published_assignment(db, sprint_assessment_id)
    _get_candidate_application(
        db,
        application_id,
        applicant_id,
        sprint.id,
        allow_submitted=True,
    )
    questions = db.scalars(
        select(SprintAssessmentQuestion)
        .where(SprintAssessmentQuestion.sprint_assessment_id == assignment.id)
        .order_by(SprintAssessmentQuestion.position)
    ).all()
    return {
        "sprint_assessment_id": assignment.id,
        "sprint_id": sprint.id,
        "title": assignment.title,
        "description": assignment.description,
        "duration_minutes": assignment.duration_minutes,
        "deadline": sprint.deadline,
        "questions": [
            {
                "id": question.id,
                "question_type": question.question_type,
                "prompt": question.prompt,
                "instructions": question.instructions,
                "position": question.position,
                "points": question.points,
                "candidate_config": _candidate_config(question.candidate_config),
            }
            for question in questions
        ],
    }


def _get_candidate_application(
    db: Session,
    application_id: UUID,
    applicant_id: UUID,
    sprint_id: UUID,
    *,
    allow_submitted: bool = False,
) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise LookupError("Application not found")
    if application.applicant_id != applicant_id:
        raise PermissionError("Applicants can only access their own application")
    if application.sprint_id != sprint_id:
        raise PermissionError("Application does not belong to this Sprint")
    allowed_statuses = {ApplicationStatus.APPLIED.value}
    if allow_submitted:
        allowed_statuses.add(ApplicationStatus.ASSESSMENT_SUBMITTED.value)
    if application.status not in allowed_statuses:
        raise ValueError("Application is not eligible for an assessment")
    return application


def start_assessment(
    db: Session,
    application_id: UUID,
    sprint_assessment_id: UUID,
    applicant_id: UUID,
) -> AssessmentAttempt:
    assignment, sprint = _get_published_assignment(db, sprint_assessment_id)
    _get_candidate_application(
        db,
        application_id,
        applicant_id,
        sprint.id,
    )
    now = datetime.now(timezone.utc)
    if sprint.deadline <= now:
        raise ValueError("Sprint deadline has passed")

    existing = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.application_id == application_id
        )
    )
    if existing is not None:
        if (
            existing.sprint_assessment_id == assignment.id
            and existing.status == "IN_PROGRESS"
            and existing.expires_at > now
        ):
            return existing
        raise ValueError("An assessment attempt already exists for this application")

    expires_at = min(
        now + timedelta(minutes=assignment.duration_minutes),
        sprint.deadline,
    )
    attempt = AssessmentAttempt(
        application_id=application_id,
        sprint_assessment_id=assignment.id,
        started_at=now,
        expires_at=expires_at,
        status="IN_PROGRESS",
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(
            select(AssessmentAttempt).where(
                AssessmentAttempt.application_id == application_id
            )
        )
        if (
            existing is not None
            and existing.sprint_assessment_id == assignment.id
            and existing.status == "IN_PROGRESS"
            and existing.expires_at > now
        ):
            return existing
        if existing is None:
            raise
        raise ValueError("An assessment attempt already exists for this application")
    db.refresh(attempt)
    return attempt


def _normalize_text(value: Any, *, case_sensitive: bool) -> str:
    normalized = re.sub(r"\s+", " ", str(value)).strip()
    return normalized if case_sensitive else normalized.casefold()


def _matches_numeric(
    actual: Any,
    expected: Any,
    tolerance_value: Any = 0,
) -> bool | None:
    try:
        actual_number = Decimal(str(actual).strip())
        expected_number = Decimal(str(expected).strip())
        tolerance = Decimal(str(tolerance_value))
    except (InvalidOperation, ValueError):
        return None
    if (
        not actual_number.is_finite()
        or not expected_number.is_finite()
        or not tolerance.is_finite()
        or tolerance < 0
    ):
        return None
    return abs(actual_number - expected_number) <= tolerance


def _matches_answer(question: SprintAssessmentQuestion, response: Any) -> bool:
    config = question.grading_config
    question_type = question.question_type.upper()
    accepted_answers = config.get("accepted_answers")
    expected_output = config.get("expected_output")

    if accepted_answers is None:
        if "correct_answer" in config:
            accepted_answers = [config["correct_answer"]]
        elif expected_output is not None:
            accepted_answers = [expected_output]
        else:
            raise ValueError(
                f"Question {question.id} has no supported automatic grading key"
            )
    if not isinstance(accepted_answers, list):
        accepted_answers = [accepted_answers]
    if not accepted_answers:
        raise ValueError(f"Question {question.id} has no accepted answers")

    if question_type == "CODE_OUTPUT":
        expected = expected_output if expected_output is not None else accepted_answers[0]
        numeric_match = _matches_numeric(
            response,
            expected,
            config.get("numeric_tolerance", 0),
        )
        if numeric_match is not None:
            return numeric_match
        return _normalize_text(response, case_sensitive=True) == _normalize_text(
            expected,
            case_sensitive=True,
        )

    return any(
        _normalize_text(response, case_sensitive=False)
        == _normalize_text(expected, case_sensitive=False)
        for expected in accepted_answers
    )


def submit_assessment(
    db: Session,
    attempt_id: UUID,
    submitted_answers: list[tuple[UUID, Any]],
    applicant_id: UUID,
) -> dict[str, Any]:
    attempt = db.scalar(
        select(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.sprint_assessment).joinedload(
                SprintAssessment.sprint
            ),
            selectinload(AssessmentAttempt.answers),
        )
        .where(AssessmentAttempt.id == attempt_id)
        .with_for_update()
    )
    if attempt is None:
        raise LookupError("Assessment attempt not found")
    application = db.get(Application, attempt.application_id)
    if application is None:
        raise LookupError("Application not found")
    if application.applicant_id != applicant_id:
        raise PermissionError("Applicants can only submit their own assessment")
    if application.sprint_id != attempt.sprint_assessment.sprint_id:
        raise PermissionError("Application does not belong to this Sprint")
    if application.status != ApplicationStatus.APPLIED.value:
        raise ValueError("Application is not eligible for assessment submission")
    if attempt.status != "IN_PROGRESS":
        raise ValueError("Assessment attempt is not in progress")

    now = datetime.now(timezone.utc)
    if now >= min(attempt.expires_at, attempt.sprint_assessment.sprint.deadline):
        attempt.status = "EXPIRED"
        attempt.updated_at = now
        db.commit()
        raise ValueError("Assessment time limit has expired")

    sprint = attempt.sprint_assessment.sprint
    questions = list(
        db.scalars(
            select(SprintAssessmentQuestion)
            .where(
                SprintAssessmentQuestion.sprint_assessment_id
                == attempt.sprint_assessment_id
            )
            .order_by(SprintAssessmentQuestion.position)
        ).all()
    )
    question_by_id = {question.id: question for question in questions}
    answer_by_id: dict[UUID, Any] = {}
    for question_id, response in submitted_answers:
        if question_id in answer_by_id:
            raise ValueError("A question may be answered only once per submission")
        if question_id not in question_by_id:
            raise ValueError("Submitted question does not belong to this assessment")
        answer_by_id[question_id] = response

    score = Decimal("0")
    max_score = sum((Decimal(question.points) for question in questions), Decimal("0"))
    answers: list[AssessmentAnswer] = []
    for question in questions:
        response = answer_by_id.get(question.id)
        is_correct = (
            _matches_answer(question, response)
            if response is not None
            else False
        )
        awarded_points = Decimal(question.points) if is_correct else Decimal("0")
        score += awarded_points
        answers.append(
            AssessmentAnswer(
                attempt_id=attempt.id,
                sprint_assessment_question_id=question.id,
                response=response,
                is_correct=is_correct,
                awarded_points=awarded_points,
                answered_at=now,
            )
        )

    percentage = (
        score * Decimal("100") / max_score if max_score > 0 else Decimal("0")
    )
    attempt.status = "SUBMITTED"
    attempt.submitted_at = now
    attempt.score = score
    attempt.max_score = max_score
    attempt.updated_at = now
    application.status = ApplicationStatus.ASSESSMENT_SUBMITTED.value
    db.add_all(answers)
    db.commit()

    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "passed": percentage >= PASSING_PERCENTAGE,
        "submitted_at": now,
    }
