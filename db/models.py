"""
SQLAlchemy 2.x ORM models — one class per table.

Design rules enforced here:
  - audit_log has NO update/delete methods in the repository; this file
    deliberately provides no mechanism for it either.
  - trust_score fields are flattened into individual columns in DecisionRow
    so they are directly queryable (e.g. "show me all decisions where
    retrieval_component < 0.5"). The audit_log stores them as JSON for
    completeness.
  - All datetime columns are stored as UTC-naive datetimes (SQLite has no
    timezone type). The repository layer is responsible for stripping tzinfo
    before writing and attaching it on read.

Swapping SQLite for Postgres later: change DATABASE_URL in .env. No
query changes required because every query lives in repository.py, not
scattered across the codebase.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from config import settings


# ── Engine + session factory ───────────────────────────────────────────────────

engine = create_engine(
    settings.DATABASE_URL,
    # SQLite-specific: enable WAL mode for better concurrency, and enforce
    # foreign-key constraints (SQLite disables them by default).
    connect_args={"check_same_thread": False, "timeout": 30.0} if "sqlite" in settings.DATABASE_URL else {},
)

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ── Declarative base ───────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Helper ─────────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    """UTC-naive datetime for storage (SQLite has no timezone type)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Table: tickets ─────────────────────────────────────────────────────────────

class TicketRow(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source: Mapped[str] = mapped_column(String, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ── Table: decisions ───────────────────────────────────────────────────────────

class DecisionRow(Base):
    """
    One row per decision (auto_resolve or escalate). Trust score fields are
    flattened for direct queryability. human_response is null until a human
    acts (escalation path only).
    """
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(
        String, ForeignKey("tickets.id", ondelete="RESTRICT"), nullable=False
    )
    action: Mapped[str] = mapped_column(String, nullable=False)       # "auto_resolve" | "escalate"

    # Trust score components (flattened)
    trust_value: Mapped[float] = mapped_column(Float, nullable=False)
    retrieval_component: Mapped[float] = mapped_column(Float, nullable=False)
    category_success_component: Mapped[float] = mapped_column(Float, nullable=False)
    llm_confidence_component: Mapped[float] = mapped_column(Float, nullable=False)
    risk_override: Mapped[bool] = mapped_column(Boolean, nullable=False)

    human_response: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utcnow)


# ── Table: category_stats ──────────────────────────────────────────────────────

class CategoryStatsRow(Base):
    """
    Running totals per ticket category. Used by the trust scorer to compute
    the category_success_component.

    human_agreed_count: number of decisions in this category where a human
    reviewed and agreed with (or did not escalate further) the agent's
    suggested resolution. Updated by the Slack interaction webhook.
    """
    __tablename__ = "category_stats"

    category: Mapped[str] = mapped_column(String, primary_key=True)
    total_handled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    human_agreed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# ── Table: audit_log ───────────────────────────────────────────────────────────

class AuditLogRow(Base):
    """
    Append-only event log. Every decision — auto or human — gets an entry
    here BEFORE any external action is taken. The repository exposes only
    append_audit_log() and list_audit_log(); there is intentionally no
    update or delete method.

    score_components stores the full TrustScore as a JSON blob so that even
    if the scoring formula changes, historical records remain interpretable.
    """
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    decision_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    score_components: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utcnow)


# ── Create all tables ──────────────────────────────────────────────────────────
# Called on import so the app starts with the schema in place.
# For production migrations, replace this with Alembic.
Base.metadata.create_all(bind=engine)
