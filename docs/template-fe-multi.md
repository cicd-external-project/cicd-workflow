# Template Setup: FE Multi (Monorepo)

Template repository:
- `ImplementSprint/template-repo-fe-multi`

Current caller workflow ref (documented exactly):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-fe.yml@main`

## Required Branches

Create these branches:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites:
- Node.js 20+
- npm

Run per app directory:
```bash
cd system-1
npm install
npm run lint
npm run test
npm run build
```

Local env vars:
- No mandatory shared local `.env` variables are defined by template baseline.

## GitHub Repository Variables (Canonical)

Set in: Settings -> Secrets and variables -> Actions -> Variables

Required:
- `FE_MULTI_SYSTEMS_JSON`

Recommended value:
```json
[
  {
    "name": "system-1",
    "dir": "system-1",
    "image": "system-1-web",
    "vercel_project_secret": "VERCEL_PROJECT_ID_SYSTEM_1"
  },
  {
    "name": "system-2",
    "dir": "system-2",
    "image": "system-2-web",
    "vercel_project_secret": "VERCEL_PROJECT_ID_SYSTEM_2"
  }
]
```

How to fill each field:
- `name`: stable label per frontend system.
- `dir`: repository-relative directory of each app.
- `image`: image label used by pipeline metadata.
- `vercel_project_secret`: GitHub secret key that stores that system's Vercel Project ID.

## GitHub Repository Secrets

Set in: Settings -> Secrets and variables -> Actions -> Secrets

Required with default workflow settings:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- Vercel project ID secret for each system declared in `FE_MULTI_SYSTEMS_JSON`
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Required by this template's documented notification setup:
- `SLACK_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`

Recommended:
- `GH_PR_TOKEN`

Where to get each value:
- Vercel values: Dashboard and project settings
- Sonar values: SonarCloud org/project settings and account security token page
- k6 values: Grafana Cloud k6 project settings
- Webhook URLs:
  - Slack: api.slack.com -> Apps -> Incoming Webhooks
  - Discord: Server Settings -> Integrations -> Webhooks
- `GH_PR_TOKEN`: GitHub PAT with PR and contents write access

## First Run Checklist

1. Add required branches.
2. Set `FE_MULTI_SYSTEMS_JSON` for all active systems.
3. Add one Vercel project ID secret per system.
4. Add Sonar and k6 secrets (or disable those lanes manually for testing).
5. Add webhook secrets if notification lane is enabled.
6. Push to `test` and confirm each system directory is discovered.

## Common Failure Modes

- Directory mismatch in `dir` entries -> build/test path resolution errors.
- Missing per-system Vercel project secret -> deploy failure for that system.
- Missing Sonar/k6 secrets with defaults enabled -> gate failures.
- Referencing a system that does not exist -> systems validation failure.
