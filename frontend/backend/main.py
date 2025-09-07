import os
from typing import List, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    # We don't raise here to allow health check without key, but will error on chat
    print("[WARN] OPENAI_API_KEY not set. Set it before calling /chat.")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title="AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: Literal['user','assistant','system']
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str | None = None
    temperature: float | None = 0.3
    max_tokens: int | None = 400

class ChatResponse(BaseModel):
    answer: str

@app.get("/health")
async def health():
    return {"ok": True, "time": __import__('datetime').datetime.utcnow().isoformat()}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing on server")
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    model = req.model or "gpt-4o-mini"
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[m.model_dump() for m in req.messages],
            temperature=req.temperature,
            max_tokens=req.max_tokens
        )
        answer = completion.choices[0].message.content if completion.choices else ""
        return ChatResponse(answer=answer or "(fără răspuns)")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

# Local run helper
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
