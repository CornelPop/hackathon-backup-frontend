from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Enum, Float, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base
import enum

class CaseStatus(str, enum.Enum):
    open = 'Open'
    in_progress = 'In Progress'
    sent = 'Sent'
    won = 'Won'
    lost = 'Lost'

class PaymentStatus(str, enum.Enum):
    open = 'OPEN'
    successful = 'SUCCESSFUL'
    flagged = 'FLAGGED'
    failed = 'FAILED'

class UserRole(str, enum.Enum):
    operator = 'operator'
    admin = 'admin'
    user = 'user'

class Payment(Base):
    __tablename__ = 'payment'
    id = Column(String, primary_key=True)  # Transaction ID
    fraud_type = Column(String, nullable=True)  # Fraud Type (categoric optional)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)  # Timestamp
    sender_account = Column(String, nullable=True)  # Sender Account
    receiver_account = Column(String, nullable=True)  # Receiver Account
    amount = Column(Float, nullable=False)  # Amount
    transaction_type = Column(String, nullable=True)  # Transaction Type
    merchant_category = Column(String, nullable=True)  # Merchant Category
    location = Column(String, nullable=True)  # Location
    device_used = Column(String, nullable=True)  # Device Used (model / type)
    payment_channel = Column(String, nullable=True)  # Payment Channel (web/app/pos)
    ip_address = Column(String, nullable=True)  # IP Address
    device_hash = Column(String, nullable=True)  # Device Hash / fingerprint
    velocity_score = Column(Float, nullable=True)  # Velocity Score
    geo_anomaly_score = Column(Float, nullable=True)  # Geo Anomaly Score
    time_since_last_txn = Column(Float, nullable=True)  # Time Since Last Txn (seconds/minutes)
    spending_deviation_score = Column(Float, nullable=True)  # Spending Deviation Score
    fraudulent = Column(Boolean, default=False)  # Fraudulent flag
    currency = Column(String(8), default='RON')  # Keep for amount context
    label = Column(String, nullable=False)  # Original description / label
    status = Column(Enum(PaymentStatus), default=PaymentStatus.open, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # reverse link for cases referencing payment_id
    cases = relationship('Case', back_populates='payment')
    

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.operator, index=True)
    active = Column(Boolean, default=True)
    password_hash = Column(String, nullable=True)  # simple hash (bcrypt/sha256) stored; nullable for legacy seeded users
    created_via_signup = Column(Boolean, default=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    cases = relationship('Case', back_populates='owner_user')
    events = relationship('CaseEvent', back_populates='actor_user')
    notes = relationship('Note', back_populates='author_user')
    

class Case(Base):
    id = Column(String, primary_key=True, index=True)
    reason = Column(String, index=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.open, index=True)
    amount = Column(Float, nullable=False, default=0)
    currency = Column(String(8), default='RON')
    probability = Column(Float, default=0.5)
    recommendation = Column(String, default='Refund')
    # textual legacy owner label (used by API serialization)
    owner = Column(String, index=True)
    owner_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), index=True, nullable=True)
    payment_id = Column(String, ForeignKey('payment.id', ondelete='SET NULL'), index=True, nullable=True)
    deadline = Column(DateTime, nullable=True)
    letter = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    checklist_items = relationship('ChecklistItem', back_populates='case', cascade='all, delete-orphan')
    events = relationship('CaseEvent', back_populates='case', cascade='all, delete-orphan')
    attachments = relationship('Attachment', back_populates='case', cascade='all, delete-orphan')
    notes = relationship('Note', back_populates='case', cascade='all, delete-orphan')
    owner_user = relationship('User', back_populates='cases')
    payment = relationship('Payment', back_populates='cases')

class ChecklistItem(Base):
    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey('case.id', ondelete='CASCADE'), index=True)
    label = Column(String)
    required = Column(Boolean, default=False)
    status = Column(String, default='missing')
    extracted = Column(String, default='')
    na_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    case = relationship('Case', back_populates='checklist_items')

class CaseEvent(Base):
    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey('case.id', ondelete='CASCADE'), index=True)
    action = Column(String, index=True)
    actor_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    actor_name = Column(String, nullable=True)
    category = Column(String, index=True)
    details = Column(JSON)
    protected = Column(Boolean, default=False)
    at = Column(DateTime, default=datetime.utcnow, index=True)
    case = relationship('Case', back_populates='events')
    actor_user = relationship('User', back_populates='events')

class Attachment(Base):
    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey('case.id', ondelete='CASCADE'), index=True)
    name = Column(String)
    size = Column(Integer)
    mime_type = Column(String)
    stored_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    case = relationship('Case', back_populates='attachments')

class Note(Base):
    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey('case.id', ondelete='CASCADE'), index=True)
    author = Column(String)  # legacy textual
    author_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    case = relationship('Case', back_populates='notes')
    author_user = relationship('User', back_populates='notes')
