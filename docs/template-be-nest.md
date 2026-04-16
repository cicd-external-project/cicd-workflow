# Template Setup: BE NestJS

Template repository:
- `ImplementSprint/template-repo-be`

Current caller workflow ref (documented exactly):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-be.yml@main`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites:
- Node.js 22+
- npm

Commands:
```bash
npm install
npm run start:dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Local Environment Variables

Create `.env` from `.env.example`.

Required:
- `NODE_ENV`
- `PORT`
- `ENABLE_SWAGGER`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`

Optional:
- `API_CENTER_BASE_URL`
- `API_CENTER_API_KEY`

Where to get values:
- Supabase values: Supabase Dashboard -> Project Settings -> API
- API Center values: internal platform/API Center owners
- `ALLOWED_ORIGINS`: your frontend app URLs (comma-separated)

Security notes:
- Treat `SUPABASE_SERVICE_ROLE_KEY` and `API_CENTER_API_KEY` as high sensitivity.
- Store high-sensitivity values in secrets manager only.

## GitHub Repository Variables (Canonical)

Set in: Settings -> Secrets and variables -> Actions -> Variables

Required:
- `BACKEND_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "backend-nest",
  "dir": ".",
  "image": "ghcr.io/org/backend-nest",
  "backend_stack": "nestjs"
}
```

How to fill each field:
- `name`: stable service label for reports/notifications.
- `dir`: repository-relative service directory (`.` for root service).
- `image`: target GHCR image path (`ghcr.io/<org>/<image>`).
- `backend_stack`: fixed value `nestjs` for this template.

## GitHub Repository Secrets

Set in: Settings -> Secrets and variables -> Actions -> Secrets

Required with default workflow settings:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get each value:
- `SONAR_TOKEN`: SonarCloud -> My Account -> Security
- `SONAR_ORGANIZATION`: SonarCloud org settings
- `SONAR_PROJECT_KEY`: SonarCloud project settings
- `K6_CLOUD_TOKEN`: Grafana Cloud k6 token page
- `K6_CLOUD_PROJECT_ID`: Grafana Cloud k6 project page
- `GH_PR_TOKEN`: GitHub PAT with PR/contents write permissions

## First Run Checklist

1. Create `.env` from `.env.example`.
2. Add required repository variable.
3. Add required secrets.
4. Push to `test`.
5. Confirm quality gates, Sonar, and k6 all pass.

## Common Failure Modes

- Missing Supabase values -> service starts with dependency errors.
- Invalid `backend_stack` value -> orchestrator route mismatch.
- Missing Sonar secrets with Sonar enabled -> preflight/scan failures.
- Missing k6 secrets with k6 enabled -> k6 lane fails.
