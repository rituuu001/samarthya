import io
import re
import struct
import uuid
import zlib
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import BadZipFile, ZipFile

import olefile


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "storage" / "uploads"

MAX_FILE_SIZE_REGULAR = 10 * 1024 * 1024  # 10 MB
MAX_FILE_SIZE_ZIP = 25 * 1024 * 1024       # 25 MB
VERIFICATION_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

ZIP_MAX_ENTRIES = 1000
ZIP_MAX_UNCOMPRESSED_TOTAL = 100 * 1024 * 1024  # 100 MB
ZIP_MAX_COMPRESSION_RATIO = 100
CONTENT_TYPES_MAX_SIZE = 64 * 1024  # 64 KB

TEXT_SAMPLE_SIZE = 64 * 1024  # 64 KB
MAX_CONTROL_BYTE_RATIO = 0.10  # 10%

PURPOSE_LIMITS = {
    "IDENTITY_EVIDENCE": {
        "allowed_mimes": {
            "application/pdf",
            "image/jpeg",
            "image/png",
        },
        "max_size": VERIFICATION_MAX_FILE_SIZE,
        "allow_zip": False,
    },
    "BUSINESS_EVIDENCE": {
        "allowed_mimes": {
            "application/pdf",
            "image/jpeg",
            "image/png",
        },
        "max_size": VERIFICATION_MAX_FILE_SIZE,
        "allow_zip": False,
    },
    "SPRINT_SUBMISSION": {
        "allowed_mimes": {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "text/plain",
            "image/jpeg",
            "image/png",
            "application/zip",
        },
        "max_size": MAX_FILE_SIZE_REGULAR,
        "max_size_zip": MAX_FILE_SIZE_ZIP,
        "allow_zip": True,
    },
    "SPRINT_ATTACHMENT": {
        "allowed_mimes": {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "text/plain",
            "image/jpeg",
            "image/png",
            "application/zip",
        },
        "max_size": MAX_FILE_SIZE_REGULAR,
        "max_size_zip": MAX_FILE_SIZE_ZIP,
        "allow_zip": True,
    },
}

OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
ZIP_SIGNATURES = (
    b"PK\x03\x04",  # normal local file header
    b"PK\x05\x06",  # empty archive end record
    b"PK\x07\x08",  # spanning archive data descriptor
)

OLE_STREAM_MAP = {
    "worddocument": ("application/msword", ".doc"),
    "workbook": ("application/vnd.ms-excel", ".xls"),
    "powerpoint document": ("application/vnd.ms-powerpoint", ".ppt"),
}

OFFICE_ZIP_PART_MAP = {
    "word/document.xml": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx",
    ),
    "ppt/presentation.xml": (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pptx",
    ),
    "xl/workbook.xml": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
}


def _is_safe_xml(xml_bytes: bytes) -> bool:
    """Reject XML with DTD or entity declarations before parsing."""
    encodings = ("utf-8", "utf-16", "utf-16-le", "utf-16-be")
    for encoding in encodings:
        try:
            text = xml_bytes.decode(encoding, errors="strict")
        except UnicodeDecodeError:
            continue

        if re.search(r"<!DOCTYPE\b", text, re.IGNORECASE):
            return False
        if re.search(r"<!ENTITY\b", text, re.IGNORECASE):
            return False
    return True


def _detect_office_zip(content: bytes) -> tuple[str, str] | None:
    """Detect Office Open XML (DOCX/PPTX/XLSX) from ZIP central directory.

    Only reads [Content_Types].xml; never extracts or reads arbitrary entries.
    """
    namelist: list[str] = []
    try:
        with ZipFile(io.BytesIO(content)) as zf:
            namelist = zf.namelist()
            if "[Content_Types].xml" not in namelist:
                return None

            info = zf.getinfo("[Content_Types].xml")
            if info.file_size > CONTENT_TYPES_MAX_SIZE:
                raise ValueError("[Content_Types].xml exceeds size limit")

            xml_bytes = zf.read("[Content_Types].xml")

    except (KeyError, RuntimeError, NotImplementedError, zlib.error, BadZipFile):
        if "[Content_Types].xml" in namelist:
            raise ValueError("Malformed [Content_Types].xml")
        return None

    if not _is_safe_xml(xml_bytes):
        raise ValueError("Unsafe [Content_Types].xml")

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        raise ValueError("Malformed [Content_Types].xml")

    # Build a set of declared content types from the XML
    declared_types = set()
    for override in root.iter():
        ct = override.get("ContentType")
        if ct:
            declared_types.add(ct)

    for part_name, (mime, ext) in OFFICE_ZIP_PART_MAP.items():
        if part_name in namelist and mime in declared_types:
            return mime, ext

    return None


