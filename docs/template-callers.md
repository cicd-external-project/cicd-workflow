# Central Caller Templates Setup

This guide covers the caller templates in `central-workflow/templates` and what consuming repositories must provide.

Files covered:
- `templates/fe-pipeline-caller.yml`
- `templates/be-pipeline-caller.yml`
- `templates/mobile-pipeline-caller.yml`

## FE Caller

Current orchestrator ref in template:
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-fe.yml@v1`

Required repository variables:
- `FE_SINGLE_SYSTEMS_JSON` or `FE_MULTI_SYSTEMS_JSON`

Required secrets with default caller settings:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- Vercel project ID secret(s) referenced by each system object
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended secret:
- `GH_PR_TOKEN` (for promotion/comment behavior where GitHub default token is insufficient)

Canonical FE system object examples:

Single:
```json
{
  "name": "frontend-root",
  "dir": ".",
  "image": "frontend-web",
  "vercel_project_secret": "VERCEL_PROJECT_ID_FRONTEND"
}
```

Multi:
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

## BE Caller

Current orchestrator ref in template:
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-be.yml@v1`

Required repository variables:
- `BACKEND_SINGLE_SYSTEMS_JSON` or `BACKEND_MULTI_SYSTEMS_JSON`

Required secrets with default caller settings:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended secret:
- `GH_PR_TOKEN`

Canonical BE system object examples:

NestJS:
```json
{
  "name": "backend-nest",
  "dir": ".",
  "image": "ghcr.io/org/backend-nest",
  "backend_stack": "nestjs"
}
```

Node:
```json
{
  "name": "backend-node",
  "dir": ".",
  "image": "ghcr.io/org/backend-node",
  "backend_stack": "nodejs"
}
```

## Mobile Caller

Current orchestrator ref in template:
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@v1`

Required repository variables:
- `MOBILE_SINGLE_SYSTEMS_JSON` or `MOBILE_MULTI_SYSTEMS_JSON`

Required secrets with default caller settings:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`

Optional by default:
- `K6_CLOUD_TOKEN` and `K6_CLOUD_PROJECT_ID` (only needed if k6 is enabled)

Recommended secret:
- `GH_PR_TOKEN`

Canonical mobile system examples:

Expo single:
```json
{
  "name": "mobile-expo",
  "dir": ".",
  "mobile_stack": "expo"
}
```

React Native single:
```json
{
  "name": "mobile-rn",
  "dir": ".",
  "mobile_stack": "react-native"
}
```

Kotlin single:
```json
{
  "name": "mobile-kotlin",
  "dir": ".",
  "mobile_stack": "kotlin",
  "enable_android_build": true,
  "enable_ios_build": false
}
```

Mobile multi:
```json
[
  {
    "name": "mobile-expo",
    "dir": ".",
    "mobile_stack": "expo"
  },
  {
    "name": "mobile-kotlin",
    "dir": "kotlin",
    "mobile_stack": "kotlin",
    "enable_android_build": true,
    "enable_ios_build": false
  }
]
```

## Where to Configure

GitHub repository settings:
- Variables: Settings -> Secrets and variables -> Actions -> Variables
- Secrets: Settings -> Secrets and variables -> Actions -> Secrets

## First Run Checklist

1. Add the correct systems JSON variable.
2. Add required secrets for enabled features.
3. Confirm `test`, `uat`, and `main` branches exist.
4. Push to `test` and verify orchestrator start + systems detection.
5. Run `workflow_dispatch` once for manual validation of optional flags.

## Migrating Repositories Without Workflows Yet

If your repository does not have CI/CD workflow files yet, follow [migration-existing-repository.md](migration-existing-repository.md) for first-time caller onboarding.

Safe first validation defaults for migration (`workflow_dispatch`):

- FE caller: `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_grafana_k6=false`.
- BE caller: `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_k6=false`.
- Mobile caller: `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_grafana_k6=false`.

These settings validate orchestration and configuration without deployment side effects.
