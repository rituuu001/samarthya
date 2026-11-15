from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentQuestion, AssessmentTemplate


_QUESTION_TYPES = (
    "CONCEPT",
    "MCQ",
    "CODE_OUTPUT",
    "DEBUGGING",
    "SHORT_ANSWER",
    "PRACTICAL",
)


def _mcq(prompt: str, choices: list[tuple[str, str]], correct: str) -> dict[str, Any]:
    return {
        "question_type": "MCQ",
        "prompt": prompt,
        "candidate_config": {
            "choices": [{"id": choice_id, "text": text} for choice_id, text in choices]
        },
        "grading_config": {"accepted_answers": [correct]},
    }


def _short(
    question_type: str,
    prompt: str,
    accepted: list[str],
    *,
    instructions: str | None = None,
    candidate_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "question_type": question_type,
        "prompt": prompt,
        "instructions": instructions,
        "candidate_config": candidate_config or {},
        "grading_config": {"accepted_answers": accepted},
    }


def _code(prompt: str, expected: str, *, instructions: str | None = None) -> dict[str, Any]:
    return {
        "question_type": "CODE_OUTPUT",
        "prompt": prompt,
        "instructions": instructions,
        "candidate_config": {},
        "grading_config": {"expected_output": expected},
    }


_TEMPLATES: dict[tuple[str, str], tuple[str, str, list[dict[str, Any]]]] = {
    ("Python", "Beginner"): (
        "Python Beginner Assessment",
        "Foundational Python syntax, data structures, and debugging.",
        [
            _short("CONCEPT", "Which Python value represents the absence of a value?", ["None"]),
            _mcq(
                "Which collection preserves insertion order and allows duplicate values?",
                [("a", "set"), ("b", "list"), ("c", "dict keys"), ("d", "frozenset")],
                "b",
            ),
            _code("What is printed by `print(len('samarthya'))`?", "9"),
            _short(
                "DEBUGGING",
                "Correct the expression so it tests whether `count` is at least 3.",
                ["count >= 3"],
                instructions="Return only the corrected Python expression.",
                candidate_config={"starter_expression": "count => 3"},
            ),
            _short(
                "SHORT_ANSWER",
                "Name the keyword used to define a function in Python.",
                ["def"],
            ),
            _short(
                "PRACTICAL",
                "A function should return the square of its input. Give the return expression for input variable `number`.",
                ["number ** 2", "number * number"],
                instructions="Return only the Python expression.",
            ),
        ],
    ),
    ("Python", "Intermediate"): (
        "Python Intermediate Assessment",
        "Intermediate Python behavior, iteration, exceptions, and practical code.",
        [
            _short(
                "CONCEPT",
                "What does a Python generator yield to its caller?",
                ["one value at a time", "values one at a time"],
            ),
            _mcq(
                "Which statement about a `finally` block is correct?",
                [
                    ("a", "It runs only when an exception is raised."),
                    ("b", "It normally runs whether or not an exception is raised."),
                    ("c", "It catches all exceptions."),
                    ("d", "It can be used only with `except` and never `try`."),
                ],
                "b",
            ),
            _code(
                "What is printed by `print(sum(x * x for x in range(1, 4)))`?",
                "14",
            ),
            _short(
                "DEBUGGING",
                "Fix the comprehension so `evens` contains the even values from `values`.",
                ["[value for value in values if value % 2 == 0]"],
                instructions="Return the complete corrected list comprehension.",
                candidate_config={"starter_code": "[value for value in values if value / 2 == 0]"},
            ),
            _short(
                "SHORT_ANSWER",
                "Which standard-library module provides `defaultdict`?",
                ["collections"],
            ),
            _short(
                "PRACTICAL",
                "Give a stable one-line expression that removes duplicates from `items` while preserving their original order.",
                ["list(dict.fromkeys(items))"],
                instructions="Return only the Python expression.",
            ),
        ],
    ),
    ("Frontend", "Beginner"): (
        "Frontend Beginner Assessment",
        "Core HTML, CSS, JavaScript, and browser fundamentals.",
        [
            _short(
                "CONCEPT",
                "Which HTML element is intended for the main, unique content of a page?",
                ["main", "<main>"],
            ),
            _mcq(
                "Which CSS property changes the text color?",
                [("a", "font-style"), ("b", "color"), ("c", "background"), ("d", "text-size")],
                "b",
            ),
            _code("What is the result of `console.log(2 + '3')` in JavaScript?", "23"),
            _short(
                "DEBUGGING",
                "Fix this JavaScript condition so it checks whether `age` is at least 18.",
                ["age >= 18"],
                instructions="Return only the corrected condition.",
                candidate_config={"starter_expression": "age => 18"},
            ),
            _short(
                "SHORT_ANSWER",
                "Which HTML attribute connects a label to an input element's id?",
                ["for"],
            ),
            _short(
                "PRACTICAL",
                "Give the CSS declaration that centers flex items on the main axis.",
                ["justify-content: center"],
                instructions="Return one CSS declaration.",
            ),
        ],
    ),
    ("Frontend", "Intermediate"): (
        "Frontend Intermediate Assessment",
        "Intermediate JavaScript, accessibility, CSS layout, and browser behavior.",
        [
            _short(
                "CONCEPT",
                "What does `event.preventDefault()` prevent in a browser event handler?",
                ["the default browser action", "default browser behavior"],
            ),
            _mcq(
                "Which React hook is intended for synchronizing a component with an external system?",
                [
                    ("a", "useMemo"),
                    ("b", "useEffect"),
                    ("c", "useId"),
                    ("d", "useRef"),
                ],
                "b",
            ),
            _code(
                "What is printed by `console.log([1, 2, 3].filter((n) => n > 1).length)`?",
                "2",
            ),
            _short(
                "DEBUGGING",
                "Correct this JavaScript comparison so it checks both value and type equality.",
                ["value === expected"],
                instructions="Return only the corrected comparison.",
                candidate_config={"starter_expression": "value = expected"},
            ),
            _short(
                "SHORT_ANSWER",
                "Which ARIA attribute gives an icon-only button its accessible name?",
                ["aria-label"],
            ),
            _short(
                "PRACTICAL",
                "Give the CSS declaration that creates a two-column grid with equal-width columns.",
                ["grid-template-columns: repeat(2, 1fr)"],
                instructions="Return one CSS declaration.",
            ),
        ],
    ),
    ("Graphic Design", "Beginner"): (
        "Graphic Design Beginner Assessment",
        "Foundational color, typography, hierarchy, and accessible layout principles.",
        [
            _short(
                "CONCEPT",
                "What is the design term for the visual difference that makes an element stand out?",
                ["contrast"],
            ),
            _mcq(
                "Which color model is primarily used for screens?",
                [("a", "CMYK"), ("b", "RGB"), ("c", "Pantone"), ("d", "Grayscale")],
                "b",
            ),
            _code(
                "A design token stores spacing as 8px. What is the computed value in pixels for `8px + 8px`?",
                "16",
            ),
            _short(
                "DEBUGGING",
                "A small text label is difficult to read on a light-gray background. Name the visual property to increase between text and background.",
                ["contrast"],
            ),
            _short(
                "SHORT_ANSWER",
                "What is the term for arranging elements to guide attention by importance?",
                ["visual hierarchy", "hierarchy"],
            ),
            _short(
                "PRACTICAL",
                "For a 320px-wide mobile artboard with 16px margins on both sides, state the remaining content width in pixels.",
                ["288", "288px"],
                instructions="Return the width only.",
            ),
        ],
    ),
    ("Graphic Design", "Intermediate"): (
        "Graphic Design Intermediate Assessment",
        "Intermediate visual systems, responsive layout, typography, and accessibility.",
        [
            _short(
                "CONCEPT",
                "In typography, what is the term for adjusting the space between a specific pair of letters?",
                ["kerning"],
            ),
            _mcq(
                "Which WCAG contrast ratio is the minimum for normal-sized text at AA level?",
                [("a", "2:1"), ("b", "3:1"), ("c", "4.5:1"), ("d", "7:1")],
                "c",
            ),
            _code(
                "A 12-column grid has a 24px gutter. What is the combined gutter width across the 11 gaps, in pixels?",
                "264",
            ),
            _short(
                "DEBUGGING",
                "A layout feels unbalanced because a secondary action competes with the primary action. Name the design principle to correct.",
                ["visual hierarchy", "hierarchy"],
            ),
            _short(
                "SHORT_ANSWER",
                "What is the term for a reusable, named set of design decisions such as colors, spacing, and typography?",
                ["design tokens", "design token"],
            ),
            _short(
                "PRACTICAL",
                "A component uses a 16px base spacing unit. Give the pixel value for a 1.5x spacing token.",
                ["24", "24px"],
                instructions="Return the value only.",
            ),
        ],
    ),
}


