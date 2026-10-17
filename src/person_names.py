"""Bilingual (English/Arabic) person-name finder: cue words plus name lists. Runs entirely locally."""
import re

# ---------- Name lists, read from the Faker library's built-in data (no network needed) ----------
def normalize_ar(text):
    """Normalize Arabic spelling variants (alif, yaa, taa marbuta) and strip diacritics."""
    if not text:
        return ""
    text = re.sub(r"[\u064B-\u0652\u0670]", "", text)  # Strip tashkeel
    text = re.sub(r"[أإآٱ]", "ا", text)                # Normalize alif variants
    text = re.sub(r"ة", "ه", text)                    # Normalize taa marbuta
    text = re.sub(r"ى", "ي", text)                    # Normalize alif maqsura
    return text

def _faker_names(locale, attribute):
    """Return one name list from a Faker locale as a set (empty if it cannot be read)."""
    try:
        module = __import__(f"faker.providers.person.{locale}", fromlist=["Provider"])
        return set(getattr(module.Provider, attribute, ()))
    except Exception:
        return set()

# Built-in fallback name lists so the system works reliably even if Faker is missing on s390x
FALLBACK_FIRST_EN = {
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
    "Christopher", "Daniel", "Matthew", "Anthony", "Donald", "Mark", "Paul", "Steven", "Andrew", "Kenneth",
    "Joshua", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan",
    "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
    "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
    "Carol", "Amanda", "Dorothy", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia",
    "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Emma", "Nicole", "Helen",
    "Samantha", "Katherine", "Christine", "Debra", "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather",
    "Ahmed", "Fatima", "Mohammed", "Ali", "Omar", "Noor", "Harvey", "Ray", "Rich", "Jackie",
    "Danny", "Warren", "Tommy", "Barry", "Owen", "Sheryl", "Tony", "Greg", "Natasha"
}
FALLBACK_LAST_EN = {
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Al-Mansoor", "Mansoor", "Al-Nuaimi", "Nuaimi", "Al-Falasi", "Falasi", "Al-Shamsi", "Shamsi",
    "Al-Maktoum", "Maktoum", "Al-Nahyan", "Nahyan", "Al-Qasimi", "Qasimi", "Al-Suwaidi", "Suwaidi",
    "Al-Marzouqi", "Marzouqi", "Al-Zaabi", "Zaabi", "Al-Mazrouei", "Mazrouei", "Al-Muhairi", "Muhairi",
    "Hassan", "Al-Hassan", "Al-Ali", "Hussein", "Al-Hussein"
}
FALLBACK_FIRST_AR = {
    "محمد", "أحمد", "احمد", "علي", "فاطمة", "مريم", "سارة", "عمر", "خالد", "عبدالله", "يوسف",
    "إبراهيم", "ابراهيم", "نورة", "ريم", "منى", "حسن", "حسين", "سالم", "زايد", "سلطان", "راشد",
    "سعيد", "حمد", "منصور", "طارق", "فيصل", "جمال", "محمود", "ليلى", "هند", "أمل", "امل",
    "هدى", "سميرة", "عائشة", "موزة", "شيخة", "حصة", "جميلة", "مرتضي", "أغاريد", "اغاريد", "عفراء"
}
FALLBACK_LAST_AR = {
    "المنصور", "المهيري", "الفلاسي", "الشامسي", "النعيمي", "المكتوم", "النهيان", "القاسمي", "الكعبي",
    "الكتبي", "المرزوقي", "الهاشمي", "الظاهري", "السويدي", "الحوسني", "الرميثي", "البلوشي", "الحجر",
    "الهنوء", "الأزد", "الازد", "العتيبة", "الزعابي", "الدرمكي", "المزروعي", "المطروشي", "الشحي"
}

# English-script name lists combined from several Faker locales for wider coverage
EN_LOCALES = ["en_US", "en_GB", "en_CA", "en_AU", "en_IE", "en_NZ", "en_IN",
              "es_ES", "es_MX", "de_DE", "fr_FR", "it_IT", "pt_BR", "nl_NL"]
