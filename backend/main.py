import os
from typing import List, Literal, Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import uuid
import random
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


# ---------- QUICK ACTIONS (start buttons) ----------
QUICK_ACTIONS = [
    "Tutorial — can you show me step by step how to open and resolve a case?",
    "Canceled subscription but still charged — what documents are required and what are the steps?",
    "Initial checklist — what information and documents should I prepare before starting?",
    "Case form — generate a template I can fill in and paste here",
]

WELCOME_TEXT = (
    "Hi! I'm your payment dispute assistant. "
    "I only answer within this topic. Pick an option or describe your case:\n"
    f"• {QUICK_ACTIONS[0]}\n"
    f"• {QUICK_ACTIONS[1]}\n"
    f"• {QUICK_ACTIONS[2]}\n"
    f"• {QUICK_ACTIONS[3]}"
)

# ---------- SYSTEM PROMPT (natural, domain strict) ----------
SYSTEM_PROMPT = f"""
You are the "Chargeback Assistant". You speak concise, natural, professional ENGLISH.
Scope: you deal EXCLUSIVELY with card payment disputes (chargebacks) for merchants.
If the user goes off-topic, politely steer back and present exactly these 4 quick options:
• {QUICK_ACTIONS[0]}
• {QUICK_ACTIONS[1]}
• {QUICK_ACTIONS[2]}
• {QUICK_ACTIONS[3]}

Style:
- Friendly, professional, natural (not robotic). 3–6 sentences OR 3–5 bullet points.
- Avoid unnecessary jargon. Briefly explain "why" and "what next".

Content rules:
- Work ONLY with provided data. If info is missing, ask 1–3 specific clarifying questions.
- Do NOT fabricate IDs, amounts, tracking numbers, logs. Mask PII in examples (j***@example.com).
- Provide Fight/Refund guidance only if minimal evidence exists; otherwise explain what is missing.

Focus examples:
- "product not delivered", "unauthorized fraud", "double charge", "canceled subscription still charged", "not as described/service issue".
- Evidence checklist, steps to take, response draft (only if requested).
"""

