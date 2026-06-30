# Backend Control Plane Plan

Status: Created - needs service/API design
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Build the AlphaCI backend control plane that creates, updates, reconciles, and cleans up GCP runtime resources safely.

## Dependencies

- Depends on: 02 database expand-contract, 01 bootstrap access for live operations
- Blocks: Provisioning, deploy orchestration, reconciliation, admin approvals

## Scope

- Provider capability model for GCP Cloud Run.
- Async provisioning/deploy/cleanup jobs with idempotency keys.
- Locks for workspace/project/app/environment/slot mutations.
- Safe error model and audit events.
- Reconciliation between database state and GCP resources.
- Admin retry, cancel, approval, and cleanup controls.

## Non-Goals

- Replacing the central workflow implementation itself.
- Customer database management.
- Unapproved dedicated customer project production launch.

## Implementation Checklist

- Add GCP provider capability behind feature flags.
- Add job records with state, retries, dead-letter status, correlation IDs, and owner.
- Add idempotency keys for project/app/environment/slot operations.
- Add admin approval records for destructive cleanup and dedicated project creation.
- Add reconciler that compares Cloud Run, Artifact Registry, Secret Manager, domains, and DB state.
- Add safe user-facing error codes with raw provider errors restricted to admin logs.

## Verification

- Duplicate provisioning requests are idempotent.
- Concurrent deploy requests for same slot are serialized.
- Failed GCP operation leaves `failed` or `cleanup_required`, not partial success.
- Reconciler flags drift without unsafe auto-delete.
- Admin approval is required for destructive operations.

## Rollback And Cleanup

- Disable `GCP_DEPLOYMENTS_ENABLED`.
- Keep legacy provider migration flags available for existing records only.
- Pause cleanup jobs before reverting metadata migrations.

## Acceptance Gates

- Backend can represent and mutate a GCP deployment target without Vercel/Render provider connections.
- All resource mutations are audited.
- Failed jobs are retryable or cancelable from admin tooling.
- Cleanup requires ownership proof from labels and DB metadata.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
