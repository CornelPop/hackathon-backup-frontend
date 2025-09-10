"""Extended deterministic seed: ~10 users, 10 cases with checklist, events, notes, attachments.
Safe to rerun: skips existing primary keys.
"""

from app.db.session import SessionLocal, engine
from app.db.base import Base
from sqlalchemy import inspect, text
from app import models
from datetime import datetime, timedelta
import random
import uuid

random.seed(42)
NOW = datetime.utcnow()

USERS = [
    {"id": f"u-{slug}", "email": f"{slug}@example.com", "name": name, "role": role}
    for slug, name, role in [
        ("dana","Dana","operator"),
        ("mihai","Mihai","operator"),
        ("irina","Irina","operator"),
        ("andrei","Andrei","operator"),
        ("roxana","Roxana","qa"),
        ("ioana","Ioana","analyst"),
        ("paul","Paul","operator"),
        ("teo","Teodor","lead"),
        ("maria","Maria","operator"),
        ("alex","Alex","analyst"),
    ]
]

REASONS = ["Fraudă","Nelivrat","Neconform","Dublă","Abonament"]

# Helper probability -> recommendation mapping
def rec_from_prob(p: float) -> str:
    return "Fight" if p >= 0.55 else "Refund"

def gen_case(idx: int):
    reason = REASONS[idx % len(REASONS)]
    prob = round(random.uniform(0.25,0.9),2)
    status_cycle = [models.CaseStatus.open, models.CaseStatus.in_progress, models.CaseStatus.sent, models.CaseStatus.won, models.CaseStatus.lost]
    status = status_cycle[idx % len(status_cycle)]
    owner_user = random.choice(USERS)
    base_created = NOW - timedelta(hours=random.randint(5,140))
    deadline = base_created + timedelta(hours=random.randint(20,140))
    return {
        "id": f"CB-{2000+idx}",
        "reason": reason,
        "status": status,
        "amount": round(random.uniform(40,1800),2),
        "currency": random.choice(["RON","EUR"]),
        "probability": prob,
        "recommendation": rec_from_prob(prob),
        "owner": owner_user["name"],
        "owner_id": owner_user["id"],
        "deadline": deadline,
        "created_at": base_created,
        "updated_at": base_created + timedelta(hours=random.randint(1,6))
    }

CASES = [gen_case(i) for i in range(10)]

# Payments (10 records) some will be linked to cases (every even index)
PAYMENTS = []
for i in range(10):
    status_cycle = [models.PaymentStatus.open, models.PaymentStatus.successful, models.PaymentStatus.flagged, models.PaymentStatus.failed]
    st = status_cycle[i % len(status_cycle)]
    base_payment = {
        'id': f'PAY-{3000+i}',
        'amount': round(random.uniform(25, 2500),2),
        'currency': random.choice(['RON','EUR','USD']),
        'label': random.choice(['Monthly subscription','One-time order','Upgrade plan','Charge test','Premium renewal']),
        'status': st,
        'created_at': NOW - timedelta(hours=random.randint(1,240))
    }
    if st == models.PaymentStatus.flagged:
        dispute_codes = [
            models.ClientIssueReason.not_recognized.value,
            models.ClientIssueReason.undelivered.value,
            models.ClientIssueReason.subscription_canceled_but_charged.value,
            models.ClientIssueReason.double_charge.value,
            models.ClientIssueReason.not_as_described.value,
            models.ClientIssueReason.family_fraud.value,
            models.ClientIssueReason.trial_auto_renew.value,
        ]
        base_payment['flag_category'] = 'DISPUTE'
        base_payment['flag_reason'] = random.choice(dispute_codes)
    PAYMENTS.append(base_payment)