# ---------- FEW-SHOTS (behavior anchoring) ----------
FEW_SHOTS = [
    # Off-topic -> redirect + quick actions
    {"role": "user", "content": "how are you?"},
    {"role": "assistant", "content":
     "I'm here strictly for payment dispute guidance. Summarize your case or pick one of these to begin:\n"
     f"• {QUICK_ACTIONS[0]}\n• {QUICK_ACTIONS[1]}\n• {QUICK_ACTIONS[2]}\n• {QUICK_ACTIONS[3]}"},
    # Minimal vague case -> ask targeted clarifications (max 3)
    {"role": "user", "content": "I have an issue, customer is unhappy"},
    {"role": "assistant", "content":
     "- What is the exact reason (undelivered / fraud / subscription / double / not as described)?\n"
     "- Transaction details (amount, currency, date, ID)?\n"
     "- Current evidence (invoice, tracking/confirmation, logs, customer email)?"},
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
    case_id: Optional[str] = None  # if auto-created (FLAGGED)
    flag_category: Optional[str] = None
    flag_reason: Optional[str] = None
    class Config:
        from_attributes = True

class ClientProfileFull(BaseModel):
    id: str
    reason: str
    email_masked: Optional[str] = None
    country: Optional[str] = None
    total_payments: Optional[int] = None
    disputed_payments: Optional[int] = None
    chargeback_win_rate: Optional[float] = None
    average_ticket: Optional[float] = None
    lifetime_value: Optional[float] = None
    risk_trigger: Optional[str] = None
    class Config:
        from_attributes = True

class PaymentSimulationResponse(BaseModel):
    payment: PaymentOut
    client: ClientProfileFull
    outcome: str  # success | failed | flagged
    case_id: Optional[str] = None

class PaymentRiskDecision(BaseModel):
    decision: Literal['SUCCESSFUL','FAILED']

class PaymentCreate(BaseModel):
    amount: float
    currency: Optional[str] = 'RON'
    label: str
    receiver_account: Optional[str] = None
    transaction_type: Optional[str] = None
    payment_channel: Optional[str] = None
    merchant_category: Optional[str] = None
    fraud_type: Optional[str] = None
    status: Optional[str] = None  # OPEN | SUCCESSFUL | FLAGGED | FAILED

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

class AnalyticsWhatIf(BaseModel):
    fightCases: int
    winRateEst: float
    totalEV: float
    delta: float
    currentEV: float

class AnalyticsResponse(BaseModel):
    period_days: int
    total_cases: int
    sent_cases: int
    won_cases: int
    lost_cases: int
    win_rate: float
    money_saved: float
    baseline_loss: float
    top_reason: Optional[str]
    avg_submit_hours: float
    sla_respect: float
    override_rate: float
    checklist_complete: float
    motive_chart: List[Dict[str, Any]]
    win_rate_evolution: List[Dict[str, Any]]
    operator_performance: List[Dict[str, Any]]
    what_if: AnalyticsWhatIf
    distinct_reasons: List[str]
    distinct_owners: List[str]
    statuses: List[str]
    generated_at: str

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
            merchant_category=p.merchant_category if hasattr(p,'merchant_category') else None,
            flag_category=getattr(p,'flag_category', None),
            flag_reason=getattr(p,'flag_reason', None)
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
    merchant_category=p.merchant_category,
    flag_category=getattr(p,'flag_category', None),
    flag_reason=getattr(p,'flag_reason', None)
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
    # Determine / validate status (fallback OPEN)
    desired_status = (payload.status or 'OPEN').upper()
    valid_statuses = {s.value for s in models.PaymentStatus}
    if desired_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="invalid_status")
    status_enum = models.PaymentStatus(desired_status)
    payment = models.Payment(
        id=pid,
        amount=float(payload.amount),
        currency=currency,
        label=label,
        status=status_enum,
        receiver_account=payload.receiver_account,
        transaction_type=payload.transaction_type,
        payment_channel=payload.payment_channel,
        merchant_category=payload.merchant_category,
        fraud_type=payload.fraud_type
    )
    db.add(payment)
    case_id: Optional[str] = None
    # Auto-create case only for FLAGGED payments
    if status_enum == models.PaymentStatus.flagged:
        case_id = 'case-' + uuid.uuid4().hex[:12]
        auto_case = models.Case(
            id=case_id,
            reason='Flagged payment review',
            amount=payment.amount,
            currency=payment.currency,
            owner='system',
            payment_id=payment.id,
        )
        db.add(auto_case)
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
        merchant_category=payment.merchant_category,
    case_id=case_id,
    flag_category=getattr(payment,'flag_category', None),
    flag_reason=getattr(payment,'flag_reason', None)
    )

ISSUE_REASONS = {
    models.ClientIssueReason.not_recognized,
    models.ClientIssueReason.undelivered,
    models.ClientIssueReason.subscription_canceled_but_charged,
    models.ClientIssueReason.double_charge,
    models.ClientIssueReason.stolen_card,
    models.ClientIssueReason.not_as_described,
    models.ClientIssueReason.family_fraud,
    models.ClientIssueReason.trial_auto_renew,
}

