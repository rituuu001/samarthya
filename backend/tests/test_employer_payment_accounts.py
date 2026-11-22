import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.dependencies import get_current_user
from app.core.token import create_access_token
from app.db.session import SessionLocal, engine, get_db
from app.main import app
from app.models.employer_payment_account import EmployerPaymentAccount
from app.models.user import User, UserRole


@pytest.fixture(scope="module", autouse=True)
def sqlite_partial_default_index():
    if engine.dialect.name == "sqlite":
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "DROP INDEX IF EXISTS "
                "uq_employer_payment_accounts_default_per_employer"
            )
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX "
                "uq_employer_payment_accounts_default_per_employer "
                "ON employer_payment_accounts (employer_id) "
                "WHERE is_default = 1"
            )
    yield


@pytest.fixture
def payment_account_scenario():
    db = SessionLocal()
    employer_id = uuid.uuid4()
    other_employer_id = uuid.uuid4()
    contributor_id = uuid.uuid4()
    users = [
        User(
            id=user_id,
            email=f"{user_id}@test.invalid",
            password_hash="test",
            role=role,
            is_active=True,
        )
        for user_id, role in (
            (employer_id, UserRole.EMPLOYER),
            (other_employer_id, UserRole.EMPLOYER),
            (contributor_id, UserRole.CONTRIBUTOR),
        )
    ]

    db.add_all(users)
    db.commit()
    try:
        yield SimpleNamespace(
            db=db,
            employer_id=employer_id,
            other_employer_id=other_employer_id,
            contributor_id=contributor_id,
        )
    finally:
        db.rollback()
        db.execute(
            delete(EmployerPaymentAccount).where(
                EmployerPaymentAccount.employer_id.in_(
                    [employer_id, other_employer_id]
                )
            )
        )
        db.execute(
            delete(User).where(
                User.id.in_(
                    [employer_id, other_employer_id, contributor_id]
                )
            )
        )
        db.commit()
        db.close()


def _request_as_user(method, path, user_id, role, db, json=None):
    user = SimpleNamespace(
        id=user_id,
        role=role,
        is_active=True,
    )
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            return client.request(method, path, json=json)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def _account_payload(**overrides):
    payload = {
        "account_type": "esewa",
        "account_identifier": "aarav@example.test",
        "is_default": False,
    }
    payload.update(overrides)
    return payload


def _create_account(scenario, user_id=None, **overrides):
    user_id = user_id or scenario.employer_id
    return _request_as_user(
        "POST",
        "/employer/payment-accounts",
        user_id,
        UserRole.EMPLOYER,
        scenario.db,
        json=_account_payload(**overrides),
    )


def test_first_account_is_default_even_when_false_is_requested(
    payment_account_scenario,
):
    response = _create_account(payment_account_scenario, is_default=False)

    assert response.status_code == 201
    assert response.json()["is_default"] is True


def test_second_non_default_account_preserves_existing_default(
    payment_account_scenario,
):
    scenario = payment_account_scenario
    first = _create_account(scenario)
    second = _create_account(
        scenario,
        account_type="khalti",
        account_identifier="aarav-khalti",
    )
    accounts = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    ).json()

    assert first.status_code == second.status_code == 201
    defaults = {item["id"]: item["is_default"] for item in accounts}
    assert defaults[first.json()["id"]] is True
    assert defaults[second.json()["id"]] is False


def test_creating_default_account_replaces_existing_default(
    payment_account_scenario,
):
    scenario = payment_account_scenario
    first = _create_account(scenario)
    second = _create_account(
        scenario,
        account_type="bank",
        account_identifier="NP00DEMO1234",
        is_default=True,
    )
    accounts = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    ).json()

    assert first.status_code == second.status_code == 201
    defaults = {item["id"]: item["is_default"] for item in accounts}
    assert defaults[first.json()["id"]] is False
    assert defaults[second.json()["id"]] is True


def test_patching_default_replaces_existing_default(payment_account_scenario):
    scenario = payment_account_scenario
    first = _create_account(scenario)
    second = _create_account(scenario, account_identifier="second-account")
    unset_current_default = _request_as_user(
        "PATCH",
        f"/employer/payment-accounts/{first.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
        json={"is_default": False},
    )
    response = _request_as_user(
        "PATCH",
        f"/employer/payment-accounts/{second.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
        json={"is_default": True},
    )
    accounts = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    ).json()
    defaults = {item["id"]: item["is_default"] for item in accounts}

    assert unset_current_default.status_code == 409
    assert response.status_code == 200
    assert defaults[first.json()["id"]] is False
    assert defaults[second.json()["id"]] is True


def test_employer_cannot_list_or_modify_another_employers_account(
    payment_account_scenario,
):
    scenario = payment_account_scenario
    other_account = _create_account(
        scenario,
        user_id=scenario.other_employer_id,
        account_identifier="other-employer-account",
    )

    listed = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    )
    patched = _request_as_user(
        "PATCH",
        f"/employer/payment-accounts/{other_account.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
        json={"account_identifier": "changed"},
    )
    deleted = _request_as_user(
        "DELETE",
        f"/employer/payment-accounts/{other_account.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    )

    assert other_account.status_code == 201
    assert listed.status_code == 200
    assert listed.json() == []
    assert patched.status_code == 404
    assert deleted.status_code == 404


def test_employer_cannot_delete_only_payment_account(payment_account_scenario):
    scenario = payment_account_scenario
    account = _create_account(scenario)
    deleted = _request_as_user(
        "DELETE",
        f"/employer/payment-accounts/{account.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    )

    assert deleted.status_code == 409
    assert "only payment account" in deleted.json()["detail"]
    assert "make it default first" in deleted.json()["detail"]


def test_employer_cannot_unset_only_default_account(payment_account_scenario):
    scenario = payment_account_scenario
    account = _create_account(scenario)
    response = _request_as_user(
        "PATCH",
        f"/employer/payment-accounts/{account.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
        json={"is_default": False},
    )
    accounts = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    ).json()

    assert response.status_code == 409
    assert "another payment account as default" in response.json()["detail"]
    assert len(accounts) == 1
    assert accounts[0]["is_default"] is True


def test_employer_cannot_delete_current_default_account(
    payment_account_scenario,
):
    scenario = payment_account_scenario
    default_account = _create_account(scenario)
    _create_account(scenario, account_identifier="another-account")

    response = _request_as_user(
        "DELETE",
        f"/employer/payment-accounts/{default_account.json()['id']}",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
    )

    assert response.status_code == 409
    assert "another payment account as default" in response.json()["detail"]


def test_non_employer_cannot_access_payment_accounts(payment_account_scenario):
    scenario = payment_account_scenario
    response = _request_as_user(
        "GET",
        "/employer/payment-accounts",
        scenario.contributor_id,
        UserRole.CONTRIBUTOR,
        scenario.db,
    )

    assert response.status_code == 403


def test_client_cannot_supply_employer_id(payment_account_scenario):
    scenario = payment_account_scenario
    response = _request_as_user(
        "POST",
        "/employer/payment-accounts",
        scenario.employer_id,
        UserRole.EMPLOYER,
        scenario.db,
        json=_account_payload(employer_id=str(scenario.other_employer_id)),
    )

    assert response.status_code == 422
    assert scenario.db.query(EmployerPaymentAccount).count() == 0
