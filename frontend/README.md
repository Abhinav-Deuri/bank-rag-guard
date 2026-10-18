# AEGIS-Z — Frontend

Next.js (App Router) + TypeScript + Tailwind v4 + Framer Motion + GSAP ScrollTrigger. It talks to the
FastAPI backend (`../app.py`) through a same-origin proxy.

- `/` landing page
- `/workspace` interactive demo (choose demo user → ask → answer, security summary, sources, audit trail)

## Run it locally

```bash
cd frontend
npm install
cp .env.example .env.local      # BACKEND_URL=http://127.0.0.1:8000
npm run dev                     # http://localhost:3000
```

### Connect the real backend

Set up and start the backend as described in the main README (`.env`, `pip install -r requirements.txt`, notebooks
01 to 06, then `uvicorn app:app --host 127.0.0.1 --port 8000`).

### Try the UI without the backend (mock)

`scripts/mock-backend.mjs` is a dev-only stand-in that speaks the same API. It never runs in production and nothing
in the app falls back to it.

```bash
node scripts/mock-backend.mjs                                   # 127.0.0.1:8000
curl -X POST localhost:8000/__mock -d '{"audit":"broken"}'      # audit: intact|broken|error|empty
curl -X POST localhost:8000/__mock -d '{"ask":"429"}'           # ask: ok|400|429|500|slow|html
```

Or put `__429__`, `__500__`, `__400__`, `__slow__`, `__html__`, `__nosources__` in a question.

## How the proxy works

Route handlers in `app/api/{users,ask,audit,health}` and `app/api/reveal/[action]` call `lib/server/proxy.ts`, which
forwards only to fixed upstream paths (`/api/users`, `/api/ask`, `/api/audit`, `/health`, and the four `/api/reveal/*`
actions). The browser never supplies a URL or path. Upstream
status codes are preserved; error bodies are reduced to a short `detail`, never stack traces; responses are
`no-store`. POSTs are never retried automatically.

`BACKEND_URL` is server-only. Database credentials and Jina/Groq keys stay in Python.

## Deployment notes

- **Localhost only works when Next.js can reach FastAPI** on the same machine/network.
- **A hosted frontend (v0, Vercel, …) cannot reach `127.0.0.1` on your laptop.** Set `BACKEND_URL` to an address its
  server can reach.
- **Timeouts:** `/api/ask` allows up to 110 s upstream (`maxDuration = 120`); the browser gives up at 120 s. Model calls
  and provider retries can be slow. Check your host's function time limit.
- **Rate limiter and access:** the backend allows 30 questions a minute per visitor and 400 a day overall. The proxy
  forwards the visitor's address in `x-client-ip`; the backend trusts it only from the same machine or with the shared
  secret. When the backend is on another machine, set the same `PROXY_SHARED_SECRET` in both places: the backend then
  refuses `/api/*` calls that don't come through this proxy. See "Hosting the public demo" in the main README.

## Workspace

`/workspace` is laid out like a document-review tool rather than a dashboard: one question thread, the sources the
model read, and the audit log, separated by rules instead of cards. Everything on it comes from the API.

- **Acting as** (top bar) switches the demo identity. The tier squares show what that identity can read.
- **Thread** (`components/bank-rag/console/thread.tsx`): each question shows the time, identity and tier, then the
  answer set as a document. Removed personal data appears as solid redaction bars (`[NAME]`, `[IBAN]`, …) sized
  roughly to the kind of value removed. "Source 2" style references in the answer become footnote buttons. A line of
  facts under each answer says what the safeguards did (guard, tiers searched, passages, withheld, removed).
- If an answer comes back with no sources, the thread shows a neutral "no documents at this clearance matched" line
  instead of the model's wording, which would otherwise hint that restricted documents exist.
- **Sources** (`sources-pane.tsx`): masked excerpts for the selected answer, plus withheld passages and the tiers that
  were not searched.
