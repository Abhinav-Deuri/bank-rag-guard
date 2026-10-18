import fitz

doc = fitz.open('frontend/referance files/Secure_RAG_Architecture.pdf')
for pno in range(len(doc)):
    page = doc[pno]
    print(f"=== PAGE {pno+1} SPANS ===")
    blocks = page.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' in b:
            for l in b['lines']:
                line_text = " ".join([s['text'] for s in l['spans'] if s['text'].strip()])
                if line_text:
                    bbox = l['bbox']
                    sample_span = l['spans'][0]
                    font = sample_span['font']
                    size = round(sample_span['size'], 1)
                    color = sample_span['color']
                    print(f"P{pno+1} [{bbox[0]:.1f}, {bbox[1]:.1f}, {bbox[2]:.1f}, {bbox[3]:.1f}] ({font}, {size}pt, {color:#06x}): {line_text}")
