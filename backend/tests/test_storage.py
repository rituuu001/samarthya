import io
import os
import struct
import tempfile
import zipfile

import olefile
import pytest

from app.core.storage import (
    detect_file_type,
    get_upload_path,
    is_mime_allowed_for_purpose,
    max_file_size_for_purpose,
    OLE_SIGNATURE,
)

SECTOR_SIZE = 512
FREESECT = 0xFFFFFFFF
ENDOFCHAIN = 0xFFFFFFFE


def make_ole_file(stream_name: str, data: bytes = b"test data") -> bytes:
    """Create a minimal valid OLE compound document with the given stream."""
    stream_name_utf16 = stream_name.encode("utf-16-le")
    name_size = len(stream_name_utf16) + 2  # include null terminator

    # Sector layout:
    # Sector 0: Header
    # Sector 1: FAT
    # Sector 2: Directory
    # Sector 3: Stream data

    # Build header (sector 0)
    header = bytearray(SECTOR_SIZE)
    header[0:8] = OLE_SIGNATURE
    struct.pack_into("<H", header, 24, 0x003E)  # minor version
    struct.pack_into("<H", header, 26, 0x0003)  # CFB version 3
    struct.pack_into("<H", header, 28, 0xFFFE)  # little-endian byte order
    struct.pack_into("<H", header, 30, 9)  # 512-byte sectors
    struct.pack_into("<H", header, 32, 6)  # 64-byte mini sectors
    struct.pack_into("<I", header, 40, 0)  # no directory sectors for v3
    struct.pack_into("<I", header, 44, 1)  # 1 FAT sector
    struct.pack_into("<I", header, 48, 2)  # directory chain starts at sector 2
    struct.pack_into("<I", header, 56, 4096)  # mini-stream cutoff
    struct.pack_into("<I", header, 60, ENDOFCHAIN)  # no mini-FAT sector
    struct.pack_into("<I", header, 64, 0)  # no mini-FAT sectors
    struct.pack_into("<I", header, 68, ENDOFCHAIN)  # no DIFAT sector
    struct.pack_into("<I", header, 72, 0)  # no DIFAT sectors
    struct.pack_into("<I", header, 76, 1)  # FAT sector 1 in DIFAT

    # Sector 0 in the FAT is unused; it immediately follows the header.
    unused_sector = bytearray(SECTOR_SIZE)

    # Build FAT sector (sector 1)
    fat = bytearray(SECTOR_SIZE)
    struct.pack_into("<I", fat, 0, FREESECT)  # unused sector 0
    struct.pack_into("<I", fat, 4, 0xFFFFFFFD)  # sector 1
    struct.pack_into("<I", fat, 8, 0xFFFFFFFE)  # sector 2
    struct.pack_into("<I", fat, 12, 0xFFFFFFFE)  # sector 3
    # Remaining FAT entries: mark unused as FREESECT
    for i in range(16, len(fat), 4):
        struct.pack_into("<I", fat, i, FREESECT)

    # Build directory sector (sector 2)
    directory = bytearray(SECTOR_SIZE)
    # Directory entry 0: Root storage (type 5)
    root_name = "Root Entry".encode("utf-16-le") + b"\x00\x00"
    directory[0:len(root_name)] = root_name
    struct.pack_into("<H", directory, 64, len(root_name))
    directory[66] = 5  # object type: root storage
    directory[67] = 0  # color: black
    struct.pack_into("<I", directory, 68, FREESECT)  # left sibling
    struct.pack_into("<I", directory, 72, FREESECT)  # right sibling
    struct.pack_into("<I", directory, 76, 1)  # stream is root child entry 1
    struct.pack_into("<I", directory, 116, ENDOFCHAIN)  # no mini-stream
    struct.pack_into("<Q", directory, 120, 0)  # root stream size
    # Directory entry 1: Stream
    name_field = stream_name_utf16 + b"\x00" * (name_size - len(stream_name_utf16))
    directory[128:128 + name_size] = name_field
    struct.pack_into("<H", directory, 128 + 64, name_size)  # name length
    directory[128 + 66] = 2  # object type: stream
    directory[128 + 67] = 0  # color: black
    struct.pack_into("<I", directory, 128 + 68, FREESECT)  # left sibling
    struct.pack_into("<I", directory, 128 + 72, FREESECT)  # right sibling
    struct.pack_into("<I", directory, 128 + 76, FREESECT)  # no child
    struct.pack_into("<I", directory, 128 + 116, 3)  # starting sector
    struct.pack_into("<Q", directory, 128 + 120, len(data))  # stream size

    # Build stream data sector (sector 3)
    stream_sector = bytearray(SECTOR_SIZE)
    stream_sector[:len(data)] = data

    return bytes(header + unused_sector + fat + directory + stream_sector)


