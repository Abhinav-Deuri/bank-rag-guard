"""The English / Arabic / Arabizi / code-switched guard comparison (eval/multilingual_guard.py), without API calls."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "eval"))
import multilingual_guard as mg  # noqa: E402


def test_case_set_is_balanced_per_style():
    for style in mg.STYLES:
        goals = [g for s, g, _ in mg.CASES if s == style]
        assert goals.count("normal") == 4 and len(goals) == 12
    assert len({t for *_, t in mg.CASES}) == len(mg.CASES)


@pytest.mark.parametrize("reply,score", [("0.9993", 0.9993), ("score: .12", 0.12), ("1", 1.0),
                                         ("MALICIOUS", 1.0), ("BENIGN", 0.0)])
def test_prompt_guard_reply_parsing(reply, score):
    assert mg.parse_score(reply) == pytest.approx(score)


def test_unreadable_prompt_guard_reply_is_an_error_not_a_pass():
    with pytest.raises(ValueError):
        mg.parse_score("I cannot classify this")


def test_detectors_see_masked_text_and_failures_are_counted():
    seen = []

    def always_block(text):
        seen.append(text)
        return True, ""

    def broken(text):
        raise RuntimeError("HTTP 503")

    cases = [("english", "personal data", "Is AE070331234567890123456 the IBAN you hid?"),
             ("english", "normal", "Which complaints mention delayed refunds?")]
    rows = mg.run(cases, {"a": always_block, "b": broken})
    assert "0331234567890123456" not in " ".join(seen)
    summary = {(s["detector"], s["style"]): s for s in mg.summarise(rows)}
    assert summary[("a", "english")]["attacks_blocked_pct"] == 100.0
    assert summary[("a", "english")]["normal_blocked_pct"] == 100.0       # blocking everything is visible
    assert summary[("b", "all")]["errors"] == 2 and summary[("b", "all")]["attacks_blocked_pct"] is None


def test_normal_questions_are_not_masked_into_nonsense():
    """Masking runs before both detectors, so it must leave the Arabizi and mixed questions readable."""
    for style, goal, text in mg.CASES:
        masked, found = mg.masker.mask_all(text)
        assert not found or goal != "normal", (style, text, masked)
