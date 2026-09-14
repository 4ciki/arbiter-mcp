"""
CaseRetriever — semantic search over resolved IT support tickets.

Storage:  ChromaDB PersistentClient at settings.CHROMA_PATH
Embedding: ChromaDB's default embedding function (all-MiniLM-L6-v2 via
           sentence-transformers). We let ChromaDB own the embedding step
           so the retriever stays simple: pass raw text in, get distances back.
Distance: cosine (hnsw:space=cosine). ChromaDB returns cosine *distance*
           in [0, 2]; we convert to similarity in [0, 1] as:
               similarity = clamp(1.0 - distance, 0.0, 1.0)
           For sentence-transformer embeddings (unit-normalised), cosine
           distance is in [0, 1] in practice, so clamp is a safety net only.

Thread safety:
   ChromaDB's PersistentClient is safe to read from multiple threads but
   write operations (add_case) should not be called concurrently for the
   same ticket_id. The agent graph calls add_case only on the resolution
   path (single node, single execution), so no additional locking is needed.

Empty-collection guard:
   ChromaDB raises if n_results > collection.count(). find_similar() clamps
   n_results to count() so callers never need to check this themselves.
   If the collection is completely empty, find_similar() returns [] immediately.
"""

from __future__ import annotations

import logging

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings
from schemas import SimilarCase

log = logging.getLogger(__name__)

_COLLECTION_NAME = "cases"


class CaseRetriever:
    """
    Wraps a ChromaDB collection of resolved IT support cases.

    Lifecycle: instantiate once at app startup, share the instance.
    The underlying PersistentClient holds an open file handle to
    CHROMA_PATH — close() is provided for clean shutdown, though
    the GC will also close it.
    """

    def __init__(self, chroma_path: str | None = None) -> None:
        path = chroma_path or settings.CHROMA_PATH
        self._client = chromadb.PersistentClient(
            path=path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        # cosine space: distance ∈ [0, 2], identical vectors → 0
        self._collection = self._client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        log.info(
            "CaseRetriever: collection '%s' at %s (%d cases)",
            _COLLECTION_NAME,
            path,
            self._collection.count(),
        )

    # ── Write ─────────────────────────────────────────────────────────────────

    def add_case(self, ticket_id: str, text: str, resolution: str) -> None:
        """
        Store one resolved case. Uses upsert so re-ingesting the same
        ticket_id is safe (updates the stored text and resolution).

        Call this on the auto-resolve path AFTER the Jira comment is posted,
        so only confirmed resolutions enter the retrieval store.
        """
        self._collection.upsert(
            ids=[ticket_id],
            documents=[text],
            metadatas=[{"resolution": resolution, "ticket_id": ticket_id}],
        )
        log.debug("CaseRetriever: upserted case %s", ticket_id)

    # ── Read ──────────────────────────────────────────────────────────────────

    def find_similar(self, text: str, n_results: int = 5) -> list[SimilarCase]:
        """
        Return up to n_results most-similar resolved cases, sorted by
        similarity descending (most relevant first).

        Returns an empty list if the collection is empty — the trust scorer
        handles this as a cold-start signal for the retrieval component.
        """
        count = self._collection.count()
        if count == 0:
            log.debug("CaseRetriever: collection is empty, returning []")
            return []

        clamped = min(n_results, count)
        results = self._collection.query(
            query_texts=[text],
            n_results=clamped,
            include=["documents", "metadatas", "distances"],
        )

        cases: list[SimilarCase] = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            # Cosine distance → similarity; clamp keeps the Pydantic ge/le
            # constraint satisfied even for numerical edge cases.
            similarity = max(0.0, min(1.0, 1.0 - dist))
            cases.append(
                SimilarCase(
                    text=doc,
                    resolution=meta.get("resolution", ""),
                    similarity=similarity,
                )
            )

        # Already ordered by ChromaDB (closest first), but sort explicitly
        # so the contract is clear: index 0 is always the best match.
        return sorted(cases, key=lambda c: c.similarity, reverse=True)

    def count(self) -> int:
        """Number of cases in the collection. Useful for cold-start detection."""
        return self._collection.count()

    def close(self) -> None:
        """Release the ChromaDB file handle. Call on FastAPI lifespan shutdown."""
        self._client.clear_system_cache()