def seed_assessments(db: Session) -> tuple[int, int]:
    templates_created = 0
    questions_created = 0

    for (skill, difficulty), (title, description, questions) in _TEMPLATES.items():
        template = db.scalar(
            select(AssessmentTemplate).where(
                AssessmentTemplate.skill == skill,
                AssessmentTemplate.difficulty == difficulty,
                AssessmentTemplate.version == 1,
            )
        )
        if template is None:
            active_template = db.scalar(
                select(AssessmentTemplate).where(
                    AssessmentTemplate.skill == skill,
                    AssessmentTemplate.difficulty == difficulty,
                    AssessmentTemplate.is_active.is_(True),
                )
            )
            if active_template is not None:
                continue
            template = AssessmentTemplate(
                skill=skill,
                difficulty=difficulty,
                title=title,
                description=description,
                version=1,
                duration_minutes=30,
                is_active=True,
            )
            db.add(template)
            db.flush()
            templates_created += 1

        existing_positions = set(
            db.scalars(
                select(AssessmentQuestion.position).where(
                    AssessmentQuestion.template_id == template.id
                )
            ).all()
        )
        for position, question_data in enumerate(questions, start=1):
            if position in existing_positions:
                continue
            if question_data["question_type"] not in _QUESTION_TYPES:
                raise ValueError(
                    f"Unsupported assessment question type: "
                    f"{question_data['question_type']}"
                )
            db.add(
                AssessmentQuestion(
                    template_id=template.id,
                    position=position,
                    points=1,
                    is_active=True,
                    **question_data,
                )
            )
            questions_created += 1

    db.flush()
    return templates_created, questions_created


def main() -> None:
    from app.db.session import SessionLocal

    with SessionLocal.begin() as db:
        templates_created, questions_created = seed_assessments(db)
    print(
        f"Seed complete: {templates_created} templates and "
        f"{questions_created} questions created."
    )


if __name__ == "__main__":
    main()
