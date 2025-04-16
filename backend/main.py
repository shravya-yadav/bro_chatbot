import os
import uuid
import requests
import json
import google.generativeai as genai
from fastapi import FastAPI
from pydantic import BaseModel
from pinecone import Pinecone, ServerlessSpec
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router

# ---------- Config ----------
genai.configure(api_key="AIzaSyA62GAHTjnfqI602xCxTzNEnW4k6uQ-LOw")
model = genai.GenerativeModel("gemini-1.5-flash-latest")

pc = Pinecone(api_key="pcsk_5JQvGu_Sexw9S6kQvcq5QuPXkETxKp7dTgWfhaKUgxKoNfyJHU1xWAgoTpvSNQLzhQg1Qo")
index_name = "genai-intel-chat"
index = pc.Index(index_name)

SERPER_API_KEY = "0da379d2affd1fc587d4a472d84265c5f438a83f"

app = FastAPI()
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- In-Memory Store ----------
user_histories = {}
if os.path.exists("chat_history.json"):
    with open("chat_history.json", "r") as f:
        user_histories = json.load(f)

# ---------- Schemas ----------
class ChatRequest(BaseModel):
    user_id: str
    message: str

class HistoryEntry(BaseModel):
    user_id: str
    query: str
    response: str

# ---------- History Endpoints ----------
@app.post("/save_history")
async def save_history(entry: HistoryEntry):
    history = user_histories.get(entry.user_id, [])
    history.append({"query": entry.query, "response": entry.response})
    user_histories[entry.user_id] = history
    with open("chat_history.json", "w") as f:
        json.dump(user_histories, f)
    return {"status": "saved"}

def find_existing_response(user_id: str, query: str):
    history = user_histories.get(user_id, [])
    for item in history:
        if item["query"].strip().lower() == query.strip().lower():
            return item["response"]
    return None

@app.get("/get_history/{user_id}")
async def get_history(user_id: str):
    return user_histories.get(user_id, [])

@app.get("/history/{user_id}")
def get_user_history(user_id: str):
    try:
        query_res = index.query(
            vector=[0.0] * 768,
            top_k=20,
            include_metadata=True,
            filter={"user_id": {"$eq": user_id}}
        )
        return {
            "history": [match["metadata"]["content"] for match in query_res.get("matches", [])]
        }
    except Exception as e:
        print(f"[ERROR] History fetch failed: {e}")
        return {"history": []}

# ---------- Embedding + Memory ----------
def get_embedding(text):
    try:
        res = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document"
        )
        return res["embedding"]
    except Exception as e:
        print(f"[ERROR] Embedding failed: {e}")
        return None

def store_memory(user_id: str, topic: str, full_message: str, category: str = "general"):
    vector = get_embedding(full_message)
    if vector:
        try:
            index.upsert(vectors=[{
                "id": str(uuid.uuid4()),
                "values": vector,
                "metadata": {
                    "user_id": user_id,
                    "topic": topic,
                    "content": full_message,
                    "category": category
                }
            }])
        except Exception as e:
            print(f"[ERROR] Memory store failed: {e}")

def retrieve_memory(user_id: str, query: str, top_k: int = 5):
    try:
        query_vector = get_embedding(query)
        if not query_vector:
            return []

        results = index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            filter={"user_id": user_id}
        )

        memory_chunks = []
        for match in results.matches:
            score = match.score
            content = match.metadata.get("content", "")
            if score > 0.75:
                memory_chunks.append(content)

        return memory_chunks

    except Exception as e:
        print(f"[ERROR] retrieve_memory failed: {e}")
        return []

# ---------- Chat Session Memory ----------
@app.get("/start_session/{user_id}")
def start_session(user_id: str):
    try:
        result = index.query(
            vector=[0.0]*768,
            top_k=15,
            include_metadata=True,
            filter={"user_id": {"$eq": user_id}}
        )
        categories = {"faq": [], "preference": [], "source": []}
        for match in result.get("matches", []):
            cat = match["metadata"].get("category", "general")
            if cat in categories:
                categories[cat].append(match["metadata"]["content"])
        return {"session_memory": categories}
    except Exception as e:
        print(f"[ERROR] Session load failed: {e}")
        return {"session_memory": {}}

# ---------- News & Web ----------
def fetch_news(company):
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    payload = {"q": company}
    try:
        res = requests.post("https://google.serper.dev/news", headers=headers, json=payload)
        res.raise_for_status()
        return res.json().get("news", [])
    except Exception as e:
        print(f"[ERROR] News fetch failed: {e}")
        return []

def summarize_news(news_items):
    if not news_items:
        return "No news found."
    headlines = "\n".join([f"{n['title']}: {n['link']}" for n in news_items[:5]])
    prompt = f"Summarize the following headlines:\n{headlines}"
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        print(f"[ERROR] News summary failed: {e}")
        return "Error summarizing news."

def fetch_web(query):
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    payload = {"q": query}
    try:
        res = requests.post("https://google.serper.dev/search", headers=headers, json=payload)
        res.raise_for_status()
        return res.json().get("organic", [])
    except Exception as e:
        print(f"[ERROR] Web fetch failed: {e}")
        return []

def summarize_web_results(results):
    if not results:
        return "No relevant results found."
    text = "\n".join([f"{r['title']}: {r['link']}" for r in results[:5]])
    prompt = f"Summarize this web info and include citations:\n{text}"
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        print(f"[ERROR] Web summarization failed: {e}")
        return "Unable to summarize web results."

# ---------- Comparison ----------
def compare_market(company, competitors):
    prompt = f"Compare {company} with {', '.join(competitors)} in terms of market share and strategy."
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        print(f"[ERROR] Comparison failed: {e}")
        return "Error comparing companies."

# ---------- Chat Endpoint ----------
@app.post("/chat")
async def chat(req: ChatRequest):
    uid = req.user_id
    msg = req.message

    try:
        if "news" in msg.lower() or "latest" in msg.lower():
            target = msg.split("about")[-1].strip() if "about" in msg else msg
            news = fetch_news(target)
            summary = summarize_news(news)
            final_response = f"Here’s the latest news about **{target}**:\n\n{summary}"
            store_memory(uid, topic=target, full_message=summary, category="source")
            return {"response": final_response}

        elif "web" in msg.lower() or "search" in msg.lower():
            results = fetch_web(msg)
            summary = summarize_web_results(results)
            store_memory(uid, topic="web_search", full_message=summary, category="source")
            return {"response": summary}

        elif "compare" in msg.lower():
            parts = msg.lower().split("compare")[-1].strip().split("with")
            company = parts[0].strip()
            competitors = [c.strip() for c in parts[1].split("and")]
            result = compare_market(company, competitors)
            final_response = f"Market Comparison between **{company}** and **{', '.join(competitors)}**:\n\n{result}"
            store_memory(uid, topic="comparison", full_message=result, category="preference")
            return {"response": final_response}

        # Check for repeated query
        existing = find_existing_response(uid, msg)
        if existing:
            return {"response": existing}

        # Fresh Gemini response
        response = model.generate_content(msg).text

        # Save only new responses to memory and JSON
        store_memory(uid, topic="general_chat", full_message=response, category="faq")
        user_histories.setdefault(uid, []).append({"query": msg, "response": response})
        with open("chat_history.json", "w") as f:
            json.dump(user_histories, f)

        return {"response": response}

    except Exception as e:
        print(f"[ERROR] Chat handling failed: {e}")
        return {"response": "Oops! Something went wrong."}

@app.get("/")
def home():
    return {"message": "AI Intel Agent Running 🚀"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)