FIRST_EN, LAST_EN = FALLBACK_FIRST_EN.copy(), FALLBACK_LAST_EN.copy()
for _loc in EN_LOCALES:
    FIRST_EN |= _faker_names(_loc, "first_names")
    LAST_EN |= _faker_names(_loc, "last_names")
FIRST_AR = FALLBACK_FIRST_AR.copy() | _faker_names("ar_AA", "first_names")
LAST_AR = FALLBACK_LAST_AR.copy() | _faker_names("ar_AA", "last_names")

# Precomputed normalized Arabic sets for spelling-insensitive matching
FIRST_AR_NORM = {normalize_ar(w) for w in FIRST_AR}
LAST_AR_NORM = {normalize_ar(w) for w in LAST_AR}

# ---------- Words that are capitalised but are not names (compared in lower case) ----------
NOT_NAMES = {
    "all", "everyone", "everybody", "team", "sir", "madam", "there", "colleagues", "customer", "customers",
    "service", "services", "support", "care", "department", "dept", "group", "inc", "corp", "corporation",
    "company", "llc", "ltd", "please", "thanks", "thank", "regards", "the", "this", "that", "these", "those",
    "hello", "hi", "dear", "mr", "mrs", "ms", "dr", "prof", "miss", "mx", "best", "kind", "sincerely", "yours",
    "cheers", "again", "regarding", "attached", "following", "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday", "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december", "enron", "energy", "gas", "power", "bank", "hospital",
    "university", "school", "college", "center", "centre", "office", "manager", "director", "president",
    "officer", "assistant", "staff", "patient", "student", "client", "member", "user", "account", "online",
    # group and organisation words seen as false alarms after "Dear" / "Hi" / "Employee"
    "parent", "parents", "club", "squad", "legal", "medicine", "geriatric", "music", "society", "association",
    "committee", "foundation", "ministry", "council", "board", "friends", "family", "guardian",
    "guardians", "residents", "applicants", "students", "employees", "employee", "portal", "roll", "name",
    "sales", "marketing", "finance", "operations", "hr", "it", "admin", "administrator", "recipient",
    # common words and sentence openers that were wrongly masked as names
    "agent", "certification", "however", "therefore", "thus", "also", "yes", "no", "ok", "okay", "sure",
    "sorry", "unfortunately", "finally", "meanwhile", "otherwise", "hence", "furthermore", "moreover",
    "now", "then", "today", "tomorrow", "yesterday", "welcome", "congratulations", "attention", "notice",
    "reminder", "update", "urgent", "note", "warning", "first", "second", "next", "lastly", "overall",
    "indeed", "instead", "still", "here", "what", "why", "how", "when", "where", "who", "if", "so",
    "but", "and", "or", "because", "since", "although", "while", "as", "in", "on", "at", "of",
    "we", "hope", "greetings", "hey", "hell", "hiya", "i", "you", "our", "my", "they", "he", "she",
    "kindly", "good", "great", "happy", "let", "just", "meeting", "agreement",
}
AR_STOP = {
    "رقم", "الهوية", "الهاتف", "الجوال", "رقمه", "رقمها", "الذي", "التي", "في", "من", "على", "إلى", "الى", "عن",
    "هو", "هي", "قد", "قام", "قدم", "قدّم", "طلب", "أبلغ", "تقدم", "يطلب", "لديه", "لدى", "مع", "أن", "إن",
    "بخصوص", "بشأن", "حول", "الإماراتية", "المسجل", "المسجلة", "صاحب", "صاحبة", "الحساب", "البطاقة",
    "المصرفي", "المستخدم", "الشركة", "البنك", "الفرع", "وقد", "ولدينا", "كان", "كانت", "يرجى", "نود",
}

