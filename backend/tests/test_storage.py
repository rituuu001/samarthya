import pytest

from app.core.storage import detect_file_type, get_upload_path


def test_detect_pdf():
    assert detect_file_type(b"%PDF-1.7 test") == (
        "application/pdf",
        ".pdf",
    )


def test_detect_jpeg():
    assert detect_file_type(b"\xff\xd8\xff test") == (
        "image/jpeg",
        ".jpg",
    )


def test_detect_png():
    assert detect_file_type(b"\x89PNG\r\n\x1a\n test") == (
        "image/png",
        ".png",
    )


def test_reject_unsupported_file():
    with pytest.raises(ValueError):
        detect_file_type(b"not a valid document")


def test_reject_path_traversal():
    with pytest.raises(ValueError):
        get_upload_path("../../.env")