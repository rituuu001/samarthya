import io
import uuid
import zipfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.dependencies import get_current_user
from app.db.session import SessionLocal, get_db
from app.main import app
from app.models.file_asset import FileAsset
from app.models.user import User, UserRole


@pytest.fixture
def upload_scenario(monkeypatch):
    db = SessionLocal()
    user = User(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4()}@test.invalid",
        password_hash="test",
        role=UserRole.EMPLOYER,
        is_active=True,
    )
    db.add(user)
    db.commit()

    def fake_save_upload(content, extension):
        return f"{uuid.uuid4()}{extension}"

    monkeypatch.setattr("app.routers.files.save_upload", fake_save_upload)

    def override_current_user():
        return user

    def override_db():
        yield db

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = override_db

    client = TestClient(app)
    try:
        yield client, user, db
    finally:
        client.close()
        db.rollback()
        db.execute(delete(FileAsset).where(FileAsset.uploaded_by == user.id))
        db.commit()
        db.delete(user)
        db.commit()
        db.close()
        app.dependency_overrides.clear()


def make_stored_zip(size: int) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_STORED) as zf:
        zf.writestr("payload.bin", b"x" * size)
    return buf.getvalue()


def make_docx() -> bytes:
    content_types = (
        b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        b'<Default Extension="xml" ContentType="application/xml"/>'
        b'<Override PartName="/word/document.xml" '
        b'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"/>'
        b'</Types>'
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("word/document.xml", b"<document/>")
    return buf.getvalue()


def test_sprint_attachment_accepts_24mb_zip(upload_scenario):
    client, user, _ = upload_scenario
    assert user.role == UserRole.EMPLOYER

    content = make_stored_zip(24 * 1024 * 1024)

    assert 10 * 1024 * 1024 < len(content) <= 25 * 1024 * 1024

    response = client.post(
        "/files/upload",
        data={"purpose": "SPRINT_ATTACHMENT"},
        files={"file": ("payload.zip", content, "application/zip")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["original_filename"] == "payload.zip"
    assert body["mime_type"] == "application/zip"
    assert body["file_size"] == len(content)
    assert body["purpose"] == "SPRINT_ATTACHMENT"


def test_sprint_attachment_rejects_zip_over_25mb(upload_scenario):
    client, _, _ = upload_scenario
    content = make_stored_zip(26 * 1024 * 1024)

    response = client.post(
        "/files/upload",
        data={"purpose": "SPRINT_ATTACHMENT"},
        files={"file": ("payload.zip", content, "application/zip")},
    )

    assert response.status_code == 413


def test_sprint_attachment_rejects_11mb_regular_file(upload_scenario):
    client, _, _ = upload_scenario
    content = b"%PDF-1.7" + b"x" * (11 * 1024 * 1024 - len(b"%PDF-1.7"))

    response = client.post(
        "/files/upload",
        data={"purpose": "SPRINT_ATTACHMENT"},
        files={"file": ("payload.pdf", content, "application/pdf")},
    )

    assert response.status_code == 413


def test_verification_upload_accepts_5mb_pdf(upload_scenario):
    client, _, _ = upload_scenario
    content = b"%PDF-1.7" + b"x" * (5 * 1024 * 1024 - len(b"%PDF-1.7"))

    response = client.post(
        "/files/upload",
        data={"purpose": "IDENTITY_EVIDENCE"},
        files={"file": ("identity.pdf", content, "application/pdf")},
    )

    assert response.status_code == 201


def test_verification_upload_rejects_pdf_over_5mb(upload_scenario):
    client, _, _ = upload_scenario
    content = b"%PDF-1.7" + b"x" * (6 * 1024 * 1024 - len(b"%PDF-1.7"))

    response = client.post(
        "/files/upload",
        data={"purpose": "IDENTITY_EVIDENCE"},
        files={"file": ("identity.pdf", content, "application/pdf")},
    )

    assert response.status_code == 413


def test_contributor_cannot_upload_sprint_attachment(upload_scenario):
    client, _, db = upload_scenario
    contributor = User(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4()}@test.invalid",
        password_hash="test",
        role=UserRole.CONTRIBUTOR,
        is_active=True,
    )
    db.add(contributor)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: contributor

    try:
        content = make_stored_zip(1024)
        response = client.post(
            "/files/upload",
            data={"purpose": "SPRINT_ATTACHMENT"},
            files={"file": ("payload.zip", content, "application/zip")},
        )

        assert response.status_code == 403
        assert response.json()["detail"] == "Only employers can upload Sprint attachment files."
    finally:
        db.delete(contributor)
        db.commit()


@pytest.mark.parametrize(
    ("filename", "content", "mime_type", "expected_mime"),
    [
        (
            "submission.pdf",
            b"%PDF-1.7 submission",
            "application/pdf",
            "application/pdf",
        ),
        (
            "submission.docx",
            make_docx(),
            "application/zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
    ],
)
def test_sprint_submission_accepts_pdf_and_docx(
    upload_scenario,
    filename,
    content,
    mime_type,
    expected_mime,
):
    client, _, db = upload_scenario
    contributor = User(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4()}@test.invalid",
        password_hash="test",
        role=UserRole.CONTRIBUTOR,
        is_active=True,
    )
    db.add(contributor)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: contributor

    try:
        response = client.post(
            "/files/upload",
            data={"purpose": "SPRINT_SUBMISSION"},
            files={"file": (filename, content, mime_type)},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["original_filename"] == filename
        assert body["mime_type"] == expected_mime
        assert body["file_size"] == len(content)
        assert body["purpose"] == "SPRINT_SUBMISSION"
    finally:
        db.delete(contributor)
        db.commit()


@pytest.mark.parametrize("purpose", ["IDENTITY_EVIDENCE", "BUSINESS_EVIDENCE"])
def test_verification_rejects_zip(upload_scenario, purpose):
    client, _, _ = upload_scenario

    response = client.post(
        "/files/upload",
        data={"purpose": purpose},
        files={"file": ("archive.zip", make_stored_zip(1024), "application/zip")},
    )

    assert response.status_code == 415
    assert "not allowed" in response.json()["detail"]


def test_database_persistence_failure_rolls_back_and_removes_file(
    upload_scenario,
    monkeypatch,
    tmp_path,
):
    client, _, db = upload_scenario

    storage_key = f"{uuid.uuid4()}.zip"
    stored_path = tmp_path / storage_key

    def failing_save_upload(content, extension):
        stored_path.write_bytes(content)
        return storage_key

    monkeypatch.setattr("app.routers.files.save_upload", failing_save_upload)
    monkeypatch.setattr(
        "app.routers.files.get_upload_path",
        lambda key: tmp_path / key,
    )

    original_commit = db.commit
    original_rollback = db.rollback
    rollback_calls = 0

    def failing_commit():
        raise RuntimeError("database persistence failure")

    def tracking_rollback():
        nonlocal rollback_calls
        rollback_calls += 1
        original_rollback()

    db.commit = failing_commit
    db.rollback = tracking_rollback

    try:
        with TestClient(app, raise_server_exceptions=False) as failing_client:
            response = failing_client.post(
                "/files/upload",
                data={"purpose": "SPRINT_ATTACHMENT"},
                files={"file": ("payload.zip", make_stored_zip(1024), "application/zip")},
            )

        assert response.status_code == 500
        assert rollback_calls == 1
        assert not stored_path.exists()
    finally:
        db.commit = original_commit
        db.rollback = original_rollback