def _detect_ole(content: bytes) -> tuple[str, str] | None:
    """Detect OLE compound document (DOC/XLS/PPT) using olefile library."""
    if not content.startswith(OLE_SIGNATURE):
        return None

    try:
        ole = olefile.OleFileIO(io.BytesIO(content))
    except Exception:
        return None

    try:
        streams = ole.listdir(streams=True, storages=False)
        for stream_path in streams:
            stream_name = stream_path[-1].lower()
            if stream_name in OLE_STREAM_MAP:
                mime, ext = OLE_STREAM_MAP[stream_name]
                return mime, ext
    finally:
        ole.close()

    # OLE signature valid but no recognized stream
    return None


def _detect_text_format(content: bytes, extension: str | None) -> tuple[str, str] | None:
    """Detect plain text formats (CSV/TXT) — extension-gated, content-proven."""
    if extension not in (".csv", ".txt"):
        return None

    sample = content[:TEXT_SAMPLE_SIZE]

    try:
        text = sample.decode("utf-8")
    except UnicodeDecodeError:
        return None

    # Reject null bytes
    if "\x00" in text:
        return None

    # Reject high control-byte density
    control_count = sum(
        1 for ch in text if ord(ch) < 32 and ch not in "\t\n\r"
    )
    if len(text) > 0 and control_count / len(text) > MAX_CONTROL_BYTE_RATIO:
        return None

    if extension == ".csv":
        return "text/csv", ".csv"
    return "text/plain", ".txt"


def detect_file_type(content: bytes, filename: str | None = None) -> tuple[str, str]:
    """Detect file MIME type and extension from content.

    Uses magic-byte signatures for binary formats and content validation
    for text formats. Extension is used only as a hint for text formats,
    never as proof of a binary format.
    """
    extension = None
    if filename:
        ext_match = re.search(r"\.([^\./]+)$", filename)
        if ext_match:
            extension = "." + ext_match.group(1).lower()

    # 1. ZIP-based formats (Office Open XML and plain ZIP) — validate structure first
    if content.startswith(ZIP_SIGNATURES):
        _validate_zip_structure(content)

        office_result = _detect_office_zip(content)
        if office_result:
            return office_result

        return "application/zip", ".zip"

    # 2. OLE compound document (DOC/XLS/PPT)
    ole_result = _detect_ole(content)
    if ole_result:
        return ole_result

    # 3. Simple magic-byte signatures
    if content.startswith(b"%PDF-"):
        return "application/pdf", ".pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"

    # 4. Text formats (extension-gated)
    text_result = _detect_text_format(content, extension)
    if text_result:
        return text_result

    raise ValueError("Unsupported or invalid file format")


def _validate_zip_structure(content: bytes) -> None:
    """Validate ZIP archive security without extracting.

    Checks: malformed archive, entry count, aggregate uncompressed size,
    compression ratio, path traversal, duplicate entry names.
    """
    try:
        with ZipFile(io.BytesIO(content)) as zf:
            infolist = zf.infolist()

            if len(infolist) > ZIP_MAX_ENTRIES:
                raise ValueError("ZIP archive contains too many entries")

            total_uncompressed = 0
            seen_names: set[str] = set()

            for info in infolist:
                total_uncompressed += info.file_size
                if total_uncompressed > ZIP_MAX_UNCOMPRESSED_TOTAL:
                    raise ValueError("ZIP archive uncompressed size exceeds limit")

                if info.compress_size > 0:
                    ratio = info.file_size / info.compress_size
                    if ratio > ZIP_MAX_COMPRESSION_RATIO:
                        raise ValueError("ZIP archive compression ratio exceeds limit")

                # Path traversal checks on entry name
                raw_name = info.filename
                normalized = raw_name.replace("\\", "/")

                # Absolute path
                if normalized.startswith("/"):
                    raise ValueError("ZIP entry contains absolute path")

                # Windows drive path
                if re.match(r"^[A-Za-z]:", normalized):
                    raise ValueError("ZIP entry contains Windows drive path")

                # Traversal components
                for segment in normalized.split("/"):
                    if segment == "..":
                        raise ValueError("ZIP entry contains path traversal")

                # Duplicate names (canonical separators and components)
                canonical_parts = []
                for segment in normalized.split("/"):
                    if segment in ("", "."):
                        continue
                    canonical_parts.append(segment)
                key = "/".join(canonical_parts).casefold()
                if key in seen_names:
                    raise ValueError("ZIP archive contains duplicate entry names")
                seen_names.add(key)

    except BadZipFile:
        raise ValueError("Malformed ZIP archive")


def max_file_size_for_purpose(purpose: str, mime_type: str) -> int:
    """Return the maximum allowed file size for a given purpose and MIME type."""
    limits = PURPOSE_LIMITS.get(purpose)
    if limits is None:
        raise ValueError(f"Unknown upload purpose: {purpose}")

    if mime_type == "application/zip" and limits.get("allow_zip"):
        return limits["max_size_zip"]

    return limits["max_size"]


def is_mime_allowed_for_purpose(mime_type: str, purpose: str) -> bool:
    """Check whether a MIME type is allowed for a given upload purpose."""
    limits = PURPOSE_LIMITS.get(purpose)
    if limits is None:
        return False

    if mime_type == "application/zip":
        return limits.get("allow_zip", False)

    return mime_type in limits["allowed_mimes"]


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
