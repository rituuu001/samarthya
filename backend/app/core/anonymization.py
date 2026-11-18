import hmac
import hashlib
from uuid import UUID

from app.core.config import settings


def generate_contributor_code(employer_id: UUID, applicant_id: UUID) -> str:
    """
    Generate a stable, employer-scoped anonymized contributor identifier.

    Uses HMAC-SHA256 with a server-side secret, scoped to both employer_id and applicant_id.
    Returns at least 16 hexadecimal characters from the digest.
    """
    secret = settings.ANONYMIZATION_SECRET.encode("utf-8")
    message = f"{employer_id}:{applicant_id}".encode("utf-8")
    digest = hmac.new(secret, message, hashlib.sha256).hexdigest()
    # Use first 16 hex characters (64 bits) for the identifier
    return f"Contributor #{digest[:16].upper()}"