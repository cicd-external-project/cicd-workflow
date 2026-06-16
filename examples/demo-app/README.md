# FlowCI Demo App

This directory contains a minimal but real full-stack application — a NestJS
backend and a Next.js frontend — that exists for one purpose: to show exactly
what FlowCI generates and enforces the moment you onboard a repository to the
platform. Nothing here is hand-built CI configuration. Every workflow file
under `backend/.github/workflows/` and `frontend/.github/workflows/` is the
literal output of FlowCI's pipeline generator, wired against the real
reusable workflows published at
`cicd-external-project/cicd-workflow/.github/workflows/*.yml@v1`.

If you are evaluating FlowCI, this is the fastest way to see the actual gate
behavior — not a slide describing it.

## What's in here

| App | Stack | Deploys to |
|-----|-------|------------|
| `backend/` | NestJS 11, Node 22 | Render (Docker web service) |
| `frontend/` | Next.js 16 (App Router), React 19 | Vercel (zero-config) |

Each app ships its own independent 3-stage FlowCI workflow bundle:

```
00-flowci-access.yml    -> Access Gate
10-flowci-quality.yml   -> Quality Gate
20-flowci-package.yml   -> Package Gate
```

The two apps are deployed and gated completely independently — the backend's
pipeline knows nothing about the frontend's, and vice versa. They happen to
live in the same example folder for convenience only.

## The 3-stage pipeline

FlowCI generates a chain of three separate GitHub Actions workflow files per
app. They are not three jobs in one file — each stage is its own workflow,
and each stage triggers the next via `workflow_run`. This means the chain
only advances when the prior stage's workflow run actually concludes
successfully (or, in the case of `workflow_dispatch`, can be re-run on
demand).

```
push / pull_request (test, uat, main)
        │
        ▼
  ┌─────────────────┐
  │  Access Gate     │  00-flowci-access.yml
  └────────┬─────────┘
           │ workflow_run: completed (conclusion == success)
           ▼
  ┌─────────────────┐
  │  Quality Gate    │  10-flowci-quality.yml
  └────────┬─────────┘
           │ workflow_run: completed
           ▼
  ┌─────────────────┐
  │  Package Gate    │  20-flowci-package.yml
  └─────────────────┘
```

### Gate-by-gate summary

| Gate | File | Trigger | Purpose |
|------|------|---------|---------|
| Access | `00-flowci-access.yml` | `push`/`pull_request` on `test`/`uat`/`main`, or manual | Authorizes the run against FlowCI before any work happens |
| Quality | `10-flowci-quality.yml` | `workflow_run` (Access Gate completed) | Branch policy resolution, tests + coverage, lint, security scan, optional SonarCloud |
| Package | `20-flowci-package.yml` | `workflow_run` (Quality Gate completed) | Build, production gate (main only), deploy, auto-promotion PR |

### Access Gate (`00-flowci-access.yml`)

Every stage — including this one — opens with a `validate-access` job. It
POSTs to a FlowCI validation endpoint
(`https://flowci-be-test.onrender.com/api/v1/ci/validate`) with:

- `Authorization: Bearer ${{ secrets.CI_TOKEN }}`
- A JSON body containing the repo, the stage name (`access`), the GitHub Run
  ID, and the head SHA being validated

If the endpoint does not return HTTP 200, the job fails immediately with
`::error::FlowCI authorization failed` and the rest of the chain never runs
(no `workflow_run` event fires from a failed workflow). This is the
mechanism that gives FlowCI control over whether a connected repository is
allowed to execute pipeline stages at all.

A `report-results` job (`if: always()`) runs afterward regardless of outcome
and POSTs a result payload — repo, branch, commit SHA, run ID, stage name,
and conclusion (`success`/`failure`/`cancelled`) — to `CI_REPORT_URL`. This
reporting call is best-effort: a failed POST only emits a
`::warning::` and never fails the job.

### Quality Gate (`10-flowci-quality.yml`)

This is the core enforcement stage. It runs five jobs after its own
`validate-access` check:

1. **`branch-policy`** — resolves enforcement strictness from the branch
   name:

   | Branch | Coverage threshold | Lint warnings | SonarCloud quality-gate wait |
   |--------|--------------------|----------------|-------------------------------|
   | `test` (and anything else) | 80% | Advisory only | No |
   | `uat` | 90% | Fail the build | Yes |
   | `main` | 90% | Fail the build | Yes |

   The coverage bump on `uat`/`main` is baseline +10 percentage points,
   capped at 95 — with an 80% baseline that lands exactly at 90%.

2. **`backend-tests`** / **`frontend-tests`** — calls the central
   `backend-tests.yml` / `frontend-tests.yml` reusable workflow with
   `enforce-coverage: true` and the resolved threshold. Tests run with
   `--coverage --coverageReporters=json-summary --coverageReporters=lcov`,
   and coverage is enforced by parsing `coverage/coverage-summary.json`. A
   commit that drops below the resolved threshold fails this job and the
   whole Quality Gate.

3. **`lint`** — calls `lint-check.yml` with `npm run lint`. On `test`, lint
   warnings are advisory (`fail-on-warning: false`); on `uat`/`main`,
   warnings become build-breaking (`fail-on-warning: true`).

4. **`security`** — calls `security-scan.yml` with `fail-on-high: true`.
   This runs regardless of branch policy and always blocks on high/critical
   findings.

