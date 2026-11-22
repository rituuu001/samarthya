from pathlib import Path
from typing import Literal
from fastapi.responses import FileResponse
from uuid import UUID
from sqlalchemy import select

from app.models.application import Application
from app.models.submission import SprintSubmission
from app.models.sprint import Sprint
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.storage import (
    detect_file_type,
    is_mime_allowed_for_purpose,
    max_file_size_for_purpose,
    save_upload,
    get_upload_path,
)
from app.db.session import get_db
from app.models.file_asset import FileAsset
from app.models.user import User, UserRole
from app.schemas.file_asset import FileUploadResponse


router = APIRouter(prefix="/files", tags=["Files"])


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    file: UploadFile = File(...),
    purpose: Literal[
        "IDENTITY_EVIDENCE",
        "BUSINESS_EVIDENCE",
        "SPRINT_SUBMISSION",
        "SPRINT_ATTACHMENT",
    ] = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if purpose == "BUSINESS_EVIDENCE" and current_user.role != UserRole.EMPLOYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can upload business evidence",
        )
    if purpose == "SPRINT_SUBMISSION" and current_user.role != UserRole.CONTRIBUTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only contributors can upload Sprint submission files.",
        )
    if purpose == "SPRINT_ATTACHMENT" and current_user.role != UserRole.EMPLOYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can upload Sprint attachment files.",
        )

    storage_key = None

    try:
        max_regular = max_file_size_for_purpose(purpose, "")
        max_zip = max_file_size_for_purpose(purpose, "application/zip")
        read_limit = max(max_regular, max_zip)

        content = await file.read(read_limit + 1)

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        if len(content) > read_limit:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the limit for purpose '{purpose}'",
            )

        try:
            mime_type, extension = detect_file_type(content, filename=file.filename)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported or invalid file format",
            )

        if not is_mime_allowed_for_purpose(mime_type, purpose):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File type '{mime_type}' is not allowed for purpose '{purpose}'",
            )

        purpose_specific_max = max_file_size_for_purpose(purpose, mime_type)
        if len(content) > purpose_specific_max:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the limit for '{mime_type}' under purpose '{purpose}'",
            )

        original_filename = (
            (file.filename or "upload")
            .replace("\\", "/")
            .split("/")[-1]
            .strip()
        )[:255] or "upload"

        storage_key = save_upload(content, extension)

        asset = FileAsset(
            uploaded_by=current_user.id,
            original_filename=original_filename,
            storage_key=storage_key,
            mime_type=mime_type,
            file_size=len(content),
            purpose=purpose,
        )

        db.add(asset)
        db.commit()
        db.refresh(asset)

        return asset

    except Exception:
        db.rollback()

        if storage_key:
            try:
                get_upload_path(storage_key).unlink(missing_ok=True)
            except (ValueError, OSError):
                pass

        raise

    finally:
        await file.close()


@router.get("/{file_id}")
def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.get(FileAsset, file_id)

    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active account required",
        )

    is_uploader = asset.uploaded_by == current_user.id

    is_sprint_employer = False

    if not is_uploader and current_user.role == UserRole.EMPLOYER:
        matching_submission = db.scalar(
            select(SprintSubmission.id)
            .join(
                Application,
                Application.id == SprintSubmission.application_id,
            )
            .join(Sprint, Sprint.id == Application.sprint_id)
            .where(
                SprintSubmission.file_ids.contains([str(file_id)]),
                Sprint.employer_id == current_user.id,
            )
        )
        is_sprint_employer = matching_submission is not None

    is_published_sprint_attachment = False
    if (
        not is_uploader
        and not is_sprint_employer
        and current_user.role == UserRole.CONTRIBUTOR
        and asset.purpose == "SPRINT_ATTACHMENT"
    ):
        matching_sprint = db.scalar(
            select(Sprint.id)
            .where(Sprint.status == "PUBLISHED")
            .where(Sprint.attachment_file_ids.contains([str(file_id)]))
        )
        is_published_sprint_attachment = matching_sprint is not None

    if not is_uploader and not is_sprint_employer and not is_published_sprint_attachment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to access this file",
        )

    file_path = get_upload_path(asset.storage_key)

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored file not found",
        )

    return FileResponse(
        path=file_path,
        media_type=asset.mime_type,
        filename=asset.original_filename,
    )
