try:
    from . import pii
    from . import person_names
except (ImportError, ValueError):
    import pii
    import person_names

def find_all(text):
    """All PII spans as (start, end, label); name spans never overlap a structured finding."""
    spans = list(pii.find_pii(text))
    for s, e, label in person_names.find_names(text):
        if not any(s < ce and e > cs for cs, ce, _ in spans):
            spans.append((s, e, label))
    return sorted(spans)

def mask_all(text):
    """Return (masked_text, spans), with each finding replaced by a [LABEL] tag."""
    spans = find_all(text)
    pieces, last = [], 0
    for s, e, label in spans:
        pieces.append(text[last:s])                  # keep the text before the finding
        pieces.append(f"[{label}]")                  # replace the finding with its tag
        last = e
    pieces.append(text[last:])                       # keep the rest
    return "".join(pieces), spans

# ---------- Numbered tokens for break-glass reveal ----------
def _same_value_key(label, value):
    """Two findings are the same value if they match after ignoring case, spacing, separators and digit script."""
    v = pii.normalize(value).casefold()
    if label == "NAME":
        return label, " ".join(v.split())
    return label, "".join(ch for ch in v if ch.isalnum())

def mask_tokens(text, mapping):
    """Like mask_all, but each distinct value gets a numbered tag ([IBAN_1], [NAME_2], ...).

    `mapping` is shared across all passages of one answer, so the same customer gets the same token everywhere,
    and the numbering depends only on the passages and their order. That is what lets vault.reveal() recover a
    value later by re-masking the same passages: no raw value is stored anywhere new.
    Returns (masked_text, spans) with spans carrying the plain label, so counts stay comparable."""
    spans = find_all(text)
    pieces, last = [], 0
    for s, e, label in spans:
        key = _same_value_key(label, text[s:e])
        if key not in mapping:
            mapping[key] = f"{label}_{sum(1 for k in mapping if k[0] == label) + 1}"
        pieces.append(text[last:s])
        pieces.append(f"[{mapping[key]}]")
        last = e
    pieces.append(text[last:])
    return "".join(pieces), spans

def token_values(texts):
    """Re-mask texts in order and return {token: original value} (first occurrence wins)."""
    mapping, values = {}, {}
    for text in texts:
        for s, e, label in find_all(text):
            key = _same_value_key(label, text[s:e])
            if key not in mapping:
                mapping[key] = f"{label}_{sum(1 for k in mapping if k[0] == label) + 1}"
                values[mapping[key]] = text[s:e]
    return values
