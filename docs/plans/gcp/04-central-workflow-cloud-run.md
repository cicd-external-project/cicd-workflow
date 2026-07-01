# Central Workflow Cloud Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace Vercel/Render deployment jobs with a reusable GCP Cloud Run deployment workflow that authenticates through Workload Identity Federation, builds a Docker image, pushes it to Artifact Registry, deploys to Cloud Run, probes health, and returns safe outputs.

**Architecture:** The central workflow remains reusable. Caller repositories own branch ordering and `needs`; the reusable GCP workflow owns auth, preflight, build, push, deploy, health probe, output formatting, and safe failure messages. Generated workflow templates call this reusable workflow only for long-lived branches and bounded previews.

**Tech Stack:** GitHub Actions reusable workflows, Google GitHub Actions auth/setup-gcloud actions, Docker, Artifact Registry, Cloud Run, Node/static YAML contract tests, workflow docs.

---

## Existing Surfaces To Check First

- Reusable workflows: `C:\Codes\cicd-ex\cicd-workflow\*.yml`
- Workflow docs: `C:\Codes\cicd-ex\cicd-workflow\docs\workflows`
- Workflow templates: `C:\Codes\cicd-ex\cicd-workflow\workflow-templates`
- Backend generator: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\projects\scaffold.builder.ts`
- Staged workflow builder: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\workflows\staged-workflow.builder.ts`

## Files To Create Or Modify

### `cicd-workflow`

- Create `.github/workflows/gcp-cloud-run-deploy.yml`
- Create `docs/workflows/gcp-cloud-run-deploy.md`
- Create `scripts/validate-gcp-cloud-run-workflow.cjs`
- Modify `.github/workflows/workflow-validation.yml`
- Modify `docs/workflows/README.md`
- Modify `workflow-templates/be-nodejs.yml`
- Modify `workflow-templates/be-nestjs.yml`
- Modify `workflow-templates/fe-react.yml`
- Modify `workflow-templates/fe-nextjs.yml`
- Modify matching `*.properties.json` files to include GCP deployment options.

### `cicd-workflow-be`

- Modify `src/modules/projects/scaffold.builder.ts`
- Modify `src/modules/projects/scaffold.builder.spec.ts`
- Modify `src/modules/workflows/staged-workflow.builder.ts`
- Modify `src/modules/workflows/staged-workflow.builder.spec.ts`

## Reusable Workflow Contract

Initial reusable workflow skeleton inputs:

```text
gcp-project-id
gcp-region
workload-identity-provider
deployer-service-account
runtime-service-account
artifact-registry-repository
image-name
cloud-run-service-name
environment
working-directory
checkout-ref
source-branch
docker-context
dockerfile-path
allow-preview
```

Required GitHub permissions:

```yaml
permissions:
  contents: read
  id-token: write
```

Initial skeleton outputs:

```text
service-url
image-uri
```

No GCP authentication secret is allowed. WIF is mandatory. Later hardening should add revision name, image digest, safe deployment status, health status, logs URL, safe error code/message, and correlation ID outputs before broad rollout.

## Job Order

```text
validate-inputs
validate-permissions
authenticate-gcp
verify-target-project
verify-required-apis
verify-artifact-registry
verify-runtime-service-account
verify-secret-references
configure-docker-auth
build-image
push-image
resolve-image-digest
deploy-cloud-run
probe-health
emit-safe-outputs
```

## Branch Mapping

```text
main -> prod
uat -> uat
test -> dev
pull_request -> preview only when plan 06 allows it
feature/* -> no long-lived deploy by default
```

Workflow tests must fail if an unmapped branch can deploy to a long-lived environment.

## Tasks

## Implementation Progress

Local backend generator prep completed on `feature/migrate-vercel-render-to-gcp`:

