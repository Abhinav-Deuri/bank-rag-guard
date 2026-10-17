"""
Test setup: a throwaway PostgreSQL + pgvector database with the project's real schema, synthetic data built
the same way as notebook 02, and local stand-ins for the two outside services (Jina embeddings, Groq models),
so the tests need no API keys and spend no quota.

Needs a PostgreSQL server with the pgvector extension. Point TEST_DATABASE_URL at a server where the user may
create databases (default: postgresql://localhost/postgres). The tests create and drop "bankrag_test".
"""
from __future__ import annotations

import hashlib
import math
import os
import random
import re
import sys

import psycopg
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

ADMIN_URL = os.environ.get("TEST_DATABASE_URL", "postgresql://localhost/postgres")
TEST_DB = "bankrag_test"


def test_url() -> str:
    """ADMIN_URL with the database name swapped for the test database."""
    if "://" in ADMIN_URL:
        base, _, _ = ADMIN_URL.rpartition("/")
        return f"{base}/{TEST_DB}"
    return re.sub(r"dbname=\S+", f"dbname={TEST_DB}", ADMIN_URL)


# ---------- Stand-in embedding: hashed bag of words, so texts sharing words are close ----------
STOP = {"the", "and", "a", "an", "of", "to", "do", "does", "say", "what", "about", "which", "this", "by", "for",
        "is", "are", "in", "on", "be", "may", "any", "all", "with", "under", "upon"}


def fake_embedding(text: str, dim: int = 768) -> list[float]:
    vec = [0.0] * dim
    for word in re.findall(r"\w+", text.lower()):
        if word in STOP:
            continue
        h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0 if (h >> 12) & 1 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def vec_text(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


# ---------- Synthetic data, using notebook 02's generators ----------
def luhn_check_digit(digits: str) -> str:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return str((10 - total % 10) % 10)


def make_emirates_id(rng: random.Random) -> str:
    year = rng.randint(1950, 2005)
    serial = f"{rng.randint(0, 9_999_999):07d}"
    return f"784-{year}-{serial}-{luhn_check_digit('784' + str(year) + serial)}"


def make_uae_iban(rng: random.Random) -> str:
    bban = f"{rng.randint(0, 999):03d}" + f"{rng.randint(0, 10**16 - 1):016d}"
    return f"AE{98 - int(bban + '101400') % 97:02d}{bban}"


def make_phone(rng: random.Random) -> str:
    return "+9715" + f"{rng.randint(0, 99_999_999):08d}"


CONTRACT_TEXT = ("Contracts clause. This Agreement may be terminated by either party upon thirty days written notice. Termination "
                 "does not affect confidentiality obligations, which survive termination for five years. "
                 "Confidential Information means all non-public information disclosed under this Agreement. Contracts {n}")
EMAIL_TEXT = "Subject: quarterly gas trading desk schedule {n}\n\nThe meeting moves to Thursday; bring the positions report."


def build_rows(seed: int = 42):
    """(source, doc_id, content, tier, truth) rows. truth holds the raw identifiers in customer notes."""
    rng = random.Random(seed)
    from faker import Faker
    Faker.seed(seed)
    fake_en, fake_ar = Faker("en_US"), Faker("ar_AA")
    rows = []
    for i in range(80):                                     # customer notes, all tiers
        lang = "en" if i % 2 == 0 else "ar"
        name = fake_en.name() if lang == "en" else fake_ar.name()
        eid, iban, phone = make_emirates_id(rng), make_uae_iban(rng), make_phone(rng)
        if lang == "en":
            text = (f"Customer {name}, Emirates ID {eid}, IBAN {iban}, phone {phone}, "
                    "reported a disputed card transaction and requested a review.")
        else:
            text = (f"العميل {name}، رقم الهوية الإماراتية {eid}، رقم الآيبان {iban}، "
                    f"الهاتف {phone}، قدّم شكوى بخصوص عملية بطاقة مشكوك فيها.")
        rows.append(("customer_notes", f"CUST{i:04d}", text, [1, 1, 2, 3][i % 4],
                     {"name": name, "eid": eid, "iban": iban, "phone": phone}))
    for i in range(120):                                    # contracts: tiers 2 and 3 only
        rows.append(("cuad", f"contract-{i}#0", CONTRACT_TEXT.format(n=i), 2 if i % 3 else 3, None))
    for i in range(60):                                     # emails, mostly tier 1
        rows.append(("enron", f"enron-{i:04d}", EMAIL_TEXT.format(n=i), 1 if i % 5 else 2, None))
    return rows


SCHEMA = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    """CREATE TABLE chunks (
        id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL, doc_id TEXT NOT NULL, content TEXT NOT NULL,
        tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 3), embedding vector(768),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())""",
    """CREATE TABLE users (
        username TEXT PRIMARY KEY, role TEXT NOT NULL CHECK (role IN ('teller', 'compliance', 'auditor')),
        tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 3))""",
    """CREATE TABLE audit_log (
        id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(), actor TEXT NOT NULL, action TEXT NOT NULL,
        details JSONB NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL)""",
    "CREATE INDEX chunks_tier_idx ON chunks (tier)",
    "CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops)",
    # notebook 05: the log is append-only
    """CREATE OR REPLACE FUNCTION audit_log_block_change() RETURNS trigger AS $$
       BEGIN RAISE EXCEPTION 'audit_log is append-only: changes are not allowed'; END; $$ LANGUAGE plpgsql""",
    """CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
       FOR EACH ROW EXECUTE FUNCTION audit_log_block_change()""",
    """CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
       FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_change()""",
]


