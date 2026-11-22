from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.assessment import (
    AssessmentAnswer,
    AssessmentAttempt,
    SprintAssessmentQuestion,
)
from app.models.connection_request import (
    ConnectionRequest,
    ConnectionRequestStatus,
)
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.portfolio_project import PortfolioProject
from app.models.proof_record import ProofRecord
from app.models.sprint import Sprint
from app.models.submission import SprintSubmission, SubmissionStatus
from app.models.user import User, UserRole
from app.models.user_profile import UserProfile
from app.services.assessment_service import assign_assessment_to_sprint
from scripts.seed_assessments import seed_assessments


DEMO_PASSWORD = "Samarthya-Demo-2026!"
EMPLOYER_EMAIL = "employer@demo.samarthya.local"
PRIMARY_CONTRIBUTOR_EMAIL = "candidate@demo.samarthya.local"
SECOND_CONTRIBUTOR_EMAIL = "jordan.lee@demo.samarthya.local"


def _new_user(
    email: str,
    role: UserRole,
    now: datetime,
) -> User:
    return User(
        id=uuid4(),
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def _new_sprint(
    *,
    employer_id: UUID,
    title: str,
    description: str,
    assessment_category: str,
    skill_category: list[str],
    difficulty: str,
    task_type: str,
    budget: Decimal,
    status: str,
    created_at: datetime,
    application_deadline: datetime,
    deadline: datetime,
) -> Sprint:
    return Sprint(
        id=uuid4(),
        employer_id=employer_id,
        title=title,
        description=description,
        assessment_category=assessment_category,
        skill_category=skill_category,
        difficulty=difficulty,
        task_type=task_type,
        budget=budget,
        currency="NPR",
        number_of_positions=1,
        revision_limit=1,
        status=status,
        created_at=created_at,
        updated_at=created_at,
        application_deadline=application_deadline,
        deadline=deadline,
    )


def _held_deposit(sprint: Sprint, employer_id: UUID, created_at: datetime) -> Payment:
    return Payment(
        id=uuid4(),
        sprint_id=sprint.id,
        application_id=None,
        payer_id=employer_id,
        payee_id=None,
        amount=Decimal(sprint.budget),
        currency=sprint.currency,
        payment_type=PaymentType.DEPOSIT.value,
        status=PaymentStatus.HELD.value,
        is_simulated=True,
        transaction_reference=None,
        payment_method="bank",
        source_identifier="demo-employer-funding-source",
        created_at=created_at,
        completed_at=None,
    )


def _accepted_response(question: SprintAssessmentQuestion) -> Any:
    grading_config = question.grading_config
    accepted_answers = grading_config.get("accepted_answers")
    if accepted_answers is None:
        if "correct_answer" in grading_config:
            accepted_answers = [grading_config["correct_answer"]]
        elif "expected_output" in grading_config:
            accepted_answers = [grading_config["expected_output"]]
        else:
            raise ValueError(
                f"Assessment question {question.id} has no automatic answer"
            )
    if not isinstance(accepted_answers, list):
        return accepted_answers
    if not accepted_answers:
        raise ValueError(
            f"Assessment question {question.id} has no accepted answers"
        )
    return accepted_answers[0]


def _new_submitted_attempt(
    db: Session,
    *,
    application: Application,
    sprint_assessment_id: UUID,
    questions: list[SprintAssessmentQuestion],
    started_at: datetime,
    missed_positions: set[int],
) -> list[AssessmentAnswer]:
    attempt_id = uuid4()
    expires_at = started_at + timedelta(minutes=30)
    submitted_at = started_at + timedelta(minutes=25)
    score = Decimal("0")
    max_score = Decimal("0")
    answer_rows: list[AssessmentAnswer] = []

    for index, question in enumerate(questions):
        points = Decimal(str(question.points))
        max_score += points
        is_correct = index not in missed_positions
        response = _accepted_response(question) if is_correct else None
        awarded_points = points if is_correct else Decimal("0")
        score += awarded_points
        answer_rows.append(
            AssessmentAnswer(
                id=uuid4(),
                attempt_id=attempt_id,
                sprint_assessment_question_id=question.id,
                response=response,
                is_correct=is_correct,
                awarded_points=awarded_points,
                answered_at=submitted_at,
                created_at=submitted_at,
                updated_at=submitted_at,
            )
        )

    attempt = AssessmentAttempt(
        id=attempt_id,
        application_id=application.id,
        sprint_assessment_id=sprint_assessment_id,
        status="SUBMITTED",
        started_at=started_at,
        expires_at=expires_at,
        submitted_at=submitted_at,
        score=score,
        max_score=max_score,
        created_at=started_at,
        updated_at=submitted_at,
    )
    db.add(attempt)
    db.add_all(answer_rows)
    return answer_rows


def _seed_demo(db: Session) -> tuple[int, int, int]:
    demo_emails = (
        EMPLOYER_EMAIL,
        PRIMARY_CONTRIBUTOR_EMAIL,
        SECOND_CONTRIBUTOR_EMAIL,
    )
    existing_emails = set(
        db.scalars(select(User.email).where(User.email.in_(demo_emails))).all()
    )
    if existing_emails:
        raise RuntimeError(
            "Demo accounts already exist: " + ", ".join(sorted(existing_emails))
        )

    now = datetime.now(timezone.utc)
    employer = _new_user(
        EMPLOYER_EMAIL,
        UserRole.EMPLOYER,
        now - timedelta(days=30),
    )
    primary_contributor = _new_user(
        PRIMARY_CONTRIBUTOR_EMAIL,
        UserRole.CONTRIBUTOR,
        now - timedelta(days=45),
    )
    second_contributor = _new_user(
        SECOND_CONTRIBUTOR_EMAIL,
        UserRole.CONTRIBUTOR,
        now - timedelta(days=35),
    )

    employer_profile = UserProfile(
        id=uuid4(),
        user_id=employer.id,
        full_name="Maya Sharma",
        bio="Talent lead at a product studio building practical tools for local businesses.",
        location="Kathmandu, Nepal",
        skills=["Product design", "Hiring", "Project management"],
        education=[
            {
                "institution": "Tribhuvan University",
                "qualification": "BBA",
                "year": 2016,
            }
        ],
        organization_name="Himalayan Product Studio",
        website="https://himalayan-product.example",
        position="Talent Lead",
        organization_type="Company",
        organization_size="11–50",
        phone_number="+9779800000101",
        created_at=now - timedelta(days=30),
        updated_at=now,
    )
    primary_profile = UserProfile(
        id=uuid4(),
        user_id=primary_contributor.id,
        full_name="Aarav Koirala",
        bio=(
            "Full-stack developer and API specialist. I build accessible, "
            "reliable web products and enjoy turning rough workflows into "
            "clear tools for small teams."
        ),
        location="Lalitpur, Nepal",
        skills=["Python", "FastAPI", "PostgreSQL", "React", "Accessibility"],
        education=[
            {
                "institution": "Pulchowk Campus",
                "qualification": "B.E. Computer Engineering",
                "year": 2022,
            }
        ],
        website="https://aarav-portfolio.example",
        phone_number="+9779800000202",
        created_at=now - timedelta(days=45),
        updated_at=now,
    )
    second_profile = UserProfile(
        id=uuid4(),
        user_id=second_contributor.id,
        full_name="Jordan Lee",
        bio=(
            "Frontend developer focused on thoughtful interactions, "
            "responsive layouts, and accessible interfaces."
        ),
        location="Pokhara, Nepal",
        skills=["TypeScript", "React", "CSS", "Accessibility"],
        education=[
            {
                "institution": "Pokhara University",
                "qualification": "BSc Computing",
                "year": 2023,
            }
        ],
        website="https://jordan-lee-portfolio.example",
        phone_number="+9779800000303",
        created_at=now - timedelta(days=35),
        updated_at=now,
    )

    db.add_all(
        [
            employer,
            primary_contributor,
            second_contributor,
            employer_profile,
            primary_profile,
            second_profile,
        ]
    )
    db.flush()

    primary_sprint = _new_sprint(
        employer_id=employer.id,
        title="Build a Stock Tracking API",
        description=(
            "Create a small REST API for tracking inventory changes, "
            "including validation, useful error responses, and a concise README."
        ),
        assessment_category="Python",
        skill_category=["Python", "FastAPI", "PostgreSQL"],
        difficulty="Beginner",
        task_type="Backend Development",
        budget=Decimal("48000.00"),
        status="PUBLISHED",
        created_at=now - timedelta(days=24),
        application_deadline=now + timedelta(days=18),
        deadline=now + timedelta(days=32),
    )
    second_sprint = _new_sprint(
        employer_id=employer.id,
        title="Improve the Onboarding Experience",
        description=(
            "Refine a responsive onboarding flow with accessible form states, "
            "clear validation, and reusable React components."
        ),
        assessment_category="Frontend",
        skill_category=["React", "TypeScript", "Accessibility"],
        difficulty="Intermediate",
        task_type="Frontend Development",
        budget=Decimal("62000.00"),
        status="PUBLISHED",
        created_at=now - timedelta(days=12),
        application_deadline=now + timedelta(days=24),
        deadline=now + timedelta(days=38),
    )
    draft_sprint = _new_sprint(
        employer_id=employer.id,
        title="Design a Community Insights Dashboard",
        description=(
            "Draft a visual direction for a dashboard that helps community "
            "organizations understand participation trends."
        ),
        assessment_category="Graphic Design",
        skill_category=["Visual design", "Data visualization", "Figma"],
        difficulty="Beginner",
        task_type="Graphic Design",
        budget=Decimal("35000.00"),
        status="DRAFT",
        created_at=now - timedelta(days=2),
        application_deadline=now + timedelta(days=28),
        deadline=now + timedelta(days=42),
    )
    sprints = [primary_sprint, second_sprint, draft_sprint]
    db.add_all(sprints)
    db.flush()

    templates_created, questions_created = seed_assessments(db)
    sprint_assessment = assign_assessment_to_sprint(db, primary_sprint)
    assessment_created_at = now - timedelta(days=20)
    sprint_assessment.created_at = assessment_created_at
    assessment_questions = list(
        db.scalars(
            select(SprintAssessmentQuestion)
            .where(
                SprintAssessmentQuestion.sprint_assessment_id
                == sprint_assessment.id
            )
            .order_by(SprintAssessmentQuestion.position)
        ).all()
    )
    for question in assessment_questions:
        question.created_at = assessment_created_at

    primary_application = Application(
        id=uuid4(),
        sprint_id=primary_sprint.id,
        applicant_id=primary_contributor.id,
        status=ApplicationStatus.SELECTED.value,
        applied_at=now - timedelta(days=19),
        updated_at=now - timedelta(days=2),
    )
    second_application = Application(
        id=uuid4(),
        sprint_id=primary_sprint.id,
        applicant_id=second_contributor.id,
        status=ApplicationStatus.ASSESSMENT_SUBMITTED.value,
        applied_at=now - timedelta(days=18),
        updated_at=now - timedelta(days=17, minutes=5),
    )
    db.add_all([primary_application, second_application])
    db.flush()

    answer_rows = _new_submitted_attempt(
        db,
        application=primary_application,
        sprint_assessment_id=sprint_assessment.id,
        questions=assessment_questions,
        started_at=now - timedelta(days=18, minutes=30),
        missed_positions={4},
    )
    answer_rows.extend(
        _new_submitted_attempt(
            db,
            application=second_application,
            sprint_assessment_id=sprint_assessment.id,
            questions=assessment_questions,
            started_at=now - timedelta(days=17, minutes=30),
            missed_positions={1, 3},
        )
    )

    submission_time = now - timedelta(days=4)
    approval_time = now - timedelta(days=2)
    submission = SprintSubmission(
        id=uuid4(),
        application_id=primary_application.id,
        description=(
            "Implemented inventory endpoints, input validation, and tests. "
            "The README includes setup steps and example requests."
        ),
        file_ids=[],
        current_revision_number=0,
        status=SubmissionStatus.APPROVED.value,
        submitted_at=submission_time,
        reviewed_at=approval_time,
        approved_at=approval_time,
        functionality_score=5,
        code_quality_score=5,
        completeness_score=4,
        timeliness_score=5,
        created_at=submission_time,
    )
    db.add(submission)

    payout = Payment(
        id=uuid4(),
        sprint_id=primary_sprint.id,
        application_id=primary_application.id,
        payer_id=employer.id,
        payee_id=primary_contributor.id,
        amount=Decimal(primary_sprint.budget),
        currency=primary_sprint.currency,
        payment_type=PaymentType.PAYOUT.value,
        status=PaymentStatus.RELEASED.value,
        is_simulated=True,
        transaction_reference=f"DEMO-PAYOUT-{uuid4().hex.upper()}",
        payment_method="bank",
        source_identifier="demo-employer-funding-source",
        created_at=now - timedelta(days=24),
        completed_at=approval_time,
    )
    second_sprint_deposit = _held_deposit(
        second_sprint,
        employer.id,
        now - timedelta(days=12),
    )
    db.add_all([payout, second_sprint_deposit])

    proof_record = ProofRecord(
        id=uuid4(),
        owner_id=primary_contributor.id,
        sprint_id=primary_sprint.id,
        submission_id=submission.id,
        title=primary_sprint.title,
        description=(
            "Verified delivery of the inventory API, validation, and setup documentation."
        ),
        skills_demonstrated=primary_sprint.skill_category,
        is_shared=True,
        verified_at=approval_time,
        created_at=approval_time,
    )
    accepted_request_time = now - timedelta(days=1, hours=12)
    accepted_request = ConnectionRequest(
        id=uuid4(),
        application_id=primary_application.id,
        status=ConnectionRequestStatus.ACCEPTED.value,
        created_at=now - timedelta(days=2),
        updated_at=accepted_request_time,
        responded_at=accepted_request_time,
    )
    pending_request_time = now - timedelta(days=1)
    pending_request = ConnectionRequest(
        id=uuid4(),
        application_id=second_application.id,
        status=ConnectionRequestStatus.PENDING.value,
        created_at=pending_request_time,
        updated_at=pending_request_time,
        responded_at=None,
    )
    portfolio_project = PortfolioProject(
        id=uuid4(),
        user_id=primary_contributor.id,
        title="Local Market Inventory Planner",
        description=(
            "A compact inventory planning tool with a FastAPI backend and "
            "React dashboard for tracking stock changes."
        ),
        skills_used=["Python", "FastAPI", "PostgreSQL", "React"],
        project_url="https://aarav-portfolio.example/inventory-planner",
        file_ids=[],
        is_shared=True,
        created_at=now - timedelta(days=40),
        updated_at=now - timedelta(days=10),
    )
    db.add_all(
        [
            proof_record,
            accepted_request,
            pending_request,
            portfolio_project,
        ]
    )

    return templates_created, questions_created, len(answer_rows)


def main() -> None:
    db: Session = SessionLocal()
    try:
        templates_created, questions_created, answer_count = _seed_demo(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(
        "Demo seed committed: 3 users, 3 profiles, 3 sprints "
        "(2 published, 1 draft), 2 applications, 1 sprint assessment, "
        f"{questions_created} template questions, 2 submitted attempts, "
        f"{answer_count} answers, 3 payments, 1 approved submission, "
        "1 proof record, 2 connection requests, and 1 portfolio project."
    )
    print(f"Assessment templates created: {templates_created}")
    print(f"Employer login: {EMPLOYER_EMAIL}")
    print(f"Contributor logins: {PRIMARY_CONTRIBUTOR_EMAIL}, {SECOND_CONTRIBUTOR_EMAIL}")
    print(f"Demo password for all accounts: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