- **Audit log** (`audit-log.tsx`): the latest 12 entries as a ledger. When the backend sends `ts`, `hash` and
  `prev_hash` (added to `GET /api/audit` in `app.py`), each row shows its fingerprint and the previous one, and a
  mismatch between neighbouring rows is shown in red.
- **Reveal requests** (`reveal-panel.tsx`): a compliance officer selects a numbered bar in their own answer and gives a
  reason; a different person approves or denies; the requester sees the value once. Values stay in memory for the
  person who asked and never reach the audit panel.
- On phones the three areas become tabs.
- Fonts: Readex Pro for the interface, Source Serif 4 for document text, IBM Plex Mono for ids and fingerprints, all
  bundled through Fontsource (no requests to Google).

## Light / dark theme

Both pages have a toggle (landing nav pill, workspace header). The saved choice (`localStorage` key `brg-theme`) wins;
with none saved it follows the system setting, and keeps following it until you pick one. An inline script
(`lib/theme.ts`, loaded `beforeInteractive`) sets `<html data-theme>` before first paint, so there is no flash of the
wrong theme. The switch crossfades via the View Transitions API where supported and snaps under reduced motion.

- Colors live in `app/globals.css`: the dark values are `:root`, the light overrides are `[data-theme="light"]`, with
  the same token names, so components follow without per-component code. Text and status colors are at least 4.5:1 on
  the page, panel and raised surfaces in both themes.
- JS-driven pieces read the theme through `useTheme()` (`components/bank-rag/theme-provider.tsx`): the ASCII
  background (`lightMode`), the BorderGlow card glow, the GooeyNav pill and the headline scramble color.
- The glass nav pill is themed through `--glass-*` variables.

## Landing-page background

`components/ui/gradient-ascii.{jsx,css,d.ts}` is the React Bits **GradientASCII** (JS + CSS variant), identical to the
source in the registry (`https://reactbits.dev/r/GradientASCII-JS-CSS.json`; no dependencies). The `.d.ts` is ours and
gives it strict TypeScript props. It is wired in through `components/bank-rag/landing/ascii-backdrop.tsx`
(hero: `horizon`, closing section: `rise`, props hard-coded from the supplied example).

- It needs WebGL2. Without it the canvas stays transparent and the page keeps its plain navy ground.
- It holds a still frame under `prefers-reduced-motion` and pauses while off-screen.
- `next.config.ts` sets `reactStrictMode: false`. The component calls `WEBGL_lose_context` in its effect cleanup, and
  React StrictMode (development only) re-runs effects on the same canvas, leaving a dead context. Production builds
  are unaffected.

## Landing-page effects from React Bits

- **BorderGlow** (`components/ui/border-glow.*`) wraps the four feature cards. Its CSS is unlayered, so Tailwind
  overrides on it need `!`. The stock component only glows while the card is hovered;
  `components/bank-rag/landing/proximity-glow.tsx` extends that to a mouse pointer within 80px of the card's edge
  (it drives the component's own CSS variables and `sweep-active` class, leaving the vendored files untouched).
- **DecryptedText** (`components/ui/decrypted-text.jsx`) drives the hero headline in
  `components/bank-rag/landing/static-hero.tsx`. It imports `motion/react`, so `motion@14.3.0` is installed (it depends
  on the same `framer-motion@14.3.0` the app already uses, so there is one animation runtime). The headline uses fixed
  line breaks so the scrambled frame and the settled text wrap identically; under `prefers-reduced-motion` a plain
  `<span>` is shown instead.

- **GooeyNav** (`components/ui/gooey-nav.*`) is the link group inside the floating pill nav
  (`components/bank-rag/landing/site-nav.tsx`). The active link follows the section in view (scroll spy), and a click
  plays the gooey transition while the browser jumps to the anchor. It is hidden on phones, where the pill holds just
  the wordmark and the Open demo button. `frame={false}` because the outer pill is the frame.

## Honest scope

Hero and CTA components: `components/ui/scroll-expansion-hero.tsx` and `components/ui/shiny-button.tsx` are **not in
the repo yet** (the sources were not attached). The landing page currently uses a static hero and a plain pill CTA in
their place.
