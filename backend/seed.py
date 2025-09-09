"""Extended deterministic seed: ~10 users, 10 cases with checklist, events, notes, attachments.
Safe to rerun: skips existing primary keys.
"""

from app.db.session import SessionLocal
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
    PAYMENTS.append({
        'id': f'PAY-{3000+i}',
        'amount': round(random.uniform(25, 2500),2),
        'currency': random.choice(['RON','EUR','USD']),
        'label': random.choice(['Monthly subscription','One-time order','Upgrade plan','Charge test','Premium renewal']),
        'status': st,
        'created_at': NOW - timedelta(hours=random.randint(1,240))
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
        # Users
        for u in USERS:
            if not db.get(models.User, u['id']):
                db.add(models.User(**u))
        db.commit()

        # Payments first
        for p in PAYMENTS:
            if not db.get(models.Payment, p['id']):
                db.add(models.Payment(**p))
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
        print("Seed completed (users, cases, checklist, events, attachments, notes).")
    finally:
        db.close()

if __name__ == '__main__':
    seed()
