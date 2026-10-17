# Bank RAG Guard — frontend

Next.js (App Router) + TypeScript + Tailwind v4 + Framer Motion + GSAP ScrollTrigger. It talks to the existing
FastAPI backend (`../app.py`) through a same-origin proxy. Nothing in the Python backend was changed.

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

The backend is not recreatable from this repo alone. Before `uvicorn` will start you need, in the repo root:

| Missing from the zip | What it must provide |
|---|---|
| `.env` (`app.py` opens it at import) | `DATABASE_URL`, `JINA_API_KEY`, `GROQ_API_KEY`, optional `RAG_MODEL` |
| `requirements.txt` (README references it) | `fastapi`, `uvicorn`, `psycopg[binary]`, `pgvector`-capable PostgreSQL client libs, `requests` |
| PostgreSQL 16 + pgvector with data | built by notebooks `01`–`06` (tables `chunks`, `users`, `audit_log`) |

Then, from the repo root: `uvicorn app:app --host 127.0.0.1 --port 8000`.

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

Route handlers in `app/api/{users,ask,audit,health}` call `lib/server/proxy.ts`, which forwards only to four fixed
upstream paths (`/api/users`, `/api/ask`, `/api/audit`, `/health`). The browser never supplies a URL or path. Upstream
status codes are preserved; error bodies are reduced to a short `detail`, never stack traces; responses are
`no-store`. POSTs are never retried automatically.

`BACKEND_URL` is server-only. Database credentials and Jina/Groq keys stay in Python.

## Deployment notes

- **Localhost only works when Next.js can reach FastAPI** on the same machine/network.
- **A hosted frontend (v0, Vercel, …) cannot reach `127.0.0.1` on your laptop.** Set `BACKEND_URL` to an address its
  server can reach.
- **Timeouts:** `/api/ask` allows up to 110 s upstream (`maxDuration = 120`); the browser gives up at 120 s. Model calls
  and provider retries can be slow. Check your host's function time limit.
- **Rate limiter:** the backend limits by `request.client.host` (6/min per visitor, 400/day overall). Behind this proxy
  every visitor shares the proxy's IP, so the per-minute limit becomes shared. The proxy does not forward or rewrite
  client IPs. If you want per-visitor limits, that is a backend decision (e.g. uvicorn `--proxy-headers` with a trusted
  forwarded-for setup).

## Workspace dashboard

`/workspace` is laid out as a dashboard in the style of the supplied reference: a rounded app frame on a gray page, a
slim icon rail, pill tabs, a greeting with a search pill, soft white cards, black active states and lime highlights.
Every number on it comes from the API; with no answer yet the tiles and chart say so instead of showing sample data.

| Reference slot | What it is here |
|---|---|
| Smart Wallet card | "Ask the assistant": scenario tiles, question box, lime Ask button, lime "New +" |
| 2×2 stat cards | Clearance tier, sources returned, masked items, audit chain (from `/api/users`, `/api/ask`, `/api/audit`) |
| Cash Flow chart | Retrieval insights: similarity per returned source, or masked items by type (tabs) |
| Quick send avatars | Choose demo user (no password, still labeled as a demo identity switcher) |
| Credit card + Deposit/Transfer | Dark access pass for the selected identity + lowest/highest-clearance pills |
| Quick action tiles | New question, refresh audit, clear |
| Starter Plan card | Demo limits (6/min per visitor, 400/day) + a link to how it works |
| Search pill | Filters the displayed audit events |

The top bar is the same centered glass pill as the landing page nav and uses the same GooeyNav for the tabs (a plain
scrolling tab row on phones). It and the icon rail are `position: fixed`, so they stay on screen while you scroll; the
active tab and rail icon follow the section in view, and the page reserves the bar's height via `--dash-bar-h`.

Layout: three columns from `xl`, two from `lg`, one on phones (the user picker comes before the question). Inside the
dashboard the accent is lime on dark and deep green on light (`.dash-scope` in `app/globals.css`).

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
