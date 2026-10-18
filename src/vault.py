"""Break-glass reveal: show one masked value to a cleared person, only with a second person's approval.

The model only ever reads numbered tokens such as [IBAN_2]. When an investigation needs the real value behind
one token, the flow is:

  1. request  The person who received the answer asks for that token, with a written reason.
              Only roles in REQUESTER_ROLES may ask.
  2. decide   A different person in APPROVER_ROLES approves or denies. Nobody approves their own request.
  3. reveal   The requester sees the value once, within APPROVAL_TTL of the approval.

Every step is written to the hash-chained audit log: who, which answer, which token, why, and the decision.
The value itself is never logged and never stored anywhere new. It is recovered by re-masking the same
passages, in the same order, that the audit log recorded for that answer (see masker.mask_tokens).
"""
from datetime import datetime, timedelta, timezone

try:
    from . import audit, masker
except (ImportError, ValueError):
    import audit, masker

REQUESTER_ROLES = {"compliance"}
APPROVER_ROLES = {"compliance", "auditor"}
APPROVAL_TTL = timedelta(minutes=15)
MIN_REASON = 10

TABLE = """
CREATE TABLE IF NOT EXISTS unmask_requests (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    answer_id   BIGINT NOT NULL,          -- audit_log id of the answer_returned entry
    token       TEXT NOT NULL,            -- e.g. IBAN_2 (never the value)
    requester   TEXT NOT NULL,
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revealed', 'expired')),
    approver    TEXT,
    decided_at  TIMESTAMPTZ,
    revealed_at TIMESTAMPTZ
)"""


class RevealError(Exception):
    """A request the rules do not allow. `status` is the HTTP status the API should answer with."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def ensure_table(conn):
    conn.execute(TABLE)


def _user(conn, username):
    row = conn.execute("SELECT role, tier FROM users WHERE username = %s", (username,)).fetchone()
    if row is None:
        raise RevealError("Unknown user.", 400)
    return row


def _answer(conn, answer_id):
    row = conn.execute("SELECT actor, details FROM audit_log WHERE id = %s AND action = 'answer_returned'",
                       (answer_id,)).fetchone()
    if row is None:
        raise RevealError("That answer is not in the audit log.", 404)
    return row


def _values_for(conn, details):
    """Rebuild {token: value} for an answer from its logged passage ids, in their logged order."""
    ids = details.get("chunk_ids") or []
    if not ids:
        return {}
    rows = dict(conn.execute("SELECT id, content FROM chunks WHERE id = ANY(%s)", (ids,)).fetchall())
    return masker.token_values([rows[i] for i in ids if i in rows])


def _row(conn, request_id):
    row = conn.execute("SELECT id, answer_id, token, requester, reason, status, approver, decided_at, created_at "
                       "FROM unmask_requests WHERE id = %s", (request_id,)).fetchone()
    if row is None:
        raise RevealError("No such request.", 404)
    keys = ("id", "answer_id", "token", "requester", "reason", "status", "approver", "decided_at", "created_at")
    return dict(zip(keys, row))


def request(conn, username, answer_id, token, reason):
    """Step 1. Returns the new request id."""
    ensure_table(conn)
    role, _ = _user(conn, username)
    if role not in REQUESTER_ROLES:
        raise RevealError("Your role can't request a reveal. Ask a compliance officer.", 403)
    reason = (reason or "").strip()
    if len(reason) < MIN_REASON:
        raise RevealError(f"Give a reason of at least {MIN_REASON} characters, such as the case or alert number.", 400)
    actor, details = _answer(conn, answer_id)
    if actor != username:
        raise RevealError("You can only request values from answers you received.", 403)
    token = (token or "").strip().strip("[]")
    if token not in _values_for(conn, details):
        raise RevealError("That token does not appear in the passages of this answer.", 400)
    rid = conn.execute("INSERT INTO unmask_requests (answer_id, token, requester, reason) VALUES (%s,%s,%s,%s) RETURNING id",
                       (answer_id, token, username, reason[:300])).fetchone()[0]
    reason_masked, _ = masker.mask_all(reason[:300])
    audit.append_event(conn, username, "unmask_requested",
                       {"request_id": rid, "answer_id": answer_id, "token": token, "reason": reason_masked})
    return rid


def decide(conn, username, request_id, approve):
    """Step 2. A second person approves or denies. Returns the new status."""
    ensure_table(conn)
    role, _ = _user(conn, username)
    if role not in APPROVER_ROLES:
        raise RevealError("Your role can't approve reveals.", 403)
    r = _row(conn, request_id)
    if r["requester"] == username:
        raise RevealError("Someone other than the requester has to approve.", 403)
    if r["status"] != "pending":
        raise RevealError(f"This request is already {r['status']}.", 409)
    status = "approved" if approve else "denied"
    conn.execute("UPDATE unmask_requests SET status = %s, approver = %s, decided_at = now() WHERE id = %s",
                 (status, username, request_id))
    audit.append_event(conn, username, f"unmask_{status}",
                       {"request_id": request_id, "answer_id": r["answer_id"], "token": r["token"], "requester": r["requester"]})
    return status


def reveal(conn, username, request_id):
    """Step 3. Returns the value once, to the requester, while the approval is fresh."""
    ensure_table(conn)
    r = _row(conn, request_id)
    if r["requester"] != username:
        raise RevealError("Only the person who asked can see this value.", 403)
    if r["status"] == "revealed":
        raise RevealError("This value was already shown once. Make a new request if you need it again.", 409)
    if r["status"] != "approved":
        raise RevealError(f"This request is {r['status']}, not approved.", 409)
    if datetime.now(timezone.utc) - r["decided_at"] > APPROVAL_TTL:
        conn.execute("UPDATE unmask_requests SET status = 'expired' WHERE id = %s", (request_id,))
        raise RevealError("The approval expired. Make a new request.", 409)
    _, details = _answer(conn, r["answer_id"])
    value = _values_for(conn, details).get(r["token"])
    if value is None:
        raise RevealError("The source passage has changed, so the value can't be recovered.", 409)
    conn.execute("UPDATE unmask_requests SET status = 'revealed', revealed_at = now() WHERE id = %s", (request_id,))
    audit.append_event(conn, username, "unmask_revealed",
                       {"request_id": request_id, "answer_id": r["answer_id"], "token": r["token"], "approver": r["approver"]})
    return value


def listing(conn, username):
    """Requests this person made, plus pending requests from others they may decide on. Never includes values."""
    ensure_table(conn)
    role, _ = _user(conn, username)
    cols = "id, answer_id, token, requester, reason, status, approver, created_at, decided_at"
    mine = conn.execute(f"SELECT {cols} FROM unmask_requests WHERE requester = %s ORDER BY id DESC LIMIT 20",
                        (username,)).fetchall()
    to_decide = []
    if role in APPROVER_ROLES:
        to_decide = conn.execute(f"SELECT {cols} FROM unmask_requests WHERE status = 'pending' AND requester <> %s "
                                 "ORDER BY id LIMIT 20", (username,)).fetchall()
    keys = cols.split(", ")

    def shape(row):
        d = dict(zip(keys, row))
        d["reason"] = masker.mask_all(d["reason"])[0]
        for k in ("created_at", "decided_at"):
            d[k] = d[k].isoformat() if d[k] else None
        return d

    return {"can_request": role in REQUESTER_ROLES, "can_approve": role in APPROVER_ROLES,
            "mine": [shape(r) for r in mine], "to_decide": [shape(r) for r in to_decide]}
