"""
Aegis-Z Architecture PDF Updater.
Updates frontend/referance files/Secure_RAG_Architecture.pdf with all 5 strategic pivots:
1. "Autonomous Digital Immune System" rebranding for the Red Team (Box 1 & Attack Catalogue).
2. "Target Gateway (Breach Cockpit)" with Side-by-Side Defenses OFF vs ON.
3. Pivot 1: Stateful Mosaic Graph (Multi-Turn Entropy Defense) in Attack Table.
4. Pivot 2: Keyed Token Vault (HMAC-SHA256 AML Pseudonyms & Break-Glass) in Box 4.
5. Pivot 3: Agentic Action Sandbox (Tool Execution Guardrail & Provenance) in Box 6.
6. Pivot 4: Franco-Arabic (Arabizi) Normalizer & Sharia Guard in Box 2 & Attack Table.
7. Pivot 5: Automated Regulatory FactSheet Engine (CBUAE / Basel III / PQC) in Audit Bar & Headline.
"""

import os
import fitz

SOURCE_PDF = "frontend/referance files/Secure_RAG_Architecture_Original.pdf"
TARGET_PDF = "frontend/referance files/Secure_RAG_Architecture.pdf"

doc = fitz.open(SOURCE_PDF)

NAVY_HDR_FILL = (0.0588, 0.1647, 0.2902)      # #0F2A4A
MINT_BOX_FILL = (0.9647, 0.9843, 0.9765)      # #F6FAF9
WHITE_FILL = (1.0, 1.0, 1.0)                  # #FFFFFF
AMBER_BOX_FILL = (1.0, 0.9569, 0.8588)        # #FFF4DB
PINK_BOX_FILL = (0.9922, 0.9255, 0.9176)       # #FDECEA
LIGHT_BLUE_FILL = (0.9333, 0.9569, 0.9843)    # #EEF4FB

def draw_lines(page, start_x, start_y, lines, line_height, fontname, fontsize, color):
    for i, line in enumerate(lines):
        page.insert_text(
            (start_x, start_y + i * line_height),
            line,
            fontname=fontname,
            fontsize=fontsize,
            color=color
        )

# =============================================================================
# PAGE 1: DATA FLOW & TRUST BOUNDARIES
# =============================================================================
p1 = doc[0]

# Redactions
p1.add_redact_annot(fitz.Rect(30, 8, 430, 32), fill=NAVY_HDR_FILL)
p1.add_redact_annot(fitz.Rect(30, 32, 600, 48), fill=NAVY_HDR_FILL)
p1.add_redact_annot(fitz.Rect(40, 142, 660, 155), fill=MINT_BOX_FILL)
p1.add_redact_annot(fitz.Rect(270, 157, 440, 169), fill=MINT_BOX_FILL) # KEY DESIGN CHOICE

# Box 2 Title: Input & Arabizi Guard (Inside Box 2 which is WHITE)
p1.add_redact_annot(fitz.Rect(175, 183, 260, 196), fill=WHITE_FILL)
# Box 4 (Passage Screen & Keyed Token Vault) (Inside Box 4 which is WHITE)
p1.add_redact_annot(fitz.Rect(436, 183, 536, 255), fill=WHITE_FILL)
# Box 5 Title (Inside Box 5 which is WHITE)
p1.add_redact_annot(fitz.Rect(570, 183, 640, 196), fill=WHITE_FILL)
# Box 6 Title: Action Sandbox & Scanner (Inside Box 6 which is WHITE)
p1.add_redact_annot(fitz.Rect(700, 183, 790, 196), fill=WHITE_FILL)
# Core DB Box Title
p1.add_redact_annot(fitz.Rect(295, 302, 415, 324), fill=LIGHT_BLUE_FILL)
# Audit Log Bar
p1.add_redact_annot(fitz.Rect(50, 404, 780, 436), fill=WHITE_FILL)
# Bottom 3 Pillars
p1.add_redact_annot(fitz.Rect(37, 478, 275, 525), fill=WHITE_FILL)
p1.add_redact_annot(fitz.Rect(302, 478, 540, 525), fill=WHITE_FILL)
p1.add_redact_annot(fitz.Rect(567, 478, 805, 525), fill=WHITE_FILL)

