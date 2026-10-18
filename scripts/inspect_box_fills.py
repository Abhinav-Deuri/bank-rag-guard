import fitz

doc = fitz.open('frontend/referance files/Secure_RAG_Architecture.pdf')

def get_fill_at(page, rect):
    for d in page.get_drawings():
        dr = d['rect']
        if dr.contains(rect) or (abs(dr.x0 - rect.x0) < 5 and abs(dr.y0 - rect.y0) < 5):
            if d.get('fill'):
                return d['fill']
    # Check any drawing containing center
    center = fitz.Point((rect.x0 + rect.x1)/2, (rect.y0 + rect.y1)/2)
    for d in page.get_drawings():
        if d['rect'].contains(center) and d.get('fill'):
            return d['fill']
    return None

for pno, p in enumerate(doc):
    print(f"=== PAGE {pno+1} RECT FILLS ===")
    blocks = p.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' in b:
            for l in b['lines']:
                for s in l['spans']:
                    txt = s['text'].strip()
                    if any(k in txt for k in ['HEADLINE', 'baseline', 'Secure Role', 'TRUSTED ZONE', 'ADVERSARIAL', 'Filter before', 'Defense in depth', 'Verifiable by', 'Defense hardening', 'Seeds: deepset', 'PII redaction', 'Indirect injection']):
                        r = fitz.Rect(s['bbox'])
                        fill = get_fill_at(p, r)
                        print(f"P{pno+1}: {txt[:40]!r} -> bbox: {r}, fill: {fill}")
