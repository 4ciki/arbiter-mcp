"""
db/supabase_client.py
Dynamic, multi-user unstructured data layer using Supabase PostgreSQL + JSONB.

Features:
- Stores user credentials, integrations, and preferences per user UID
- Stores tickets and audit logs as flexible JSONB documents
- Native cloud persistence independent of container restarts / sleeps
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from config import settings

log = logging.getLogger("arbiter.supabase")


class SupabaseStore:
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = (url or settings.SUPABASE_URL or "").rstrip("/")
        self.key = key or settings.SUPABASE_KEY or ""
        self._headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

    @property
    def is_configured(self) -> bool:
        return bool(self.url and self.key)

    def get_user_config(self, uid: str) -> Optional[Dict[str, Any]]:
        """Fetch dynamic user configuration JSON by UID."""
        if not self.is_configured or not uid:
            return None
        endpoint = f"{self.url}/rest/v1/user_configs?uid=eq.{uid}&select=config_json"
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.get(endpoint, headers=self._headers)
                if res.status_code == 200:
                    rows = res.json()
                    if rows and isinstance(rows, list) and len(rows) > 0:
                        return rows[0].get("config_json")
        except Exception as exc:
            log.warning("Supabase get_user_config error for uid=%s: %s", uid, exc)
        return None

    def save_user_config(self, uid: str, config: Dict[str, Any], email: str = "") -> Optional[Dict[str, Any]]:
        """Upsert dynamic user configuration JSON by UID."""
        if not self.is_configured or not uid:
            return None
        endpoint = f"{self.url}/rest/v1/user_configs"
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "uid": uid,
            "email": email or "",
            "config_json": config,
            "updated_at": now_iso,
        }
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.post(endpoint, headers=self._headers, json=payload)
                if res.status_code in (200, 201):
                    return config
                else:
                    log.warning("Supabase save_user_config returned %s: %s", res.status_code, res.text)
        except Exception as exc:
            log.warning("Supabase save_user_config error for uid=%s: %s", uid, exc)
        return None

    def save_ticket(self, ticket_id: str, user_uid: str, ticket_data: Dict[str, Any]) -> bool:
        """Upsert unstructured ticket JSON by ID."""
        if not self.is_configured or not ticket_id:
            return False
        endpoint = f"{self.url}/rest/v1/tickets"
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": ticket_id,
            "user_uid": user_uid or "",
            "ticket_data": ticket_data,
            "updated_at": now_iso,
        }
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.post(endpoint, headers=self._headers, json=payload)
                return res.status_code in (200, 201)
        except Exception as exc:
            log.warning("Supabase save_ticket error: %s", exc)
            return False

    def get_tickets(self, user_uid: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve all tickets, optionally filtered by user_uid."""
        if not self.is_configured:
            return []
        query = f"?user_uid=eq.{user_uid}&order=created_at.desc" if user_uid else "?order=created_at.desc"
        endpoint = f"{self.url}/rest/v1/tickets{query}"
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.get(endpoint, headers=self._headers)
                if res.status_code == 200:
                    rows = res.json()
                    return [r.get("ticket_data", {}) for r in rows if isinstance(r, dict)]
        except Exception as exc:
            log.warning("Supabase get_tickets error: %s", exc)
        return []

    def save_audit_log(self, user_uid: str, event_type: str, payload: Dict[str, Any]) -> bool:
        """Append an audit log event."""
        if not self.is_configured:
            return False
        endpoint = f"{self.url}/rest/v1/audit_logs"
        now_iso = datetime.now(timezone.utc).isoformat()
        data = {
            "user_uid": user_uid or "",
            "event_type": event_type,
            "payload": payload,
            "created_at": now_iso,
        }
        try:
            with httpx.Client(timeout=6.0) as client:
                res = client.post(endpoint, headers=self._headers, json=data)
                return res.status_code in (200, 201)
        except Exception as exc:
            log.warning("Supabase save_audit_log error: %s", exc)
            return False


# Global singleton instance
supabase_store = SupabaseStore()
