import os
from typing import List, Literal, Optional
import hashlib
import uuid
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app import models
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

# --- lightweight dev auto-migration (safe idempotent) ---
from sqlalchemy import inspect, text
from app.db.session import engine

def _ensure_user_columns():
    try:
        insp = inspect(engine)
        cols = {c['name'] for c in insp.get_columns('users')}
        with engine.begin() as conn:
            if 'password_hash' not in cols:
                conn.execute(text('ALTER TABLE users ADD COLUMN password_hash VARCHAR'))
            if 'created_via_signup' not in cols:
                conn.execute(text('ALTER TABLE users ADD COLUMN created_via_signup BOOLEAN DEFAULT FALSE'))
            if 'phone' not in cols:
                conn.execute(text('ALTER TABLE users ADD COLUMN phone VARCHAR'))
    except Exception as e:
        print('[WARN] auto-migration users columns failed:', e)

_ensure_user_columns()

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

class CaseOut(BaseModel):
    id: str
    reason: str
    status: str
    amount: float
    currency: str
    probability: float
    recommendation: str
    owner: str | None = None
    owner_id: str | None = None
    deadline: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    class Config:
        from_attributes = True

class PaymentOut(BaseModel):
    id: str
    amount: float
    currency: str
    label: str
    status: str
    created_at: Optional[str] = None
    fraud_type: Optional[str] = None
    receiver_account: Optional[str] = None
    transaction_type: Optional[str] = None
    payment_channel: Optional[str] = None
    merchant_category: Optional[str] = None
    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    amount: float
    currency: Optional[str] = 'RON'
    label: str
    receiver_account: Optional[str] = None
    transaction_type: Optional[str] = None
    payment_channel: Optional[str] = None
    merchant_category: Optional[str] = None
    fraud_type: Optional[str] = None

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    created_at: Optional[str] = None
    token: Optional[str] = None
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

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

@app.get("/cases", response_model=list[CaseOut])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(models.Case).order_by(models.Case.created_at.desc()).limit(500).all()
    # Serialize datetime to ISO
    out: list[CaseOut] = []
    for c in cases:
        out.append(CaseOut(
            id=c.id, reason=c.reason, status=c.status.value if hasattr(c.status,'value') else c.status,
            amount=c.amount, currency=c.currency, probability=c.probability, recommendation=c.recommendation,
            owner=c.owner, owner_id=c.owner_id,
            deadline=c.deadline.isoformat() if c.deadline else None,
            created_at=c.created_at.isoformat() if c.created_at else None,
            updated_at=c.updated_at.isoformat() if c.updated_at else None
        ))
    return out

@app.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.get(models.Case, case_id)
    if not c:
        raise HTTPException(status_code=404, detail="case not found")
    return CaseOut(
        id=c.id, reason=c.reason, status=c.status.value if hasattr(c.status,'value') else c.status,
        amount=c.amount, currency=c.currency, probability=c.probability, recommendation=c.recommendation,
        owner=c.owner, owner_id=c.owner_id,
        deadline=c.deadline.isoformat() if c.deadline else None,
        created_at=c.created_at.isoformat() if c.created_at else None,
        updated_at=c.updated_at.isoformat() if c.updated_at else None
    )

@app.get("/payments", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db)):
    payments = db.query(models.Payment).order_by(models.Payment.created_at.desc()).limit(500).all()
    out: list[PaymentOut] = []
    for p in payments:
        out.append(PaymentOut(
            id=p.id, amount=p.amount, currency=p.currency, label=p.label,
            status=p.status.value if hasattr(p.status,'value') else p.status,
            created_at=p.created_at.isoformat() if p.created_at else None,
            fraud_type=p.fraud_type if hasattr(p,'fraud_type') else None,
            receiver_account=p.receiver_account if hasattr(p,'receiver_account') else None,
            transaction_type=p.transaction_type if hasattr(p,'transaction_type') else None,
            payment_channel=p.payment_channel if hasattr(p,'payment_channel') else None,
            merchant_category=p.merchant_category if hasattr(p,'merchant_category') else None
        ))
    return out