5. **`sonar`** — calls `sonarcloud-scan.yml`, but only `if:
   needs.branch-policy.outputs.sonar-enabled == 'true'`. That flag is
   computed from whether `SONAR_TOKEN`, `SONAR_ORGANIZATION`, and
   `SONAR_PROJECT_KEY` are all non-empty secrets — if any are missing, this
   job is skipped entirely rather than failing. On `uat`/`main` it also
   waits on the SonarCloud quality gate (`quality-gate-wait: true`).

**What blocks a merge/promotion:** failing tests, coverage below threshold,
high/critical security findings, and (on `uat`/`main`) lint warnings or a
failed SonarCloud quality gate.

**What's advisory:** lint warnings on `test`, and SonarCloud entirely when
its three secrets aren't configured.

A final `report-results` job posts the stage conclusion plus a
`coverage: { pct, threshold }` object back to FlowCI, sourced from the test
job's `coverage-percent` output.

### Package Gate (`20-flowci-package.yml`)

1. **`build`** — checks out the exact commit that passed Quality
   (`ref: github.event.workflow_run.head_sha`), installs with
   `npm ci --ignore-scripts` (or `npm install` if no lockfile exists yet),
   and runs `npm run build`. Gated to `test`/`uat`/`main` only.

2. **`production-gate`** — calls the central `production-gate.yml`, but
   `if:` restricts it to the `main` branch only. In this example
   `require-approval` is set to `false`, but the reusable workflow supports
   manual-approval gating — an operator could flip this to `true` to require
   a human click-through before a `main` build is allowed to deploy.

3. **`deploy-render`** (backend) / **`deploy-vercel-standalone`**
   (frontend) — runs when `build` succeeded and either the branch isn't
   `main`, or it is `main` and `production-gate` also succeeded. Environment
   targeting is derived directly from the branch name:

   | Branch | Backend environment (Render) | Frontend environment (Vercel) |
   |--------|-------------------------------|--------------------------------|
   | `test` | `test` | `preview` |
   | `uat` | `uat` | `preview` |
   | `main` | `production` | `production` |

4. **`promote-to-uat`** / **`promote-to-main`** — run only on `test` and
   `uat` respectively, only after `build` succeeded and the deploy job
   succeeded *or was skipped*. Each calls the central `promotion.yml`
   workflow to open an auto-promotion pull request (`test` → `uat`, or
   `uat` → `main`), authenticated with `GH_PR_TOKEN` if set, falling back to
   the default `github.token` otherwise.

A `report-results` job again posts the final stage conclusion to FlowCI.

## Branch promotion flow

The platform-wide branch model is strictly `test → uat → main`, with no
reverse promotions, enforced end to end by what's actually wired into these
workflows:

```
feature/* or bugfix/*
        │  (manual PR, outside this bundle)
        ▼
       test  ──── Quality Gate: 80% coverage, lint advisory, Sonar optional ────┐
        │                                                                       │
        │ Package Gate: build → deploy to Render "test" / Vercel "preview"      │
        │ promote-to-uat opens an auto-PR test → uat                            │
        ▼                                                                       │
       uat  ──── Quality Gate: 90% coverage, lint fails build, Sonar gate-wait ─┤
        │                                                                       │
        │ Package Gate: build → deploy to Render "uat" / Vercel "preview"       │
        │ promote-to-main opens an auto-PR uat → main                          │
        ▼                                                                       │
       main ──── Quality Gate: 90% coverage, lint fails build, Sonar gate-wait ─┘
        │
        │ Package Gate: build → production-gate (main only) → deploy to
        │ Render "production" / Vercel "production"
        ▼
   production
```

Each promotion is opt-in only in the sense that it requires the prior
stage's deploy job to have succeeded or been skipped — a failed deploy blocks
the auto-PR from being opened.

## Where this deploys

### Backend → Render

`backend/render.yaml` documents the Render Blueprint shape for this service
— a Docker web service (`runtime: docker`), built from the repo's own
`Dockerfile`, on the `free` plan in the `oregon` region, with
`healthCheckPath: /api/v1/health` and `autoDeploy: false`. The pipeline does
not read this file directly: `20-flowci-package.yml`'s `deploy-render` job
drives the actual deploy via a Render deploy hook URL plus a post-deploy
health check, per environment (test/uat/production). The Dockerfile itself
is a three-stage build (`deps` → `builder` → `runner`) producing a non-root
`nestjs` user and a container-level `HEALTHCHECK` against the same
`/api/v1/health` path.

### Frontend → Vercel

The frontend has no special deploy configuration at all —
`frontend/next.config.ts` is an untouched default Next.js config. Vercel's
zero-config auto-detection of Next.js handles the build and runtime entirely
on Vercel's side; FlowCI's `deploy-vercel-standalone` job only needs a
token, org ID, and project ID to push the build to the right Vercel project
and environment (`preview` for test/uat, `production` for main).

## Try it yourself

Everything described above is real, working configuration — but turning it
into a live, green pipeline requires GitHub repos, a Render service, a
Vercel project, and a handful of secrets that this session has no access to
create. See [`MANUAL_SETUP.md`](./MANUAL_SETUP.md) for the exact, ordered
checklist of what a human needs to do by hand to stand this example up for
real.