p1.apply_redactions()

# 1. Header & Subtitle
p1.insert_text((30, 24), "AEGIS-Z : Enterprise Architecture & Data Flow", fontsize=16, fontname="hebo", color=(1, 1, 1))
p1.insert_text((30, 41), "Page 1 of 2  |  ZERO-TRUST DATA FLOW: Middleware between Core Banking DBs and GenAI Models", fontsize=8.0, fontname="helv", color=(0.75, 0.83, 0.95))

# 2. Trusted Zone Banner
p1.insert_text((42, 151), "IBM LINUXONE s390x TRUSTED ENCLAVE: CPACF hardware acceleration, native PostgreSQL 16 + pgvector colocation, zero raw token egress", fontsize=7.1, fontname="hebo", color=(0.06, 0.55, 0.43))

# 3. Key Design Choice Tag
p1.insert_text((276, 166), "KEY DESIGN CHOICE: \"AI cannot leak what the DB never serves\"", fontsize=5.8, fontname="hebo", color=(0.72, 0.47, 0.12))

# 4. Box 2 Title: Input & Arabizi Guard
p1.insert_text((179.8, 193.0), "Input & Arabizi Guard", fontsize=7.2, fontname="hebo", color=(0.06, 0.16, 0.29))

# 5. Box 4 (Passage Screen & Token Vault)
p1.insert_text((439.0, 193.0), "Passage Screen & Token Vault", fontsize=6.8, fontname="hebo", color=(0.06, 0.16, 0.29))
box4_lines = [
    "Drops indirect injections.",
    "Keyed HMAC pseudonyms",
    "(e.g. [IBAN:7A2B]) for AML",
    "shell tracing; break-glass."
]
draw_lines(p1, 439.0, 211.0, box4_lines, 8.2, "helv", 5.9, (0.11, 0.14, 0.19))

# 6. Box 5 (Local LLM on LinuxONE)
p1.insert_text((572.2, 193.0), "Local LLM (Granite/LLaMA)", fontsize=7.2, fontname="hebo", color=(0.06, 0.16, 0.29))

# 7. Box 6 (Action Sandbox & Scanner)
p1.insert_text((703.0, 193.0), "Action Sandbox & Scanner", fontsize=7.2, fontname="hebo", color=(0.06, 0.16, 0.29))

# 8. Core Banking DB Store Box
p1.insert_text((298.0, 311.0), "Core Banking DB + FactSheet", fontsize=6.8, fontname="hebo", color=(0.06, 0.16, 0.29))
p1.insert_text((298.0, 319.5), "(Db2 / PostgreSQL / Temenos / Finacle)", fontsize=5.8, fontname="helv", color=(0.35, 0.40, 0.45))

# 9. Audit Log Bar
p1.insert_text((52.0, 414.0), "TAMPER-EVIDENT AUDIT LOG & FACTSHEET ENGINE (SHA-256 + PQC ML-DSA)", fontsize=7.8, fontname="hebo", color=(0.72, 0.47, 0.12))
audit_lines = [
    "Every stage logs user, role, query, documents retrieved, blocks, and actions: entry(n) = SHA-256(entry(n-1) + record(n)).",
    "PostgreSQL write-triggers block UPDATE and DELETE. Programmatic compliance mapping to CBUAE, PDPL, Basel III & ISO 42001."
]
draw_lines(p1, 52.0, 424.5, audit_lines, 8.5, "helv", 6.6, (0.11, 0.14, 0.19))

# 10. Bottom 3 Pillars
p1.insert_text((39.0, 489.0), "1. Deterministic Isolation", fontsize=8.5, fontname="hebo", color=(0.06, 0.16, 0.29))
p1_lines1 = [
    "Hard SQL Tier Filter (WHERE tier <= user_tier) enforced at DB level.",
    "IAM-driven clearance: junior teller cannot retrieve VIP credit contracts.",
    "\"The AI cannot leak what the DB never serves.\""
]
draw_lines(p1, 39.0, 501.0, p1_lines1, 9.0, "helv", 6.8, (0.11, 0.14, 0.19))

