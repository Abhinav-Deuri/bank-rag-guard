"""Masking of structured identifiers: patterns plus IBAN mod-97 and Emirates ID check digits."""
import random

import masker
import pii
from conftest import build_rows, make_emirates_id, make_uae_iban


def test_checksums_on_known_values():
    assert pii._iban_ok("AE07 0331 2345 6789 0123 456")      # the published UAE example IBAN
    assert pii._iban_ok("GB82WEST12345698765432")
    assert not pii._iban_ok("AE08 0331 2345 6789 0123 456")  # one check digit off
    rng = random.Random(1)
    for _ in range(200):
        assert pii._iban_ok(make_uae_iban(rng))
        assert pii._emirates_id_ok(make_emirates_id(rng))


def test_loose_layouts_are_caught_when_the_checksum_passes():
    rng = random.Random(2)
    iban = make_uae_iban(rng)
    eid = make_emirates_id(rng).replace("-", "")
    cases = {
        iban.lower(): "IBAN",                                                   # lower case
        "-".join(iban[i:i + 4] for i in range(0, len(iban), 4)): "IBAN",        # hyphen groups
        f"{eid[:3]}.{eid[3:7]}.{eid[7:14]}.{eid[14]}": "EMIRATES_ID",           # dots
        f"{eid[:3]}/{eid[3:7]}/{eid[7:14]}/{eid[14]}": "EMIRATES_ID",           # slashes
    }
    for text, label in cases.items():
        masked, spans = pii.mask_text(f"Customer value {text} on file.")
        assert f"[{label}]" in masked, text
        assert not any(c.isdigit() for c in masked), masked                     # no digits left behind


def test_loose_layouts_with_a_bad_checksum_are_not_masked():
    rng = random.Random(3)
    eid = make_emirates_id(rng).replace("-", "")
    wrong = eid[:-1] + str((int(eid[-1]) + 1) % 10)
    text = f"Reference {wrong[:3]}.{wrong[3:]}"
    assert pii.mask_text(text)[0] == text


def test_arabic_indic_digits():
    rng = random.Random(4)
    eid = make_emirates_id(rng)
    arabic = eid.translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))
    masked, _ = pii.mask_text(f"رقم الهوية {arabic}")
    assert "[EMIRATES_ID]" in masked


def test_every_planted_identifier_is_masked_in_the_synthetic_notes():
    for source, _, content, _, t in build_rows():
        if not t:
            continue
        masked, _ = masker.mask_all(content)
        for key in ("eid", "iban", "phone"):
            assert t[key] not in masked, (key, masked)


def test_arabic_question_words_after_customer_are_not_names():
    """Found by the multilingual guard set: in "لدى العميل للإبلاغ" the word after "the customer" is "to report"."""
    for text in ("كم يوماً لدى العميل للإبلاغ عن معاملة متنازع عليها؟", "ماذا يريد العميل بالحساب الجديد؟",
                 "العميل يحتاج إلى بطاقة جديدة"):
        assert masker.mask_all(text)[0] == text
    masked, _ = masker.mask_all("العميل فالح المنصوري قدّم شكوى")
    assert "فالح" not in masked
