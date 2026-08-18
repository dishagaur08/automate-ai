"""
Authentication service (Phase 5).

Handles password hashing/verification and JWT access-token issuing and
verification, plus the `get_current_user` FastAPI dependency every
protected route uses.

Secrets: JWT_SECRET is read from the environment (backend/.env), never
hardcoded. If it's unset, we generate a random secret for this process
only, and print a loud warning — the server still starts (matching the
project's existing "degrade gracefully, never silently fail" pattern
for LLM_API_KEY), but every restart invalidates existing tokens. This
is fine for local development; production deployments must set a real
JWT_SECRET.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()  # harmless if another module already loaded it

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET and APP_ENV in {"production", "prod"}:
    raise RuntimeError("JWT_SECRET must be set in production.")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    print(
        "\u26a0\ufe0f  JWT_SECRET is not set in backend/.env — using a randomly "
        "generated secret for this process only. Every backend restart will "
        "invalidate existing login sessions. Set JWT_SECRET in backend/.env "
        "for a stable, production-ready secret."
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # default: 24h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency: requires a valid `Authorization: Bearer <token>`
    header, resolves it to a User row, and 401s otherwise. Used on
    every protected route in routes/*.py and services/ai_router.py.
    """
    if not token:
        raise CREDENTIALS_ERROR

    user_id = decode_access_token(token)
    if user_id is None:
        raise CREDENTIALS_ERROR

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise CREDENTIALS_ERROR

    return user
