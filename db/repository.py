"""
Repository — all database query logic lives here.

Rules:
  - No raw SQL or ORM queries appear anywhere else in the codebase.
  - Every public method accepts and returns application-layer types
    (schemas.py Pydantic models), never raw ORM rows. Callers never
    import db/models.py directly.
  - audit_log is append-only: there is no update_audit_log or
    delete_audit_log method, and none will ever be added.
  - All datetimes are stored as UTC-naive in SQLite; this module
    strips tzinfo on write and reattaches UTC on read.

Usage:
    from db.repository import ArbiterRepository
    repo = ArbiterRepository()
    repo.save_ticket(ticket)
    decision = repo.get_decision(decision_id)
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator, Optional

from sqlalchemy.orm import Session

from db.models import (
    AuditLogRow,
    CategoryStatsRow,
    DecisionRow,
    SessionLocal,
    TicketRow,
)
from schemas import CategoryStats, Decision, SimilarCase, Ticket, TrustScore


# ── Datetime helpers ───────────────────────────────────────────────────────────

def _strip_tz(dt: Optional[datetime]) -> Optional[datetime]:
    """Remove tzinfo before writing to SQLite (no tz column type)."""
    if dt is None:
        return None
    return dt.replace(tzinfo=None)


def _add_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Reattach UTC tzinfo after reading from SQLite."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


# ── Row ↔ schema converters ────────────────────────────────────────────────────

def _ticket_from_row(row: TicketRow) -> Ticket:
    return Ticket(
        id=row.id,
        source=row.source,
        text=row.text,
        created_at=_add_utc(row.created_at),
    )


def _decision_from_row(row: DecisionRow) -> Decision:
    trust_score = TrustScore(
        value=row.trust_value,
        retrieval_component=row.retrieval_component,
        category_success_component=row.category_success_component,
        llm_confidence_component=row.llm_confidence_component,
        risk_override=row.risk_override,
    )
    return Decision(
        ticket_id=row.ticket_id,
        action=row.action,  # type: ignore[arg-type]
        trust_score=trust_score,
        human_response=row.human_response,  # type: ignore[arg-type]
        resolved_at=_add_utc(row.resolved_at),
    )


# ── Repository ─────────────────────────────────────────────────────────────────

class ArbiterRepository:
    """
    All database access for Arbiter. Instantiate once at app startup and
    inject wherever needed (FastAPI dependency, agent nodes, etc.).

    Every method opens and closes its own session. For multi-step
    operations that must be atomic, use the session() context manager
    and pass the session explicitly — but prefer individual method calls
    where atomicity is not required to keep callsites simple.
    """

    @contextmanager
    def _session(self) -> Generator[Session, None, None]:
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    # ── tickets ───────────────────────────────────────────────────────────────

    def save_ticket(self, ticket: Ticket) -> None:
        """Insert or replace a ticket record."""
        with self._session() as s:
            existing = s.get(TicketRow, ticket.id)
            if existing is None:
                s.add(TicketRow(
                    id=ticket.id,
                    source=ticket.source,
                    text=ticket.text,
                    created_at=_strip_tz(ticket.created_at),
                ))
            else:
                existing.source = ticket.source
                existing.text = ticket.text
                existing.created_at = _strip_tz(ticket.created_at)

    def get_ticket(self, ticket_id: str) -> Optional[Ticket]:
        """Return a Ticket by id, or None if not found."""
        with self._session() as s:
            row = s.get(TicketRow, ticket_id)
            return _ticket_from_row(row) if row else None

    def list_tickets(self, offset: int = 0, limit: int = 50) -> list[Ticket]:
        """Paginated list of tickets, newest first."""
        with self._session() as s:
            rows = (
                s.query(TicketRow)
                .order_by(TicketRow.created_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return [_ticket_from_row(r) for r in rows]

    # ── decisions ─────────────────────────────────────────────────────────────

    def save_decision(self, decision: Decision) -> int:
        """
        Insert a new decision row and return its auto-generated integer id.
        Should be called BEFORE any external action (Jira comment / Slack
        card) so the audit trail is written first.
        """
        with self._session() as s:
            ts = decision.trust_score
            row = DecisionRow(
                ticket_id=decision.ticket_id,
                action=decision.action,
                trust_value=ts.value,
                retrieval_component=ts.retrieval_component,
                category_success_component=ts.category_success_component,
                llm_confidence_component=ts.llm_confidence_component,
                risk_override=ts.risk_override,
                human_response=decision.human_response,
                resolved_at=_strip_tz(decision.resolved_at),
            )
            s.add(row)
            s.flush()  # populate row.id before commit
            return row.id

    def get_decision(self, decision_id: int | str) -> Optional[Decision]:
        """Return a Decision by integer id or ticket_id string, or None."""
        with self._session() as s:
            if isinstance(decision_id, int):
                row = s.get(DecisionRow, decision_id)
            elif isinstance(decision_id, str) and decision_id.isdigit():
                row = s.get(DecisionRow, int(decision_id))
            else:
                row = (
                    s.query(DecisionRow)
                    .filter(DecisionRow.ticket_id == str(decision_id))
                    .order_by(DecisionRow.created_at.desc())
                    .first()
                )
            return _decision_from_row(row) if row else None

    def get_decision_by_ticket_id(self, ticket_id: str) -> Optional[Decision]:
        """Return the latest Decision for a ticket_id, or None."""
        return self.get_decision(ticket_id)

    def mark_decision_resolved(
        self,
        decision_id: int | str,
        resolved_at: Optional[datetime] = None,
    ) -> None:
        """Mark an existing decision as resolved with a timestamp."""
        with self._session() as s:
            if isinstance(decision_id, int):
                row = s.get(DecisionRow, decision_id)
            elif isinstance(decision_id, str) and decision_id.isdigit():
                row = s.get(DecisionRow, int(decision_id))
            else:
                row = (
                    s.query(DecisionRow)
                    .filter(DecisionRow.ticket_id == str(decision_id))
                    .order_by(DecisionRow.created_at.desc())
                    .first()
                )
            if row is not None:
                row.resolved_at = _strip_tz(resolved_at or datetime.now(timezone.utc))

    def update_human_response(
        self,
        decision_id: int | str,
        human_response: str,
        resolved_at: Optional[datetime] = None,
    ) -> None:
        """
        Record the human's response to an escalated card. Called by the
        Slack interaction webhook after signature verification.
        Accepts either an integer decision_id or a ticket_id string.
        """
        with self._session() as s:
            if isinstance(decision_id, int):
                row = s.get(DecisionRow, decision_id)
            elif isinstance(decision_id, str) and decision_id.isdigit():
                row = s.get(DecisionRow, int(decision_id))
            else:
                row = (
                    s.query(DecisionRow)
                    .filter(DecisionRow.ticket_id == str(decision_id))
                    .order_by(DecisionRow.created_at.desc())
                    .first()
                )
            if row is None:
                raise ValueError(f"Decision {decision_id} not found")
            row.human_response = human_response
            row.resolved_at = _strip_tz(resolved_at or datetime.now(timezone.utc))

    def list_decisions(self, offset: int = 0, limit: int = 50) -> list[Decision]:
        """Paginated list of decisions, newest first."""
        with self._session() as s:
            rows = (
                s.query(DecisionRow)
                .order_by(DecisionRow.created_at.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return [_decision_from_row(r) for r in rows]

    # ── category_stats ────────────────────────────────────────────────────────

    def get_category_stats(self, category: str) -> Optional[CategoryStats]:
        """
        Return a CategoryStats model for a category, or None if no data
        exists yet (cold start). The trust scorer uses this to decide whether
        to apply the cold-start rate.

        Returns a Pydantic model (not an ORM row) so the caller never touches
        a detached SQLAlchemy object after the session closes.
        """
        with self._session() as s:
            row = s.get(CategoryStatsRow, category)
            if row is None:
                return None
            # Read attributes while still inside the session
            return CategoryStats(
                category=row.category,
                total_handled=row.total_handled,
                human_agreed_count=row.human_agreed_count,
            )

    def increment_category_stats(self, category: str, human_agreed: bool) -> None:
        """
        Increment total_handled by 1, and conditionally increment
        human_agreed_count. Called by the Slack webhook after a human
        interacts with an escalated card.

        human_agreed=True  when the human clicked Approve (or made no change).
        human_agreed=False when the human clicked Escalate Further.
        """
        with self._session() as s:
            row = s.get(CategoryStatsRow, category)
            if row is None:
                row = CategoryStatsRow(
                    category=category,
                    total_handled=0,
                    human_agreed_count=0,
                )
                s.add(row)
                s.flush()
            row.total_handled += 1
            if human_agreed:
                row.human_agreed_count += 1

    # ── audit_log (append-only) ───────────────────────────────────────────────

    def append_audit_log(
        self,
        event_type: str,
        ticket_id: Optional[str] = None,
        decision_id: Optional[int] = None,
        score_components: Optional[dict] = None,
    ) -> int:
        """
        Write one audit event and return its id. This is the ONLY write
        method for audit_log. There is no update or delete — by design.

        Callers must invoke this BEFORE any external action (Jira, Slack)
        so the record exists even if the downstream call fails.
        """
        with self._session() as s:
            row = AuditLogRow(
                ticket_id=ticket_id,
                decision_id=decision_id,
                event_type=event_type,
                score_components=score_components,
            )
            s.add(row)
            s.flush()
            return row.id

    def list_audit_log(
        self,
        offset: int = 0,
        limit: int = 100,
        ticket_id: Optional[str] = None,
    ) -> list[dict]:
        """
        Paginated audit log, oldest first (chronological order is the natural
        reading order for an audit trail). Returns plain dicts so the API
        layer doesn't need to import ORM row types.
        """
        with self._session() as s:
            query = s.query(AuditLogRow)
            if ticket_id is not None:
                query = query.filter(AuditLogRow.ticket_id == ticket_id)
            rows = (
                query
                .order_by(AuditLogRow.created_at.asc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return [
                {
                    "id": r.id,
                    "ticket_id": r.ticket_id,
                    "decision_id": r.decision_id,
                    "event_type": r.event_type,
                    "score_components": r.score_components,
                    "created_at": _add_utc(r.created_at),
                }
                for r in rows
            ]
