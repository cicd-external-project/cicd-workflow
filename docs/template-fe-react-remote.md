# Template Setup: FE React + Vite (Remote-Sourced)

Remote source:
- `ImplementSprint/template-repo-fe-react` (default branch)

Verification date:
- 2026-04-10

Current caller workflow ref (documented exactly from remote default branch):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-fe.yml@main`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites:
- Node.js 20+
- npm

Commands:
```bash
npm install
npm run dev
npm run build
npm run start
npm run test
npm run lint
```

Local E2E/perf env inputs used by tests:
- `PORT`
- `E2E_BASE_URL`
- `E2E_BROWSER`
- `BASE_URL`
- `SYSTEM_NAME`
- `SMOKE_PATHS`
- `EXPECTED_STATUS`
- `MAX_DURATION_MS`
- `EXPECTED_TEXT`
- `K6_VUS`
- `K6_DURATION`

## GitHub Repository Variables (Canonical)

Required:
- `FE_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "frontend-react",
  "dir": ".",
  "image": "fe-react-web",
  "vercel_project_secret": "VERCEL_PROJECT_ID_FE_REACT"
}
```

How to fill each field:
- `name`: stable frontend system label.
- `dir`: repository-relative app path (`.` for root app).
- `image`: image label used in pipeline metadata.
- `vercel_project_secret`: GitHub secret key name that stores Vercel Project ID.

## GitHub Repository Secrets

Required with default FE caller settings:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- Vercel project ID secret referenced by `vercel_project_secret`
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get values:
- Vercel dashboard (token/org/project ID)
- SonarCloud settings/token page
- Grafana Cloud k6 settings
- GitHub PAT settings

Vercel project settings:
- Framework preset: Vite
- Root directory: `.`

## First Run Checklist

1. Add `FE_SINGLE_SYSTEMS_JSON`.
2. Add Vercel, Sonar, and k6 secrets.
3. Push to `test`.
4. Confirm deploy lane resolves Vite project ID secret.

## Common Failure Modes

- Variable uses non-canonical FE key name.
- Missing Vercel project secret referenced in systems JSON.
- Sonar/k6 enabled but secrets absent.
