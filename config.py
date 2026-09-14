"""
Central configuration for Arbiter.

All environment variables are loaded here via pydantic-settings. No other
module in the codebase may call os.environ directly — import `settings`
from this module instead. This keeps the config surface in one place and
makes it trivially testable (override fields in test fixtures, not env vars).

Usage:
    from config import settings
    print(settings.TRUST_THRESHOLD)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # silently drop unknown env vars rather than error
    )

    # ── Jira (Atlassian Rovo MCP) ──────────────────────────────────────────────
    JIRA_SITE_URL: str
    JIRA_EMAIL: str
    JIRA_API_TOKEN: str

    # ── Slack ──────────────────────────────────────────────────────────────────
    SLACK_BOT_TOKEN: str
    SLACK_SIGNING_SECRET: str
    SLACK_CHANNEL: str = "#it-escalations"

    # ── Google Cloud / Vertex AI ───────────────────────────────────────────────
    GOOGLE_APPLICATION_CREDENTIALS: str
    GCP_PROJECT_ID: str

    # ── Groq ──────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str

    # ── Storage ────────────────────────────────────────────────────────────────
    CHROMA_PATH: str = "./chroma_data"
    DATABASE_URL: str = "sqlite:///./arbiter.db"

    # ── Trust scoring thresholds ───────────────────────────────────────────────
    TRUST_THRESHOLD: float = 0.75
    COLD_START_SUCCESS_RATE: float = 0.3
    COLD_START_MIN_SAMPLES: int = 20

    # ── Scoring weights (must sum to 1.0) ──────────────────────────────────────
    # These are starting points tuned from the spec; tune them once real data
    # exists. The trust scorer reads these at call time so a restart picks up
    # any changes made here or in the .env file.
    WEIGHT_RETRIEVAL: float = 0.40
    WEIGHT_CATEGORY: float = 0.35
    WEIGHT_LLM_CONFIDENCE: float = 0.25


# Module-level singleton. All other modules do:
#   from config import settings
settings = Settings()
