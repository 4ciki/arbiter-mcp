"""
Pytest configuration and environment defaults for test isolation.
Runs before any test collection so that modules importing config.settings
always have valid dummy configuration.
"""

import os

# ── Dummy env before any config / settings import ────────────────────────────
os.environ.setdefault("JIRA_SITE_URL", "https://test.atlassian.net")
os.environ.setdefault("JIRA_EMAIL", "test@example.com")
os.environ.setdefault("JIRA_API_TOKEN", "dummy")
os.environ.setdefault("SLACK_BOT_TOKEN", "xoxb-dummy")
os.environ.setdefault("SLACK_SIGNING_SECRET", "dummy-secret")
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/dummy.json")
os.environ.setdefault("GCP_PROJECT_ID", "dummy-project")
os.environ.setdefault("GROQ_API_KEY", "dummy-groq")