# User-specific demo payments for logged email (frontend filtering by receiver_account)
TARGET_USER_EMAIL = 'mihnea.encean2@gmail.com'
USER_PAYMENTS = []
user_statuses = [models.PaymentStatus.open, models.PaymentStatus.successful, models.PaymentStatus.flagged, models.PaymentStatus.failed, models.PaymentStatus.successful, models.PaymentStatus.open]
for idx, st in enumerate(user_statuses, start=1):
    up = {
        'id': f'PAY-MH-{idx:02d}',
        'amount': round(random.uniform(40, 1500),2),
        'currency': random.choice(['RON','EUR']),
        'label': random.choice(['User plan renewal','User charge attempt','User flagged txn','User upgrade','User monthly','User fallback']),
        'status': st,
        'receiver_account': TARGET_USER_EMAIL,
        'payment_channel': random.choice(['Card','Bank Transfer','POS']),
        'merchant_category': random.choice(['games','pharmacy','movies','clinic']),
        'created_at': NOW - timedelta(hours=random.randint(1,120))
    }
    if st == models.PaymentStatus.flagged:
        dispute_codes = [
            models.ClientIssueReason.not_recognized.value,
            models.ClientIssueReason.undelivered.value,
            models.ClientIssueReason.subscription_canceled_but_charged.value,
            models.ClientIssueReason.double_charge.value,
            models.ClientIssueReason.not_as_described.value,
            models.ClientIssueReason.family_fraud.value,
            models.ClientIssueReason.trial_auto_renew.value,
        ]
        up['flag_category'] = 'DISPUTE'
        up['flag_reason'] = random.choice(dispute_codes)
    USER_PAYMENTS.append(up)
# Extra 10 OPEN payments for this user
for i in range(1,11):
    USER_PAYMENTS.append({
        'id': f'PAY-MH-O{i:02d}',
        'amount': round(random.uniform(20, 900),2),
        'currency': random.choice(['RON','EUR']),
        'label': random.choice(['Open invoice','Pending checkout','Awaiting payment','Cart hold','Unpaid order']),
        'status': models.PaymentStatus.open,
        'receiver_account': TARGET_USER_EMAIL,
        'payment_channel': random.choice(['Card','Bank Transfer','POS']),
        'merchant_category': random.choice(['games','pharmacy','movies','clinic']),
        'created_at': NOW - timedelta(hours=random.randint(1,72))
    })
# Add 10 more OPEN payments (O11-O20) for extended dataset
for i in range(11,21):
    USER_PAYMENTS.append({
        'id': f'PAY-MH-O{i:02d}',
        'amount': round(random.uniform(25, 950),2),
        'currency': random.choice(['RON','EUR']),
        'label': random.choice(['Open invoice','Pending checkout','Awaiting payment','Cart hold','Unpaid order','Outstanding']),
        'status': models.PaymentStatus.open,
        'receiver_account': TARGET_USER_EMAIL,
        'payment_channel': random.choice(['Card','Bank Transfer','POS']),
        'merchant_category': random.choice(['games','pharmacy','movies','clinic','electronics']),
        'created_at': NOW - timedelta(hours=random.randint(1,90))
    })
 # Add 15 more OPEN payments (O21-O35) as requested
for i in range(21,36):
    USER_PAYMENTS.append({
        'id': f'PAY-MH-O{i:02d}',
        'amount': round(random.uniform(20, 1200),2),
        'currency': random.choice(['RON','EUR']),
        'label': random.choice(['Open invoice','Pending checkout','Awaiting payment','Cart hold','Unpaid order','Outstanding','Pending capture']),
        'status': models.PaymentStatus.open,
        'receiver_account': TARGET_USER_EMAIL,
        'payment_channel': random.choice(['Card','Bank Transfer','POS']),
        'merchant_category': random.choice(['games','pharmacy','movies','clinic','electronics','services']),
        'created_at': NOW - timedelta(hours=random.randint(1,96))
    })
# Add 15 more OPEN payments (O36-O50) additional batch
for i in range(36,51):
    USER_PAYMENTS.append({
        'id': f'PAY-MH-O{i:02d}',
        'amount': round(random.uniform(18, 1400),2),
        'currency': random.choice(['RON','EUR','USD']),
        'label': random.choice(['Open invoice','Pending checkout','Awaiting payment','Cart hold','Unpaid order','Outstanding','Pending capture','New order pending']),
        'status': models.PaymentStatus.open,
        'receiver_account': TARGET_USER_EMAIL,
        'payment_channel': random.choice(['Card','Bank Transfer','POS','Wallet']),
        'merchant_category': random.choice(['games','pharmacy','movies','clinic','electronics','services','education']),
        'created_at': NOW - timedelta(hours=random.randint(1,120))
    })
