import uuid
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "storage" / "uploads"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

ALLOWED_FILE_TYPES = {
    "application/pdf": {
        "extension": ".pdf",
        "signature": b"%PDF-",
    },
    "image/jpeg": {
        "extension": ".jpg",
        "signature": b"\xff\xd8\xff",
    },
    "image/png": {
        "extension": ".png",
        "signature": b"\x89PNG\r\n\x1a\n",
    },
}


def detect_file_type(content: bytes) -> tuple[str, str]:
    for mime_type, details in ALLOWED_FILE_TYPES.items():
        if content.startswith(details["signature"]):
            return mime_type, details["extension"]

    raise ValueError("Unsupported or invalid file format")

def save_upload(content: bytes, extension: str) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    storage_key = f"{uuid.uuid4()}{extension}"
    file_path = UPLOAD_DIR / storage_key

    file_path.write_bytes(content)

    return storage_key


def get_upload_path(storage_key: str) -> Path:
    filename = Path(storage_key)

    if filename.name != storage_key:
        raise ValueError("Invalid storage key")

    try:
        uuid.UUID(filename.stem)
    except ValueError:
        raise ValueError("Invalid storage key")

    return UPLOAD_DIR / storage_key