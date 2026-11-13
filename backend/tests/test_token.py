import pytest
import jwt

from app.core.token import create_access_token, decode_access_token


def test_create_access_token():
    user_id = "test-user-123"

    token = create_access_token(user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == user_id
    assert "exp" in payload


def test_invalid_token_is_rejected():
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("invalid.token.value")