# Shared To Dedicated Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Move paid/production customer workloads from the shared runtime project to dedicated customer GCP projects without changing customer/app identity or losing rollback.

**Architecture:** The `alphaexplora-cloud` repo owns the Terraform-created `20-customer-runtime/dedicated` folder and project-factory skeleton early, but product use of dedicated customer projects remains disabled. Runtime migration is two-phase: first create and verify the dedicated target while shared continues serving traffic, then move routing only after health checks and domain checks pass. Shared runtime stays available as rollback until the retention window passes.

**Tech Stack:** GCP Resource Manager, Cloud Billing, Service Usage, IAM, Artifact Registry, Secret Manager, Cloud Run, domain routing plan, backend control-plane jobs, lifecycle entitlements, admin approvals.

---

## Hard Block Before Implementation

Do not enable production/business dedicated customer projects until `00-org-foundation-automation` has created the private `alphaexplora-cloud` repo, that repo has created the dedicated customer folder/project-factory skeleton, and one routing option has a separate approved design and live proof:

```text
Option B: central routing project with validated cross-project backend pattern
Option C: per-customer routing in dedicated projects
```

The live proof must cover managed-domain traffic, custom-domain traffic, rollback, and cleanup. The existence of `alphaexplora-cloud` and Terraform foundation automation does not by itself allow customer-dedicated project creation in the product.

## Migration Sequence

```text
1. Create dedicated GCP project under `20-customer-runtime/dedicated` using the project factory pattern owned by `alphaexplora-cloud`.
2. Link billing.
3. Enable required APIs.
4. Create Artifact Registry repository.
5. Create deployer/runtime service accounts.
6. Recreate or migrate customer-provided env-var secret references in Secret Manager.
7. Deploy same image digest or latest approved image to dedicated Cloud Run service.
8. Run synthetic health checks.
9. Verify managed-domain and custom-domain routing.
10. Move routing from shared to dedicated target.
11. Keep shared target available for rollback window.
12. Retire shared resources after retention and manual approval.
```

## Files To Create Or Modify

- Create `src/modules/gcp-project-factory/gcp-project-factory.module.ts`
- Create `src/modules/gcp-project-factory/gcp-project-factory.service.ts`
- Create `src/modules/gcp-project-factory/gcp-project-factory.service.spec.ts`
- Create `src/modules/gcp-project-factory/dedicated-project-migration.service.ts`
- Create `src/modules/gcp-project-factory/dedicated-project-migration.service.spec.ts`
- Create `src/modules/gcp-project-factory/project-billing.service.ts`
- Create `src/modules/gcp-project-factory/project-api-enablement.service.ts`
- Modify `src/modules/gcp-control/provisioning-orchestrator.service.ts`
- Modify `src/modules/runtime-domains/domain-records.service.ts`
- Modify `src/modules/billing-lifecycle/lifecycle-transitions.service.ts`
- Modify admin module to approve project creation and destructive cleanup.

## Required Dedicated Project Metadata

```text
workspaceId
customerId
customerSlug
appSlug
dedicatedGcpProjectId
dedicatedGcpProjectNumber
billingAccountName
folderId -- must resolve under 20-customer-runtime/dedicated
region
artifactRegistryRepo
runtimeServiceAccount
deployerServiceAccount
budgetId
migrationState
sharedSourceDeploymentTargetId
dedicatedDeploymentTargetId
rollbackUntil
cleanupEligibleAt
approvalId
```

Migration states:

```text
requested
approved
creating_project
linking_billing
enabling_apis
creating_iam
creating_registry
migrating_secrets
deploying_dedicated
verifying_health
verifying_routing
routing_cutover_ready
routing_cutover_complete
rollback_required
retention_wait
cleanup_required
completed
failed
```

## Tasks

### Task 1: Add Project Factory Guard Tests

Test file: `src/modules/gcp-project-factory/gcp-project-factory.service.spec.ts`

Cases:

- Dedicated project creation is rejected when `GCP_DEDICATED_PROJECTS_ENABLED=false`.
- Dedicated project creation requires production/business entitlement.
- Dedicated project creation requires manual approval.
- Dedicated project ID is deterministic and collision-safe.
- Failed creation leaves `failed` or `cleanup_required` state.

### Task 2: Add Migration Service Tests

Test file: `src/modules/gcp-project-factory/dedicated-project-migration.service.spec.ts`

Cases:

- Migration deploys dedicated target before moving routing.
- Shared target remains active until dedicated target is healthy.
- Routing cutover can roll back to shared target.
- Secret metadata migrates without exposing raw values.
- Dedicated project cleanup requires manual approval.

### Task 3: Implement Project Factory

Rules:

- Create project with approved folder under `20-customer-runtime/dedicated` and approved billing account only, using the foundation-repo-owned project factory contract.
- Link billing before workload resources are created.
- Enable required APIs idempotently.
- Create Artifact Registry repo and service accounts.
- Apply labels: `managed_by=alphaci`, `customer`, `app`, `environment`, `slot`, `runtime_scope=dedicated_customer_project`.
- Create budget alert if billing API scope is available.

### Task 4: Implement Secret Reference Migration

Rules:

- Raw secret values are not readable from AlphaCI if the source of truth is write-only.
- If values cannot be copied, mark migration as waiting for customer/admin secret re-entry.
- Secret metadata should map old reference to new Secret Manager reference.
- Production secrets are never printed in logs or migration errors.

### Task 5: Implement Dedicated Deploy And Verification

Rules:

- Deploy same image digest or latest approved image.
- Use dedicated runtime service account.
- Run synthetic health probe.
- Store dedicated revision and image digest.
- Do not move routing until health and metadata persistence pass.

### Task 6: Implement Routing Cutover

Rules:

- Update domain records to point primary managed/custom domains to dedicated target.
- Keep fallback/shared target route until rollback window expires.
- Cutover writes audit events and notification events.
- Rollback moves route back to shared target and marks migration `rollback_required`.

### Task 7: Implement Retention And Cleanup

Rules:

- Shared resources remain until dedicated target has been healthy for retention window.
- Cleanup requires metadata and label proof.
- Production resource deletion requires manual approval.
- Dedicated project deletion is a separate manual approval action.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/gcp-project-factory/gcp-project-factory.service.spec.ts
npm test -- src/modules/gcp-project-factory/dedicated-project-migration.service.spec.ts
npm test -- src/modules/runtime-domains/domain-records.service.spec.ts
npm test -- src/modules/billing-lifecycle/lifecycle-transitions.service.spec.ts
npm run typecheck
npm run lint
```

Live smoke tests require explicit approval and must use a disposable customer/app target before production rollout.

## Rollback

- Move routing back to shared target.
- Keep shared Cloud Run service, images, secrets, and domain records until dedicated target is healthy for the retention window.
- Mark migration `rollback_required` if route or health verification fails.
- Do not delete dedicated project automatically after rollback; create admin cleanup task.

## Acceptance Gates

- Customer/app/environment/slot identity is unchanged.
- Dedicated project routing topology has live proof.
- Migration preserves domains, env metadata, deployment history, and rollback.
- Shared and dedicated targets can run side by side during verification.
- Destructive cleanup is manually approved and audited.
