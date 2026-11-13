from app.core.security import hash_password, verify_password


def test_hash_password():
    password = "SamarthyaTest123!"
    hashed = hash_password(password)

    assert hashed != password


def test_verify_correct_password():
    password = "SamarthyaTest123!"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True


def test_verify_wrong_password():
    password = "SamarthyaTest123!"
    hashed = hash_password(password)

    assert verify_password("wrong-password", hashed) is False