p1.insert_text((304.3, 489.0), "2. Zero-Egress Sovereign Masking", fontsize=8.5, fontname="hebo", color=(0.06, 0.16, 0.29))
p1_lines2 = [
    "Dual-layer in-enclave protection: Passage Screen drops poisoned chunks;",
    "bilingual PII scrubber normalizes Arabic-Indic & 3arabizi, scrubs IDs via",
    "Luhn & Mod-97 checksums. Zero raw customer tokens egress to model."
]
draw_lines(p1, 304.3, 501.0, p1_lines2, 9.0, "helv", 6.8, (0.11, 0.14, 0.19))

p1.insert_text((569.7, 489.0), "3. Verifiable Cryptographic Governance", fontsize=8.5, fontname="hebo", color=(0.06, 0.16, 0.29))
p1_lines3 = [
    "Immutable SHA-256 hash-chained audit trail (prev_hash + record).",
    "Database write triggers actively block UPDATE, DELETE, and TRUNCATE.",
    "Automated FactSheet Engine with NIST ML-DSA Post-Quantum attestation."
]
draw_lines(p1, 569.7, 501.0, p1_lines3, 9.0, "helv", 6.8, (0.11, 0.14, 0.19))


# =============================================================================
# PAGE 2: AUTONOMOUS DIGITAL IMMUNE SYSTEM & BENCHMARKS
# =============================================================================
p2 = doc[1]

# Redactions
p2.add_redact_annot(fitz.Rect(30, 8, 430, 32), fill=NAVY_HDR_FILL)
p2.add_redact_annot(fitz.Rect(30, 32, 600, 48), fill=NAVY_HDR_FILL)

# Box 1: Badge 1 is at [47.5, 87.8, 64.5, 104.8], Box 1 rect is [40.0, 95.3, 240.0, 203.3]
# Strictly redact inside Box 1 boundaries to prevent extending onto the canvas or prompt arrow
p2.add_redact_annot(fitz.Rect(66, 95.5, 238, 116), fill=PINK_BOX_FILL)
p2.add_redact_annot(fitz.Rect(41, 116.0, 238, 195), fill=PINK_BOX_FILL)

# Box 2: Badge 2 is at [328.5, 89.8, 345.5, 105.0].
p2.add_redact_annot(fitz.Rect(348, 95, 450, 112), fill=LIGHT_BLUE_FILL)

# Box 5: Badge 5 is at [328.5, 227.8, 345.5, 244.8].
p2.add_redact_annot(fitz.Rect(348, 235, 515, 252), fill=AMBER_BOX_FILL)
p2.add_redact_annot(fitz.Rect(325, 252, 515, 335), fill=AMBER_BOX_FILL)

# Table Title
p2.add_redact_annot(fitz.Rect(28, 347, 240, 362), fill=WHITE_FILL)
# Attack Table Rows: Indirect, Piece-by-piece, Arabic
p2.add_redact_annot(fitz.Rect(35, 455, 580, 522), fill=WHITE_FILL)
# Headline Result Callout Box: rect is [590.0, 487.3, 802.0, 521.3]
p2.add_redact_annot(fitz.Rect(591, 488, 801, 521), fill=AMBER_BOX_FILL)

p2.apply_redactions()

# 1. Header & Subtitle
p2.insert_text((30, 24), "AEGIS-Z : Autonomous Digital Immune System & Telemetry", fontsize=16, fontname="hebo", color=(1, 1, 1))
p2.insert_text((30, 41), "Page 2 of 2  |  AUTONOMOUS DIGITAL IMMUNE SYSTEM: Continuous 24/7 Red-Team Penetration & Cockpit Telemetry", fontsize=7.8, fontname="helv", color=(0.75, 0.83, 0.95))

