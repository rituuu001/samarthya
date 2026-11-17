import pytest
from pydantic import ValidationError

from app.schemas.profile import UserProfileUpdate


def test_profile_accepts_valid_full_name():
    data = UserProfileUpdate(full_name="Ritu Adhikari")

    assert data.full_name == "Ritu Adhikari"


def test_profile_strips_full_name_whitespace():
    data = UserProfileUpdate(full_name="  Ritu Adhikari  ")

    assert data.full_name == "Ritu Adhikari"


def test_profile_rejects_empty_full_name():
    with pytest.raises(ValidationError):
        UserProfileUpdate(full_name="")


def test_profile_rejects_whitespace_only_full_name():
    with pytest.raises(ValidationError):
        UserProfileUpdate(full_name="   ")


def test_profile_allows_null_optional_fields():
    data = UserProfileUpdate(bio=None)

    assert data.bio is None


def test_profile_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        UserProfileUpdate(email="new@example.com")


def test_profile_allows_partial_updates():
    data = UserProfileUpdate(bio="Computer Engineering student")

    assert data.model_dump(exclude_unset=True) == {
        "bio": "Computer Engineering student"
    }
