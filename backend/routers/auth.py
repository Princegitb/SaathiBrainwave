"""
SAATHI Authentication Router
Handles user signup, login, password verification, and authentication checks.
Stores real users in MongoDB (or in-memory fallback).
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from database import users_collection, ping_db, _MEM_USERS
from services.auth_service import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str
    goals: Optional[List[str]] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    goals: List[str]
    created_at: str
    access_token: Optional[str] = None
    token_type: str = "bearer"


def _now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/auth/signup", response_model=UserResponse)
async def signup(req: SignupRequest):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    display_name = req.display_name.strip() or "Friend"
    user_id = f"usr_{hash_password(email_clean)[:12]}"
    pwd_hashed = hash_password(req.password)

    # MongoDB persistence
    if await ping_db():
        try:
            existing = await users_collection.find_one({"email": email_clean})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email already exists. Please log in instead.",
                )

            user_doc = {
                "user_id": user_id,
                "email": email_clean,
                "password_hash": pwd_hashed,
                "display_name": display_name,
                "goals": req.goals or ["General Confidence"],
                "preferences": {
                    "preferred_format": "text",
                    "session_length": "short",
                    "goal_tags": req.goals or [],
                },
                "created_at": _now_str(),
                "updated_at": _now_str(),
            }

            await users_collection.insert_one(user_doc)
            logger.info("New user registered in DB: %s (%s)", display_name, email_clean)

            token = create_access_token({"sub": user_id, "email": email_clean})
            return UserResponse(
                user_id=user_id,
                email=email_clean,
                display_name=display_name,
                goals=req.goals or ["General Confidence"],
                created_at=user_doc["created_at"],
                access_token=token,
                token_type="bearer",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("DB signup failed, using memory: %s", e)

    # In-Memory fallback
    for uid, u in _MEM_USERS.items():
        if u.get("email") == email_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please log in instead.",
            )

    mem_doc = {
        "user_id": user_id,
        "email": email_clean,
        "password_hash": pwd_hashed,
        "display_name": display_name,
        "goals": req.goals or ["General Confidence"],
        "created_at": _now_str(),
    }
    _MEM_USERS[user_id] = mem_doc

    token = create_access_token({"sub": user_id, "email": email_clean})
    return UserResponse(
        user_id=user_id,
        email=email_clean,
        display_name=display_name,
        goals=req.goals or ["General Confidence"],
        created_at=mem_doc["created_at"],
        access_token=token,
        token_type="bearer",
    )


@router.post("/auth/login", response_model=UserResponse)
async def login(req: LoginRequest):
    email_clean = req.email.strip().lower()

    if await ping_db():
        try:
            user = await users_collection.find_one({"email": email_clean})
            if not user or not verify_password(req.password, user.get("password_hash", "")):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password. Please try again.",
                )

            token = create_access_token({"sub": user["user_id"], "email": user["email"]})
            return UserResponse(
                user_id=user["user_id"],
                email=user["email"],
                display_name=user.get("display_name", "Friend"),
                goals=user.get("goals", []),
                created_at=user.get("created_at", _now_str()),
                access_token=token,
                token_type="bearer",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("DB login error, falling back to memory: %s", e)

    # In-memory check
    for uid, u in _MEM_USERS.items():
        if u.get("email") == email_clean:
            if verify_password(req.password, u.get("password_hash", "")):
                token = create_access_token({"sub": u["user_id"], "email": u["email"]})
                return UserResponse(
                    user_id=u["user_id"],
                    email=u["email"],
                    display_name=u.get("display_name", "Friend"),
                    goals=u.get("goals", []),
                    created_at=u.get("created_at", _now_str()),
                    access_token=token,
                    token_type="bearer",
                )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password. Please try again.",
    )


@router.get("/auth/me")
async def get_me(user_id: str):
    if await ping_db():
        try:
            user = await users_collection.find_one({"user_id": user_id})
            if user:
                return {
                    "user_id": user["user_id"],
                    "email": user.get("email", ""),
                    "display_name": user.get("display_name", "Friend"),
                    "goals": user.get("goals", []),
                }
        except Exception:
            pass

    if user_id in _MEM_USERS:
        u = _MEM_USERS[user_id]
        return {
            "user_id": u["user_id"],
            "email": u.get("email", ""),
            "display_name": u.get("display_name", "Friend"),
            "goals": u.get("goals", []),
        }

    return {"user_id": user_id, "display_name": "Friend", "goals": []}
