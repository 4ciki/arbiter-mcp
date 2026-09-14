"""
db — SQLAlchemy models and repository for Arbiter.

Public surface:
    engine       — SQLAlchemy engine (use for test setup / migrations)
    SessionLocal — session factory; use as a context manager
    Base         — DeclarativeBase shared by all models
    repository   — module with all query logic; nothing else queries the DB
"""

from .models import Base, engine, SessionLocal, TicketRow, DecisionRow, CategoryStatsRow, AuditLogRow

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "TicketRow",
    "DecisionRow",
    "CategoryStatsRow",
    "AuditLogRow",
]
