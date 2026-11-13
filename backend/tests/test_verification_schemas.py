import pytest
from pydantic import ValidationError

from app.schemas.verification import (
    VerificationCreate,
    VerificationReview,
)


def test_contributor_can_request_identity_verification():
    data = VerificationCreate(
        verification_type="IDENTITY",
        evidence_file_id="11111111-1111-1111-1111-111111111111",
    )

    assert data.verification_type == "IDENTITY"


def test_business_verification_type_is_valid():
    data = VerificationCreate(
        verification_type="BUSINESS",
        evidence_file_id="11111111-1111-1111-1111-111111111111",
    )

    assert data.verification_type == "BUSINESS"


def test_invalid_verification_type_is_rejected():
    with pytest.raises(ValidationError):
        VerificationCreate(
            verification_type="CONTACT",
            evidence_file_id="11111111-1111-1111-1111-111111111111",
        )


def test_review_accepts_approved_status():
    data = VerificationReview(status="APPROVED")

    assert data.status == "APPROVED"


def test_review_accepts_rejected_status():
    data = VerificationReview(
        status="REJECTED",
        review_reason="Invalid evidence",
    )

    assert data.status == "REJECTED"


def test_review_rejects_invalid_status():
    with pytest.raises(ValidationError):
        VerificationReview(status="PENDING")