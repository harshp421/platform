# Canopy — Platform (admin) panel

One of the three Canopy frontends (farmer · organization · platform). This app is
the **engine + trust layer**: the platform reviews the pending-plot queue, verifies
plots (which issues + lists credits), owns the append-only **ledger**, and tracks
**revenue** from the 70/30 split.

Built per `spac/001_poc.md` and the shared design system in `CLAUDE.md` — the same
light "warm paper" theme as the farmer panel (cream surfaces, near-black ink, green
accent, Fira Code / Fira Sans).

## Stack

Identical to the farmer panel: **Vite + React 18 + TypeScript (strict)**, **Tailwind**
(tokens in `tailwind.config.js`), **react-router-dom**, JWT in `localStorage`. No
state/query libraries.

## Run it

```bash
cd platform
npm install
cp .env.example .env      # defaults are fine for local dev
npm run dev               # http://localhost:5174
```

Runs on **port 5174** so it can run alongside the farmer panel (5173). Both proxy
`/api/*` to the backend at `VITE_API_TARGET` (default `http://localhost:3000`).

```bash
npm run build       # typecheck + production build → dist/
npm run typecheck   # types only
```

## What it talks to (backend, spac/001_poc.md §7)

Only the platform-relevant endpoints:

| Action                | Call                                                       |
| --------------------- | ---------------------------------------------------------- |
| Register / login      | `POST /auth/register` (role `platform`), `POST /auth/login`|
| Pending queue         | `GET /plots/pending`                                       |
| Verify + issue credit | `POST /plots/:id/verify` `{ tier: 'A'\|'B'\|'C' }`         |
| Ledger                | `GET /ledger`                                              |
| Revenue               | `GET /revenue` (sum of `platform_amount`)                  |

Register always creates a `platform` account; sign-ins with another role are
rejected client-side (use the matching panel).

## Screens

```
src/pages/
  Login, Register    platform-role auth
  Dashboard          pending callout + stats + recent ledger activity
  PendingPlots       review queue — tier picker, per-row verify, bulk multi-select
  Ledger             trust surface — every credit, state filters, provenance
  Revenue            platform 30% headline + 70/30 split breakdown
```

`PendingPlots` is the platform's core action: selecting plots and verifying them
issues credits (minus the 15% buffer) straight onto the ledger. Bulk verify applies
the chosen tier to every selected plot.

## Shared with the farmer panel

`lib/` (api/auth/carbon/format/useAsync) and most of `components/` mirror the farmer
app so the two stay visually consistent. Platform-specific additions: `CreditChip`
(credit-state language), admin icons, and the Pending/Ledger/Revenue pages.
Keep the carbon constants (`BUFFER`, `PRICE`, shares) in sync with the backend.
