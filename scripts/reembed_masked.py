"""
Re-embed every chunk from its MASKED text, so no raw personal data is sent to the embedding service.

The first version of notebook 03 sent each chunk's raw text to Jina when building the index. This script
replaces those embeddings with embeddings of the masked text (the same masking the answer pipeline uses).
Raw text stays in the database, where retrieval and the tier rule need it; only masked text leaves.

Run once on the server (needs DATABASE_URL and JINA_API_KEY in .env):

    python scripts/reembed_masked.py            # all chunks
    python scripts/reembed_masked.py --dry-run  # show what would be sent, change nothing

It is safe to stop and re-run: chunks already done are recorded in the chunks.embedded_masked column.
"""
from __future__ import annotations

import argparse
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

env = os.path.join(ROOT, ".env")
if os.path.exists(env):
    for line in open(env, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

import psycopg  # noqa: E402
import masker, rag  # noqa: E402

BATCH = 16


def embed_passages(texts: list[str]) -> list[list[float]]:
    """Jina embeddings for stored passages (task 'retrieval.passage', 768 numbers each)."""
    data = rag._post(rag.JINA_URL, {"Authorization": f"Bearer {os.environ['JINA_API_KEY']}"},
                     {"model": "jina-embeddings-v3", "task": "retrieval.passage", "dimensions": 768,
                      "normalized": True, "input": texts})
    return [d["embedding"] for d in sorted(data["data"], key=lambda d: d["index"])]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--pause", type=float, default=2.0, help="seconds between API calls")
    args = ap.parse_args()

    conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)
    conn.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedded_masked BOOLEAN NOT NULL DEFAULT false")
    todo = conn.execute("SELECT id, content FROM chunks WHERE NOT embedded_masked ORDER BY id").fetchall()
    print(f"{len(todo)} chunks to re-embed from masked text")
    if args.dry_run:
        for cid, content in todo[:3]:
            print(f"--- chunk {cid} as it would be sent:\n{masker.mask_all(content)[0][:300]}")
        return

    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        masked = [masker.mask_all(content)[0] for _, content in batch]
        vectors = embed_passages(masked)
        with conn.transaction():
            for (cid, _), vec in zip(batch, vectors):
                conn.execute("UPDATE chunks SET embedding = %s::vector, embedded_masked = true WHERE id = %s",
                             ("[" + ",".join(f"{x:.6f}" for x in vec) + "]", cid))
        print(f"re-embedded {min(i + BATCH, len(todo))}/{len(todo)}")
        time.sleep(args.pause)
    print("Done. Every embedding now comes from masked text.")


if __name__ == "__main__":
    main()
