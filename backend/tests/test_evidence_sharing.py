import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.dependencies import get_current_user
from app.core.token import create_access_token
from app.db.session import SessionLocal, get_db
from app.main import app
from app.models.portfolio_project import PortfolioProject
from app.models.proof_record import ProofRecord
from app.models.sprint import Sprint
from app.models.submission import SprintSubmission
from app.models.application import Application, ApplicationStatus
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentStatus, PaymentType


def _headers(user_id):
    return {
        "Authorization": f"Bearer {create_access_token(str(user_id))}",
    }


@pytest.fixture
def sharing_scenario():
    db = SessionLocal()

    contributor_id = uuid.uuid4()
    other_contributor_id = uuid.uuid4()
    employer_id = uuid.uuid4()
    project_id = uuid.uuid4()
    proof_record_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    users = [
        User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True),
        User(id=other_contributor_id, email=f"{other_contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True),
        User(id=employer_id, email=f"{employer_id}@test.invalid", password_hash="test", role=UserRole.EMPLOYER, is_active=True),
    ]

    project = PortfolioProject(
        id=project_id,
        user_id=contributor_id,
        title="Test Project",
        description="A test project",
        skills_used=["Python"],
        project_url="https://example.test/project",
        file_ids=[],
        is_shared=False,
        created_at=now,
        updated_at=now,
    )

    client = TestClient(app)

    try:
        db.add_all(users)
        db.commit()
        db.add(project)
        db.commit()

        yield SimpleNamespace(
            client=client,
            contributor_id=contributor_id,
            other_contributor_id=other_contributor_id,
            employer_id=employer_id,
            project_id=project_id,
        )
    finally:
        client.close()
        db.rollback()
        db.execute(delete(PortfolioProject).where(PortfolioProject.id == project_id))
        db.execute(delete(User).where(User.id.in_([contributor_id, other_contributor_id, employer_id])))
        db.commit()
        db.close()


def test_new_portfolio_project_defaults_to_private(sharing_scenario):
    response = sharing_scenario.client.post(
        "/portfolio-projects",
        headers=_headers(sharing_scenario.contributor_id),
        json={
            "title": "New Project",
            "description": "A new project",
            "skills_used": ["Python"],
            "project_url": "https://example.test/new",
            "file_ids": [],
        },
    )
    assert response.status_code == 201
    assert response.json()["is_shared"] is False


def test_owner_can_enable_project_sharing(sharing_scenario):
    response = sharing_scenario.client.patch(
        f"/portfolio-projects/{sharing_scenario.project_id}/sharing",
        headers=_headers(sharing_scenario.contributor_id),
        json={"is_shared": True},
    )
    assert response.status_code == 200
    assert response.json()["is_shared"] is True


def test_owner_can_disable_project_sharing(sharing_scenario):
    # Enable first
    sharing_scenario.client.patch(
        f"/portfolio-projects/{sharing_scenario.project_id}/sharing",
        headers=_headers(sharing_scenario.contributor_id),
        json={"is_shared": True},
    )
    # Then disable
    response = sharing_scenario.client.patch(
        f"/portfolio-projects/{sharing_scenario.project_id}/sharing",
        headers=_headers(sharing_scenario.contributor_id),
        json={"is_shared": False},
    )
    assert response.status_code == 200
    assert response.json()["is_shared"] is False


def test_another_user_cannot_change_project_sharing(sharing_scenario):
    response = sharing_scenario.client.patch(
        f"/portfolio-projects/{sharing_scenario.project_id}/sharing",
        headers=_headers(sharing_scenario.other_contributor_id),
        json={"is_shared": True},
    )
    assert response.status_code == 403


def test_non_contributor_cannot_change_project_sharing(sharing_scenario):
    response = sharing_scenario.client.patch(
        f"/portfolio-projects/{sharing_scenario.project_id}/sharing",
        headers=_headers(sharing_scenario.employer_id),
        json={"is_shared": True},
    )
    assert response.status_code == 403


def test_new_proof_record_defaults_to_private():
    """ProofRecords created via approve_submission default to private."""
    # This is verified by the model default and migration
    # The model has is_shared=False as default
    from app.models.proof_record import ProofRecord

    # Check the column default
    assert ProofRecord.is_shared.default.arg is False or ProofRecord.is_shared.default is False


def test_proof_record_owner_can_enable_sharing():
    db = SessionLocal()
    try:
        contributor_id = uuid.uuid4()
        user = User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        db.add(user)
        db.commit()

        proof_record = ProofRecord(
            id=uuid.uuid4(),
            owner_id=contributor_id,
            sprint_id=uuid.uuid4(),
            submission_id=uuid.uuid4(),
            title="Test Proof",
            description="A test proof",
            skills_demonstrated=["Python"],
            verified_at=datetime.now(timezone.utc),
            is_shared=False,
        )
        db.add(proof_record)
        db.commit()
        proof_record_id = proof_record.id

        # Use dependency override
        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        try:
            with TestClient(app) as client:
                response = client.patch(
                    f"/proof-records/{proof_record_id}/sharing",
                    json={"is_shared": True},
                )
                assert response.status_code == 200
                assert response.json()["is_shared"] is True
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(ProofRecord).where(ProofRecord.owner_id == contributor_id))
        db.execute(delete(User).where(User.id == contributor_id))
        db.commit()
        db.close()


