"""
db/mongo_client.py
Dynamic, multi-user unstructured data store using MongoDB Atlas.

Features:
- Stores user credentials, integrations, and preferences per user UID
- Stores tickets and audit logs as flexible BSON/JSON documents
- Synchronizes with Supabase for multi-cloud resilience
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config import settings

log = logging.getLogger("arbiter.mongo")


class MongoStore:
    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        self.uri = uri or settings.MONGODB_URI or ""
        self.db_name = db_name or settings.MONGODB_DATABASE or "arbiter"
        self._client = None
        self._db = None

    @property
    def is_configured(self) -> bool:
        return bool(self.uri)

    def _get_db(self):
        if self._db is not None:
            return self._db
        if not self.is_configured:
            return None
        try:
            from pymongo import MongoClient
            self._client = MongoClient(self.uri, serverSelectionTimeoutMS=4000)
            self._db = self._client[self.db_name]
            return self._db
        except Exception as exc:
            log.warning("Could not connect to MongoDB: %s", exc)
            return None

    def get_user_config(self, uid: str) -> Optional[Dict[str, Any]]:
        """Fetch user config document by UID."""
        if not uid:
            return None
        db = self._get_db()
        if db is None:
            return None
        try:
            doc = db.user_configs.find_one({"uid": uid}, {"_id": 0})
            if doc and "config" in doc:
                return doc["config"]
        except Exception as exc:
            log.warning("MongoDB get_user_config error for uid=%s: %s", uid, exc)
        return None

    def save_user_config(self, uid: str, config: Dict[str, Any], email: str = "") -> Optional[Dict[str, Any]]:
        """Upsert user config document by UID."""
        if not uid or not config:
            return None
        db = self._get_db()
        if db is None:
            return None
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            db.user_configs.update_one(
                {"uid": uid},
                {
                    "$set": {
                        "uid": uid,
                        "email": email or "",
                        "config": config,
                        "updated_at": now_iso,
                    },
                    "$setOnInsert": {
                        "created_at": now_iso,
                    }
                },
                upsert=True,
            )
            return config
        except Exception as exc:
            log.warning("MongoDB save_user_config error for uid=%s: %s", uid, exc)
        return None

    def save_ticket(self, ticket_id: str, user_uid: str, ticket_data: Dict[str, Any]) -> bool:
        """Upsert ticket document by ID."""
        if not ticket_id:
            return False
        db = self._get_db()
        if db is None:
            return False
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            db.tickets.update_one(
                {"id": ticket_id},
                {
                    "$set": {
                        "id": ticket_id,
                        "user_uid": user_uid or "",
                        "ticket_data": ticket_data,
                        "updated_at": now_iso,
                    },
                    "$setOnInsert": {
                        "created_at": now_iso,
                    }
                },
                upsert=True,
            )
            return True
        except Exception as exc:
            log.warning("MongoDB save_ticket error: %s", exc)
            return False

    def get_tickets(self, user_uid: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve all tickets, optionally filtered by user_uid."""
        db = self._get_db()
        if db is None:
            return []
        try:
            query = {"user_uid": user_uid} if user_uid else {}
            cursor = db.tickets.find(query, {"_id": 0}).sort("updated_at", -1).limit(100)
            return list(cursor)
        except Exception as exc:
            log.warning("MongoDB get_tickets error: %s", exc)
            return []


# Module singleton
mongo_store = MongoStore()
