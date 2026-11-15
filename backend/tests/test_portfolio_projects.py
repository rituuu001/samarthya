import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.token import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.portfolio_project import PortfolioProject
from app.models.user import User, UserRole


@pytest.fixture
def scenario():
    db = SessionLocal()
    contributor_id = uuid.uuid4()
    other_contributor_id = uuid.uuid4()
    employer_id = uuid.uuid4()
    project_ids = [uuid.uuid4(), uuid.uuid4()]
    now = datetime.now(timezone.utc)
    users = [
        User(
            id=user_id,
            email=f"{user_id}@test.invalid",
            password_hash="test",
            role=role,
        )
        for user_id, role in (
            (contributor_id, UserRole.CONTRIBUTOR),
            (other_contributor_id, UserRole.CONTRIBUTOR),
            (employer_id, UserRole.EMPLOYER),
        )
    ]
    projects = [
        PortfolioProject(
            id=project_ids[0],
            user_id=contributor_id,
            title="Contributor One Project",
            description="First contributor's work",
            skills_used=["Python", "FastAPI"],
            project_url="https://example.test/one",
            file_ids=["file-one"],
            created_at=now,
            updated_at=now,
        ),
        PortfolioProject(
            id=project_ids[1],
            user_id=other_contributor_id,
            title="Contributor Two Project",
            description="Second contributor's work",
            skills_used=["TypeScript"],
            project_url="https://example.test/two",
            file_ids=["file-two"],
            created_at=now,
            updated_at=now,
        ),
    ]
    client = TestClient(app)

    try:
        db.add_all(users)
        db.commit()
        db.add_all(projects)
        db.commit()

        yield SimpleNamespace(
            client=client,
            contributor_id=contributor_id,
            other_contributor_id=other_contributor_id,
            employer_id=employer_id,
            project_ids=project_ids,
        )
    finally:
        client.close()
        db.rollback()
        db.execute(
            delete(PortfolioProject).where(
                PortfolioProject.user_id.in_(
                    [contributor_id, other_contributor_id, employer_id]
                )
            )
        )
        db.execute(
            delete(User).where(
                User.id.in_(
                    [contributor_id, other_contributor_id, employer_id]
                )
            )
        )
        db.commit()
        db.close()


def _headers(user_id):
    return {
        "Authorization": f"Bearer {create_access_token(str(user_id))}",
    }


def _project_payload(**overrides):
    payload = {
        "title": "New Portfolio Project",
        "description": "A contributor-owned project",
        "skills_used": ["Python", "PostgreSQL"],
        "project_url": "https://example.test/project",
        "file_ids": ["new-file"],
    }
    payload.update(overrides)
    return payload


def test_contributor_can_create_own_project(scenario):
    response = scenario.client.post(
        "/portfolio-projects",
        headers=_headers(scenario.contributor_id),
        json=_project_payload(),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == str(scenario.contributor_id)
    assert data["title"] == "New Portfolio Project"
    assert data["skills_used"] == ["Python", "PostgreSQL"]


def test_non_contributor_cannot_create_project(scenario):
    response = scenario.client.post(
        "/portfolio-projects",
        headers=_headers(scenario.employer_id),
        json=_project_payload(),
    )

    assert response.status_code == 403


def test_contributor_can_retrieve_their_own_projects(scenario):
    response = scenario.client.get(
        "/portfolio-projects/me",
        headers=_headers(scenario.contributor_id),
    )

    assert response.status_code == 200
    projects = response.json()
    assert [project["id"] for project in projects] == [
        str(scenario.project_ids[0])
    ]


def test_public_user_can_retrieve_contributors_projects(scenario):
    response = scenario.client.get(
        f"/users/{scenario.contributor_id}/portfolio-projects"
    )

    assert response.status_code == 200
    projects = response.json()
    assert [project["id"] for project in projects] == [
        str(scenario.project_ids[0])
    ]


def test_public_user_can_retrieve_individual_project(scenario):
    response = scenario.client.get(
        f"/portfolio-projects/{scenario.project_ids[1]}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(scenario.project_ids[1])


def test_contributor_can_update_own_project(scenario):
    response = scenario.client.put(
        f"/portfolio-projects/{scenario.project_ids[0]}",
        headers=_headers(scenario.contributor_id),
        json=_project_payload(title="Updated Project"),
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Project"
    assert response.json()["user_id"] == str(scenario.contributor_id)


def test_contributor_cannot_update_another_contributors_project(scenario):
    response = scenario.client.put(
        f"/portfolio-projects/{scenario.project_ids[1]}",
        headers=_headers(scenario.contributor_id),
        json=_project_payload(title="Unauthorized Update"),
    )

    assert response.status_code == 403


def test_contributor_can_delete_own_project(scenario):
    response = scenario.client.delete(
        f"/portfolio-projects/{scenario.project_ids[0]}",
        headers=_headers(scenario.contributor_id),
    )

    assert response.status_code == 204
    assert scenario.client.get(
        f"/portfolio-projects/{scenario.project_ids[0]}"
    ).status_code == 404


def test_contributor_cannot_delete_another_contributors_project(scenario):
    response = scenario.client.delete(
        f"/portfolio-projects/{scenario.project_ids[1]}",
        headers=_headers(scenario.contributor_id),
    )

    assert response.status_code == 403
    assert scenario.client.get(
        f"/portfolio-projects/{scenario.project_ids[1]}"
    ).status_code == 200


def test_nonexistent_project_returns_not_found(scenario):
    response = scenario.client.get(f"/portfolio-projects/{uuid.uuid4()}")

    assert response.status_code == 404


def test_create_does_not_accept_user_id_from_client(scenario):
    response = scenario.client.post(
        "/portfolio-projects",
        headers=_headers(scenario.contributor_id),
        json=_project_payload(user_id=str(scenario.other_contributor_id)),
    )

    assert response.status_code == 422
