"""
Measure the masker (src/masker.py) on the project's data. Every number is computed when you run this file;
nothing is typed in by hand.

Test sets (created by notebooks 02 and 04b, stored in data/, which is not in git):
  data/customers.csv               synthetic customer notes with the true name, Emirates ID, IBAN and phone
  data/pii_benchmark.jsonl         ai4privacy/pii-masking-200k development slice (used while writing the rules)
  data/pii_benchmark_fresh.jsonl   ai4privacy slice the rules were never tuned on (the honest number)

    python eval/benchmark_name_masker.py

Writes eval/name_benchmark_scores.csv.
"""
from __future__ import annotations

import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
sys.path.insert(0, os.path.join(ROOT, "src"))

import masker  # noqa: E402
import pii  # noqa: E402

NAME_GOLD = {"FIRSTNAME", "LASTNAME", "MIDDLENAME"}


def overlap(a0: int, a1: int, b0: int, b1: int) -> int:
    return max(0, min(a1, b1) - max(a0, b0))


def score_customers(path: str) -> list[dict]:
    """Per language and per identifier: was each true value fully hidden in the masked note?"""
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    out = []
    for lang in ("en", "ar"):
        notes = [r for r in rows if r["language"] == lang]
        if not notes:
            continue
        for field, label in (("name", "NAME"), ("emirates_id", "EMIRATES_ID"), ("iban", "IBAN"), ("phone", "PHONE")):
            caught = 0
            for r in notes:
                text = r["text"]
                value = r[field]
                # Notebook 02 rewrites some Arabic notes with Arabic-Indic digits, so look for either form.
                start = text.find(value)
                if start < 0:
                    start = pii.normalize(text).find(value)
                if start < 0:
                    continue
                end = start + len(value)
                spans = masker.find_all(text)
                covered = sum(overlap(s, e, start, end) for s, e, _ in spans)
                caught += covered >= len(value) - 1          # allow one stray character (punctuation)
            out.append({"test_set": f"customer notes ({lang})", "kind": "synthetic, same generator as the rules",
                        "target": label, "labelled": len(notes), "recall": round(caught / len(notes), 3),
                        "findings": "", "precision_same_label": "", "precision_any_label": ""})
    return out


def score_benchmark(path: str, name: str, kind: str) -> dict:
    """Recall and precision of the NAME tag against ai4privacy's first / middle / last name labels."""
    gold_n = caught = pred_n = same = anyl = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            text = row["source_text"]
            mask = row["privacy_mask"]
            all_gold = json.loads(mask) if isinstance(mask, str) else mask
            gold = [g for g in all_gold if g["label"] in NAME_GOLD]
            preds = [p for p in masker.find_all(text) if p[2] == "NAME"]
            for g in gold:
                gold_n += 1
                half = 0.5 * (g["end"] - g["start"])
                caught += any(overlap(p[0], p[1], g["start"], g["end"]) >= half for p in preds)
            for s, e, _ in preds:
                pred_n += 1
                same += any(overlap(s, e, g["start"], g["end"]) > 0 for g in gold)
                anyl += any(overlap(s, e, g["start"], g["end"]) > 0 for g in all_gold)
    return {"test_set": name, "kind": kind, "target": "NAME", "labelled": gold_n,
            "recall": round(caught / max(gold_n, 1), 3), "findings": pred_n,
            "precision_same_label": round(same / max(pred_n, 1), 3),
            "precision_any_label": round(anyl / max(pred_n, 1), 3)}


def main() -> None:
    results: list[dict] = []
    files = {
        "customers": os.path.join(DATA, "customers.csv"),
        "dev": os.path.join(DATA, "pii_benchmark.jsonl"),
        "fresh": os.path.join(DATA, "pii_benchmark_fresh.jsonl"),
    }
    if os.path.exists(files["customers"]):
        results += score_customers(files["customers"])
    if os.path.exists(files["dev"]):
        results.append(score_benchmark(files["dev"], "ai4privacy development slice", "rules were tuned on this"))
    if os.path.exists(files["fresh"]):
        results.append(score_benchmark(files["fresh"], "ai4privacy fresh slice", "never used while writing rules"))
    missing = [p for p in files.values() if not os.path.exists(p)]
    if missing:
        print("Skipped (file not found, run notebooks 02 and 04b first):", *missing, sep="\n  ")
    if not results:
        sys.exit("No test data found.")

    out = os.path.join(HERE, "name_benchmark_scores.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        w.writeheader()
        w.writerows(results)

    print(f"{'Test set':<34} {'Target':<12} {'Labelled':>8} {'Recall':>8} {'Precision':>10}")
    for r in results:
        prec = f"{r['precision_same_label']:.1%}" if r["precision_same_label"] != "" else "–"
        print(f"{r['test_set']:<34} {r['target']:<12} {r['labelled']:>8} {r['recall']:>8.1%} {prec:>10}")
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()
