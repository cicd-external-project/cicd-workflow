# Migrating a Repository Without Workflows to Central Workflow

This runbook is for teams whose repository does not have workflow files yet and needs first-time CI/CD onboarding through `ImplementSprint/central-workflow` callers.

## Scope

Use this guide when your repository has no active pipeline files under `.github/workflows` and you want to add:

- FE caller (`master-pipeline-fe.yml`)
- BE caller (`master-pipeline-be.yml`)
- Mobile caller (`master-pipeline-mobile.yml`)

If you are starting from a fresh template repository, follow the setup guides in [README.md](README.md) first, then use this runbook for first-time onboarding.

## Pre-Migration Checklist

Complete these items before adding workflow files:

1. Create a migration branch from your active branch (for example `chore/migrate-central-workflow`).
2. Confirm there is no active workflow file that can trigger unexpectedly.
3. Confirm branch model includes `test`, `uat`, and `main`.
4. Confirm required secrets exist in repository settings.
5. Confirm required repository variable exists with the canonical name.

Configure secrets before variables and before adding workflow files. This avoids first-run failures where workflows resolve missing secrets.

## Canonical Variable Names

Use only these variable names:

- `FE_SINGLE_SYSTEMS_JSON`
- `FE_MULTI_SYSTEMS_JSON`
- `BACKEND_SINGLE_SYSTEMS_JSON`
- `BACKEND_MULTI_SYSTEMS_JSON`
- `MOBILE_SINGLE_SYSTEMS_JSON`
- `MOBILE_MULTI_SYSTEMS_JSON`

If repository variables exist under older names, rename them to the canonical names above before onboarding.

## Phase 1: Configure Required Secrets and Variables

1. Add all required secrets for your selected stack.
2. Add the canonical systems variable (`*_SYSTEMS_JSON`) for your stack.
3. Validate JSON payload shape before saving.

Minimum recommendation by stack:

- FE: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, project-id secret(s), `SONAR_TOKEN`, `SONAR_ORGANIZATION`, `SONAR_PROJECT_KEY`; optional `K6_CLOUD_TOKEN`, `K6_CLOUD_PROJECT_ID`; recommended `GH_PR_TOKEN`.
- BE: `SONAR_TOKEN`, `SONAR_ORGANIZATION`, `SONAR_PROJECT_KEY`; optional `K6_CLOUD_TOKEN`, `K6_CLOUD_PROJECT_ID`; recommended `GH_PR_TOKEN`.
- Mobile: `SONAR_TOKEN`, `SONAR_ORGANIZATION`, `SONAR_PROJECT_KEY`; optional `K6_CLOUD_TOKEN`, `K6_CLOUD_PROJECT_ID`; recommended `GH_PR_TOKEN`.

See [template-callers.md](template-callers.md) for exact caller contract details.

## Phase 2: Add Workflow Caller Safely

In your migration branch:

1. Add exactly one central caller workflow for the stack you are onboarding.
2. Commit and push only workflow-file changes first.
3. Do not add deploy/promotion customizations before first validation run.

Caller template sources:

- `central-workflow/templates/fe-pipeline-caller.yml`
- `central-workflow/templates/be-pipeline-caller.yml`
- `central-workflow/templates/mobile-pipeline-caller.yml`

## Phase 3: Safe First Validation Run (`workflow_dispatch`)

Run the new caller manually from GitHub Actions with low-risk settings.

Recommended first-run values:

- FE: `pipeline_mode=auto`, `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_grafana_k6=false`.
- BE: `pipeline_mode=auto`, `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_k6=false`.
- Mobile: `pipeline_mode=auto`, `run_deploy=false`, `run_promotion=false`, `dry_run=true`, `enable_grafana_k6=false`.

Why: this validates systems detection, lint/test/security paths, and secrets resolution without deployment or promotion side effects.

## Phase 4: Controlled Adoption on Branches

1. Merge migration branch into `test` first.
2. Validate push-triggered run on `test` succeeds.
3. Promote to `uat`, then `main` after verification.
4. After stable runs, add optional feature toggles gradually (k6, deploy automation, promotion automation).

## Stack-Specific Notes

### FE

- Ensure every system object sets `vercel_project_secret` and matching secret exists.
- If `run_deploy` is enabled, verify Vercel team/project IDs map correctly.

### BE

- Ensure every system object has the correct `backend_stack` (`nestjs` or `nodejs`).
- Wrong `backend_stack` can route to an incompatible build path.

### Mobile

- `mobile_stack` must be accurate (`expo`, `react-native`, `kotlin`).
- Mobile build toggles (`enable_android_build`, `enable_ios_build`) should match repository capability.
- Maestro behavior differs between templates; validate expected defaults before enabling deploy/promotion.

## Common Migration Failure Scenarios

1. Variable name mismatch (`*_SYSTEMS_JSON` typo) causes systems detection failures.
2. Missing secret causes immediate failure in quality/security/deploy stages.
3. Wrong stack value (`backend_stack` or `mobile_stack`) routes to wrong workflow path.
4. Running first onboarding directly on `main` increases rollback risk.

## Rollback Procedure

If onboarding fails in a way that blocks delivery:

1. Revert the commit that added the caller workflow file.
2. Re-run checks after fixing variable/secret/config gaps.
3. Reattempt onboarding in a new migration branch.
4. Keep rollout on `test` until first end-to-end pass succeeds.

Because there was no previous workflow path, rollback means returning to the pre-onboarding state (no GitHub Actions workflow files).

## Post-Migration Cleanup

After successful onboarding:

1. Remove obsolete secrets/variables that are no longer used.
2. Document local conventions that differ from template defaults.
3. Add environment-specific overrides only after baseline stability is confirmed.
