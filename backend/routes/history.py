from fastapi import FastAPI, Request
from pydantic import BaseModel

app = FastAPI()

history_db = {}  # Temporary in-memory DB

class HistoryRequest(BaseModel):
    user_id: str
    prompt: str

@app.post("/save_history")
def save_history(req: HistoryRequest):
    if req.user_id not in history_db:
        history_db[req.user_id] = []
    if req.prompt not in history_db[req.user_id]:
        history_db[req.user_id].append(req.prompt)
    return {"message": "Saved"}

@app.get("/get_history/{user_id}")
def get_history(user_id: str):
    return {"history": history_db.get(user_id, [])}