for idx, c in enumerate(CASES):
    if idx % 2 == 0 and idx < len(PAYMENTS):
        c['payment_id'] = PAYMENTS[idx]['id']

CHECKLIST_TEMPLATES = {
  'Fraudă': [
    ('fraud-3ds','Dovadă 3-D Secure',True),
    ('fraud-avs-cvv','Rezultat AVS/CVV',True),
    ('fraud-ip','IP / Device',False)
  ],
  'Nelivrat': [
    ('nl-awb','AWB / tracking',True),
    ('nl-courier','Confirmare curier',True),
    ('nl-chat','Conversație client',False)
  ],
  'Neconform': [
    ('nc-photos','Poze produs',True),
    ('nc-desc','Fișă tehnică',True),
    ('nc-rma','RMA',False)
  ],
  'Dublă': [
    ('dbl-both','Ambele plăți (ID + sumă)',True),
    ('dbl-log','Log procesator',True)
  ],
  'Abonament': [
    ('sub-cancel','Cerere anulare',True),
    ('sub-usage','Log folosire',True),
    ('sub-terms','Termeni plan',True)
  ],
}

def checklist_for(case_id: str, reason: str):
    items = []
    for tpl in CHECKLIST_TEMPLATES.get(reason, []):
        status = random.choice(['missing','ok','uploaded','ok'])  # bias spre ok
        if status == 'uploaded':
            status = 'ok'  # mimic auto-validation
        items.append(models.ChecklistItem(
            id=f"{case_id}-{tpl[0]}",
            case_id=case_id,
            label=tpl[1],
            required=tpl[2],
            status=status,
            extracted='' if status!='ok' else 'valid'
        ))
    return items

def base_events(case):
    ev = []
    created_time = case['created_at']
    owner = case['owner']
    owner_id = case['owner_id']
    # Created
    ev.append(models.CaseEvent(
        id=str(uuid.uuid4()), case_id=case['id'], action='status_change', actor_id=owner_id,
        actor_name=owner, category='status', details={'status':'Open'}, protected=False, at=created_time
    ))
    # Progress events depending on final status
    if case['status'] in (models.CaseStatus.in_progress, models.CaseStatus.sent, models.CaseStatus.won, models.CaseStatus.lost):
        ev.append(models.CaseEvent(
            id=str(uuid.uuid4()), case_id=case['id'], action='status_change', actor_id=owner_id,
            actor_name=owner, category='status', details={'status':'In Progress'}, protected=False,
            at=created_time + timedelta(hours=1)
        ))
    if case['status'] in (models.CaseStatus.sent, models.CaseStatus.won, models.CaseStatus.lost):
        ev.append(models.CaseEvent(
            id=str(uuid.uuid4()), case_id=case['id'], action='status_change', actor_id=owner_id,
            actor_name=owner, category='status', details={'status':'Sent'}, protected=True,
            at=created_time + timedelta(hours=2)
        ))
        ev.append(models.CaseEvent(
            id=str(uuid.uuid4()), case_id=case['id'], action='letter_generated', actor_id=owner_id,
            actor_name=owner, category='letter', details={'version':1}, protected=False,
            at=created_time + timedelta(hours=2, minutes=15)
        ))
    if case['status'] in (models.CaseStatus.won, models.CaseStatus.lost):
        ev.append(models.CaseEvent(
            id=str(uuid.uuid4()), case_id=case['id'], action='status_change', actor_id=owner_id,
            actor_name=owner, category='status', details={'status':case['status'].value}, protected=True,
            at=created_time + timedelta(hours=3)
        ))
    # AI recommendation event
    ev.append(models.CaseEvent(
        id=str(uuid.uuid4()), case_id=case['id'], action='ai_recommendation', actor_id=owner_id,
        actor_name=owner, category='ai', details={'probability':case['probability'],'recommendation':case['recommendation']}, protected=False,
        at=created_time + timedelta(minutes=30)
    ))
    return ev