- `cicd-workflow-be` staged workflow generation accepts `provider=gcp` deployment targets with `deploymentStrategy=gcp_cloud_run`.
- Generated package workflows add `permissions.id-token: write` only when a GCP Cloud Run target is present.
- Generated deploy jobs call `cicd-external-project/cicd-workflow/.github/workflows/gcp-cloud-run-deploy.yml@<centralWorkflowRef>`.
- Generated GCP jobs pass project, region, WIF provider, deployer service account, runtime service account, Artifact Registry repo, image, Cloud Run service, Docker context, Dockerfile path, branch source, environment, and preview allowance.
- Focused tests prove generated GCP workflows do not reference `VERCEL_TOKEN`, `RENDER_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, or service-account JSON keys.
- `cicd-workflow` now has the reusable `.github/workflows/gcp-cloud-run-deploy.yml`, contract docs, and `scripts/validate-gcp-cloud-run-workflow.cjs`.
- The reusable workflow validates branch/environment mapping, OIDC permission availability, target project, required APIs, Artifact Registry repo, runtime service account, pushed image digest, Cloud Run ready revision, and private health probe before reporting `deployment-status=healthy`.
- `workflow-validation.yml` runs the GCP Cloud Run contract validator, and the local repo-wide actionlint check passes after escaping a literal GitHub expression in validation shell code.

Remaining workflow work:

- Update older template files and project scaffold generation where still applicable.
- Run the disposable live smoke test after WIF and GCP access are available.

### Task 1: Add Static Workflow Contract Tests

Status: Completed for the local reusable-workflow prep slice.

Create `scripts/validate-gcp-cloud-run-workflow.cjs` to check:

- `.github/workflows/gcp-cloud-run-deploy.yml` uses `workflow_call`.
- Required inputs exist.
- Required permissions include `id-token: write` and `contents: read`.
- No input, env var, or secret name requires a service account JSON key.
- Auth, setup-gcloud, Docker build, Artifact Registry push, Cloud Run deploy, branch/preview gates, and health probe are present.
- Static key and environment-dump patterns are absent.

Run:

```powershell
node scripts/validate-gcp-cloud-run-workflow.cjs
```

Expected before workflow implementation: fail with missing workflow file.

### Task 2: Implement The Reusable Workflow

Status: Completed for the local reusable-workflow prep slice. Live behavior still requires the disposable GCP smoke test.

File: `C:\Codes\cicd-ex\cicd-workflow\.github\workflows\gcp-cloud-run-deploy.yml`

Failure rules:

- Missing WIF provider fails before build.
- Missing `id-token: write` fails before build.
- Wrong project fails before deploy.
- Missing Artifact Registry repo fails before push.
- Missing runtime service account fails before deploy.
- Missing required secret reference fails before deploy unless backend marked it optional.
- Health failure does not mark deployment healthy.
- Secret values, tokens, and raw provider errors are never printed.

### Task 3: Add Workflow Documentation

Status: Completed for the local reusable-workflow prep slice.

File: `docs/workflows/gcp-cloud-run-deploy.md`

Must document:

- Inputs and outputs.
- Required permissions.
- WIF setup assumptions.
- Caller workflow example for backend.
- Caller workflow example for frontend.
- Branch mapping.
- Preview behavior delegation to plan 06.
- Runtime secrets through Secret Manager references.
- Known failure messages and remediation.

### Task 4: Update Caller Templates

Rules:

- Keep tests/lint/security jobs before deploy.
- Deploy jobs use `needs` to wait for checks.
- Only `main`, `uat`, and `test` create long-lived deploys by default.
- Caller supplies GCP metadata from generated project settings.
- Caller does not store GCP service account JSON.
- Direct feature branches do not create long-lived services.

### Task 5: Update Backend Workflow Generation

Status: Completed for the staged workflow builder local prep slice. Project scaffold/template updates still remain if that path is used for generated GCP deployments.

Tests must prove:

- Generated backend workflow calls `gcp-cloud-run-deploy.yml` for GCP targets.
- Generated frontend workflow calls `gcp-cloud-run-deploy.yml` for containerized Next/React targets.
- Generated workflow includes `id-token: write`.
- Generated workflow does not reference `VERCEL_TOKEN`, `RENDER_API_KEY`, or GCP JSON credentials for new GCP targets.
- Branch mapping uses backend project settings, not only hardcoded YAML.

Run:

```powershell
npm test -- src/modules/projects/scaffold.builder.spec.ts src/modules/workflows/staged-workflow.builder.spec.ts
```

### Task 6: Disposable Live Smoke Test

Requires explicit approval because it deploys to GCP.

Smoke target:

```text
Cloud Run service: ac-smoke-central-workflow-web
Image: asia-southeast1-docker.pkg.dev/alphaci-20260629/alphaci-shared/ac-smoke-central-workflow-web:<sha>
Region: asia-southeast1
```

Expected:

- Workflow authenticates with WIF.
- Image pushes to Artifact Registry.
- Cloud Run deploys a disposable service.
- Health probe runs.
- Outputs include service URL, revision, digest, status, and correlation ID.
- Cleanup removes service and smoke image tags by label.

## Verification Commands

From `C:\Codes\cicd-ex\cicd-workflow`:

```powershell
node scripts/validate-gcp-cloud-run-workflow.cjs
git diff --check -- .github/workflows/gcp-cloud-run-deploy.yml docs/workflows/gcp-cloud-run-deploy.md scripts/validate-gcp-cloud-run-workflow.cjs workflow-templates
```

From `C:\Codes\cicd-ex\cicd-workflow-be`:

```powershell
npm test -- src/modules/projects/scaffold.builder.spec.ts src/modules/workflows/staged-workflow.builder.spec.ts
npm run typecheck
npm run lint
```

## Rollback

- Disable generated GCP deploy jobs with `GCP_DEPLOYMENTS_ENABLED=false`.
- Keep existing Vercel/Render legacy workflows only for migration records.
- Remove disposable Cloud Run smoke service and smoke image tags.
- Do not delete Artifact Registry repo or WIF bootstrap resources as part of workflow rollback.

## Acceptance Gates

- Reusable workflow validates inputs and permissions before build.
- WIF auth happens before Docker registry login or deploy.
- No static GCP key is referenced.
- Image is pushed by digest to Artifact Registry.
- Cloud Run deploy uses metadata-provided service account, labels, region, and project.
- Synthetic health failure blocks healthy status.
- Backend-generated workflows call the GCP reusable workflow for new managed deployments.
