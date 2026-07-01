# GCP Bootstrap And Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Prepare the shared AlphaCI GCP runtime project, using outputs from `00-org-foundation-automation`, so GitHub Actions and AlphaCI backend jobs can deploy to Cloud Run without static service account keys.

**Architecture:** Org folders, baseline project placement, labels, IAM boundaries, and Terraform state are owned by `alphaexplora-cloud` through `00-org-foundation-automation` first. This plan consumes those foundation outputs to configure shared-runtime WIF, deployer/runtime service accounts, Artifact Registry, Secret Manager, and Cloud Run smoke deploys. Live bootstrap scripts that mutate GCP belong in `alphaexplora-cloud`; `cicd-workflow` only consumes outputs and owns reusable deployment workflows. `alphaci-20260629` may be used as the current seed/shared project only until it is reconciled into the Terraform-owned foundation or documented as a bootstrap exception.

**Tech Stack:** Google Cloud CLI, IAM, Workload Identity Federation, Artifact Registry, Cloud Run, Secret Manager, Cloud Logging, Cloud Monitoring, GitHub Actions OIDC, PowerShell bootstrap scripts.

---

## Source Documents

- Master plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-provider-migration-plan.md`
- IAM access request matrix: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\gcp-iam-access-request-matrix.md`
- Foundation plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\00-org-foundation-automation.md`
- Cloud implementation repo: `C:\Codes\cicd-ex\alphaexplora-cloud`
- Index: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-migration-index.md`
- Workflow repo: `C:\Codes\cicd-ex\cicd-workflow`
- Backend repo: `C:\Codes\cicd-ex\cicd-workflow-be`

## Foundation Dependency

This plan starts after one of these is true:

- Terraform foundation created the target shared runtime project under `20-customer-runtime/shared` and exposed project/folder outputs.
- An admin bootstrap exception explicitly records why `alphaci-20260629` is temporarily used before Terraform reconciliation.

The backend must not create folders or baseline projects in this phase.

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

### `alphaexplora-cloud`

- Create `scripts/gcp/bootstrap-shared-runtime.ps1`: idempotent bootstrap script for APIs, service accounts, WIF, Artifact Registry, and smoke-test labels.
- Create `scripts/gcp/verify-shared-runtime.ps1`: read-only verification script that checks APIs, WIF provider, service accounts, IAM bindings, Artifact Registry repo, and Secret Manager baseline.
- Create `docs/gcp/bootstrap-shared-runtime.md`: operator runbook with exact commands, expected output shape, rollback notes, cleanup instructions, and output handoff to AlphaCI.

### `cicd-workflow`

- Do not create live GCP bootstrap scripts here.
- Consume WIF provider, deployer service account, runtime service account, Artifact Registry repo, and region outputs from `alphaexplora-cloud`.
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

Do not enable domain, billing automation, or dedicated-project APIs in this first slice unless the foundation plan and operator runbook explicitly say the shared smoke test requires them.

## IAM Boundary

Use `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\gcp-iam-access-request-matrix.md` for the complete GCP access request. This section is the runtime subset for the shared smoke test only.


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

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\docs\gcp\bootstrap-shared-runtime.md`

Steps:

- [ ] Document current project, region, billing account, expected active account, and command safety rule: never print access tokens.
- [ ] List every API service ID and why it is required.
- [ ] List every resource name and label.
- [ ] Add rollback instructions for smoke-only resources.
- [ ] Add evidence snippets: command, timestamp, result, operator.

Verification:

```powershell
git -C C:\Codes\cicd-ex\alphaexplora-cloud diff --check -- docs/gcp/bootstrap-shared-runtime.md
```

Expected: no output and exit code `0`.

### Task 2: Add The Idempotent Bootstrap Script

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\bootstrap-shared-runtime.ps1`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\verify-shared-runtime.ps1`

Script requirements:

- Accept parameters for `ProjectId`, `Region`, `ArtifactRepo`, `WifPool`, `WifProvider`, `DeployerServiceAccount`, and `RuntimeServiceAccount`.
- Use `gcloud services enable` only for the APIs listed in this plan.
- Check before create for service accounts, WIF pool/provider, Artifact Registry repo, and smoke secret.
- Do not print secret values, OAuth tokens, access tokens, refresh tokens, or service account keys.
- Write safe summary lines only: resource name, exists/created/skipped, and next action.
- Exit non-zero if active project differs from `ProjectId`.

Verification:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\verify-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1
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
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\bootstrap-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1 -ArtifactRepo alphaci-shared -WifPool alphaci-github-pool -WifProvider alphaci-github-provider -DeployerServiceAccount alphaci-gha-deployer -RuntimeServiceAccount alphaci-shared-runtime
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\verify-shared-runtime.ps1 -ProjectId alphaci-20260629 -Region asia-southeast1
```

Expected: APIs enabled, service accounts exist, WIF provider exists, Artifact Registry repo exists, smoke secret metadata exists, no token values printed.


## Live Access Handoff Checklist

Use this checklist after AlphaExplora GCP access is granted. Do not run these commands from the access-independent local plan.

| Step | Evidence to capture | Unblocks | Verification command |
| --- | --- | --- | --- |
| Authenticate AlphaExplora account | Active account email and ADC presence, no tokens printed | Live GCP inventory and bootstrap verification | `gcloud auth list --filter=status:ACTIVE --format=json` and `gcloud auth application-default print-access-token --quiet` only by a human operator if needed, never pasted into docs |
| Verify org and folder roles | Org ID, folder list, caller roles, timestamp, operator | Foundation Terraform planning | `gcloud organizations list --format=json` and `gcloud resource-manager folders list --organization=<ORG_ID> --format=json` |
| Verify billing account user rights | Billing account ID and caller billing role, no payment data copied | Project creation and billing links | `gcloud billing accounts get-iam-policy <BILLING_ACCOUNT_ID> --format=json` |
| Initialize remote Terraform state | State bucket name, versioning enabled, Terraform init output | Foundation plan/apply path in `alphaexplora-cloud` | `terraform -chdir=infra/gcp/foundation init` then `terraform -chdir=infra/gcp/foundation plan` |
| Create WIF and deployer identity through approved automation | WIF pool/provider resource names, deployer service account email, IAM binding condition | Keyless GitHub Actions deploys | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\gcp\verify-shared-runtime.ps1 -ProjectId <PROJECT_ID> -Region asia-southeast1` |
| Run disposable Cloud Run smoke deploy | GitHub Actions run URL, image digest, Cloud Run URL, health result | First live Cloud Run deployment proof | `gcloud run services describe <SMOKE_SERVICE> --region asia-southeast1 --project <PROJECT_ID> --format=json` |
| Destroy disposable smoke resources | Deleted service/image/secret-version names and timestamp | Clean launch-readiness evidence | `gcloud run services list --region asia-southeast1 --project <PROJECT_ID> --filter="metadata.labels.app=bootstrap-smoke" --format=json` |
| Record evidence in board and index | Links to sanitized outputs and commit hashes | Full phase sequence can resume | Update `alphaci-gcp-implementation-board.md` and `alphaci-gcp-migration-index.md` |

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
- All commands and evidence are recorded in `C:\Codes\cicd-ex\alphaexplora-cloud\docs\gcp\bootstrap-shared-runtime.md`, with safe output values copied into AlphaCI config/docs as needed.