# ---------- English building blocks ----------
# A capitalised word: Smith, O'Brien, Smith-Jones, McGlynn
CAP = r"(?:Mc[A-Z][a-z]+|Mac[A-Z][a-z]+|[A-Z][a-z]*['\-][A-Z][a-z]+|[A-Z][a-z]+)"
CAPS = rf"{CAP}(?:[ ]{CAP}){{0,2}}"                  # one to three capitalised words, single spaces
# A title followed by either "." (with or without a space) or a space, so "Ms.North" and "Ms. North" both work
TITLE = r"(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Sir|Madam|Mme|Mlle)(?:\.[ ]*|[ ]+)"
GREET = r"(?:Dear|Hi|Hello|Hey|Hiya|Greetings|Welcome)"
SIGN = r"(?:Best regards|Kind regards|Regards|Sincerely|Cheers|Thanks|Thank you|Yours truly)"
ROLE = (r"(?:patient|customer|client|student|member|employee|applicant|account holder|user|resident|"
        r"guest|candidate|contact|attendee|nurse|doctor|coach|teacher|professor|mentor)")
# Introductions such as "I'm Garrick Murray", "my name is ...", "this is ..."
INTRO = (r"(?:name is|named|called|under the name(?: of)?|on behalf of|signed by|attn:?|attention:?|"
         r"I'm|I am|my name is|this is|speaking with)")
# Words after which a single known first name is likely a person ("reminder for Stephen", "Connect with Harvey")
FIRST_CTX = r"(?:for|with|to|ask|contact|call|from|by|cc|meet|tell|remind)"

# ---------- Arabic building blocks ----------
# Arabic letters plus diacritics (shadda, fatha, damma and so on), so words like حقّي stay in one piece
AR = r"\u0621-\u065F\u0670"
AR_WORD = rf"[{AR}]+"
AR_CUES = ("العميلة|العميل|السيدة|السيد|الآنسة|الأستاذة|الأستاذ|الدكتورة|الدكتور|المهندسة|المهندس|الشيخ|"
           "المريضة|المريض|الطالبة|الطالب|الموظفة|الموظف|المدعوة|المدعو|باسم|اسمها|اسمه|الاسم|اسم")

# Each rule: (kind, compiled regex, extra)
#   "cue"   rules mask capture group 1 (trimmed at the first stop word); extra = stop-word set
#   "pair"  rules mask two adjacent words if the first is a known first name and the second a known
#           last OR first name; extra = (first-name set, last-name set)
#   "first" rules mask a known first name (group 1) that follows a context word, plus an optional
#           second word (group 2) if it is also a known name; extra = (first-name set, last-name set)
RULES = [
    ("cue", re.compile(rf"(?<![A-Za-z]){TITLE}({CAPS})"), NOT_NAMES),
    ("cue", re.compile(rf"(?<![A-Za-z]){GREET}[,]?[ ]+({CAPS})"), NOT_NAMES),
    ("cue", re.compile(rf"(?<![A-Za-z]){SIGN}[,!.]?\s{{1,3}}({CAPS})"), NOT_NAMES),
    ("cue", re.compile(rf"(?<![A-Za-z])(?i:{ROLE})[ ]+({CAPS})"), NOT_NAMES),
    ("cue", re.compile(rf"(?<![A-Za-z])(?i:{INTRO})[ ]+({CAPS})"), NOT_NAMES),
    # Arabic cue word followed by up to six Arabic words (names with bin / ibn / al- chains)
    ("cue", re.compile(rf"(?<![{AR}])(?:{AR_CUES})(?![{AR}])[ ]*:?[ ]*({AR_WORD}(?:[ ]{AR_WORD}){{0,5}})"), AR_STOP),
    # a name at the very start of a text or line, followed by a comma and a typical opening word,
    # or by a request word, e.g. "Lincoln, We need..." or "Kattie could you..." (no name list needed)
    ("cue", re.compile(rf"(?:\A|(?<=\n))({CAP})(?=,[ ](?i:our|your|the|we|i|please|this|here|my|it)\b|[ ](?:could|can|would|will|please)\b)"), NOT_NAMES),
    ("pair", re.compile(rf"(?<![A-Za-z])({CAP})[ ]({CAP})(?![A-Za-z])"), (FIRST_EN, LAST_EN, False)),
    ("pair", re.compile(rf"(?<![{AR}])({AR_WORD})[ ]({AR_WORD})(?![{AR}])"), (FIRST_AR_NORM, LAST_AR_NORM, True)),
    # Corporate directory layout: "Smith, John" or "المنصور، أحمد"
    ("pair_comma", re.compile(rf"(?<![A-Za-z])({CAP}),[ ]+({CAP})(?![A-Za-z])"), (LAST_EN, FIRST_EN, False)),
    ("pair_comma", re.compile(rf"(?<![{AR}])({AR_WORD})[ ]*،[ ]*({AR_WORD})(?![{AR}])"), (LAST_AR_NORM, FIRST_AR_NORM, True)),
    # first name after a context word, e.g. "reminder for Stephen", "Connect with Harvey"
    ("first", re.compile(rf"(?<![A-Za-z])(?i:{FIRST_CTX})[ ]+({CAP})(?:[ ]({CAP}))?(?![A-Za-z])"), (FIRST_EN, LAST_EN)),
    # first name at the start of a sentence followed by a comma or a request word, e.g. "Kattie could you ..."
    ("first", re.compile(rf"(?:\A|(?<=[.!?][ ])|(?<=\n))({CAP})(?=,|[ ](?:could|can|would|will|please|we|I|you|thanks)\b)"
                         rf"(?:[ ]({CAP}))?"), (FIRST_EN, LAST_EN)),
    # a known first name after a comma at the end of a sentence, e.g. "Just a quick tip, Natasha."
    ("first", re.compile(rf"(?<=,[ ])({CAP})(?=[.!?](?:\s|$))"), (FIRST_EN, LAST_EN)),
]

