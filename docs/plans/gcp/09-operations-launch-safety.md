# Operations And Launch Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Define and implement the operational controls that make the GCP provider safe to run: audit, observability, alerts, disaster recovery, quotas, reconciliation, supply-chain safeguards, and admin tooling.

**Architecture:** Production rollout is blocked until every GCP mutation has audit coverage, every deploy has synthetic health evidence, every cleanup has ownership proof, and every high-risk operation has admin recovery paths. Operations are part of launch readiness, not day-two polish.

**Tech Stack:** NestJS audit/admin modules, Cloud Logging, Cloud Monitoring, BigQuery billing export, Artifact Registry cleanup policies, GCP control-plane reconciler, frontend/admin dashboards, runbooks.

---

## Existing Surfaces To Check First

- Audit module: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\audit`
- Admin module: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\admin`
- Notifications: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\notifications`
- Health module: `C:\Codes\cicd-ex\cicd-workflow-be\src\health`
- Frontend admin pages: `C:\Codes\cicd-ex\cicd-workflow-fe\src\app\admin`

## Files To Create Or Modify

- Create `src/modules/gcp-ops/gcp-ops.module.ts`
- Create `src/modules/gcp-ops/launch-readiness.service.ts`
- Create `src/modules/gcp-ops/launch-readiness.service.spec.ts`
- Create `src/modules/gcp-ops/quota-registry.service.ts`
- Create `src/modules/gcp-ops/quota-registry.service.spec.ts`
- Create `src/modules/gcp-ops/cleanup-safety.service.ts`
- Create `src/modules/gcp-ops/cleanup-safety.service.spec.ts`
- Modify `src/modules/admin/admin.controller.ts`
- Modify `src/modules/admin/admin.service.ts`
- Modify `src/modules/audit/audit-events.service.ts`
- Create `C:\Codes\cicd-ex\cicd-workflow\docs\gcp\operations-runbooks.md`
- Create frontend admin page or panel for GCP operations under `src/app/admin` or existing admin components.

## Required Audit Events

```text
project_created
plan_changed
trial_started
trial_expired
payment_past_due
account_suspended
account_canceled
deployment_requested
deployment_succeeded
deployment_failed
rollback_requested
rollback_succeeded
rollback_failed
preview_created
preview_expired
preview_deleted
secret_metadata_changed
custom_domain_requested
custom_domain_verified
custom_domain_removed
dedicated_project_requested
dedicated_project_created
shared_to_dedicated_migration_started
shared_to_dedicated_migration_verified
cleanup_requested
cleanup_completed
cleanup_failed
legacy_provider_connection_blocked
```

Audit payloads must never include secret values, tokens, database URLs, OAuth client secrets, or raw provider credential values.

## Alert Thresholds

Initial thresholds:

```text
stuck provisioning: job validating/running/waiting_for_external for more than 30 minutes
failed deploy burst: 3 failed deploys for same app/environment/slot within 30 minutes
cleanup backlog: cleanup_required older than 24 hours
preview cleanup backlog: expired preview older than 6 hours
billing export stale: no successful import/report for 36 hours
domain verification stale: pending_dns/verifying older than 48 hours
certificate failure: certificate failed or not active after 24 hours
reconciler failure: scheduled reconciler missed 2 consecutive runs
```

## Quota Registry

Track limits and usage for:

```text
Cloud Run services per project
Cloud Run revisions per service behavior
Cloud Run max instances per service
Artifact Registry storage and cleanup policies
Secret Manager secrets and versions
Certificate Manager certificates/maps
Load balancer URL map/backend/serverless NEG limits
Project creation and billing link quotas
BigQuery billing export freshness
```

## Tasks

### Task 1: Add Launch Readiness Tests

Test file: `src/modules/gcp-ops/launch-readiness.service.spec.ts`

Cases:

- Shared launch is blocked if WIF is not verified.
- Shared launch is blocked if Artifact Registry or Cloud Run smoke deploy is missing.
- Domain launch is blocked if DNS/load-balancer/certificate checks are missing.
- Dedicated project launch is blocked if routing topology proof is missing.
- Broad production rollout is blocked if alert/runbook owners are missing.

### Task 2: Add Cleanup Safety Tests

Test file: `src/modules/gcp-ops/cleanup-safety.service.spec.ts`

Cases:

- Cleanup requires both DB metadata and GCP labels.
- Cleanup rejects resources missing `managed_by=alphaci`.
- Cleanup rejects resources for mismatched customer/app/environment/slot.
- Production cleanup requires manual approval.
- Dry-run output lists exact resources before active deletion.

### Task 3: Extend Audit Events

Rules:

- Every lifecycle or infrastructure mutation writes audit before user sees operation complete.
- Every workflow run returns correlation ID linking GitHub Actions, backend history, Cloud Run revision, and dashboard status.
- Cleanup/deletion audit events include selector used to prove ownership.

### Task 4: Add Admin Operations Surface

Minimum admin capabilities:

```text
view workspace/project/deployment target runtime state
view GCP project, region, service, revision, image digest, and domain mapping
retry/cancel failed jobs
approve dedicated project creation
approve destructive cleanup
force rollback to last healthy revision
view reconciliation drift and orphan candidates
view preview cleanup queue
view custom-domain verification status
view customer cost and limit status
view audit events by correlation ID
```

### Task 5: Write Runbooks

File: `C:\Codes\cicd-ex\cicd-workflow\docs\gcp\operations-runbooks.md`

Runbooks required:

- Bad Cloud Run deployment.
- Broken WIF auth.
- Bad Secret Manager reference.
- Broken managed-domain route or wildcard certificate.
- Billing export not updating.
- Artifact Registry cleanup mistake.
- Stuck provisioning job.
- Bad shared-to-dedicated migration.
- AlphaCI database restore.
- Legacy provider rollback during migration.

Each runbook must name owner, required access, expected recovery time, and verification command.

### Task 6: Artifact Cleanup Safety

Rules:

- Cleanup policies start in dry-run mode.
- Always keep currently deployed image digests.
- Keep last 10 successful deploys per service unless tier plan says higher.
- Lower/shared deletes older images after 30 days.
- Production/business deletes older images after 90 days unless incident hold exists.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/gcp-ops/launch-readiness.service.spec.ts
npm test -- src/modules/gcp-ops/quota-registry.service.spec.ts
npm test -- src/modules/gcp-ops/cleanup-safety.service.spec.ts
npm test -- src/modules/audit/audit-events.service.spec.ts
npm run typecheck
npm run lint
```

Frontend/admin:

```powershell
npm test -- tests/unit/admin-gcp-ops.test.tsx
npm run lint
```

Docs:

```powershell
git -C C:\Codes\cicd-ex\cicd-workflow diff --check -- docs/gcp/operations-runbooks.md
```

## Rollback

- Freeze cleanup jobs during incidents.
- Disable GCP deployments with `GCP_DEPLOYMENTS_ENABLED=false`.
- Roll back Cloud Run traffic to last healthy revision where possible.
- Keep legacy migration paths available only as defined in provider deprecation plan.

## Acceptance Gates

- Production rollout has alerts, runbooks, owners, and verification commands.
- Admin tooling can recover failed jobs without database surgery.
- Cost, quota, domain, deploy, and cleanup risks have named controls.
- Cleanup cannot run without metadata and label proof.
- No broad rollout happens without audit and observability coverage.
