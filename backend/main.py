import os
from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# OpenAI import "lazy"
try:
    from openai import OpenAI  # type: ignore
except Exception:
    OpenAI = None  # gestionăm la runtime

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEFAULT_MODEL = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
NATURAL_TEMPERATURE = 0.4  # mai natural, dar controlat

if not OPENAI_API_KEY:
    print("[WARN] OPENAI_API_KEY not set. Set it before calling /chat.")

_client: Optional["OpenAI"] = None


def get_client() -> "OpenAI":
    """Return a cached OpenAI client, creating it if needed."""
    global _client
    if _client is not None:
        return _client
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing on server")
    if OpenAI is None:
        raise HTTPException(status_code=500, detail="openai package import failed. Reinstall dependencies.")
    try:
        _client = OpenAI(api_key=OPENAI_API_KEY)
        return _client
    except TypeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI client init error (likely outdated httpx). {e}. Run: pip install --upgrade httpx",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI client init error: {e}")


# ---------- QUICK ACTIONS (butoane de start) ----------
QUICK_ACTIONS = [
    "Tutorial — îmi poți arăta, pas cu pas, cum deschid și rezolv un caz?",
    "Abonament anulat dar taxat — care sunt documentele obligatorii și pașii de urmat?",
    "Checklist inițial — ce informații și documente trebuie să pregătesc înainte să încep?",
    "Formular de caz — generează un template pe care să-l completez și să-l trimit aici",
]

WELCOME_TEXT = (
    "Salut! Sunt asistentul tău pentru disputele de plată. "
    "Răspund strict pe acest subiect. Alege o opțiune sau descrie cazul tău:\n"
    f"• {QUICK_ACTIONS[0]}\n"
    f"• {QUICK_ACTIONS[1]}\n"
    f"• {QUICK_ACTIONS[2]}\n"
    f"• {QUICK_ACTIONS[3]}"
)

# ---------- PROMPT DE SISTEM (natural, dar strict pe domeniu) ----------
SYSTEM_PROMPT = f"""
Ești „Chargeback Assistant”. Vorbești natural, scurt și clar, în limba română.
Direcție: te ocupi EXCLUSIV de dispute de plată cu cardul pentru comercianți (chargeback).
Dacă utilizatorul pune întrebări în afara domeniului, redirecționezi politicos și revii la subiect,
oferind exact aceste 4 opțiuni rapide:
• {QUICK_ACTIONS[0]}
• {QUICK_ACTIONS[1]}
• {QUICK_ACTIONS[2]}
• {QUICK_ACTIONS[3]}

Stil:
- Prietenos, profesionist, natural (nu robotic). 3–6 propoziții sau 3–5 bullet-uri.
- Fără jargon inutil. Explici pe scurt „de ce” și „ce urmează”.

Conținut:
- Lucrezi DOAR cu datele primite. Dacă lipsesc informații, ceri 1–3 clarificări specifice.
- Nu inventezi coduri, sume, AWB, loguri. Maschezi PII în exemple (i***@exemplu.ro).
- Recomandări orientative (Fight/Refund) doar dacă există minime dovezi. Altfel, explici ce lipsește.

Exemple de focus:
- „produs nelivrat”, „fraudă neautorizată”, „dublă încasare”, „abonament anulat dar taxat”, „serviciu neconform”,
- checklist de dovezi, pași de urmat, draft de răspuns (doar la cerere).
"""

# ---------- FEW-SHOTS minimale pentru ancorare de comportament ----------
FEW_SHOTS = [
    # Off-topic -> redirecționare naturală + quick actions
    {"role": "user", "content": "ce faci?"},
    {"role": "assistant", "content":
     "Sunt aici doar pentru disputele de plată. Spune-mi pe scurt cazul tău sau alege una dintre opțiunile de început:\n"
     f"• {QUICK_ACTIONS[0]}\n• {QUICK_ACTIONS[1]}\n• {QUICK_ACTIONS[2]}\n• {QUICK_ACTIONS[3]}"},
    # Caz minim -> cere clarificări țintite (max 3)
    {"role": "user", "content": "am o problemă, clientul e nemulțumit"},
    {"role": "assistant", "content":
     "- Care e motivul exact (nelivrat / fraudă / abonament / dublă / serviciu)?\n"
     "- Ce detalii are tranzacția (sumă, monedă, dată, ID)?\n"
     "- Ce dovezi ai acum (factură, AWB/confirmare, loguri, email client)?"},
]

# ---------- FastAPI ----------
app = FastAPI(title="AI Backend — Chargeback Assistant (natural)", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustează în producție
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: Literal['user','assistant','system']
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = None  # dacă nu se dă, folosim NATURAL_TEMPERATURE
    max_tokens: Optional[int] = 600

class ChatResponse(BaseModel):
    answer: str

def build_messages(user_messages: List[ChatMessage]) -> list[dict]:
    """Inserează sistemul + few-shots, apoi istoricul."""
    msgs: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    msgs += FEW_SHOTS
    msgs += [m.model_dump() for m in user_messages if m.role in ("system", "user", "assistant")]
    return msgs

# ---------- Endpoints ----------
@app.get("/health")
async def health():
    return {"ok": True, "time": __import__('datetime').datetime.utcnow().isoformat()}

@app.get("/debug-config")
async def debug_config():
    try:
        import importlib.metadata as importlib_metadata
        openai_version = importlib_metadata.version("openai")
    except Exception:
        openai_version = None
    return {
        "model_env": DEFAULT_MODEL,
        "api_key_present": bool(OPENAI_API_KEY),
        "openai_version": openai_version,
        "client_cached": _client is not None,
    }

@app.get("/welcome")
async def welcome():
    return {"welcome": WELCOME_TEXT, "quick_actions": QUICK_ACTIONS}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    client = get_client()
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    model = req.model or DEFAULT_MODEL

    try:
        messages = build_messages(req.messages)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=NATURAL_TEMPERATURE if req.temperature is None else req.temperature,
            max_tokens=req.max_tokens or 600,
            top_p=0.9,              # mai natural
            presence_penalty=0.0,
            frequency_penalty=0.2,  # reduce repetițiile
        )
        answer = completion.choices[0].message.content if completion.choices else ""
        return ChatResponse(answer=answer or "(fără răspuns)")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

# Local run helper
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



