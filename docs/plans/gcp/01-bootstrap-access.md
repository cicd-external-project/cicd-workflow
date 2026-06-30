# GCP Bootstrap And Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Prepare the shared AlphaCI GCP runtime project so GitHub Actions and AlphaCI backend jobs can deploy to Cloud Run without static service account keys.

**Architecture:** Stable platform resources are bootstrapped first in `alphaci-20260629`. GitHub Actions authenticates through Workload Identity Federation, pushes images to Artifact Registry, and deploys Cloud Run services using a deployer service account. Runtime services run as separate least-privilege service accounts that can read only the Secret Manager values assigned to their service/environment/slot.

**Tech Stack:** Google Cloud CLI, IAM, Workload Identity Federation, Artifact Registry, Cloud Run, Secret Manager, Cloud Logging, Cloud Monitoring, GitHub Actions OIDC, PowerShell bootstrap scripts.

---

## Source Documents

- Master plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-provider-migration-plan.md`
- Index: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-migration-index.md`
- Workflow repo: `C:\Codes\cicd-ex\cicd-workflow`
- Backend repo: `C:\Codes\cicd-ex\cicd-workflow-be`

## Current Known GCP State

- Project ID: `alphaci-20260629`
- Project number: `840317199583`
- Organization: `alphaexplora.com / 905531103378`
- Region default: `asia-southeast1`
- Billing account: `billingAccounts/01C34F-9DCD67-86DB82`
- Known gaps before implementation: no service accounts, no WIF pool/provider, Artifact Registry API disabled, Cloud Run Admin API disabled, Secret Manager API disabled, no Artifact Registry repos, no Cloud Run services.

## Target Resource Names

```text
GCP project: alphaci-20260629
Region: asia-southeast1
WIF pool: alphaci-github-pool
WIF provider: alphaci-github-provider
Deployer service account: alphaci-gha-deployer@alphaci-20260629.iam.gserviceaccount.com
Runtime service account: alphaci-shared-runtime@alphaci-20260629.iam.gserviceaccount.com
Artifact Registry repo: alphaci-shared
Artifact Registry format: Docker
Smoke Cloud Run service: ac-smoke-bootstrap-web
Smoke secret: alphaci-smoke-bootstrap-secret
Labels: managed_by=alphaci, runtime_scope=shared_project, environment=dev, app=bootstrap-smoke, slot=web
```

## Files To Create Or Modify

### `cicd-workflow`

- Create `scripts/gcp/bootstrap-shared-runtime.ps1`: idempotent bootstrap script for APIs, service accounts, WIF, Artifact Registry, and smoke-test labels.
- Create `scripts/gcp/verify-shared-runtime.ps1`: read-only verification script that checks APIs, WIF provider, service accounts, IAM bindings, Artifact Registry repo, and Secret Manager baseline.
- Create `docs/gcp/bootstrap-shared-runtime.md`: operator runbook with exact commands, expected output shape, rollback notes, and cleanup instructions.
- Modify this plan as evidence and decisions change.

### `cicd-workflow-be`

- Modify `src/config/app.config.ts`: add GCP project ID, region, WIF provider, deployer service account, runtime service account, Artifact Registry location/repo, and bootstrap mode.
- Modify `src/config/app.config.spec.ts`: assert defaults are disabled/safe when GCP env vars are absent.
- Create `src/modules/gcp/gcp-bootstrap.types.ts`: shared type definitions for bootstrap checks and resource names.
- Create `src/modules/gcp/gcp-bootstrap.service.ts`: read-only backend-side validation service for project/bootstrap metadata.
- Create `src/modules/gcp/gcp-bootstrap.service.spec.ts`: unit tests for validation and redaction behavior.

## API Enablement Matrix For This Plan

Enable or verify these services before the shared smoke deploy:

```text
cloudresourcemanager.googleapis.com
serviceusage.googleapis.com
iam.googleapis.com
iamcredentials.googleapis.com
sts.googleapis.com
run.googleapis.com
artifactregistry.googleapis.com
secretmanager.googleapis.com
logging.googleapis.com
monitoring.googleapis.com
```

Do not enable domain, billing automation, or dedicated-project APIs in this first slice unless the operator runbook explicitly says the shared smoke test requires them.

## IAM Boundary

### Deployer Service Account

Minimum roles for the shared smoke test:

```text
roles/run.developer on alphaci-20260629
roles/artifactregistry.writer on alphaci-20260629 or the alphaci-shared repo
roles/iam.serviceAccountUser on alphaci-shared-runtime service account only
roles/secretmanager.viewer only if the workflow must verify secret references
```

Do not grant `roles/owner`, `roles/editor`, broad Secret Manager admin, or organization-level roles to the deployer service account.

### Runtime Service Account

Minimum roles:

```text
roles/secretmanager.secretAccessor only on secrets assigned to smoke/runtime services
roles/logging.logWriter if required by runtime behavior
```

The runtime service account must not be able to deploy Cloud Run services, mutate Artifact Registry, link billing, create projects, or update IAM.

## WIF Policy Decisions

The WIF condition must bind credentials to the intended GitHub surface. The first implementation should allow only the central workflow repository and protected refs needed for smoke testing.

Required claim checks:

