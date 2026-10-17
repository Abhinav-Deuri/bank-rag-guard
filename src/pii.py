"""Bilingual (English/Arabic) PII masker: structured identifiers."""
import re

# Map Arabic-Indic (٠-٩) and Persian (۰-۹) digits to 0-9. Both strings have 20 characters,
# so every character maps to exactly one character and text positions do not shift.
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")

def normalize(text):
    """Return text with all non-ASCII digits replaced by ASCII digits (same length)."""
    return text.translate(_DIGITS)

def _digit_count(text):
    """How many digit characters a string contains."""
    return sum(ch.isdigit() for ch in text)

def _digits_between(low, high):
    """Build a check function: the match must contain between low and high digits."""
    return lambda text: low <= _digit_count(text) <= high

def _not_a_date(digits_text):
    """Reject 8-digit strings that look like a YYYYMMDD date (so timestamps are not masked)."""
    if len(digits_text) == 8:
        year, month, day = int(digits_text[:4]), int(digits_text[4:6]), int(digits_text[6:])
        if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
            return False
    return True

def _luhn_ok(text):
    """True if the digits in text pass the Luhn checksum used by payment cards."""
    numbers = [int(c) for c in text if c.isdigit()]
    total = 0
    for i, n in enumerate(reversed(numbers)):
        if i % 2 == 1:              # double every second digit from the right
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return bool(numbers) and total % 10 == 0

def _brand_ok(text):
    """True if the digits start like a real card brand and have a length that brand uses."""
    d = "".join(c for c in text if c.isdigit())
    n, p2, p3, p4 = len(d), int(d[:2]), int(d[:3]), int(d[:4])
    if d[0] == "4":                                   return n in (16, 19)           # Visa
    if 51 <= p2 <= 55 or 2221 <= p4 <= 2720:          return n == 16                 # Mastercard
    if p2 in (34, 37):                                return n == 15                 # American Express
    if d[:4] == "6011" or p2 == 65 or 644 <= p3 <= 649: return n in (16, 19)         # Discover
    if 3528 <= p4 <= 3589:                            return 16 <= n <= 19           # JCB
    if p2 in (36, 38) or 300 <= p3 <= 305:            return n in (14, 16)           # Diners Club
    return False

def _not_a_timestamp(text):
    """Numbers starting with 19 or 20 are usually timestamps, and numbers with many leading zeros
    are usually record IDs, so neither is treated as a card."""
    return not text.startswith(("19", "20", "0000"))

def _looks_like_address(text):
    """Crypto addresses mix digits with lower- and upper-case letters; ordinary long words do not."""
    return (any(c.isdigit() for c in text) and any(c.islower() for c in text)
            and any(c.isupper() for c in text))

# Words that signal "an account or payment number follows" (English and Arabic)
_ACCOUNT_WORDS = r"(?:account|acct|acc't|a/c|حساب|الحساب|transfer(?:red)?|payment|deposit(?:ed)?|wire[d]?)"

# Words that signal "a payment card number is nearby"
_CARD_ALT = r"credit card|debit card|card|visa|mastercard|master card|maestro|amex|american express|discover|jcb|diners"