@app.get("/payments/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    p = db.get(models.Payment, payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="payment not found")
    return PaymentOut(
        id=p.id, amount=p.amount, currency=p.currency, label=p.label,
        status=p.status.value if hasattr(p.status,'value') else p.status,
        created_at=p.created_at.isoformat() if p.created_at else None,
        fraud_type=p.fraud_type,
        receiver_account=p.receiver_account,
        transaction_type=p.transaction_type,
        payment_channel=p.payment_channel,
        merchant_category=p.merchant_category
    )

@app.post("/payments", response_model=PaymentOut, status_code=201)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    if payload.amount is None or payload.amount <= 0:
        raise HTTPException(status_code=400, detail="invalid_amount")
    label = (payload.label or '').strip()
    if not label:
        raise HTTPException(status_code=400, detail="label_required")
    currency = (payload.currency or 'RON').upper()[:8]
    pid = 'pay-' + uuid.uuid4().hex[:12]
    payment = models.Payment(
        id=pid,
        amount=float(payload.amount),
        currency=currency,
        label=label,
        status=models.PaymentStatus.open,
        receiver_account=payload.receiver_account,
        transaction_type=payload.transaction_type,
        payment_channel=payload.payment_channel,
        merchant_category=payload.merchant_category,
        fraud_type=payload.fraud_type
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return PaymentOut(
        id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        label=payment.label,
        status=payment.status.value if hasattr(payment.status,'value') else payment.status,
        created_at=payment.created_at.isoformat() if payment.created_at else None,
        fraud_type=payment.fraud_type,
        receiver_account=payment.receiver_account,
        transaction_type=payment.transaction_type,
        payment_channel=payment.payment_channel,
        merchant_category=payment.merchant_category
    )

@app.post('/auth/signup', response_model=UserOut, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # Basic normalization
    email_norm = payload.email.strip().lower()
    if not email_norm or '@' not in email_norm:
        raise HTTPException(status_code=400, detail='invalid email')
    # Check existing
    existing = db.query(models.User).filter(models.User.email == email_norm).first()
    if existing:
        raise HTTPException(status_code=409, detail='email exists')
    # Simple password policy (demo only)
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail='password too short')
    # Hash (demo: sha256; for production use passlib bcrypt)
    pw_hash = hashlib.sha256(payload.password.encode('utf-8')).hexdigest()
    user_id = 'u-' + uuid.uuid4().hex[:10]
    user = models.User(
        id=user_id,
        email=email_norm,
        name=payload.name.strip() or 'User',
        role='operator',
        password_hash=pw_hash,
        created_via_signup=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        created_at=user.created_at.isoformat() if user.created_at else None,
        token=None
    )

@app.post('/auth/login', response_model=UserOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_norm = payload.email.strip().lower()
    if not email_norm or '@' not in email_norm:
        raise HTTPException(status_code=400, detail='invalid_email')
    user = db.query(models.User).filter(models.User.email == email_norm).first()
    if not user:
        raise HTTPException(status_code=404, detail='email_not_found')
    # Users created via seed might not have password_hash; treat as invalid password
    if not user.password_hash:
        raise HTTPException(status_code=400, detail='password_not_set')
    pw_hash = hashlib.sha256(payload.password.encode('utf-8')).hexdigest()
    if pw_hash != user.password_hash:
        raise HTTPException(status_code=400, detail='invalid_password')
    token = 'tok-' + uuid.uuid4().hex[:24]
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        created_at=user.created_at.isoformat() if user.created_at else None,
        token=token
    )

@app.get('/users/{user_id}', response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail='user_not_found')
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        phone=u.phone,
        created_at=u.created_at.isoformat() if u.created_at else None,
        token=None
    )

@app.put('/users/{user_id}', response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail='user_not_found')
    changed = False
    if payload.name is not None:
        u.name = payload.name.strip() or u.name
        changed = True
    if payload.phone is not None:
        u.phone = payload.phone.strip() or None
        changed = True
    if changed:
        db.add(u)
        db.commit()
        db.refresh(u)
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        phone=u.phone,
        created_at=u.created_at.isoformat() if u.created_at else None,
        token=None
    )


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



