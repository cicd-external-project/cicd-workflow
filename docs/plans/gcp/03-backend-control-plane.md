# Backend Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the AlphaCI backend control plane that safely provisions, deploys, reconciles, and cleans up GCP runtime resources through async jobs, idempotency, feature flags, and audit events.

**Architecture:** The backend owns orchestration and metadata while stable shared infrastructure is bootstrapped by the GCP bootstrap plan. All GCP-changing actions run through job records with idempotency keys and locks. The control plane writes runtime metadata first, calls workflow or GCP operations second, records safe status last, and never reports success until deploy, synthetic health, and metadata persistence all succeed.

**Tech Stack:** NestJS modules, PostgreSQL repositories, Supabase migrations from plan 02, Jest, GitHub Actions workflow generation, GCP client abstraction, audit module, notifications module.

---

## Existing Surfaces To Check First

- Env provisioning: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\env-provisioning`
- Workflow generation: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\workflows`
- Project scaffolding: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\projects`
- Capabilities: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\capabilities`
- Audit: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\audit`
- Notifications: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\notifications`

## Control Plane Boundaries

Backend control plane owns: deployment target metadata, provisioning job lifecycle, secret-reference metadata, domain metadata, plan/lifecycle gates, reconciliation findings, admin approval records, and safe status/error projection.

Backend control plane does not own: customer databases, customer OAuth provider credentials, raw secret retrieval after storage, unbounded feature-branch deployments, or production dedicated-project launch before routing proof.

## Files To Create Or Modify

- Create `src/modules/gcp-control/gcp-control.module.ts`
- Create `src/modules/gcp-control/gcp-control.types.ts`
- Create `src/modules/gcp-control/gcp-provider-capabilities.service.ts`
- Create `src/modules/gcp-control/gcp-provider-capabilities.service.spec.ts`
- Create `src/modules/gcp-control/provisioning-jobs.repository.ts`
- Create `src/modules/gcp-control/provisioning-jobs.repository.spec.ts`
- Create `src/modules/gcp-control/provisioning-orchestrator.service.ts`
- Create `src/modules/gcp-control/provisioning-orchestrator.service.spec.ts`
- Create `src/modules/gcp-control/gcp-reconciler.service.ts`
- Create `src/modules/gcp-control/gcp-reconciler.service.spec.ts`
- Modify `src/modules/capabilities/capabilities.controller.ts`
- Modify `src/modules/capabilities/capabilities.controller.spec.ts`
- Modify `src/modules/env-provisioning/deployment-strategy.resolver.ts`
- Modify `src/modules/env-provisioning/deployment-strategy.resolver.spec.ts`
- Modify `src/modules/env-provisioning/deployment-targets.service.ts`
- Modify `src/modules/env-provisioning/deployment-targets.service.spec.ts`
- Modify `src/modules/projects/scaffold.builder.ts`
- Modify `src/modules/projects/scaffold.builder.spec.ts`
- Modify `src/app.module.ts`

## Feature Flags

```text
GCP_DEPLOYMENTS_ENABLED=false by default
LEGACY_VERCEL_PROVIDER_ENABLED=false in production target state
LEGACY_RENDER_PROVIDER_ENABLED=false in production target state
BYO_DEPLOYMENT_PROVIDER_ENABLED=false in production target state
GCP_DEDICATED_PROJECTS_ENABLED=false until plan 10 acceptance gates pass
GCP_CUSTOM_DOMAINS_ENABLED=false until plan 05 custom-domain gates pass
GCP_PREVIEW_DEPLOYMENTS_ENABLED=false until plan 06 gates pass
```

## Implementation Progress

Local backend prep completed on `feature/migrate-vercel-render-to-gcp`:

- Added `src/modules/gcp-control` with provider capability reporting and a provisioning job repository backed by `gcp_operations.provisioning_jobs`.
- Exposed GCP and legacy provider capability state through `/capabilities` as `deploymentProviders`.
- Added GCP runtime config fields and disabled-by-default rollout flags for shared project config, dedicated projects, custom domains, and preview deployments.
- Verified with focused Jest suites, typecheck, lint, and existing GCP runtime migration/database guard tests.

Remaining backend work:

- Add full strategy resolver support for GCP targets.
- Complete the provisioning job repository methods beyond the initial create/claim/retryable-failure slice.
- Add orchestrator, reconciler, audit events, plan gates, and worker execution.

## Job State Machine

```text
queued
validating
locked
running
waiting_for_external
succeeded
failed_retryable
failed_terminal
cleanup_required
cancel_requested
canceled
dead_lettered
```

Rules:

- Every job has an `idempotencyKey` and `correlationId`.
- Every job references workspace/project/deployment target where applicable.
- A duplicate idempotency key returns the existing job instead of creating a second job.
- A job cannot mutate resources unless it holds the lock for its workspace/project/app/environment/slot.

Lock key:

