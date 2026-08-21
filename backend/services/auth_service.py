import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "saathi-secret-key-production-jwt-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored salt:hash string."""
    try:
        salt, original_hash = stored_hash.split(':')
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return secrets.compare_digest(original_hash, new_hash)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None


from fastapi import Depends, HTTPException, status, Header, Request

security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    """
    FastAPI security dependency to extract user_id.
    1. Extracts from verified JWT access token if present.
    2. Falls back to X-User-Id header if present.
    3. Falls back to user_id query parameter if present.
    4. Defaults to guest user ID so users/demos are never blocked with 401 errors.
    """
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            return payload["sub"]

    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    # Fallback to query param user_id
    query_user_id = request.query_params.get("user_id")
    if query_user_id and query_user_id.strip():
        return query_user_id.strip()

    return "usr_demo_guest"

