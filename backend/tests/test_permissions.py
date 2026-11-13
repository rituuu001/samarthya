import pytest
from fastapi import HTTPException

from app.core.permissions import require_roles
from app.models.user import User, UserRole


def test_employer_is_allowed():
    employer = User(role=UserRole.EMPLOYER)

    checker = require_roles(UserRole.EMPLOYER)

    assert checker(current_user=employer) is employer


def test_contributor_is_rejected():
    contributor = User(role=UserRole.CONTRIBUTOR)

    checker = require_roles(UserRole.EMPLOYER)

    with pytest.raises(HTTPException) as exc:
        checker(current_user=contributor)

    assert exc.value.status_code == 403


def test_admin_is_allowed_when_explicitly_permitted():
    admin = User(role=UserRole.ADMIN)

    checker = require_roles(UserRole.EMPLOYER, UserRole.ADMIN)

    assert checker(current_user=admin) is admin