@app.post("/payments/{payment_id}/simulate", response_model=PaymentSimulationResponse)
def simulate_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.get(models.Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="payment_not_found")
    if payment.status != models.PaymentStatus.open:
        raise HTTPException(status_code=400, detail="only_open_payments_can_be_simulated")
    profiles = db.query(models.ClientProfile).limit(200).all()
    if not profiles:
        raise HTTPException(status_code=400, detail="no_client_profiles_seeded")
    profile = random.choice(profiles)
    # Determine outcome & flag metadata
    flag_category: Optional[str] = None
    flag_reason: Optional[str] = None
    if getattr(profile, 'risk_trigger', None):  # Risk-only profile
        new_status = models.PaymentStatus.flagged
        outcome = "flagged"
        flag_category = 'RISK'
        flag_reason = profile.risk_trigger
    elif profile.reason == models.ClientIssueReason.successful:
        new_status = models.PaymentStatus.successful
        outcome = "success"
    elif profile.reason == models.ClientIssueReason.failed:
        new_status = models.PaymentStatus.failed
        outcome = "failed"
    elif profile.reason in ISSUE_REASONS:
        new_status = models.PaymentStatus.flagged
        outcome = "flagged"
        flag_category = 'DISPUTE'
        flag_reason = (profile.reason.value if hasattr(profile.reason,'value') else str(profile.reason))
    else:
        new_status = models.PaymentStatus.successful
        outcome = "success"
    payment.status = new_status
    if new_status == models.PaymentStatus.flagged:
        payment.flag_category = flag_category
        payment.flag_reason = flag_reason
    case_id: Optional[str] = None
    if new_status == models.PaymentStatus.flagged:
        # Auto-create a case if none exists for this payment
        existing_case = db.query(models.Case).filter(models.Case.payment_id == payment.id).first()
        if not existing_case:
            case_id = 'case-' + uuid.uuid4().hex[:12]
            case_reason_map = {
                models.ClientIssueReason.not_recognized: 'Unrecognized charge',
                models.ClientIssueReason.undelivered: 'Product not delivered',
                models.ClientIssueReason.subscription_canceled_but_charged: 'Subscription canceled but charged',
                models.ClientIssueReason.double_charge: 'Double charge',
                models.ClientIssueReason.stolen_card: 'Stolen card claim',
                models.ClientIssueReason.not_as_described: 'Not as described',
                models.ClientIssueReason.family_fraud: 'Family / friendly fraud',
                models.ClientIssueReason.trial_auto_renew: 'Trial auto-renew dispute',
            }
            db.add(models.Case(
                id=case_id,
                reason=case_reason_map.get(profile.reason, flag_reason or 'Flagged payment review'),
                amount=payment.amount,
                currency=payment.currency,
                owner='system',
                payment_id=payment.id,
            ))
    db.commit()
    db.refresh(payment)
    p_out = PaymentOut(
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
        merchant_category=payment.merchant_category,
        case_id=case_id,
        flag_category=getattr(payment,'flag_category', None),
        flag_reason=getattr(payment,'flag_reason', None)
    )
    return PaymentSimulationResponse(
        payment=p_out,
        client=ClientProfileFull(
            id=profile.id,
            reason=profile.reason.value if hasattr(profile.reason,'value') else str(profile.reason),
            email_masked=getattr(profile, 'email_masked', None),
            country=getattr(profile, 'country', None),
            total_payments=getattr(profile, 'total_payments', None),
            disputed_payments=getattr(profile, 'disputed_payments', None),
            chargeback_win_rate=getattr(profile, 'chargeback_win_rate', None),
            average_ticket=getattr(profile, 'average_ticket', None),
            lifetime_value=getattr(profile, 'lifetime_value', None),
            risk_trigger=getattr(profile, 'risk_trigger', None),
        ),
        outcome=outcome,
        case_id=case_id
    )