# Each entry: (label, compiled regex, regex group to mask (0 = whole match), optional check function).
# Order matters: specific patterns first, so later ones cannot claim their digits.
PATTERNS = [
    # Emirates ID: 784-YYYY-XXXXXXX-Z (hyphens or spaces optional)
    ("EMIRATES_ID", re.compile(r"(?<!\d)784[ \-]?\d{4}[ \-]?\d{7}[ \-]?\d(?!\d)"), 0, None),

    # IBAN, any country: 2 capital letters + 2 digits, then either a compact run of 11-30
    # letters/digits, or 3-7 groups of 4 separated by single spaces (plus an optional short last group).
    ("IBAN", re.compile(
        r"(?<![A-Za-z0-9])[A-Z]{2}\d{2}"
        r"(?:[A-Z0-9]{11,30}|(?: [A-Z0-9]{4}){3,7}(?: [A-Z0-9]{1,3})?)"
        r"(?![A-Za-z0-9])"), 0, lambda t: _digit_count(t) >= 8),

    # Payment card, way 1: real brand prefix and length, and a valid Luhn checksum
    ("CREDIT_CARD", re.compile(r"(?<!\d)\d(?:[ \-]?\d){12,18}(?!\d)"), 0,
     lambda t: _brand_ok(t) and _luhn_ok(t)),
    # Payment card, way 2a: a card word, then (up to 60 characters later) a 13-19 digit number
    ("CREDIT_CARD", re.compile(r"(?i)(?:" + _CARD_ALT + r")[^\d\n]{0,60}(?<!\d)(\d(?:[ \-]?\d){12,18})(?!\d)"),
     1, _digits_between(13, 19)),
    # Payment card, way 2b: a 13-19 digit number followed (within 40 characters) by a card word or CVV
    ("CREDIT_CARD", re.compile(r"(?<!\d)(\d(?:[ \-]?\d){12,18})(?!\d)(?=[^\d\n]{0,40}(?i:" + _CARD_ALT + r"|cvv))"),
     1, _digits_between(13, 19)),
    # Payment card, way 3: a standalone 15-16 digit number (not part of a longer token, not after a currency symbol)
    ("CREDIT_CARD", re.compile(r"(?<![\w\-./$€£¥,=])\d{15,16}(?![\w\-/]|\.\d)"), 0, _not_a_timestamp),

    # Crypto addresses: Ethereum (0x + 40 hex digits) and Bitcoin/Litecoin (base58, 25-39 characters)
    ("CRYPTO_ADDRESS", re.compile(r"(?<![A-Za-z0-9])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])"), 0, None),
    ("CRYPTO_ADDRESS", re.compile(r"(?<![A-Za-z0-9])[13LM][1-9A-HJ-NP-Za-km-z]{24,38}(?![A-Za-z0-9])"),
     0, _looks_like_address),

    # IPv6: full form (8 groups), then compressed form with "::"
    ("IP_ADDRESS", re.compile(r"(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}(?![0-9A-Fa-f:])"), 0, None),
    ("IP_ADDRESS", re.compile(
        r"(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{1,4}:){1,6}(?::[0-9A-Fa-f]{1,4}){1,6}(?![0-9A-Fa-f:])"), 0, None),

    # MAC address: six pairs of hex digits separated by ":" or "-"
    ("MAC_ADDRESS", re.compile(
        r"(?<![0-9A-Fa-f:\-])(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}(?![0-9A-Fa-f:\-])"), 0, None),

    # IPv4: four numbers from 0 to 255 separated by dots (a trailing sentence full stop is allowed)
    ("IP_ADDRESS", re.compile(
        r"(?<!\d)(?<!\d\.)(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?!\d|\.\d)"),
     0, None),

    # US social security number, dashed: 123-45-6789
    ("SSN", re.compile(r"(?<![\d\-])\d{3}-\d{2}-\d{4}(?![\d\-])"), 0, None),
    # US social security number, spaced: 123 45 6789
    ("SSN", re.compile(r"(?<![\d\-.])\d{3} \d{2} \d{4}(?![\d\-.])"), 0, None),
    # Swiss social insurance layout: 756.XXXX.XXXX(.XX), with any separator or none (11 or 13 digits)
    ("SSN", re.compile(r"(?<![\d.])756[ .\-]?\d{4}[ .\-]?\d{4}(?:[ .\-]?\d{2})?(?!\d)"), 0, _digits_between(11, 13)),
    # National ID after a cue word: "SSN 123456789", "social security number 756.7496.6890"
    ("SSN", re.compile(r"(?i)(?:\bssn\b|social security(?: number)?|national (?:id|insurance)(?: number)?)"
                       r"[^\d\n]{0,25}(?<!\d)(\d(?:[ \-.]?\d){7,10})(?!\d)"), 1, _digits_between(8, 11)),

    # Card security code after a cue word: "CVV is 531", "security code being 383", "verification value (936)"
    ("CARD_CVV", re.compile(r"(?i)(?:\bcvv2?\b|\bcvc2?\b|security code|verification (?:code|value))"
                           r"[^\d\n]{0,25}?(?<!\d)(\d{3,4})(?!\d)"), 1, None),

    # PIN after the word PIN: "PIN - 8824", "PIN 1644"
    ("PIN", re.compile(r"(?i)(?<![A-Za-z])pin(?: code| number)?(?![A-Za-z])[^\d\n]{0,10}(?<!\d)(\d{4,6})(?!\d)"),
     1, None),

    # BIC / SWIFT code after the word BIC or SWIFT: 8 or 11 capital letters/digits in the BIC layout
    ("BIC", re.compile(r"(?i:\b(?:bic|swift)\b)[^\n]{0,30}?"
                       r"(?<![A-Za-z0-9])([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)(?![A-Za-z0-9])"), 1, None),

    # UAE mobile: 05X XXX XXXX, 00971 5X XXX XXXX or +971 5X XXX XXXX
    ("PHONE", re.compile(r"(?<![\d\-])(?:(?:\+|00)971[ \-]?|0)5\d[ \-]?\d{3}[ \-]?\d{4}(?!\d)"), 0, None),

    # International phone: "+" country code, then 2-4 groups of 2-5 digits separated by space, hyphen or dot
    ("PHONE", re.compile(r"(?<![\w+])\+\d{1,4}(?:[ \-.]?\d{2,5}){2,4}(?!\d)"), 0, _digits_between(8, 15)),

    # Local phone, area code in parentheses: (98) 7561.5671 or (95)-5544-2455
    ("PHONE", re.compile(r"(?<!\w)\(\d{2,4}\)[ \-.]?\d{3,4}[ \-.]?\d{3,4}(?!\d)"), 0, _digits_between(8, 13)),

    # Local phone starting with 0: 03-4947-8651, 06.3603 7980, 0371-52754478, 07747 182426
    # (10-13 digits keeps out 9-digit ZIP+4 codes and short date fragments)
    ("PHONE", re.compile(r"(?<![\w\-.])0\d{1,4}[ \-.]\d{3,8}(?:[ \-.]\d{2,5})?(?!\d)"), 0, _digits_between(10, 13)),

    # Grouped phone without a leading 0 or +: 713-853-1715, 7422 257-1915, 1952-178-8156
    ("PHONE", re.compile(r"(?<![\w\-.])\d{3,4}[ \-.]\d{3}[ \-.]\d{4}(?!\d|[\-.]\d)"), 0, _digits_between(10, 11)),

    # Email address
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"), 0, None),

    # Web address starting with http(s):// or www. (trailing punctuation is not included)
    ("URL", re.compile(r'(?i)(?<![\w@])(?:https?://|www\.)[^\s<>"\')\]]*[^\s<>"\')\].,;:!?]'), 0, None),

    # Account number: an account/payment word, up to 60 non-digit characters, then 8-16 digits.
    # Group 1 is the number itself; a number right after a currency symbol is an amount and is skipped.
    ("ACCOUNT_NUMBER", re.compile(r"(?i)(?<!\w)" + _ACCOUNT_WORDS + r"[^\d\n]{0,60}(?<![\d$€£¥])(\d{8,16})(?!\d)"),
     1, _not_a_date),
    # Account number after a transfer or payment word and "to": "transfer of ¥2582... to 23564969"
    ("ACCOUNT_NUMBER", re.compile(r"(?i)(?<!\w)(?:transfer(?:red)?|wire[d]?|deposit(?:ed)?|payment|paid|sent?)\b"
                                  r"[^\n]{0,80}?\b(?:to|into)\s+(?:account\s+|acct\s+)?(?<![\d$€£¥])(\d{8,16})(?!\d)"),
     1, _not_a_date),
]

def find_pii(text):
    """Return a sorted list of (start, end, label) for every PII span found."""
    norm = normalize(text)                       # search the normalised text; positions also fit the original
    claimed, spans = [], []
    for label, pattern, group, check in PATTERNS:
        for m in pattern.finditer(norm):
            s, e = m.span(group)
            if s < 0:                            # the group did not take part in this match
                continue
            if check and not check(norm[s:e]):   # the pattern matched but failed its extra check
                continue
            if any(s < ce and e > cs for cs, ce in claimed):    # overlaps an earlier finding: skip
                continue
            claimed.append((s, e))
            spans.append((s, e, label))
    return sorted(spans)

def mask_text(text):
    """Return (masked_text, spans), with each finding replaced by a [LABEL] tag."""
    spans = find_pii(text)
    pieces, last = [], 0
    for s, e, label in spans:
        pieces.append(text[last:s])              # keep the text before the finding
        pieces.append(f"[{label}]")              # replace the finding with its tag
        last = e
    pieces.append(text[last:])                   # keep the rest
    return "".join(pieces), spans