def make_office_zip(part_name: str, content_type: str) -> bytes:
    """Create a ZIP with an Office part and [Content_Types].xml."""
    ct_line = (
        '<Override PartName="/'
        + part_name
        + '" ContentType="'
        + content_type
        + '"/>'
    ).encode("utf-8")
    content_types = (
        b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        b'<Default Extension="xml" ContentType="application/xml"/>'
        + ct_line
        + b"</Types>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr(part_name, b"x" * 10)
    return buf.getvalue()


def make_zip_bomb(compress_ratio: int = 200) -> bytes:
    """Create a ZIP with a high compression ratio (decompression bomb)."""
    uncompressed = b"A" * (1024 * 1024)  # 1 MB of zeros compresses well
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("large.txt", uncompressed)
    return buf.getvalue()


# --- Existing tests (preserved) ---

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


# --- OLE tests ---

def test_detect_ole_doc():
    content = make_ole_file("WordDocument")
    mime, ext = detect_file_type(content, filename="test.doc")
    assert mime == "application/msword"
    assert ext == ".doc"


def test_detect_ole_xls():
    content = make_ole_file("Workbook")
    mime, ext = detect_file_type(content, filename="test.xls")
    assert mime == "application/vnd.ms-excel"
    assert ext == ".xls"


def test_detect_ole_ppt():
    content = make_ole_file("PowerPoint Document")
    mime, ext = detect_file_type(content, filename="test.ppt")
    assert mime == "application/vnd.ms-powerpoint"
    assert ext == ".ppt"


def test_reject_ole_unidentified():
    content = make_ole_file("UnknownStream")
    with pytest.raises(ValueError):
        detect_file_type(content, filename="test.doc")


def test_reject_ole_invalid():
    with pytest.raises(ValueError):
        detect_file_type(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100)


# --- Office ZIP tests ---

def test_detect_docx():
    content = make_office_zip(
        "word/document.xml",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    mime, ext = detect_file_type(content, filename="test.docx")
    assert mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert ext == ".docx"


def test_detect_pptx():
    content = make_office_zip(
        "ppt/presentation.xml",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
    mime, ext = detect_file_type(content, filename="test.pptx")
    assert mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    assert ext == ".pptx"


def test_detect_xlsx():
    content = make_office_zip(
        "xl/workbook.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    mime, ext = detect_file_type(content, filename="test.xlsx")
    assert mime == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert ext == ".xlsx"


def test_detect_zip_plain():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("readme.txt", b"hello")
    content = buf.getvalue()
    mime, ext = detect_file_type(content, filename="test.zip")
    assert mime == "application/zip"
    assert ext == ".zip"


# --- CSV/TXT tests ---

def test_detect_csv():
    content = b"col1,col2,col3\nval1,val2,val3"
    mime, ext = detect_file_type(content, filename="data.csv")
    assert mime == "text/csv"
    assert ext == ".csv"


def test_detect_txt():
    content = b"Hello, world! This is a text file."
    mime, ext = detect_file_type(content, filename="notes.txt")
    assert mime == "text/plain"
    assert ext == ".txt"


def test_detect_single_column_csv():
    content = b"justonecolumn"
    mime, ext = detect_file_type(content, filename="single.csv")
    assert mime == "text/csv"
    assert ext == ".csv"


def test_reject_csv_invalid_utf8():
    content = b"\xff\xfe\x00invalid"
    with pytest.raises(ValueError):
        detect_file_type(content, filename="data.csv")


def test_reject_txt_invalid_utf8():
    content = b"\xff\xfe\x00invalid"
    with pytest.raises(ValueError):
        detect_file_type(content, filename="notes.txt")


def test_reject_csv_null_byte():
    content = b"col1,col2\x00col3"
    with pytest.raises(ValueError):
        detect_file_type(content, filename="data.csv")


def test_reject_txt_null_byte():
    content = b"Hello\x00World"
    with pytest.raises(ValueError):
        detect_file_type(content, filename="notes.txt")


def test_reject_unsupported_md_text():
    content = b"# Hello Markdown"
    with pytest.raises(ValueError):
        detect_file_type(content, filename="readme.md")


# --- ZIP validation tests ---

def test_reject_zip_malformed():
    with pytest.raises(ValueError):
        detect_file_type(b"PK\x03\x04garbage", filename="bad.zip")


def test_reject_zip_traversal():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("a/../b.txt", b"x")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_reject_zip_absolute():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("/etc/passwd", b"x")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_reject_zip_drive():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("C:\\Windows\\file.txt", b"x")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_allow_zip_harmless_dots():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("file..txt", b"x")
        zf.writestr("...", b"x")
    mime, ext = detect_file_type(buf.getvalue(), filename="test.zip")
    assert mime == "application/zip"


def test_reject_zip_duplicate_casefold():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("A.txt", b"x")
        zf.writestr("a.txt", b"y")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


@pytest.mark.parametrize("second_name", ["a/./b.txt", "a//b.txt"])
def test_reject_zip_duplicate_canonical_paths(second_name):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("a/b.txt", b"x")
        zf.writestr(second_name, b"y")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_reject_zip_bomb_ratio():
    content = make_zip_bomb(200)
    with pytest.raises(ValueError):
        detect_file_type(content, filename="bomb.zip")


def test_reject_zip_entry_count():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        for i in range(1001):
            zf.writestr(f"file{i}.txt", b"x")
    with pytest.raises(ValueError):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_reject_zip_aggregate_uncompressed_size():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_STORED) as zf:
        for i in range(101):
            zf.writestr(f"file{i}.bin", b"x" * (1024 * 1024))
    with pytest.raises(ValueError, match="uncompressed size"):
        detect_file_type(buf.getvalue(), filename="test.zip")


def test_detect_valid_empty_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w"):
        pass
    mime, ext = detect_file_type(buf.getvalue(), filename="test.zip")
    assert mime == "application/zip"
    assert ext == ".zip"


def test_reject_utf16_office_xml_with_dtd():
    content_types = (
        '<?xml version="1.0"?>'
        '<!DOCTYPE Types [<!ENTITY xxe "attack">]>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"/>'
        '</Types>'
    ).encode("utf-16")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w") as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("word/document.xml", b"x")
    with pytest.raises(ValueError, match="Unsafe"):
        detect_file_type(buf.getvalue(), filename="test.docx")


def test_reject_malformed_compressed_content_types():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
    corrupted = bytearray(buf.getvalue())
    name = b"[Content_Types].xml"
    local_offset = corrupted.find(name) - 30
    if local_offset >= 0:
        struct.pack_into("<H", corrupted, local_offset + 8, 99)
    central_offset = corrupted.find(b"PK\x01\x02")
    if central_offset >= 0:
        entry_offset = corrupted.find(name, central_offset)
        if entry_offset >= 0:
            struct.pack_into("<H", corrupted, entry_offset - 46 + 10, 99)
    with pytest.raises(ValueError, match="Malformed|unsupported"):
        detect_file_type(bytes(corrupted), filename="test.docx")


# --- Size limit tests ---

def test_max_size_sprint_purposes_regular():
    assert max_file_size_for_purpose("SPRINT_SUBMISSION", "application/pdf") == 10 * 1024 * 1024
    assert max_file_size_for_purpose("SPRINT_ATTACHMENT", "application/pdf") == 10 * 1024 * 1024


def test_max_size_sprint_purposes_zip():
    assert max_file_size_for_purpose("SPRINT_SUBMISSION", "application/zip") == 25 * 1024 * 1024
    assert max_file_size_for_purpose("SPRINT_ATTACHMENT", "application/zip") == 25 * 1024 * 1024


def test_max_size_verification():
    assert max_file_size_for_purpose("IDENTITY_EVIDENCE", "application/pdf") == 5 * 1024 * 1024
    assert max_file_size_for_purpose("BUSINESS_EVIDENCE", "application/pdf") == 5 * 1024 * 1024


# --- MIME allow tests ---

def test_mime_allowed_verification_zip():
    assert is_mime_allowed_for_purpose("application/zip", "IDENTITY_EVIDENCE") is False


def test_mime_allowed_sprint_docx():
    assert is_mime_allowed_for_purpose(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "SPRINT_SUBMISSION",
    ) is True


def test_mime_allowed_sprint_attachment_docx():
    assert is_mime_allowed_for_purpose(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "SPRINT_ATTACHMENT",
    ) is True
