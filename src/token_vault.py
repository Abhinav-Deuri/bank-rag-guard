"""Pivot 2: Just-in-Time Cryptographic Break-Glass Token Vault for AML Investigations.

Keeps the LLM blind to raw PII while preserving entity linkability across documents via deterministic
HMAC-SHA256 format-preserving tokens (e.g. IBAN_TOKEN_884A). Raw values are encrypted at rest using a
keyed stream cipher (simulating IBM Cloud Hyper Protect Crypto Services / Crypto Express HSM) and can
only be unmasked via a dual-custody workflow co-signed by a Compliance Officer, with every request and
unmasking event recorded into the SHA-256 hash-chained audit log.
"""
import base64
import hashlib
import hmac
import os
import re
from datetime import datetime, timezone

try:
    from . import audit, masker
except (ImportError, ValueError):
    import audit, masker

VAULT_TABLES = [
    """CREATE TABLE IF NOT EXISTS token_vault (
        token_id    TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        ciphertext  TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS break_glass_requests (
        id              BIGSERIAL PRIMARY KEY,
        token_id        TEXT NOT NULL,
        label           TEXT NOT NULL,
        requested_by    TEXT NOT NULL,
        justification   TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        approved_by     TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at     TIMESTAMPTZ
    )""",
]

# In-memory mirror so token lookups and tests work even if a DB transaction rolls back
_MEMORY_VAULT: dict[str, dict] = {}
_MEMORY_REQUESTS: list[dict] = []


def _master_key() -> bytes:
    raw = os.environ.get("HSM_MASTER_KEY", "ibm-linuxone-hpcs-kyok-master-key-2026")
    return hashlib.sha256(raw.encode("utf-8")).digest()


def _normalize_value(label: str, raw_value: str) -> str:
    """Normalize whitespace/separators so identical entities get the exact same deterministic token."""
    cleaned = re.sub(r"[\s\-\./]+", "", raw_value.strip()).upper()
    return f"{label}:{cleaned}"


def compute_token_id(label: str, raw_value: str) -> str:
    """Deterministic format-preserving token ID (e.g. IBAN_TOKEN_884A) using HMAC-SHA256."""
    norm = _normalize_value(label, raw_value).encode("utf-8")
    digest = hmac.new(_master_key(), norm, hashlib.sha256).hexdigest().upper()
    return f"{label}_TOKEN_{digest[:4]}"


def _encrypt(plaintext: str) -> str:
    """Encrypt plaintext with an HSM-derived keystream and random 8-byte nonce."""
    nonce = os.urandom(8)
    data = plaintext.encode("utf-8")
    key = _master_key()
    stream = b""
    counter = 0
    while len(stream) < len(data):
        stream += hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        counter += 1
    xored = bytes(a ^ b for a, b in zip(data, stream[: len(data)]))
    return base64.urlsafe_b64encode(nonce + xored).decode("ascii")


