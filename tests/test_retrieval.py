"""
Tests for retrieval/retrieval.py.

All tests use an ephemeral (in-memory) ChromaDB client injected via monkeypatch
so they never touch the filesystem and never share state across test functions.
ChromaDB's EphemeralClient is the official way to do this.

Milestone 4 is DONE when all tests in this file pass.
"""

from __future__ import annotations

import os
import pytest

# ── Dummy env before config import ────────────────────────────────────────────
os.environ.setdefault("JIRA_SITE_URL", "https://test.atlassian.net")
os.environ.setdefault("JIRA_EMAIL", "test@example.com")
os.environ.setdefault("JIRA_API_TOKEN", "dummy")
os.environ.setdefault("SLACK_BOT_TOKEN", "xoxb-dummy")
os.environ.setdefault("SLACK_SIGNING_SECRET", "dummy-secret")
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/dummy.json")
os.environ.setdefault("GCP_PROJECT_ID", "dummy-project")
os.environ.setdefault("GROQ_API_KEY", "dummy-groq")

import chromadb  # kept for reference; PersistentClient is used via CaseRetriever
from retrieval.retrieval import CaseRetriever
from schemas import SimilarCase


# ── Fixture ────────────────────────────────────────────────────────────────────

@pytest.fixture()
def retriever(tmp_path):
    """
    CaseRetriever backed by a PersistentClient in a per-test temp directory.

    chromadb.EphemeralClient() shares global in-memory state across instances
    within the same process, causing cross-test contamination. Using
    PersistentClient with pytest's per-test tmp_path gives true isolation:
    each test gets its own fresh directory, and pytest cleans it up afterward.
    """
    return CaseRetriever(chroma_path=str(tmp_path / "chroma"))


# ── Empty collection ───────────────────────────────────────────────────────────

class TestEmptyCollection:
    def test_count_zero_on_fresh_collection(self, retriever):
        assert retriever.count() == 0

    def test_find_similar_empty_returns_empty_list(self, retriever):
        """Must not raise — empty collection returns [] not an exception."""
        results = retriever.find_similar("VPN is not connecting", n_results=5)
        assert results == []

    def test_find_similar_with_n_results_zero_returns_empty(self, retriever):
        results = retriever.find_similar("anything", n_results=0)
        assert results == []


# ── add_case ───────────────────────────────────────────────────────────────────

class TestAddCase:
    def test_add_increments_count(self, retriever):
        retriever.add_case("ABC-1", "VPN not connecting", "Reset credentials")
        assert retriever.count() == 1

    def test_add_multiple(self, retriever):
        for i in range(3):
            retriever.add_case(f"TICKET-{i}", f"issue {i}", f"fix {i}")
        assert retriever.count() == 3

    def test_upsert_is_idempotent(self, retriever):
        """Adding the same ticket_id twice must not duplicate the entry."""
        retriever.add_case("ABC-1", "original text", "original resolution")
        retriever.add_case("ABC-1", "updated text", "updated resolution")
        assert retriever.count() == 1

    def test_upsert_updates_content(self, retriever):
        """After upsert, the updated resolution should be retrievable."""
        retriever.add_case("ABC-1", "password issue", "old fix")
        retriever.add_case("ABC-1", "password issue", "new fix")
        results = retriever.find_similar("password issue", n_results=1)
        assert len(results) == 1
        assert results[0].resolution == "new fix"


# ── find_similar ───────────────────────────────────────────────────────────────

class TestFindSimilar:
    def _seed(self, retriever):
        cases = [
            ("P-1", "User cannot reset their password via the self-service portal", "Reset password using admin panel"),
            ("P-2", "VPN client fails to connect from home network", "Update VPN client to latest version"),
            ("P-3", "Printer not responding on floor 3", "Replace USB cable"),
            ("P-4", "Cannot access shared network drive after office move", "Remap network drive with updated server path"),
            ("P-5", "Laptop screen flickers intermittently", "Update graphics driver"),
        ]
        for tid, text, resolution in cases:
            retriever.add_case(tid, text, resolution)

    def test_returns_similar_cases(self, retriever):
        self._seed(retriever)
        results = retriever.find_similar("I forgot my password and can't log in", n_results=3)
        assert len(results) == 3
        # Password case should rank first — most semantically similar
        assert "password" in results[0].resolution.lower() or "password" in results[0].text.lower()

    def test_results_are_sorted_by_similarity_descending(self, retriever):
        self._seed(retriever)
        results = retriever.find_similar("VPN keeps disconnecting", n_results=5)
        similarities = [r.similarity for r in results]
        assert similarities == sorted(similarities, reverse=True)

    def test_similarity_in_unit_range(self, retriever):
        """Similarity values must satisfy the SimilarCase Pydantic constraint [0, 1]."""
        self._seed(retriever)
        results = retriever.find_similar("network connectivity issue", n_results=5)
        for r in results:
            assert 0.0 <= r.similarity <= 1.0, f"Out of range: {r.similarity}"

    def test_n_results_clamped_to_count(self, retriever):
        """Requesting more results than exist must not raise."""
        retriever.add_case("X-1", "only one case", "one fix")
        results = retriever.find_similar("anything", n_results=100)
        assert len(results) == 1

    def test_returns_similar_case_objects(self, retriever):
        self._seed(retriever)
        results = retriever.find_similar("printer broken", n_results=2)
        for r in results:
            assert isinstance(r, SimilarCase)
            assert isinstance(r.text, str)
            assert isinstance(r.resolution, str)
            assert isinstance(r.similarity, float)

    def test_count_method(self, retriever):
        self._seed(retriever)
        assert retriever.count() == 5
