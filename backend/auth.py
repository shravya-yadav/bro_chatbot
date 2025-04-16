# backend/auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import json
import os

router = APIRouter()

USERS_FILE = "users.json"
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, "w") as f:
        json.dump({}, f)

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/signup")
def signup(data: AuthRequest):
    with open(USERS_FILE, "r") as f:
        users = json.load(f)

    # Check if username already exists
    for user_info in users.values():
        if user_info["username"] == data.username:
            raise HTTPException(status_code=400, detail="Username already exists.")

    user_id = str(uuid.uuid4())
    users[user_id] = {"username": data.username, "password": data.password}

    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

    return {"user_id": user_id, "username": data.username}

@router.post("/login")
def login(data: AuthRequest):
    with open(USERS_FILE, "r") as f:
        users = json.load(f)

    for user_id, user_info in users.items():
        if user_info["username"] == data.username and user_info["password"] == data.password:
            return {"user_id": user_id, "username": data.username}

    raise HTTPException(status_code=401, detail="Invalid credentials.")