def attachments_for(case):
    if case['status'] == models.CaseStatus.open:
        return []
    att_count = random.randint(1,3)
    out = []
    for i in range(att_count):
        out.append(models.Attachment(
            id=str(uuid.uuid4()), case_id=case['id'], name=f"doc_{i+1}.pdf", size=random.randint(10_000,120_000),
            mime_type='application/pdf', stored_path=None
        ))
    return out

def notes_for(case):
    n = []
    if random.random() < 0.7:
        n.append(models.Note(
            id=str(uuid.uuid4()), case_id=case['id'], author='System', author_id=None, text='Verificare inițială',
            created_at=case['created_at'] + timedelta(minutes=10)
        ))
    if random.random() < 0.5:
        n.append(models.Note(
            id=str(uuid.uuid4()), case_id=case['id'], author=case['owner'], author_id=case['owner_id'], text='Adăugat dovezi',
            created_at=case['created_at'] + timedelta(hours=1, minutes=20)
        ))
    return n

def seed():
    db = SessionLocal()
    try:
        # --- lightweight safety: ensure new columns exist (if migrations not yet run) ---
        try:
            insp = inspect(engine)
            p_cols = {c['name'] for c in insp.get_columns('payment')}
            with engine.begin() as conn:
                if 'flag_category' not in p_cols:
                    conn.execute(text("ALTER TABLE payment ADD COLUMN flag_category VARCHAR"))
                if 'flag_reason' not in p_cols:
                    conn.execute(text("ALTER TABLE payment ADD COLUMN flag_reason VARCHAR"))
            if insp.has_table('client_profiles'):
                cp_cols = {c['name'] for c in insp.get_columns('client_profiles')}
                if 'risk_trigger' not in cp_cols:
                    with engine.begin() as conn:
                        conn.execute(text("ALTER TABLE client_profiles ADD COLUMN risk_trigger VARCHAR"))
        except Exception as e:
            print('[WARN] auto add columns failed (safe to ignore if migrations already applied):', e)

        # Users
        for u in USERS:
            if not db.get(models.User, u['id']):
                db.add(models.User(**u))
        db.commit()

        # Payments first (generic)
        for p in PAYMENTS:
            if not db.get(models.Payment, p['id']):
                db.add(models.Payment(**p))
        db.commit()
        # User-specific payments
        for p in USER_PAYMENTS:
            if not db.get(models.Payment, p['id']):
                db.add(models.Payment(**p))
        db.commit()

        # Retrofit: set flag metadata for existing flagged payments missing category
        flagged_missing = db.query(models.Payment).filter(models.Payment.status==models.PaymentStatus.flagged, models.Payment.flag_category.is_(None)).all()
        if flagged_missing:
            dispute_codes = [
                models.ClientIssueReason.not_recognized.value,
                models.ClientIssueReason.undelivered.value,
                models.ClientIssueReason.subscription_canceled_but_charged.value,
                models.ClientIssueReason.double_charge.value,
                models.ClientIssueReason.not_as_described.value,
                models.ClientIssueReason.family_fraud.value,
                models.ClientIssueReason.trial_auto_renew.value,
            ]
            for fp in flagged_missing:
                fp.flag_category = 'DISPUTE'
                fp.flag_reason = random.choice(dispute_codes)
            db.commit()

        for c in CASES:
            if db.get(models.Case, c['id']):
                continue
            case_obj = models.Case(**c)
            db.add(case_obj)
            # checklist
            for item in checklist_for(c['id'], c['reason']):
                db.add(item)
            # events
            for ev in base_events(c):
                db.add(ev)
            # attachments
            for at in attachments_for(c):
                db.add(at)
            # notes
            for nt in notes_for(c):
                db.add(nt)
        db.commit()
        print("Seed completed (users, cases, checklist, events, attachments, notes, payments incl. user-specific).")
        # Client profiles (ensure table exists)
        insp = inspect(engine)
        if not insp.has_table('client_profiles'):
            Base.metadata.create_all(bind=engine, tables=[models.ClientProfile.__table__])
            db.commit()
        existing_clients = { cp.id for cp in db.query(models.ClientProfile.id).all() }
        ISSUE_SEQUENCE = [
            models.ClientIssueReason.not_recognized,
            models.ClientIssueReason.undelivered,
            models.ClientIssueReason.subscription_canceled_but_charged,
            models.ClientIssueReason.double_charge,
            models.ClientIssueReason.stolen_card,
            models.ClientIssueReason.not_as_described,
            models.ClientIssueReason.family_fraud,
            models.ClientIssueReason.trial_auto_renew,
        ]
        profiles = []
        # 8 issue profiles
        for idx, reason in enumerate(ISSUE_SEQUENCE, start=1):
            profiles.append({
                'id': f'cl-issue-{idx:02d}',
                'email_masked': f'user{idx}***@example.com',
                'country': random.choice(['RO','DE','FR','US','ES']),
                'first_seen': NOW - timedelta(days=random.randint(20,400)),
                'last_activity': NOW - timedelta(days=random.randint(0,5)),
                'total_payments': random.randint(3,25),
                'disputed_payments': random.randint(1,3),
                'chargeback_win_rate': round(random.uniform(20,80),2),
                'average_ticket': round(random.uniform(20,130),2),
                'lifetime_value': round(random.uniform(100,1500),2),
                'reason': reason,
                'notes': 'Seeded profile with dispute reason.'
            })
        # 12 generic success/failed
        for i in range(12):
            reason = models.ClientIssueReason.successful if i % 2 == 0 else models.ClientIssueReason.failed
            profiles.append({
                'id': f'cl-gen-{i+1:02d}',
                'email_masked': f'client{i+1}***@example.com',
                'country': random.choice(['RO','DE','FR','US','UK','IT']),
                'first_seen': NOW - timedelta(days=random.randint(10,600)),
                'last_activity': NOW - timedelta(days=random.randint(0,15)),
                'total_payments': random.randint(1,40),
                'disputed_payments': 0 if reason==models.ClientIssueReason.successful else random.randint(0,2),
                'chargeback_win_rate': 0.0 if reason==models.ClientIssueReason.failed else round(random.uniform(50,95),2),
                'average_ticket': round(random.uniform(15,220),2),
                'lifetime_value': round(random.uniform(50,3200),2),
                'reason': reason,
                'notes': 'Generic profile'
            })
        # 8 risk-only profiles (flagged risk scenarios)
        RISK_CODES = [
            ('AVS_CVV_FAIL_NO_3DS','AVS/CVV fail + 3DS absent'),
            ('TRI_COUNTRY_MISMATCH','BIN/IP/Shipping tri-mismatch'),
            ('VELOCITY_SPIKE','Multiple fails then success'),
            ('ANON_NET','Proxy/VPN/TOR detected'),
            ('HIGH_VALUE_ATYPICAL','High-value atypical'),
            ('TEMP_EMAIL_NEW_DEVICE','Temp email + new device'),
            ('BYPASS_3DS','3DS challenge fail then no 3DS'),
            ('INTERNAL_WATCHLIST','Previously flagged instrument'),
        ]
        for idx, (code, label) in enumerate(RISK_CODES, start=1):
            profiles.append({
                'id': f'cl-risk-{idx:02d}',
                'email_masked': f'risk{idx}***@example.com',
                'country': random.choice(['RO','DE','FR','US','ES','UK']),
                'first_seen': NOW - timedelta(days=random.randint(1,180)),
                'last_activity': NOW - timedelta(days=random.randint(0,3)),
                'total_payments': random.randint(0,5),
                'disputed_payments': 0,
                'chargeback_win_rate': 0.0,
                'average_ticket': round(random.uniform(10,400),2),
                'lifetime_value': round(random.uniform(10,900),2),
                'reason': models.ClientIssueReason.successful,  # neutral outcome history
                'notes': f'Risk trigger: {label}',
                'risk_trigger': code
            })
        for p in profiles:
            if p['id'] not in existing_clients:
                db.add(models.ClientProfile(**p))
        db.commit()
        print('Client profiles seeded: ', len(profiles))
    finally:
        db.close()

if __name__ == '__main__':
    seed()
