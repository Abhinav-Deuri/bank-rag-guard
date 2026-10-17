"""Tamper-evident audit log: each row stores a SHA-256 fingerprint that includes the previous row's fingerprint."""
import hashlib, json
from datetime import datetime, timezone
from psycopg.types.json import Jsonb

GENESIS = "0" * 64                                   # the "previous fingerprint" of the very first entry

def canonical(obj):
    """One fixed text form for any JSON value (sorted keys, no extra spaces), so hashes are repeatable."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def ts_text(ts):
    """Timestamp as UTC text with microseconds, the same way every time."""
    if ts.tzinfo is None:                            # a time without a zone is treated as UTC
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc).isoformat(timespec="microseconds")

def compute_hash(prev_hash, ts, actor, action, details):
    """SHA-256 of (previous fingerprint + this entry's content)."""
    body = canonical({"ts": ts_text(ts), "actor": actor, "action": action, "details": details})
    return hashlib.sha256((prev_hash + body).encode("utf-8")).hexdigest()

def append_event(conn, actor, action, details=None):
    """Add one entry to the chain and return (id, hash). A lock keeps concurrent writers in order."""
    details = details or {}
    ts = datetime.now(timezone.utc)
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(748201)")            # one writer at a time
        row = conn.execute("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1").fetchone()
        prev = row[0] if row else GENESIS                                # link to the latest entry
        digest = compute_hash(prev, ts, actor, action, details)
        new_id = conn.execute(
            "INSERT INTO audit_log (ts, actor, action, details, prev_hash, hash) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (ts, actor, action, Jsonb(details), prev, digest)).fetchone()[0]
    return new_id, digest

def verify_chain(conn):
    """Check every entry in order. Returns (ok, first_bad_id, message)."""
    prev, count = GENESIS, 0
    rows = conn.execute("SELECT id, ts, actor, action, details, prev_hash, hash FROM audit_log ORDER BY id")
    for id_, ts, actor, action, details, prev_hash, digest in rows:
        if prev_hash != prev:                        # the link to the previous entry is broken
            return False, id_, "link to the previous entry is broken (an earlier entry was changed, removed or reordered)"
        if compute_hash(prev_hash, ts, actor, action, details) != digest:
            return False, id_, "this entry's content does not match its fingerprint (it was edited)"
        prev, count = digest, count + 1
    return True, None, f"all {count} entries verified"
