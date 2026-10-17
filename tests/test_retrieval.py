"""Access control before the model: the tier rule runs inside the SQL query and always returns full results."""
import psycopg

import rag
from conftest import fake_embedding, vec_text

CONTRACT_Q = "What do the contracts say about termination and confidentiality?"


def test_old_index_query_starved_low_tier_users(conn):
    """Documents the bug the exact search fixes: with the HNSW index, the ~40 nearest chunks are all contracts
    (tier 2-3), so the tier filter left a teller with fewer than k results."""
    vec = vec_text(fake_embedding(CONTRACT_Q))
    with conn.transaction():
        # Leave the planner only the HNSW index, as on the full-size server table; undone by the rollback below.
        conn.execute("DROP INDEX chunks_tier_idx")
        conn.execute("SET LOCAL enable_seqscan = off")
        plan = "\n".join(r[0] for r in conn.execute(
            "EXPLAIN SELECT id FROM chunks WHERE tier <= 1 ORDER BY embedding <=> %s::vector LIMIT 5", (vec,)))
        rows = conn.execute(
            "SELECT id FROM chunks WHERE tier <= 1 ORDER BY embedding <=> %s::vector LIMIT 5", (vec,)).fetchall()
        raise psycopg.Rollback()
    assert "chunks_embedding_idx" in plan
    assert len(rows) < 5


def test_teller_gets_full_results_and_only_tier_1(conn, models):
    rows = rag.retrieve(conn, CONTRACT_Q, tier=1, k=5)
    assert len(rows) == 5
    assert {r[4] for r in rows} == {1}


def test_compliance_reaches_restricted_contracts(conn, models):
    rows = rag.retrieve(conn, CONTRACT_Q, tier=3, k=5)
    assert len(rows) == 5
    assert all(r[1] == "cuad" for r in rows)
    assert max(r[4] for r in rows) <= 3


def test_no_user_ever_sees_above_their_tier(conn, models):
    for tier in (1, 2, 3):
        for q in (CONTRACT_Q, "disputed card transaction", "gas trading desk schedule"):
            assert max(r[4] for r in rag.retrieve(conn, q, tier=tier, k=10)) <= tier


def test_result_size_is_bounded(conn, models):
    assert len(rag.retrieve(conn, "disputed card transaction", tier=3, k=10_000)) == 20
