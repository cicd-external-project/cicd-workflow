# FlowCI Demo Frontend

A small, real Next.js 16 app that demonstrates what FlowCI generates and
enforces for a frontend repository. The landing page (`/`) is the
user-facing explanation of the product: it walks through the three pipeline
stages FlowCI generates (Access Gate → Quality → Package) and the
`test → uat → main` branch promotion flow, and it proves the frontend talks
to a real backend by calling the backend's health endpoint on load.

This app is standalone — it has its own `package.json`, lockfile, and test
suite, independent of the product repos (`cicd-workflow-fe`,
`cicd-workflow-be`) elsewhere in this workspace. See the top-level
[`../README.md`](../README.md) for how this app fits into the full
demo (backend + frontend + the generated workflow files).

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict mode)
- Tailwind CSS v4 — configured entirely in `src/app/globals.css`, no
  `tailwind.config.js`
- Jest + React Testing Library for unit tests
- Path alias `@/*` → `src/*`

## Environment variables

Copy `.env.example` to `.env.local` and point it at a running backend:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

The page calls `GET ${NEXT_PUBLIC_API_URL}/api/v1/health` on load and
renders a live status pill (`Checking backend…` → `Backend online` /
`Backend unreachable`). If the variable is unset, the badge renders an
explicit "not configured" offline state rather than silently failing.

## Run

```bash
npm install
npm run dev      # Next.js dev server on port 3000 (Turbopack)
```

> The example backend in `../backend` also defaults to port 3000 — when
> running both locally at once, start the backend on a different port
> (`PORT=3001 npm run start:dev`) and point `NEXT_PUBLIC_API_URL` at it.

## Test

```bash
npm test                    # Jest + jsdom, all unit tests
npm test -- --coverage      # with coverage report
```

Coverage thresholds (mirrors the product frontend's gate): branches ≥ 80%,
functions ≥ 80%, lines ≥ 85%, statements ≥ 85%. `src/app/**` (the App
Router page/layout entry files) is excluded from coverage collection —
testable logic lives in `src/lib/` and `src/components/`, which are fully
covered.

Exact CI test command (what `10-flowci-quality.yml` actually runs):

```bash
npm run test -- --coverage --coverageReporters=json-summary --coverageReporters=lcov --json --outputFile=test-results.json
```

## Lint and typecheck

```bash
npm run lint           # ESLint flat config (ESLint 9)
npx tsc --noEmit        # TypeScript strict mode check
```

## Build

```bash
npm run build           # Production build (.next/)
npm start                # Serve the production build on port 3000
```

## Project structure

```
src/
  app/
    layout.tsx           # Root layout, metadata, skip-to-content link
    page.tsx              # Landing page composition
    globals.css            # Design tokens + all component styles (Tailwind v4 + CSS)
  components/
    HealthBadge.tsx        # Calls the backend health endpoint, renders live status
    PipelineRail.tsx        # Access Gate -> Quality -> Package stage visualization
    PromotionLadder.tsx      # test -> uat -> main branch promotion visualization
  lib/
    health-check.ts          # Backend health-check fetch + interpretation logic (tested)
    pipeline-stages.ts        # Pipeline stage + promotion step data and helpers (tested)
tests/unit/                    # Page/layout/component tests that need the full app context
```

## Deployment

This app deploys to Vercel via the generated `20-flowci-package.yml`
workflow's `deploy-vercel-standalone` job, which calls the central
`vercel-deploy.yml` reusable workflow with `working-directory: .`. That
workflow drives the deploy with the standard Vercel CLI (`vercel pull` →
`vercel build` → `vercel deploy --prebuilt`) and Vercel's own zero-config
Next.js auto-detection — there is intentionally no `vercel.json` in this
app (see `../README.md` and `../MANUAL_SETUP.md`, which document this as a
deliberate choice, not an oversight). The only inputs the pipeline needs
from the Vercel side are a token, org ID, and project ID, supplied as the
`VERCEL_STANDALONE_TOKEN` / `VERCEL_STANDALONE_ORG_ID` /
`VERCEL_STANDALONE_PROJECT_ID` repository secrets.

Required environment variable on Vercel: `NEXT_PUBLIC_API_URL`, pointed at
the deployed backend's base URL (e.g. the Render service URL).