@app.post('/payments/{payment_id}/risk_decision', response_model=PaymentOut)
def apply_risk_decision(payment_id: str, payload: PaymentRiskDecision, db: Session = Depends(get_db)):
    p = db.get(models.Payment, payment_id)
    if not p:
        raise HTTPException(status_code=404, detail='payment_not_found')
    if p.status != models.PaymentStatus.flagged or getattr(p, 'flag_category', None) != 'RISK':
        raise HTTPException(status_code=400, detail='not_risk_flagged')
    # Apply decision
    target_status = models.PaymentStatus.successful if payload.decision == 'SUCCESSFUL' else models.PaymentStatus.failed
    p.status = target_status
    db.commit()
    db.refresh(p)
    return PaymentOut(
        id=p.id,
        amount=p.amount,
        currency=p.currency,
        label=p.label,
        status=p.status.value if hasattr(p.status,'value') else p.status,
        created_at=p.created_at.isoformat() if p.created_at else None,
        fraud_type=p.fraud_type,
        receiver_account=p.receiver_account,
        transaction_type=p.transaction_type,
        payment_channel=p.payment_channel,
        merchant_category=p.merchant_category,
        flag_category=getattr(p,'flag_category', None),
        flag_reason=getattr(p,'flag_reason', None)
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

@app.get('/analytics/cases', response_model=AnalyticsResponse)
def analytics_cases(days: int = 30, threshold: int = 70, include_fees: bool = True,
                    reason: Optional[str] = None, owner: Optional[str] = None, status: Optional[str] = None,
                    db: Session = Depends(get_db)):
    days = max(1, min(days, 365))
    threshold = max(0, min(threshold, 100))
    window_start = datetime.utcnow() - timedelta(days=days)
    # Load cases in period
    q = db.query(models.Case).filter(models.Case.created_at >= window_start)
    if reason:
        q = q.filter(models.Case.reason == reason)
    if owner:
        q = q.filter(models.Case.owner == owner)
    if status:
        q = q.filter(models.Case.status == status)
    cases: List[models.Case] = q.all()
    case_ids = [c.id for c in cases]
    events_by_case: Dict[str, List[models.CaseEvent]] = {cid: [] for cid in case_ids}
    if case_ids:
        evts = db.query(models.CaseEvent).filter(models.CaseEvent.case_id.in_(case_ids)).all()
        for e in evts:
            events_by_case.setdefault(e.case_id, []).append(e)
    # Checklist items (required/ok) for completeness metric
    checklist_by_case: Dict[str, List[models.ChecklistItem]] = {cid: [] for cid in case_ids}
    if case_ids:
        items = db.query(models.ChecklistItem).filter(models.ChecklistItem.case_id.in_(case_ids)).all()
        for it in items:
            checklist_by_case.setdefault(it.case_id, []).append(it)
    # Build enriched list
    enriched = []
    for c in cases:
        evts = events_by_case.get(c.id, [])
        # derive submitted_at, closed_at
        submitted_at = None
        closed_at = None
        for e in evts:
            if e.action == 'status_change':
                st = e.details.get('status') if isinstance(e.details, dict) else None
                if st == 'Sent' and submitted_at is None:
                    submitted_at = e.at
                if st in ('Won', 'Lost') and closed_at is None:
                    closed_at = e.at
        enriched.append({
            'case': c,
            'events': evts,
            'submitted_at': submitted_at,
            'closed_at': closed_at
        })
    # Metrics
    sent_cases_list = [e for e in enriched if e['submitted_at'] is not None or e['case'].status in (models.CaseStatus.sent, models.CaseStatus.won, models.CaseStatus.lost)]
    won_cases_list = [e for e in enriched if e['case'].status == models.CaseStatus.won]
    lost_cases_list = [e for e in enriched if e['case'].status == models.CaseStatus.lost]
    win_rate = (len(won_cases_list) / len(sent_cases_list) * 100) if sent_cases_list else 0.0
    # Money saved vs baseline (similar heuristic)
    feeRep = 60.0
    costOperare = 15.0
    money_saved = 0.0
    baseline_loss = 0.0
    for e in sent_cases_list:
        amount = float(e['case'].amount or 0)
        baseline_loss += -amount
        costFight = feeRep + costOperare
        if e['case'].status == models.CaseStatus.won:
            money_saved += (amount - costFight)
        elif e['case'].status == models.CaseStatus.lost:
            money_saved += (-amount - costFight)
    # Top reason among sent
    reason_counts: Dict[str, int] = {}
    for e in sent_cases_list:
        r = e['case'].reason or 'Unknown'
        reason_counts[r] = reason_counts.get(r, 0) + 1
    top_reason = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[0][0] if reason_counts else None
    # Avg submit hours
    submit_deltas = []
    for e in sent_cases_list:
        created = e['case'].created_at
        sub = e['submitted_at']
        if created and sub and sub > created:
            submit_deltas.append((sub - created).total_seconds())
    avg_submit_hours = (sum(submit_deltas) / len(submit_deltas) / 3600.0) if submit_deltas else 0.0
    # SLA respect
    sla_cases = []
    sla_ok = 0
    for e in sent_cases_list:
        c = e['case']
        if c.deadline and e['submitted_at']:
            sla_cases.append(c)
            if e['submitted_at'] < c.deadline:
                sla_ok += 1
    sla_respect = (sla_ok / len(sla_cases) * 100) if sla_cases else 0.0
    # Override rate (events override_decision / status_change decisions Sent/Won/Lost)
    overrides = 0
    decision_events = 0
    for e in enriched:
        for ev in e['events']:
            if ev.action == 'override_decision':
                overrides += 1
            if ev.action == 'status_change':
                st = ev.details.get('status') if isinstance(ev.details, dict) else None
                if st in ('Sent', 'Won', 'Lost'):
                    decision_events += 1
    override_rate = (overrides / decision_events * 100) if decision_events else 0.0
    # Checklist complete (% sent cases where all required items status='ok')
    checklist_sent = 0
    checklist_ok = 0
    for e in sent_cases_list:
        items = checklist_by_case.get(e['case'].id, [])
        required_items = [it for it in items if it.required]
        if required_items:
            checklist_sent += 1
            if all(it.status == 'ok' for it in required_items):
                checklist_ok += 1
    checklist_complete = (checklist_ok / checklist_sent * 100) if checklist_sent else 0.0
    # Motive chart
    motive_map: Dict[str, Dict[str, Any]] = {}
    for e in enriched:
        r = e['case'].reason or 'Unknown'
        bucket = motive_map.setdefault(r, {'reason': r, 'total': 0, 'won': 0, 'lost': 0})
        bucket['total'] += 1
        if e['case'].status == models.CaseStatus.won:
            bucket['won'] += 1
        if e['case'].status == models.CaseStatus.lost:
            bucket['lost'] += 1
    motive_chart = list(motive_map.values())
    # Win rate evolution (daily)
    daily: Dict[str, Dict[str, Any]] = {}
    for e in enriched:
        day = (e['case'].created_at.date().isoformat()) if e['case'].created_at else datetime.utcnow().date().isoformat()
        bucket = daily.setdefault(day, {'date': day, 'sent': 0, 'won': 0})
        if e in sent_cases_list:
            bucket['sent'] += 1
        if e['case'].status == models.CaseStatus.won:
            bucket['won'] += 1
    win_rate_evolution = [{'date': d['date'], 'winRate': (d['won']/d['sent']*100) if d['sent'] else 0.0} for d in sorted(daily.values(), key=lambda x: x['date'])]
    # Operator performance
    op_map: Dict[str, Dict[str, Any]] = {}
    for e in enriched:
        op = e['case'].owner or '—'
        bucket = op_map.setdefault(op, {'operator': op, 'sent': 0, 'won': 0, 'timeSum': 0.0, 'timeCount': 0})
        if e in sent_cases_list:
            bucket['sent'] += 1
            if e['submitted_at'] and e['case'].created_at and e['submitted_at'] > e['case'].created_at:
                bucket['timeSum'] += (e['submitted_at'] - e['case'].created_at).total_seconds()
                bucket['timeCount'] += 1
        if e['case'].status == models.CaseStatus.won:
            bucket['won'] += 1
    operator_performance = [
        {
            'operator': b['operator'],
            'winRate': (b['won']/b['sent']*100) if b['sent'] else 0.0,
            'avgHours': (b['timeSum']/b['timeCount']/3600.0) if b['timeCount'] else 0.0
        } for b in op_map.values()
    ]
    # What-if simulator
    th = threshold / 100.0
    fight_cases = 0
    fight_prob_sum = 0.0
    totalEV = 0.0
    currentEV = 0.0
    for e in enriched:
        c = e['case']
        amount = float(c.amount or 0)
        p = float(c.probability or 0.5)
        fee_total = (60.0 + 15.0) if include_fees else 0.0
        if p >= th:
            fight_cases += 1
            fight_prob_sum += p
            totalEV += (2*p - 1)*amount - fee_total
        else:
            totalEV += -amount
        # current policy uses recommendation
        if (c.recommendation or '').lower() == 'fight':
            currentEV += (2*p - 1)*amount - fee_total
        else:
            currentEV += -amount
    winRateEst = (fight_prob_sum / fight_cases * 100) if fight_cases else 0.0
    delta = totalEV - currentEV
    what_if = AnalyticsWhatIf(
        fightCases=fight_cases,
        winRateEst=winRateEst,
        totalEV=totalEV,
        delta=delta,
        currentEV=currentEV
    )
    distinct_reasons = sorted({ (e['case'].reason or 'Unknown') for e in enriched })
    distinct_owners = sorted({ (e['case'].owner or '—') for e in enriched })
    statuses = [s.value for s in models.CaseStatus]
    return AnalyticsResponse(
        period_days=days,
        total_cases=len(enriched),
        sent_cases=len(sent_cases_list),
        won_cases=len(won_cases_list),
        lost_cases=len(lost_cases_list),
        win_rate=win_rate,
        money_saved=money_saved,
        baseline_loss=baseline_loss,
        top_reason=top_reason,
        avg_submit_hours=avg_submit_hours,
        sla_respect=sla_respect,
        override_rate=override_rate,
        checklist_complete=checklist_complete,
        motive_chart=motive_chart,
        win_rate_evolution=win_rate_evolution,
        operator_performance=operator_performance,
        what_if=what_if,
        distinct_reasons=distinct_reasons,
        distinct_owners=distinct_owners,
        statuses=statuses,
        generated_at=datetime.utcnow().isoformat()
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
        return ChatResponse(answer=answer or "(no answer)")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

# Local run helper
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



