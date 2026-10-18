"""Mosaic check: notice when one person pulls many different customers' records in a short time.

Each answer on its own can be harmless, but an insider can piece a picture together over many questions. This
counts the distinct customer records (customer-note documents) that reached one user's answers in the last hour.
It reads the audit log, which already records the passages behind every answer, so it needs no new table, keeps
working after a restart, and stores nothing new about customers.

When a user crosses MOSAIC_LIMIT distinct customers in the window, one `mosaic_alert` entry is written to the
hash-chained audit log for a reviewer. It warns and logs; it does not block, because a busy teller can
legitimately touch many records.
"""
import os

try:
    from . import audit
except (ImportError, ValueError):
    import audit

WINDOW = "1 hour"
CUSTOMER_SOURCE = "customer_notes"


def limit() -> int:
    try:
        return max(1, int(os.environ.get("MOSAIC_LIMIT", "15")))
    except ValueError:
        return 15


def _customers(conn, username, exclude_answer_id=None) -> set:
    """Distinct customer documents in this user's answers within the window."""
    rows = conn.execute(
        "SELECT id, details FROM audit_log WHERE actor = %s AND action = 'answer_returned' "
        f"AND ts > now() - interval '{WINDOW}'", (username,)).fetchall()
    ids = {cid for aid, d in rows if aid != exclude_answer_id for cid in (d.get("chunk_ids") or [])}
    if not ids:
        return set()
    return {doc for (doc,) in conn.execute(
        "SELECT DISTINCT doc_id FROM chunks WHERE id = ANY(%s) AND source = %s", (list(ids), CUSTOMER_SOURCE))}


def check(conn, username, answer_id=None) -> dict:
    """Return this user's count for the window, and log an alert the first time an answer crosses the limit."""
    lim = limit()
    now = len(_customers(conn, username))
    alert = now >= lim
    if answer_id is not None and alert and len(_customers(conn, username, exclude_answer_id=answer_id)) < lim:
        audit.append_event(conn, username, "mosaic_alert",
                           {"customers_last_hour": now, "limit": lim, "answer_id": answer_id})
    return {"customers_last_hour": now, "limit": lim, "alert": alert}
