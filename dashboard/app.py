"""
Arbiter Streamlit Dashboard (§2.10).

Monitors ticket triage, automated resolution metrics, and human escalations.
COMMUNICATION RULE: Calls /api/tickets and /api/audit ONLY. Never touches the DB directly.
"""

from __future__ import annotations

import os
import time
from datetime import datetime
from typing import Any

import altair as alt
import pandas as pd
import requests
import streamlit as st

API_BASE_URL = os.environ.get("ARBITER_API_URL", "http://localhost:8000").rstrip("/")


def fetch_data(base_url: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    """Fetch tickets and audit logs from the Arbiter API."""
    tickets = []
    audit_logs = []
    err = None

    try:
        t_resp = requests.get(f"{base_url}/api/tickets?offset=0&limit=50", timeout=5)
        if t_resp.status_code == 200:
            tickets = t_resp.json()
        else:
            err = f"API Error /api/tickets: {t_resp.status_code}"

        a_resp = requests.get(f"{base_url}/api/audit?offset=0&limit=100", timeout=5)
        if a_resp.status_code == 200:
            audit_logs = a_resp.json()
        else:
            err = f"API Error /api/audit: {a_resp.status_code}"
    except Exception as exc:
        err = f"Could not connect to Arbiter API at {base_url}: {exc}"

    return tickets, audit_logs, err


def format_tickets_dataframe(tickets: list[dict[str, Any]]) -> pd.DataFrame:
    """Format raw tickets response into the 6 required columns."""
    rows = []
    for t in tickets:
        rows.append({
            "ticket_id": t.get("ticket_id") or t.get("id", ""),
            "category": t.get("category", "general"),
            "trust_score": f"{t.get('trust_score'):.2f}" if t.get("trust_score") is not None else "—",
            "action": t.get("action", "—"),
            "human_response": t.get("human_response") or "—",
            "resolved_at": t.get("resolved_at") or "—",
        })
    return pd.DataFrame(rows)


def build_resolution_chart_data(tickets: list[dict[str, Any]]) -> pd.DataFrame:
    """Group tickets by category and week to compute auto-resolution rates."""
    chart_data = []
    for t in tickets:
        created = t.get("created_at")
        if created:
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            except ValueError:
                dt = datetime.now()
        else:
            dt = datetime.now()

        week_str = dt.strftime("%Y-W%W")
        is_auto = 1 if t.get("action") == "auto_resolve" else 0
        chart_data.append({
            "category": t.get("category", "general"),
            "week": week_str,
            "auto_resolved": is_auto,
            "total": 1,
        })

    df = pd.DataFrame(chart_data)
    if df.empty:
        return df
    grouped = (
        df.groupby(["category", "week"])
        .agg(auto_resolved=("auto_resolved", "sum"), total=("total", "count"))
        .reset_index()
    )
    grouped["auto_rate"] = (grouped["auto_resolved"] / grouped["total"]) * 100
    return grouped


def render_dashboard() -> None:
    """Main rendering loop for the Streamlit dashboard."""
    st.set_page_config(
        page_title="Arbiter Triage Dashboard",
        page_icon="🛡️",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # ── Sidebar ────────────────────────────────────────────────────────────────
    st.sidebar.title("🛡️ Arbiter Agent")
    st.sidebar.markdown(
        """
        **Autonomous IT Helpdesk Triage**
        Safety-critical trust scoring & human escalation.
        """
    )
    st.sidebar.divider()

    api_url_input = st.sidebar.text_input("API Base URL", value=API_BASE_URL)
    auto_refresh = st.sidebar.toggle("Auto-refresh (30s)", value=False)
    st.sidebar.button("🔄 Refresh Now")

    st.sidebar.divider()
    st.sidebar.markdown(
        """
        **Endpoints queried**:
        - `GET /api/tickets?limit=50`
        - `GET /api/audit?limit=100`
        *(No direct database connections)*
        """
    )

    # Fetch data
    tickets, audit_logs, fetch_error = fetch_data(api_url_input)

    # ── Header & KPI Metrics ───────────────────────────────────────────────────
    st.title("🛡️ Arbiter Operations & Triage Monitor")
    st.caption(
        f"Connected to Arbiter API at `{api_url_input}` — Last refreshed: {datetime.now().strftime('%H:%M:%S')}"
    )

    if fetch_error:
        st.error(f"⚠️ {fetch_error}")
        st.info("Ensure the FastAPI service is running: `uvicorn api.main:app --port 8000`")

    # Compute KPIs
    total_tickets = len(tickets)
    auto_resolved_count = sum(1 for t in tickets if t.get("action") == "auto_resolve")
    escalated_count = sum(1 for t in tickets if t.get("action") == "escalate")
    auto_rate = (auto_resolved_count / total_tickets * 100) if total_tickets > 0 else 0.0

    valid_scores = [t.get("trust_score") for t in tickets if t.get("trust_score") is not None]
    avg_trust = (sum(valid_scores) / len(valid_scores)) if valid_scores else 0.0

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Tickets Processed", total_tickets)
    col2.metric("Auto-Resolution Rate", f"{auto_rate:.1f}%", f"{auto_resolved_count} resolved")
    col3.metric("Escalated to Humans", escalated_count)
    col4.metric("Avg Trust Score", f"{avg_trust:.2f}")

    st.divider()

    # ── Recent Tickets Table ───────────────────────────────────────────────────
    st.subheader("📋 Recent Tickets (Last 50)")

    if tickets:
        df_tickets = format_tickets_dataframe(tickets)
        st.dataframe(
            df_tickets,
            use_container_width=True,
            hide_index=True,
            column_config={
                "ticket_id": st.column_config.TextColumn("Ticket ID", width="small"),
                "category": st.column_config.TextColumn("Category", width="small"),
                "trust_score": st.column_config.TextColumn("Trust Score", width="small"),
                "action": st.column_config.TextColumn("Action", width="medium"),
                "human_response": st.column_config.TextColumn("Human Feedback", width="medium"),
                "resolved_at": st.column_config.TextColumn("Resolved At", width="medium"),
            },
        )
    else:
        st.info("No tickets recorded yet. Send tickets to `POST /webhooks/jira` to begin.")

    st.divider()

    # ── Auto-Resolution Rate Chart ─────────────────────────────────────────────
    st.subheader("📈 Auto-Resolution Rate by Category Over Time")

    if tickets:
        grouped = build_resolution_chart_data(tickets)
        if not grouped.empty:
            chart = (
                alt.Chart(grouped)
                .mark_bar(opacity=0.85)
                .encode(
                    x=alt.X("week:N", title="Week"),
                    y=alt.Y("auto_rate:Q", title="Auto-Resolution Rate (%)", scale=alt.Scale(domain=[0, 100])),
                    color=alt.Color("category:N", title="Category"),
                    tooltip=["category", "week", "auto_resolved", "total", alt.Tooltip("auto_rate:Q", format=".1f")],
                )
                .properties(height=350)
                .interactive()
            )
            st.altair_chart(chart, use_container_width=True)
    else:
        st.info("Chart will appear once tickets have been processed.")

    st.divider()

    # ── Audit Trail View ───────────────────────────────────────────────────────
    with st.expander("🔍 Immutable Audit Log Stream"):
        if audit_logs:
            df_audit = pd.DataFrame(audit_logs)
            st.dataframe(df_audit, use_container_width=True, hide_index=True)
        else:
            st.caption("No audit entries.")

    # ── Auto-Refresh ───────────────────────────────────────────────────────────
    if auto_refresh:
        time.sleep(30)
        st.rerun()


if __name__ == "__main__":
    render_dashboard()