def _trim(group_text, start, stop_words):
    """Keep the leading words of the group up to the first stop word; return (start, end) or None."""
    end = None
    for m in re.finditer(r"\S+", group_text):
        token = m.group(0).strip(".,;:!?،؛")
        if token.lower() in stop_words or normalize_ar(token) in stop_words or token in stop_words:
            break                                    # a stop word ends the name
        end = m.end()
    return None if end is None else (start, start + end)

def find_names(text):
    """Return a sorted list of (start, end, 'NAME') spans for person names."""
    claimed, spans = [], []
    for kind, pattern, extra in RULES:
        for m in pattern.finditer(text):
            if kind == "cue":
                trimmed = _trim(m.group(1), m.start(1), extra)
                if trimmed is None:
                    continue
                s, e = trimmed
            elif kind in ("pair", "pair_comma"):     # both words must be in the name lists
                first, last, is_ar = extra
                w1 = normalize_ar(m.group(1)) if is_ar else m.group(1)
                w2 = normalize_ar(m.group(2)) if is_ar else m.group(2)
                if not is_ar:
                    if (w1 not in first or (w2 not in last and w2 not in first)
                            or w1.lower() in NOT_NAMES or w2.lower() in NOT_NAMES):
                        continue
                else:
                    if (w1 not in first or (w2 not in last and w2 not in first)
                            or m.group(1) in AR_STOP or m.group(2) in AR_STOP
                            or normalize_ar(m.group(1)) in AR_STOP or normalize_ar(m.group(2)) in AR_STOP):
                        continue
                s, e = m.start(1), m.end(2)
            else:                                    # "first": the first word must be a known first name
                first, last = extra
                if m.group(1) not in first or m.group(1).lower() in NOT_NAMES:
                    continue
                s, e = m.start(1), m.end(1)
                second = m.group(2) if m.lastindex and m.lastindex >= 2 else None
                if second and (second in last or second in first) and second.lower() not in NOT_NAMES:
                    e = m.end(2)                     # also take the second word when it is a known name
            if any(s < ce and e > cs for cs, ce in claimed):    # overlaps an earlier finding: skip
                continue
            claimed.append((s, e))
            spans.append((s, e, "NAME"))
    return sorted(spans)