```text
assertion.repository_owner == '<github-org-or-owner>'
assertion.repository in ['<central-workflow-repo>', '<approved-caller-repo>']
assertion.ref in ['refs/heads/feature/migrate-vercel-render-to-gcp', 'refs/heads/test', 'refs/heads/uat', 'refs/heads/main']
assertion.event_name in ['workflow_dispatch', 'push', 'pull_request']
```

Fork pull-request previews must remain disabled until the preview deployment plan defines an untrusted-preview model.

## Tasks

### Task 1: Write The Bootstrap Runbook Before Running Cloud Commands

**Files:**

- Create `C:\Codes\cicd-ex\cicd-workflow\docs\gcp\bootstrap-shared-runtime.md`

Steps:

- [ ] Document current project, region, billing account, expected active account, and command safety rule: never print access tokens.
- [ ] List every API service ID and why it is required.
- [ ] List every resource name and label.
- [ ] Add rollback instructions for smoke-only resources.
- [ ] Add evidence snippets: command, timestamp, result, operator.

Verification:

```powershell
git -C C:\Codes\cicd-ex\cicd-workflow diff --check -- docs/gcp/bootstrap-shared-runtime.md
```

Expected: no output and exit code `0`.

### Task 2: Add The Idempotent Bootstrap Script

**Files:**

- Create `C:\Codes\cicd-ex\cicd-workflow\scripts\gcp\bootstrap-shared-runtime.ps1`
- Create `C:\Codes\cicd-ex\cicd-workflow\scripts\gcp\verify-shared-runtime.ps1`

Script requirements:

- Accept parameters for `ProjectId`, `Region`, `ArtifactRepo`, `WifPool`, `WifProvider`, `DeployerServiceAccount`, and `RuntimeServiceAccount`.
- Use `gcloud services enable` only for the APIs listed in this plan.
- Check before create for service accounts, WIF pool/provider, Artifact Registry repo, and smoke secret.
- Do not print secret values, OAuth tokens, access tokens, refresh tokens, or service account keys.
- Write safe summary lines only: resource name, exists/created/skipped, and next action.
- Exit non-zero if active project differs from `ProjectId`.

Verification:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Codes\cicd-ex\cicd-workflow\scripts\gcp\verify-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1
```

Expected before bootstrap: safe failures for missing APIs/resources, no token output.

### Task 3: Add Backend Configuration Shape

**Files:**

- Modify `C:\Codes\cicd-ex\cicd-workflow-be\src\config\app.config.ts`
- Modify `C:\Codes\cicd-ex\cicd-workflow-be\src\config\app.config.spec.ts`

Configuration keys:

```text
GCP_DEPLOYMENTS_ENABLED
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_DEFAULT_REGION
GCP_ARTIFACT_REGISTRY_LOCATION
GCP_ARTIFACT_REGISTRY_REPO
GCP_WIF_PROVIDER
GCP_DEPLOYER_SERVICE_ACCOUNT
GCP_RUNTIME_SERVICE_ACCOUNT
GCP_BOOTSTRAP_MODE
```

Rules:

- Missing GCP keys must not break local dev when `GCP_DEPLOYMENTS_ENABLED` is not `true`.
- When `GCP_DEPLOYMENTS_ENABLED=true`, required keys must be validated before deployment actions run.
- No config value may contain raw credential JSON.

Verification:

```powershell
npm test -- src/config/app.config.spec.ts
npm run typecheck
```

Expected: config tests pass and typecheck exits `0`.

### Task 4: Add Read-Only Bootstrap Validation Service

**Files:**

- Create `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\gcp\gcp-bootstrap.types.ts`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\gcp\gcp-bootstrap.service.ts`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\gcp\gcp-bootstrap.service.spec.ts`

Required checks:

```text
projectId matches deployment target metadata
region is asia-southeast1 unless plan config overrides it
artifact repo is configured
WIF provider string is configured
service account emails end with the expected project domain
no credential JSON appears in config
```

Verification:

```powershell
npm test -- src/modules/gcp/gcp-bootstrap.service.spec.ts
npm run lint
```

Expected: tests pass and lint exits `0`.

### Task 5: Live Smoke Test With Explicit Approval

Do not run this task automatically in CI or an agent session without explicit approval because it creates GCP resources.

Approved operator sequence:

```powershell
gcloud config set project alphaci-20260629
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gcp/bootstrap-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1 -ArtifactRepo alphaci-shared -WifPool alphaci-github-pool -WifProvider alphaci-github-provider -DeployerServiceAccount alphaci-gha-deployer -RuntimeServiceAccount alphaci-shared-runtime
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gcp/verify-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1
```

Expected: APIs enabled, service accounts exist, WIF provider exists, Artifact Registry repo exists, smoke secret metadata exists, no token values printed.

## Rollback

- Remove smoke Cloud Run services by exact service name and labels.
- Delete smoke secret versions only if they were created for the smoke test.
- Remove WIF IAM bindings if the provider condition is wrong.
- Do not delete baseline Artifact Registry repo, WIF pool, or service accounts after they become shared infrastructure unless a new bootstrap plan replaces them.

## Acceptance Gates

- `verify-shared-runtime.ps1` reports the shared runtime bootstrap state without exposing secrets.
- GitHub Actions can exchange OIDC for the deployer service account without JSON keys.
- The deployer service account can push to Artifact Registry and deploy one disposable Cloud Run service.
- The runtime service account cannot deploy services or mutate IAM.
- All commands and evidence are recorded in `docs/gcp/bootstrap-shared-runtime.md`.