```text
workspace:{workspaceId}:project:{projectId}:app:{appSlug}:env:{environment}:slot:{serviceSlot}
```

## Tasks

### Task 1: Add GCP Provider Capability Tests

Status: Completed for the local prep slice.

Test file: `src/modules/gcp-control/gcp-provider-capabilities.service.spec.ts`

Cases:

- GCP provider is hidden when `GCP_DEPLOYMENTS_ENABLED` is false.
- GCP provider is visible when the flag is true and required config exists.
- Legacy Vercel/Render providers are hidden for new managed projects when legacy flags are false.
- Dedicated project capability is false until `GCP_DEDICATED_PROJECTS_ENABLED=true`.
- Custom domain capability is false until `GCP_CUSTOM_DOMAINS_ENABLED=true`.

Run: `npm test -- src/modules/gcp-control/gcp-provider-capabilities.service.spec.ts`

### Task 2: Implement Provider Capability Service

Status: Completed for the local prep slice.

Return shape:

```ts
export interface GcpProviderCapabilities {
  provider: 'gcp';
  enabled: boolean;
  deploymentStrategy: 'gcp_cloud_run';
  runtimeScopes: Array<'shared_project' | 'dedicated_customer_project'>;
  supportsPreviewDeployments: boolean;
  supportsCustomDomains: boolean;
  requiresProviderConnection: false;
  customerDatabaseManagedByAlphaCI: false;
}
```

### Task 3: Add Strategy Resolver Support

Expected behavior:

- GCP target resolves to `gcp_cloud_run`.
- Vercel/Render targets resolve only when legacy flags allow them or the target is an existing legacy target.
- BYO provider targets are rejected for new managed projects.
- Customer custom domains do not imply BYO provider ownership.

Run: `npm test -- src/modules/env-provisioning/deployment-strategy.resolver.spec.ts`

### Task 4: Add Provisioning Job Repository

Status: Partially implemented for the local prep slice. The first pass covers idempotent create, next-job claim with lock/attempt increment, and retryable failure/dead-letter safe error handling. The remaining repository methods still need TDD implementation before orchestrator work.

Repository methods:

```ts
createJob(input)
findById(id)
findByIdempotencyKey(key)
claimNextJob(workerId, jobTypes)
markRunning(id, workerId)
markSucceeded(id, result)
markRetryableFailure(id, safeError)
markTerminalFailure(id, safeError)
requestCancel(id, actor)
releaseLock(id)
```

Tests:

- Duplicate idempotency key returns existing job.
- `claimNextJob` skips locked/running jobs.
- Safe error storage redacts raw provider messages.
- Dead-letter state is reached after max attempts.

### Task 5: Add Provisioning Orchestrator

Behavior:

- Validates feature flags and plan entitlements before creating a job.
- Writes deployment target metadata before external operations.
- Creates secret-reference metadata without exposing values.
- Queues workflow/deploy job with correlation ID.
- Emits audit event before returning operation accepted.
- Returns safe status to user.

### Task 6: Add Reconciler

Checks:

```text
DB target exists but Cloud Run service missing
Cloud Run service exists but DB target missing
Artifact image digest referenced by active deploy still exists
Secret reference points to missing Secret Manager secret/version
Preview past TTL
Domain record active but route/cert not healthy
Cleanup candidate lacks ownership labels
```

Rules:

- Safe drift can be repaired only when ownership is proven by labels and metadata.
- Dangerous drift creates admin review task.
- Reconciler never auto-deletes production resources.

### Task 7: Wire Module Into App

Rules:

- Module can load in local/dev even when GCP feature flags are disabled.
- External GCP calls must be behind method calls, not module constructor side effects.
- Tests must not need live GCP credentials.

## Verification Commands

Run from `C:\Codes\cicd-ex\cicd-workflow-be`:

```powershell
npm test -- src/modules/gcp-control/gcp-provider-capabilities.service.spec.ts
npm test -- src/modules/env-provisioning/deployment-strategy.resolver.spec.ts
npm test -- src/modules/gcp-control/provisioning-jobs.repository.spec.ts
npm test -- src/modules/gcp-control/provisioning-orchestrator.service.spec.ts
npm test -- src/modules/gcp-control/gcp-reconciler.service.spec.ts
npm run typecheck
npm run lint
```

## Rollback

- Set `GCP_DEPLOYMENTS_ENABLED=false`.
- Stop job workers before reverting code.
- Keep metadata tables intact until no running or retryable GCP jobs remain.
- Keep legacy provider read paths available for migration status.

## Acceptance Gates

- Backend can create GCP runtime metadata without Vercel/Render provider connections.
- Every external mutation is represented by a job with idempotency key and correlation ID.
- Concurrent deploys for the same workspace/project/app/environment/slot are serialized.
- Failed jobs are retryable, cancelable, or terminal with safe error messages.
- Reconciliation reports drift safely and never deletes resources without ownership proof.