def test_proof_record_another_user_cannot_change_sharing():
    db = SessionLocal()
    try:
        owner_id = uuid.uuid4()
        other_id = uuid.uuid4()
        owner = User(id=owner_id, email=f"{owner_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        other = User(id=other_id, email=f"{other_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        db.add_all([owner, other])
        db.commit()

        proof_record = ProofRecord(
            id=uuid.uuid4(),
            owner_id=owner_id,
            sprint_id=uuid.uuid4(),
            submission_id=uuid.uuid4(),
            title="Test Proof",
            description="A test proof",
            skills_demonstrated=["Python"],
            verified_at=datetime.now(timezone.utc),
            is_shared=False,
        )
        db.add(proof_record)
        db.commit()
        proof_record_id = proof_record.id

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: other
        try:
            with TestClient(app) as client:
                response = client.patch(
                    f"/proof-records/{proof_record_id}/sharing",
                    json={"is_shared": True},
                )
                assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(ProofRecord).where(ProofRecord.owner_id == owner_id))
        db.execute(delete(User).where(User.id.in_([owner_id, other_id])))
        db.commit()
        db.close()

def test_sending_is_shared_on_create_is_rejected():
    db = SessionLocal()
    try:
        contributor_id = uuid.uuid4()
        user = User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        db.add(user)
        db.commit()

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        try:
            with TestClient(app) as client:
                response = client.post(
                    "/portfolio-projects",
                    json={
                        "title": "New Project",
                        "description": "A new project",
                        "skills_used": ["Python"],
                        "project_url": "https://example.test/new",
                        "file_ids": [],
                        "is_shared": True,
                    },
                )
                assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(User).where(User.id == contributor_id))
        db.commit()
        db.close()


def test_editing_shared_project_preserves_is_shared():
    db = SessionLocal()
    try:
        contributor_id = uuid.uuid4()
        user = User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        db.add(user)
        db.commit()

        project = PortfolioProject(
            id=uuid.uuid4(),
            user_id=contributor_id,
            title="Shared Project",
            description="A shared project",
            skills_used=["Python"],
            project_url="https://example.test/shared",
            file_ids=[],
            is_shared=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(project)
        db.commit()
        project_id = project.id

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        try:
            with TestClient(app) as client:
                response = client.put(
                    f"/portfolio-projects/{project_id}",
                    json={
                        "title": "Updated Project",
                        "description": "Updated description",
                        "skills_used": ["Python", "FastAPI"],
                        "project_url": "https://example.test/updated",
                        "file_ids": [],
                    },
                )
                assert response.status_code == 200
                assert response.json()["is_shared"] is True
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(PortfolioProject).where(PortfolioProject.user_id == contributor_id))
        db.execute(delete(User).where(User.id == contributor_id))
        db.commit()
        db.close()


def test_sending_is_shared_on_update_cannot_change_visibility():
    db = SessionLocal()
    try:
        contributor_id = uuid.uuid4()
        user = User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        db.add(user)
        db.commit()

        project = PortfolioProject(
            id=uuid.uuid4(),
            user_id=contributor_id,
            title="Private Project",
            description="A private project",
            skills_used=["Python"],
            project_url="https://example.test/private",
            file_ids=[],
            is_shared=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(project)
        db.commit()
        project_id = project.id

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        try:
            with TestClient(app) as client:
                response = client.put(
                    f"/portfolio-projects/{project_id}",
                    json={
                        "title": "Updated Project",
                        "description": "Updated description",
                        "skills_used": ["Python"],
                        "project_url": "https://example.test/updated",
                        "file_ids": [],
                        "is_shared": True,
                    },
                )
                assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(PortfolioProject).where(PortfolioProject.user_id == contributor_id))
        db.execute(delete(User).where(User.id == contributor_id))
        db.commit()
        db.close()


def test_employer_cannot_access_proof_records_me():
    db = SessionLocal()
    try:
        employer_id = uuid.uuid4()
        employer = User(id=employer_id, email=f"{employer_id}@test.invalid", password_hash="test", role=UserRole.EMPLOYER, is_active=True)
        db.add(employer)
        db.commit()

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: employer
        try:
            with TestClient(app) as client:
                response = client.get("/proof-records/me")
                assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(User).where(User.id == employer_id))
        db.commit()
        db.close()


def test_employer_cannot_change_proof_record_sharing():
    db = SessionLocal()
    try:
        contributor_id = uuid.uuid4()
        employer_id = uuid.uuid4()
        contributor = User(id=contributor_id, email=f"{contributor_id}@test.invalid", password_hash="test", role=UserRole.CONTRIBUTOR, is_active=True)
        employer = User(id=employer_id, email=f"{employer_id}@test.invalid", password_hash="test", role=UserRole.EMPLOYER, is_active=True)
        db.add_all([contributor, employer])
        db.commit()

        proof_record = ProofRecord(
            id=uuid.uuid4(),
            owner_id=contributor_id,
            sprint_id=uuid.uuid4(),
            submission_id=uuid.uuid4(),
            title="Test Proof",
            description="A test proof",
            skills_demonstrated=["Python"],
            verified_at=datetime.now(timezone.utc),
            is_shared=False,
        )
        db.add(proof_record)
        db.commit()
        proof_record_id = proof_record.id

        previous_overrides = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: employer
        try:
            with TestClient(app) as client:
                response = client.patch(
                    f"/proof-records/{proof_record_id}/sharing",
                    json={"is_shared": True},
                )
                assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous_overrides)
    finally:
        db.rollback()
        db.execute(delete(ProofRecord).where(ProofRecord.owner_id == contributor_id))
        db.execute(delete(User).where(User.id.in_([contributor_id, employer_id])))
        db.commit()
        db.close()