def _decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext produced by _encrypt."""
    raw = base64.urlsafe_b64decode(ciphertext.encode("ascii"))
    nonce, xored = raw[:8], raw[8:]
    key = _master_key()
    stream = b""
    counter = 0
    while len(stream) < len(xored):
        stream += hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        counter += 1
    data = bytes(a ^ b for a, b in zip(xored, stream[: len(xored)]))
    return data.decode("utf-8")


def ensure_vault_tables(conn) -> None:
    if conn is None:
        return
    try:
        for sql in VAULT_TABLES:
            conn.execute(sql)
    except Exception:
        pass


def register_spans(conn, text: str, spans: list[tuple[int, int, str]] | None = None) -> list[dict]:
    """Register all PII spans from `text` into the cryptographic token vault.

    Returns an ordered list of token metadata dicts corresponding to each `[LABEL]` tag in the masked text:
    `[{"index": 0, "token_id": "IBAN_TOKEN_884A", "label": "IBAN"}, ...]`
    """
    if spans is None:
        spans = masker.find_all(text)
    if not spans:
        return []

    ensure_vault_tables(conn)
    tokens: list[dict] = []

    for idx, (s, e, label) in enumerate(spans):
        raw_val = text[s:e]
        if not raw_val:
            continue
        token_id = compute_token_id(label, raw_val)
        cipher = _encrypt(raw_val)
        _MEMORY_VAULT[token_id] = {
            "token_id": token_id,
            "label": label,
            "ciphertext": cipher,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if conn is not None:
            try:
                conn.execute(
                    "INSERT INTO token_vault (token_id, label, ciphertext) VALUES (%s, %s, %s) "
                    "ON CONFLICT (token_id) DO NOTHING",
                    (token_id, label, cipher),
                )
            except Exception:
                pass
        tokens.append({
            "index": idx,
            "token_id": token_id,
            "label": label,
        })
    return tokens


def request_break_glass(conn, token_id: str, requested_by: str, justification: str) -> dict:
    """Create a break-glass unmask request and log it to the SHA-256 hash chain."""
    ensure_vault_tables(conn)
    justification = (justification or "").strip()[:300]
    if not justification:
        raise ValueError("Justification is required for AML break-glass unmasking.")

    label = token_id.split("_TOKEN_")[0] if "_TOKEN_" in token_id else "PII"
    req_id = len(_MEMORY_REQUESTS) + 1
    now_iso = datetime.now(timezone.utc).isoformat()

    if conn is not None:
        try:
            row = conn.execute(
                "INSERT INTO break_glass_requests (token_id, label, requested_by, justification, status) "
                "VALUES (%s, %s, %s, %s, 'pending') RETURNING id",
                (token_id, label, requested_by, justification),
            ).fetchone()
            if row:
                req_id = row[0]
        except Exception:
            pass

        try:
            audit.append_event(
                conn,
                requested_by,
                "break_glass_requested",
                {
                    "request_id": req_id,
                    "token_id": token_id,
                    "label": label,
                    "justification": masker.mask_all(justification)[0],
                },
            )
        except Exception:
            pass

    entry = {
        "id": req_id,
        "token_id": token_id,
        "label": label,
        "requested_by": requested_by,
        "justification": justification,
        "status": "pending",
        "approved_by": None,
        "created_at": now_iso,
    }
    _MEMORY_REQUESTS.append(entry)
    return entry


def approve_break_glass(
    conn,
    token_id: str,
    requested_by: str,
    approved_by: str,
    justification: str,
) -> dict:
    """Dual-custody compliance approval to unmask a specific token and record in SHA-256 chain."""
    ensure_vault_tables(conn)
    justification = (justification or "").strip()[:300]
    if not justification:
        raise ValueError("A regulatory justification (e.g., AML SAR reference) is required.")
    if requested_by and approved_by and requested_by.strip().lower() == approved_by.strip().lower():
        if conn is not None:
            try:
                audit.append_event(
                    conn,
                    requested_by,
                    "break_glass_denied",
                    {
                        "token_id": token_id,
                        "requested_by": requested_by,
                        "approved_by": approved_by,
                        "reason": "Dual-custody violation: self-approval rejected.",
                    },
                )
            except Exception:
                pass
        raise PermissionError("Dual-custody violation: requester cannot self-approve break-glass unmasking.")

    # Verify the approver is a compliance role or Tier 3 authority
    approver_role = "compliance" if "compliance" in approved_by.lower() else ("auditor" if "auditor" in approved_by.lower() else "teller")
    approver_tier = 3 if approver_role == "compliance" else 1
    if conn is not None:
        try:
            row = conn.execute(
                "SELECT role, tier FROM users WHERE username = %s",
                (approved_by,),
            ).fetchone()
            if row is None:
                raise PermissionError(f"Unknown approver user: {approved_by}")
            approver_role, approver_tier = row[0], int(row[1])
        except PermissionError:
            raise
        except Exception:
            pass

    if approver_role != "compliance" and approver_tier < 3:
        if conn is not None:
            try:
                audit.append_event(
                    conn,
                    approved_by,
                    "break_glass_denied",
                    {
                        "token_id": token_id,
                        "requested_by": requested_by,
                        "approved_by": approved_by,
                        "role": approver_role,
                        "tier": approver_tier,
                        "reason": f"Insufficient authority: {approved_by} (Tier {approver_tier}) cannot co-sign Break-Glass.",
                    },
                )
            except Exception:
                pass
        raise PermissionError(
            f"Dual-custody violation: '{approved_by}' (role={approver_role}, tier={approver_tier}) "
            "is not authorized to co-sign break-glass unmasking. Compliance Officer (Tier 3) required."
        )

    # Fetch ciphertext from DB or memory vault
    cipher = None
    label = token_id.split("_TOKEN_")[0] if "_TOKEN_" in token_id else "PII"
    if conn is not None:
        try:
            row = conn.execute(
                "SELECT label, ciphertext FROM token_vault WHERE token_id = %s",
                (token_id,),
            ).fetchone()
            if row:
                label, cipher = row[0], row[1]
        except Exception:
            pass

    if cipher is None and token_id in _MEMORY_VAULT:
        label = _MEMORY_VAULT[token_id]["label"]
        cipher = _MEMORY_VAULT[token_id]["ciphertext"]

    if cipher is None:
        raise KeyError(f"Token {token_id} not found in HSM token vault.")

    plaintext = _decrypt(cipher)
    now_iso = datetime.now(timezone.utc).isoformat()
    req_id = len(_MEMORY_REQUESTS) + 1

    if conn is not None:
        try:
            row = conn.execute(
                "INSERT INTO break_glass_requests "
                "(token_id, label, requested_by, justification, status, approved_by, resolved_at) "
                "VALUES (%s, %s, %s, %s, 'approved', %s, now()) RETURNING id",
                (token_id, label, requested_by, justification, approved_by),
            ).fetchone()
            if row:
                req_id = row[0]
        except Exception:
            pass

        # Log the dual-custody unmasking event to the SHA-256 hash chain (never storing raw plaintext in the log!)
        audit_id, audit_hash = audit.append_event(
            conn,
            approved_by,
            "break_glass_unmasked",
            {
                "request_id": req_id,
                "token_id": token_id,
                "label": label,
                "requested_by": requested_by,
                "approved_by": approved_by,
                "justification": masker.mask_all(justification)[0],
                "hsm_key_id": "IBM-HPCS-KYOK-01",
            },
        )
    else:
        audit_id, audit_hash = 0, "0" * 64

    record = {
        "request_id": req_id,
        "token_id": token_id,
        "label": label,
        "plaintext": plaintext,
        "requested_by": requested_by,
        "approved_by": approved_by,
        "justification": justification,
        "status": "approved",
        "resolved_at": now_iso,
        "audit_entry_id": audit_id,
        "audit_hash": audit_hash,
        "hsm_key_id": "IBM-HPCS-KYOK-01",
    }
    _MEMORY_REQUESTS.append(record)
    return record


def list_requests(conn, limit: int = 20) -> list[dict]:
    """Return recent break-glass unmask requests."""
    ensure_vault_tables(conn)
    if conn is not None:
        try:
            rows = conn.execute(
                "SELECT id, token_id, label, requested_by, justification, status, approved_by, created_at, resolved_at "
                "FROM break_glass_requests ORDER BY id DESC LIMIT %s",
                (limit,),
            ).fetchall()
            return [
                {
                    "id": r[0],
                    "token_id": r[1],
                    "label": r[2],
                    "requested_by": r[3],
                    "justification": r[4],
                    "status": r[5],
                    "approved_by": r[6],
                    "created_at": r[7].isoformat() if r[7] else None,
                    "resolved_at": r[8].isoformat() if r[8] else None,
                }
                for r in rows
            ]
        except Exception:
            pass
    return list(reversed(_MEMORY_REQUESTS[-limit:]))
