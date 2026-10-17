"""Tamper-evident audit log: each row stores a SHA-256 fingerprint that includes the previous row's fingerprint."""
import hashlib, json
from datetime import datetime, timezone
try:
    from psycopg.types.json import Jsonb
except ImportError:
    class Jsonb:
        def __init__(self, obj):
            self.obj = obj

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
        try:
            conn.execute("SELECT pg_advisory_xact_lock(748201)")            # one writer at a time
        except Exception:
            pass  # Non-PostgreSQL or sqlite fallback
        
        # Determine schema columns
        prev = GENESIS
        try:
            row = conn.execute("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1").fetchone()
            if row and row[0]:
                prev = row[0]
        except Exception:
            try:
                row = conn.execute("SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1").fetchone()
                if row and row[0]:
                    prev = row[0]
            except Exception:
                prev = GENESIS

        digest = compute_hash(prev, ts, actor, action, details)
        
        try:
            # Notebook 01 schema: (ts, actor, action, details, prev_hash, hash)
            new_id = conn.execute(
                "INSERT INTO audit_log (ts, actor, action, details, prev_hash, hash) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (ts, actor, action, Jsonb(details), prev, digest)).fetchone()[0]
        except Exception:
            # Section 3 specification schema: (timestamp, username, tier, query, chunks_retrieved, action_taken, previous_hash, entry_hash)
            tier_val = details.get("tier", 1)
            query_val = details.get("question", details.get("query", ""))
            chunks_val = len(details.get("chunk_ids", []))
            new_id = conn.execute(
                "INSERT INTO audit_log (timestamp, username, tier, query, chunks_retrieved, action_taken, previous_hash, entry_hash) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (ts, actor, tier_val, query_val, chunks_val, action, prev, digest)).fetchone()[0]

    return new_id, digest

def verify_chain(conn):
    """Check every entry in order. Returns (ok, first_bad_id, message)."""
    prev, count = GENESIS, 0
    try:
        rows = conn.execute("SELECT id, ts, actor, action, details, prev_hash, hash FROM audit_log ORDER BY id").fetchall()
    except Exception:
        try:
            raw_rows = conn.execute("SELECT id, timestamp, username, action_taken, tier, query, previous_hash, entry_hash FROM audit_log ORDER BY id").fetchall()
            rows = [(r[0], r[1], r[2], r[3], {"tier": r[4], "query": r[5]}, r[6], r[7]) for r in raw_rows]
        except Exception as e:
            return False, None, f"Cannot read audit_log table: {e}"

    for id_, ts, actor, action, details, prev_hash, digest in rows:
        if prev_hash != prev:                        # the link to the previous entry is broken
            return False, id_, "link to the previous entry is broken (an earlier entry was changed, removed or reordered)"
        dt = details if isinstance(details, dict) else (json.loads(details) if details else {})
        if compute_hash(prev_hash, ts, actor, action, dt) != digest:
            return False, id_, "this entry's content does not match its fingerprint (it was edited)"
        prev, count = digest, count + 1
    return True, None, f"all {count} entries verified"
