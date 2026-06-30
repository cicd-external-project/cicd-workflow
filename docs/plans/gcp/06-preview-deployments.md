# Preview Deployments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Support pull-request preview deployments as separate Cloud Run services with strict TTL, plan limits, secret isolation, and cleanup.

**Architecture:** A preview is a distinct deployment target with `environment=preview`, a PR identity, its own Cloud Run service, labels, URL, lifecycle state, and cleanup state. Preview services use Cloud Run services, not revision tags. Revision tags remain for pre-traffic validation and canary-style rollout on existing long-lived services.

**Tech Stack:** NestJS backend, runtime deployment schemas, GitHub webhook/workflow events, reusable GCP deploy workflow, Cloud Run, Secret Manager metadata, frontend preview status UI, scheduled cleanup jobs.

---

## Existing Surfaces To Check First

- Workflow plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\04-central-workflow-cloud-run.md`
- Domain plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\05-domains-routing.md`
- Backend control plane: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\gcp-control`
- Frontend project environment panel: `C:\Codes\cicd-ex\cicd-workflow-fe\src\components\product\project-env-panel.tsx`

## Preview Naming

Domains:

```text
pr-{prNumber}-{appSlug}-{customerSlug}.{managedDomainBase}
pr-{prNumber}-api-{appSlug}-{customerSlug}.{managedDomainBase}
```

Cloud Run services:

```text
ac-{customerSlug}-{appSlug}-pr-{prNumber}-web
ac-{customerSlug}-{appSlug}-pr-{prNumber}-api
```

Branch preview fallback, if approved later:

```text
br-{branchHash}-{appSlug}-{customerSlug}.{managedDomainBase}
ac-{customerSlug}-{appSlug}-br-{branchHash}-{slot}
```

Raw branch names must never appear directly in service names or domains.

## Preview Limits

```text
trial: previews disabled by default
lower_shared: 1 active preview per app
production_business: 5 active previews per app
internal AlphaExplora products: 10 active previews per product
TTL: delete 72 hours after PR close, or 7 days after inactivity
min instances: 0
max instances: 1 by default unless tier raises it
fork PR previews: disabled by default
```

## Files To Create Or Modify

### Backend

- Create `src/modules/gcp-previews/gcp-previews.module.ts`
- Create `src/modules/gcp-previews/gcp-previews.types.ts`
- Create `src/modules/gcp-previews/preview-targets.service.ts`
- Create `src/modules/gcp-previews/preview-targets.service.spec.ts`
- Create `src/modules/gcp-previews/preview-limits.service.ts`
- Create `src/modules/gcp-previews/preview-cleanup.service.ts`
- Create `src/modules/gcp-previews/preview-cleanup.service.spec.ts`
- Modify `src/modules/gcp-control/provisioning-orchestrator.service.ts`
- Modify `src/modules/gcp-control/gcp-reconciler.service.ts`

### Workflow Repo

- Modify `workflow-templates/be-nodejs.yml`, `be-nestjs.yml`, `fe-react.yml`, and `fe-nextjs.yml` to add bounded PR preview calls once enabled.
- Modify `gcp-cloud-run-deploy.yml` to accept preview-safe metadata if not already covered.

### Frontend

- Create `src/lib/api/previews.ts`
- Create `src/hooks/use-preview-deployments.ts`
- Create `src/components/product/preview-deployments-panel.tsx`
- Create `tests/unit/preview-deployments-api.test.ts`
- Create `tests/unit/preview-deployments-panel.test.tsx`

## Preview Metadata

Required fields:

```text
previewId
previewType: pull_request | branch
sourceProvider: github
repositoryFullName
pullRequestNumber
branchName
branchHash
commitSha
baseEnvironment
previewEnvironment
expiresAt
closedAt
cleanupStatus
planTier
billingStatus
lifecycleStatus
entitlementState
migrationState
previewDomain
previewCloudRunServiceName
```

Lifecycle states:

```text
requested
building
deploying
healthy
unhealthy
expired
cleanup_required
deleting
deleted
failed
```

## Tasks

### Task 1: Add Preview Limit Tests

Test file: `src/modules/gcp-previews/preview-limits.service.spec.ts`

Cases:

- Trial rejects preview creation.
- Lower/shared paid allows only one active preview per app.
- Production/business allows five active previews per app by default.
- Internal product allows ten active previews.
- Fork PR preview is rejected by default.
- Production secrets are rejected unless explicit approval exists.

Run: `npm test -- src/modules/gcp-previews/preview-limits.service.spec.ts`

### Task 2: Add Preview Target Service

Service behavior:

- Creates preview deployment target separate from prod/staging.
- Computes deterministic service/domain names.
- Stores preview metadata and labels.
- Sets min instances to `0` and max instances from plan limits.
- Calls provisioning orchestrator with preview correlation ID.

### Task 3: Add Preview Workflow Generation

Rules:

- Pull request event creates preview only when repo settings and plan allow it.
- Direct feature branches do not create long-lived services.
- New commits to same PR cancel stale preview build/deploy jobs for that PR.
- Production rollback jobs are never canceled by preview cleanup logic.

### Task 4: Add Preview Secret Isolation

Rules:

- Preview deployments can inherit non-sensitive app settings.
- Preview secrets require preview scope when values differ from dev/staging.
- Production secrets are blocked unless explicit approval is stored.
- Deleting a preview removes preview-specific secrets only.

### Task 5: Add Cleanup Job

Cleanup triggers:

```text
PR closed
PR merged
TTL expired
inactive for 7 days
plan downgraded below preview allowance
manual admin cleanup
```

Cleanup must verify labels and metadata before deleting Cloud Run service, preview-specific secrets, preview routes, and image tags.

### Task 6: Add Frontend Preview Panel

UI must show:

- Preview URL.
- Source PR and branch.
- Commit SHA.
- Health status.
- Expiration time.
- Cleanup status.
- Safe failure message.

No UI should expose secret values or raw provider errors.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/gcp-previews/preview-limits.service.spec.ts
npm test -- src/modules/gcp-previews/preview-targets.service.spec.ts
npm test -- src/modules/gcp-previews/preview-cleanup.service.spec.ts
npm run typecheck
npm run lint
```

Frontend:

```powershell
npm test -- tests/unit/preview-deployments-api.test.ts tests/unit/preview-deployments-panel.test.tsx
npm run lint
```

Workflow:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-gcp-workflow.ps1
```

## Rollback

- Set `GCP_PREVIEW_DEPLOYMENTS_ENABLED=false`.
- Keep existing preview services running only until cleanup owner reviews them.
- Cleanup preview-specific services and secrets by labels.
- Do not delete production/staging services, images, secrets, or domains.

## Acceptance Gates

- One PR preview can be created, redeployed, expired, and deleted safely.
- Preview cleanup cannot match production/staging resources.
- Plan limits prevent unbounded preview services, images, routes, and secrets.
- Fork previews are disabled by default.
- Dashboard shows preview URL, source PR, commit, health, expiration, and cleanup status.