@pytest.fixture(scope="session")
def db_url():
    try:
        admin = psycopg.connect(ADMIN_URL, autocommit=True)
    except psycopg.OperationalError as e:
        pytest.skip(f"no PostgreSQL server for tests ({e}); set TEST_DATABASE_URL")
    admin.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    admin.execute(f"CREATE DATABASE {TEST_DB}")
    url = test_url()
    with psycopg.connect(url, autocommit=True) as conn:
        for sql in SCHEMA:
            conn.execute(sql)
        conn.execute("INSERT INTO users VALUES ('teller1','teller',1), ('compliance1','compliance',3), "
                     "('auditor1','auditor',1)")
        for source, doc_id, content, tier, _ in build_rows():
            conn.execute("INSERT INTO chunks (source, doc_id, content, tier, embedding) VALUES (%s,%s,%s,%s,%s::vector)",
                         (source, doc_id, content, tier, vec_text(fake_embedding(content))))
    yield url
    admin.execute(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
    admin.close()


@pytest.fixture()
def conn(db_url):
    c = psycopg.connect(db_url, autocommit=True)
    c.execute("SET TIME ZONE 'UTC'")
    yield c
    c.close()


class FakeModels:
    """Records every prompt sent to the 'language model' and returns scripted replies."""

    def __init__(self):
        self.prompts: list[tuple[str, str]] = []
        self.answer = "All matching complaints concern disputed card transactions (Source 1)."
        self.guard_blocks = re.compile(r"(?i)ignore all previous|system prompt|real values")

    def chat(self, system, user, model=None, temperature=0.0, max_tokens=1500):
        self.prompts.append((system, user))
        if '"injection"' in user:
            return '{"injection": %s}' % ("true" if "ignore all previous" in user.lower() else "false")
        if '"block"' in user:
            message = user.rsplit("Message to check:", 1)[-1]
            hit = bool(self.guard_blocks.search(message))
            return '{"block": %s, "reason": "%s"}' % ("true" if hit else "false", "asks to override rules" if hit else "normal question")
        return "{}"

    def ask_model(self, question, context):
        self.prompts.append(("answer-model", f"Question: {question}\n\nContext:\n{context}"))
        return self.answer, "fake-model"


@pytest.fixture()
def models(monkeypatch):
    import guard
    import rag
    fake = FakeModels()
    monkeypatch.setattr(rag, "embed_query", fake_embedding)
    monkeypatch.setattr(rag, "ask_model", fake.ask_model)
    monkeypatch.setattr(guard, "chat", fake.chat)
    guard._chunk_cache.clear()
    return fake


@pytest.fixture(scope="session")
def truth():
    """The raw identifiers planted in the customer notes."""
    return [t for *_, t in build_rows() if t]
