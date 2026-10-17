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
