# Template Setup: FE Single (Next.js)

Template repository:
- `ImplementSprint/template-repo-fe-single`

Current caller workflow ref (documented exactly):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-fe.yml@fix/e2e-policy`

## Required Branches

Create these branches in the target repo:
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
npm run test
npm run lint
npm run build
```

Local env vars:
- No mandatory local `.env` variables are defined by this template baseline.

## GitHub Repository Variables (Canonical)

Set in: Settings -> Secrets and variables -> Actions -> Variables

Required:
- `FE_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "frontend-root",
  "dir": ".",
  "image": "fe-single-web",
  "vercel_project_secret": "VERCEL_PROJECT_ID_FE_SINGLE"
}
```

How to fill each field:
- `name`: any stable system label used in logs/reports.
- `dir`: repository-relative app directory (`.` for repo root app).
- `image`: image label used by pipeline metadata.
- `vercel_project_secret`: the exact GitHub secret key that stores this app's Vercel Project ID.

## GitHub Repository Secrets

Set in: Settings -> Secrets and variables -> Actions -> Secrets

Required with default workflow settings:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_FE_SINGLE` (or whatever name you referenced in `vercel_project_secret`)
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN` (promotion/comment operations are more reliable than fallback token in many org policies)

Where to get each value:
- `VERCEL_TOKEN`: Vercel Dashboard -> Settings -> Tokens
- `VERCEL_ORG_ID`: Vercel Team Settings -> General -> Team ID
- `VERCEL_PROJECT_ID_*`: Vercel Project -> Settings -> General -> Project ID
- `SONAR_TOKEN`: SonarCloud -> My Account -> Security -> Generate Token
- `SONAR_ORGANIZATION`: SonarCloud -> Organization Settings
- `SONAR_PROJECT_KEY`: SonarCloud -> Project Information
- `K6_CLOUD_TOKEN`: Grafana Cloud k6 -> Project Settings -> API Token
- `K6_CLOUD_PROJECT_ID`: Grafana Cloud k6 -> Project details
- `GH_PR_TOKEN`: GitHub PAT (fine-grained recommended with Contents RW, Pull requests RW)

## Vercel Project Configuration

In Vercel:
- Link repository to project
- Root directory: `.`
- Framework preset: Next.js

## First Run Checklist

1. Add required branches.
2. Add `FE_SINGLE_SYSTEMS_JSON` variable.
3. Add required secrets listed above.
4. Push a commit to `test`.
5. Confirm pipeline resolves one system with `dir: .`.
6. Confirm Sonar and k6 jobs pass (or explicitly disable these features in manual dispatch).

## Common Failure Modes

- Missing `FE_SINGLE_SYSTEMS_JSON` variable -> systems-config fails.
- Wrong `vercel_project_secret` name -> deploy fails to resolve project ID secret.
- Missing Sonar secrets with Sonar enabled -> preflight/scan fails.
- Missing k6 secrets with k6 enabled -> k6 job fails early.
