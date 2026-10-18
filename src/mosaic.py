"""Pivot 1: Stateful 'Mosaic Attack' Graph Tracker (Solving Piece-by-Piece Fishing).

Tracks cumulative semantic entropy and entity overlap across a user's multi-turn queries.
When an insider asks multiple innocent-looking questions that combine to triangulate a customer
record or deal (k-anonymity / mosaic violation), the tracker elevates risk and logs an alert
to the SHA-256 hash chain.
"""
from collections import defaultdict
from datetime import datetime, timezone

try:
    from . import audit
except (ImportError, ValueError):
    import audit

_USER_GRAPHS: dict[str, dict] = defaultdict(
    lambda: {
        "turns": 0,
        "entities": set(),
        "sources_touched": set(),
        "triangulation_hits": 0,
        "history": [],
    }
)

_FISHING_TERMS = (
    "triangulate",
    "narrow down",
    "combine",
    "piece together",
    "which customer",
    "identify the",
    "cross reference",
    "cross-reference",
    "match the branch",
    "only customer",
)


def update_session_graph(
    conn,
    username: str,
    question: str,
    sources: list[dict],
    vault_tokens: list[dict],
) -> dict:
    """Update the stateful session knowledge graph for `username` and return current Mosaic risk."""
    state = _USER_GRAPHS[username]
    state["turns"] += 1

    for s in sources:
        state["sources_touched"].add(f"CHUNK_{s.get('id')}")
    for t in vault_tokens:
        state["entities"].add(t.get("token_id"))

    q_lower = question.lower()
    if any(term in q_lower for term in _FISHING_TERMS):
        state["triangulation_hits"] += 1

    # Compute k-anonymity / mosaic deanonymization risk score (0 to 100)
    entity_score = min(55, len(state["entities"]) * 6)
    turn_score = min(25, (state["turns"] - 1) * 7)
    fishing_bonus = state["triangulation_hits"] * 22
    risk_score = min(98, max(8, entity_score + turn_score + fishing_bonus))

    if risk_score >= 75:
        level = "critical"
        advisory = "k-Anonymity threshold breached: high multi-turn entity overlap detected. Dynamic step-up redaction active."
    elif risk_score >= 45:
        level = "elevated"
        advisory = "Multi-turn entity accumulation observed across session graph; monitoring for mosaic triangulation."
    else:
        level = "safe"
        advisory = "Session knowledge graph within k-anonymity compliance bounds."

    if level in ("elevated", "critical") and state["triangulation_hits"] > 0 and conn is not None:
        try:
            audit.append_event(
                conn,
                username,
                "mosaic_risk_alert",
                {
                    "risk_score": risk_score,
                    "level": level,
                    "turns_in_window": state["turns"],
                    "entities_tracked": len(state["entities"]),
                },
            )
        except Exception:
            pass

    nodes = sorted(list(state["entities"]))[:8]
    return {
        "username": username,
        "risk_score": risk_score,
        "level": level,
        "turns_in_window": state["turns"],
        "entities_tracked": len(state["entities"]),
        "sources_touched": len(state["sources_touched"]),
        "nodes": nodes,
        "advisory": advisory,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_session_graph(username: str) -> dict:
    state = _USER_GRAPHS[username]
    entity_score = min(55, len(state["entities"]) * 6)
    turn_score = min(25, max(0, state["turns"] - 1) * 7)
    fishing_bonus = state["triangulation_hits"] * 22
    risk_score = min(98, entity_score + turn_score + fishing_bonus) if state["turns"] > 0 else 0
    level = "critical" if risk_score >= 75 else "elevated" if risk_score >= 45 else "safe"
    return {
        "username": username,
        "risk_score": risk_score,
        "level": level,
        "turns_in_window": state["turns"],
        "entities_tracked": len(state["entities"]),
        "sources_touched": len(state["sources_touched"]),
        "nodes": sorted(list(state["entities"]))[:8],
    }


def reset_session_graph(username: str | None = None) -> None:
    if username:
        _USER_GRAPHS.pop(username, None)
    else:
        _USER_GRAPHS.clear()
