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
        ("Junior Accountant", "Beginner"): (
        "Junior Accountant Beginner Assessment",
        "Basic accounting principles, journal entries, financial transactions, and bookkeeping.",
        [
            _mcq(
                "A business buys office equipment on credit from a supplier for 20,000. Which entry records this purchase?",
                [
                    ("a", "Debit Equipment 20,000, Credit Cash 20,000"),
                    ("b", "Debit Accounts payable 20,000, Credit Equipment 20,000"),
                    ("c", "Debit Equipment 20,000, Credit Accounts payable 20,000"),
                    ("d", "Debit Purchases 20,000, Credit Accounts receivable 20,000"),
                ],
                "c",
            ),
            _mcq(
                "The owner invests an extra 10,000 in cash into the business. What is the effect on the accounting equation?",
                [
                    ("a", "Assets and liabilities both increase by 10,000"),
                    ("b", "Assets increase and equity decreases by 10,000"),
                    ("c", "Only assets increase, with no other effect"),
                    ("d", "Assets and equity both increase by 10,000"),
                ],
                "d",
            ),
            _mcq(
                "Which of these is treated as capital expenditure?",
                [
                    ("a", "Repainting the office as routine maintenance"),
                    ("b", "Paying to install a newly purchased machine so it can be used"),
                    ("c", "The monthly electricity bill"),
                    ("d", "The annual insurance premium"),
                ],
                "b",
            ),
            _mcq(
                "A customer returns damaged goods and the seller reduces the amount the customer owes. Which document does the seller issue?",
                [
                    ("a", "Credit note"),
                    ("b", "Debit note"),
                    ("c", "Purchase order"),
                    ("d", "Delivery note"),
                ],
                "a",
            ),
            _mcq(
                "A business pays 6,000 in January for insurance covering January to December. How much insurance expense belongs to the first three months (January to March)?",
                [
                    ("a", "6,000"),
                    ("b", "3,000"),
                    ("c", "1,500"),
                    ("d", "500"),
                ],
                "c",
            ),
            _mcq(
                "In a ledger account the debit side totals 12,500 and the credit side totals 9,800. What is the balance?",
                [
                    ("a", "Credit balance of 2,700"),
                    ("b", "Debit balance of 22,300"),
                    ("c", "Credit balance of 22,300"),
                    ("d", "Debit balance of 2,700"),
                ],
                "d",
            ),
        ],
    ),

    ("Junior Accountant", "Intermediate"): (
        "Junior Accountant Intermediate Assessment",
        "Bank reconciliation, depreciation, inventory valuation, adjustments, receivables, and accounting errors.",
        [
            _mcq(
                "The cash book balance is 12,400. Bank charges of 100 are not yet in the cash book. On the bank side, cheques issued of 1,800 have not been presented and deposits of 600 have not yet been credited. What should the bank statement balance be?",
                [
                    ("a", "12,300"),
                    ("b", "14,100"),
                    ("c", "11,100"),
                    ("d", "13,500"),
                ],
                "d",
            ),
            _mcq(
                "A machine costing 120,000 with a residual value of 12,000 and a useful life of 6 years is bought on 1 October. Depreciation is straight-line, charged monthly, and the year ends 31 December. What is the depreciation charge for the year?",
                [
                    ("a", "18,000"),
                    ("b", "4,500"),
                    ("c", "9,000"),
                    ("d", "1,500"),
                ],
                "b",
            ),
            _mcq(
                "A business buys 100 units at 10 each on 1 January and 100 units at 12 each on 1 February. It sells 150 units in March. Using FIFO, what is the value of the closing stock?",
                [
                    ("a", "600"),
                    ("b", "500"),
                    ("c", "1,600"),
                    ("d", "550"),
                ],
                "a",
            ),
            _mcq(
                "Net profit before adjustments is 50,000. Rent paid includes 2,000 relating to next year; wages of 3,000 for this year are still owed; 1,000 of interest income received relates to next year. What is the adjusted net profit?",
                [
                    ("a", "50,000"),
                    ("b", "46,000"),
                    ("c", "48,000"),
                    ("d", "52,000"),
                ],
                "c",
            ),
            _mcq(
                "Receivables total 80,000. A debt of 4,000 is written off as irrecoverable, and an allowance of 5% is then made on the remaining receivables (no opening allowance). What is the total charge to profit or loss?",
                [
                    ("a", "3,800"),
                    ("b", "7,800"),
                    ("c", "4,000"),
                    ("d", "8,000"),
                ],
                "b",
            ),
            _mcq(
                "A delivery van bought for 50,000 is wrongly recorded in 'motor expenses'. The trial balance still balances. What type of error is this?",
                [
                    ("a", "Error of omission"),
                    ("b", "Error of commission"),
                    ("c", "Compensating error"),
                    ("d", "Error of principle"),
                ],
                "d",
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
