from uuid import uuid4

from app.models.assessment import AssessmentQuestion, AssessmentTemplate
from scripts import seed_assessments as assessment_seeder


class _Rows:
    def __init__(self, rows: list[object]) -> None:
        self.rows = rows

    def all(self) -> list[object]:
        return self.rows


class _SeedSession:
    def __init__(
        self,
        *,
        templates: list[AssessmentTemplate],
        questions: list[AssessmentQuestion],
        scalar_results: list[AssessmentTemplate | None],
        scalar_rows: list[list[object]],
    ) -> None:
        self.templates = templates
        self.questions = questions
        self.scalar_results = scalar_results
        self.scalar_rows = scalar_rows
        self.pending: list[object] = []

    def scalar(self, _statement: object) -> AssessmentTemplate | None:
        return self.scalar_results.pop(0)

    def scalars(self, _statement: object) -> _Rows:
        return _Rows(self.scalar_rows.pop(0))

    def add(self, instance: object) -> None:
        self.pending.append(instance)

    def flush(self) -> None:
        for instance in self.pending:
            if isinstance(instance, AssessmentTemplate):
                instance.id = instance.id or uuid4()
                self.templates.append(instance)
            elif isinstance(instance, AssessmentQuestion):
                instance.id = instance.id or uuid4()
                self.questions.append(instance)
        self.pending.clear()


def _template(skill: str, difficulty: str, *, active: bool = True) -> AssessmentTemplate:
    template = AssessmentTemplate(
        skill=skill,
        difficulty=difficulty,
        title="Outdated title",
        description="Outdated description",
        version=1,
        duration_minutes=30,
        is_active=active,
    )
    template.id = uuid4()
    return template


def _question(template_id: object, position: int) -> AssessmentQuestion:
    question = AssessmentQuestion(
        template_id=template_id,
        question_type="MCQ",
        prompt="Outdated prompt",
        instructions=None,
        position=position,
        points=1,
        candidate_config={"choices": []},
        grading_config={"accepted_answers": ["old"]},
        is_active=True,
    )
    question.id = uuid4()
    return question


def test_seed_reconciles_replacement_templates_without_losing_legacy_rows(
    monkeypatch,
) -> None:
    replacement_templates = {
        key: definition
        for key, definition in assessment_seeder._TEMPLATES.items()
        if key[0] == "Junior Accountant"
    }
    monkeypatch.setattr(assessment_seeder, "_TEMPLATES", replacement_templates)

    legacy_frontend = _template("Frontend", "Beginner")
    beginner = _template("Junior Accountant", "Beginner")
    existing_question = _question(beginner.id, 1)
    obsolete_question = _question(beginner.id, 7)
    intermediate_questions: list[AssessmentQuestion] = []
    db = _SeedSession(
        templates=[legacy_frontend, beginner],
        questions=[existing_question, obsolete_question],
        scalar_results=[beginner, None, None],
        scalar_rows=[
            [legacy_frontend],
            [existing_question, obsolete_question],
            intermediate_questions,
        ],
    )

    assert assessment_seeder.seed_assessments(db) == (1, 11)
    assert legacy_frontend.is_active is False
    assert beginner.title == "Junior Accountant Beginner Assessment"
    assert existing_question.prompt == replacement_templates[
        ("Junior Accountant", "Beginner")
    ][2][0]["prompt"]
    assert obsolete_question.is_active is False
    assert len([item for item in db.templates if item.skill == "Junior Accountant"]) == 2
    assert len(
        [
            item
            for item in db.questions
            if item.template_id in {
                template.id
                for template in db.templates
                if template.skill == "Junior Accountant"
            }
            and item.is_active
        ]
    ) == 12

    db.scalar_results = [
        beginner,
        next(
            template
            for template in db.templates
            if template.skill == "Junior Accountant"
            and template.difficulty == "Intermediate"
        ),
    ]
    db.scalar_rows = [
        [],
        [question for question in db.questions if question.template_id == beginner.id],
        [
            question
            for question in db.questions
            if question.template_id
            == next(
                template.id
                for template in db.templates
                if template.skill == "Junior Accountant"
                and template.difficulty == "Intermediate"
            )
        ],
    ]

    assert assessment_seeder.seed_assessments(db) == (0, 0)
    assert len([item for item in db.templates if item.skill == "Junior Accountant"]) == 2
    assert legacy_frontend in db.templates