# 2. Box 1: Autonomous Digital Immune System
p2.insert_text((68.0, 106.0), "Autonomous Digital Immune System", fontsize=7.4, fontname="hebo", color=(0.06, 0.16, 0.29))
p2.insert_text((68.0, 114.0), "(Continuous Automated Red-Team Agent)", fontsize=5.8, fontname="helv", color=(0.45, 0.15, 0.15))
box1_lines = [
    "- Operates like a biological vaccine: continuous automated probing.",
    "- 100+ prompts: direct injection, extraction, role escalation,",
    "  indirect injection (poisoned document), Arabizi & Islamic evasion.",
    "- Seeds: deepset prompt-injections + synthetic bank attack corpus",
    "  (Lakera Gandalf & HackAPrompt on Phase 2 expansion roadmap).",
    "- Automated regressions: cross-lingual translation, paraphrase."
]
draw_lines(p2, 45.0, 125.0, box1_lines, 7.8, "helv", 5.7, (0.11, 0.14, 0.19))

# 3. Box 2: Target Assistant (Side-by-Side Breach Cockpit)
p2.insert_text((351.0, 108.0), "Target Gateway (Breach Cockpit)", fontsize=7.8, fontname="hebo", color=(0.06, 0.16, 0.29))

# 4. Box 5: Continuous Defense Hardening (Badge 5 is 100% intact!)
p2.insert_text((351.0, 244.0), "Continuous Defense Hardening", fontsize=7.8, fontname="hebo", color=(0.06, 0.16, 0.29))
box5_lines = [
    "- Root cause: pinpoint which security gate was challenged.",
    "- Regression suite: novel attack vectors join continuous test suite.",
    "- Boundary updates: refine regex rules, PII checksums & IAM tiers.",
    "- Phase 2 Roadmap: automated clustering & Granite Guardian."
]
draw_lines(p2, 335.0, 262.0, box5_lines, 10.5, "helv", 6.4, (0.11, 0.14, 0.19))

# 5. Table Title Rebranding
p2.insert_text((30.0, 359.0), "Digital Immune System: Attack & Neutralization Catalogue", fontsize=8.5, fontname="hebo", color=(0.06, 0.16, 0.29))

# 6. Attack Table Rows with Pivots
# Row 4: Indirect Injection
p2.insert_text((36.0, 467.0), "Indirect injection", fontsize=6.8, fontname="hebo", color=(0.06, 0.16, 0.29))
p2.insert_text((141.0, 467.0), "Hidden commands inside retrieved customer documents.", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))
p2.insert_text((356.0, 467.0), "Passage screen (Gate 5) + Action Sandbox", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))

# Row 5: Multi-Turn Mosaic Attack (Pivot 1)
p2.insert_text((36.0, 489.0), "Mosaic attack (fishing)", fontsize=6.8, fontname="hebo", color=(0.06, 0.16, 0.29))
p2.insert_text((141.0, 489.0), "Multi-turn correlated queries piecing together identities.", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))
p2.insert_text((356.0, 489.0), "Stateful Mosaic Entropy Graph (session freeze)", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))

# Row 6: Arabizi & Sharia Evasion (Pivot 4)
p2.insert_text((36.0, 511.0), "Arabizi & Sharia evasion", fontsize=6.8, fontname="hebo", color=(0.06, 0.16, 0.29))
p2.insert_text((141.0, 511.0), "Franco-Arabic (3arabizi) bypassing rules / Riba inquiry.", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))
p2.insert_text((356.0, 511.0), "Arabizi Normalizer + Sharia compliance policy", fontsize=6.8, fontname="helv", color=(0.11, 0.14, 0.19))

# 7. Headline Result Callout Box: Side-by-Side Breach Cockpit & FactSheet
p2.insert_text((595.0, 497.0), "SIDE-BY-SIDE BREACH COCKPIT RESULT", fontsize=6.5, fontname="hebo", color=(0.72, 0.47, 0.12))
p2.insert_text((595.0, 506.5), "Cloud RAG [Defenses OFF]: 67.5% Breach -> Aegis-Z [ON]: 0.0%", fontsize=5.8, fontname="hebo", color=(0.06, 0.16, 0.29))
p2.insert_text((595.0, 515.5), "Raw PII Egress: 0 Tokens | Direct & Indirect Attacks: 100% Blocked", fontsize=5.3, fontname="helv", color=(0.11, 0.14, 0.19))

# Save
doc.save(TARGET_PDF)
doc.close()
print(f"Successfully updated architecture PDF with all 5 pivots at: {TARGET_PDF}")
