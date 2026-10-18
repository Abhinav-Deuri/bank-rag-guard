"""Break-glass reveal: numbered tokens, two-person approval, one-time reveal, everything audited, values never logged."""
import json
from datetime import timedelta

import pytest

import audit
import masker
import rag
import vault


def test_same_value_gets_the_same_token_and_values_can_be_rebuilt():
    texts = ["IBAN AE07 0331 2345 6789 0123 456 and phone +971501234567.",
             "Repeat: ae07-0331-2345-6789-0123-456, then GB82 WEST 1234 5698 7654 32."]
    mapping = {}
    a, _ = masker.mask_tokens(texts[0], mapping)
    b, _ = masker.mask_tokens(texts[1], mapping)
    assert "[IBAN_1]" in a and "[PHONE_1]" in a
    assert b.startswith("Repeat: [IBAN_1]") and "[IBAN_2]" in b      # same IBAN written differently, same token
    values = masker.token_values(texts)
    assert values["IBAN_1"] == "AE07 0331 2345 6789 0123 456" and values["IBAN_2"].startswith("GB82")


@pytest.fixture()
def answered(conn, models):
    """compliance1 asks a question whose passages contain customer identifiers."""
    res = rag.answer(conn, "compliance1", "disputed card transaction")
    token = next(t for t in ("IBAN_1", "EMIRATES_ID_1") if f"[{t}]" in " ".join(s["text"] for s in res["sources"]))
    return res, token


def logged(conn, action):
    return conn.execute("SELECT details FROM audit_log WHERE action = %s ORDER BY id DESC LIMIT 1", (action,)).fetchone()[0]


def test_full_flow_reveals_the_true_value_once(conn, answered, truth):
    res, token = answered
    rid = vault.request(conn, "compliance1", res["answer_id"], token, "AML alert 2026-114, sanctions screening")
    assert vault.decide(conn, "auditor1", rid, approve=True) == "approved"
    value = vault.reveal(conn, "compliance1", rid)

    planted = {t["iban"] for t in truth} | {t["eid"] for t in truth}
    assert value in planted
    with pytest.raises(vault.RevealError):                     # shown once only
        vault.reveal(conn, "compliance1", rid)

    everything = json.dumps([logged(conn, a) for a in
                             ("unmask_requested", "unmask_approved", "unmask_revealed")])
    assert value not in everything and token in everything     # the log names the token, never the value
    assert audit.verify_chain(conn)[0]


def test_rules_are_enforced(conn, answered):
    res, token = answered
    with pytest.raises(vault.RevealError) as e:                # tellers cannot ask
        vault.request(conn, "teller1", res["answer_id"], token, "curious about this customer")
    assert e.value.status == 403
    with pytest.raises(vault.RevealError):                     # a reason is required
        vault.request(conn, "compliance1", res["answer_id"], token, "pls")
    with pytest.raises(vault.RevealError):                     # only tokens that exist in that answer
        vault.request(conn, "compliance1", res["answer_id"], "IBAN_99", "case 7781, account review")

    rid = vault.request(conn, "compliance1", res["answer_id"], token, "case 7781, account review")
    with pytest.raises(vault.RevealError) as e:                # nobody approves their own request
        vault.decide(conn, "compliance1", rid, approve=True)
    assert e.value.status == 403
    with pytest.raises(vault.RevealError):                     # not before approval
        vault.reveal(conn, "compliance1", rid)
    with pytest.raises(vault.RevealError):                     # tellers cannot approve
        vault.decide(conn, "teller1", rid, approve=True)
    vault.decide(conn, "auditor1", rid, approve=False)
    with pytest.raises(vault.RevealError):                     # a denied request stays closed
        vault.reveal(conn, "compliance1", rid)


def test_only_the_requester_sees_the_value_and_approvals_expire(conn, answered, monkeypatch):
    res, token = answered
    rid = vault.request(conn, "compliance1", res["answer_id"], token, "case 9001, fraud hold review")
    vault.decide(conn, "auditor1", rid, approve=True)
    with pytest.raises(vault.RevealError):
        vault.reveal(conn, "auditor1", rid)
    monkeypatch.setattr(vault, "APPROVAL_TTL", timedelta(seconds=-1))
    with pytest.raises(vault.RevealError):
        vault.reveal(conn, "compliance1", rid)


def test_cannot_request_from_someone_elses_answer(conn, models):
    other = rag.answer(conn, "auditor1", "disputed card transaction")
    with pytest.raises(vault.RevealError):
        vault.request(conn, "compliance1", other["answer_id"], "IBAN_1", "case 1234, looking around")


def test_listing_never_contains_values(conn, answered):
    res, token = answered
    vault.request(conn, "compliance1", res["answer_id"], token, "case 5555, KYC refresh")
    seen = vault.listing(conn, "auditor1")
    assert seen["can_approve"] and not seen["can_request"] and seen["to_decide"]
    assert "value" not in json.dumps(seen)
