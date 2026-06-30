# Shared To Dedicated Migration Plan

Status: Created - blocked until routing topology is proven
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Move paid/production customer workloads from the shared runtime project to dedicated customer GCP projects without changing customer/app identity or losing rollback.

## Dependencies

- Depends on: 01 bootstrap access, 03 backend control plane, 04 central workflow, 05 domains routing, 08 lifecycle, 09 operations
- Blocks: Production/business dedicated customer projects

## Scope

- Dedicated project creation and billing link.
- API enablement, Artifact Registry, service accounts, Secret Manager, labels, and budgets.
- Recreate or migrate env-var secret references.
- Deploy same image or latest approved image to dedicated Cloud Run service.
- Move managed-domain and custom-domain routing after health checks.
- Retire shared resources after retention and approval.

## Non-Goals

- Launching dedicated projects before routing topology proof.
- Deleting shared resources immediately after first successful deploy.
- Moving or managing customer databases.

## Implementation Checklist

- Choose Option B central routing or Option C per-customer routing in a separate approved design.
- Smoke-test managed-domain traffic, custom-domain traffic, rollback, and cleanup across chosen topology.
- Create dedicated project factory with idempotency and cleanup states.
- Deploy and verify dedicated target before moving routing.
- Keep shared target as rollback until retention window passes.
- Require manual approval before deleting dedicated projects or production shared resources.

## Verification

- Dedicated project provisioning is idempotent.
- Failed provisioning leaves `failed` or `cleanup_required`.
- Shared and dedicated services can run side by side.
- Routing move is reversible.
- Env-var secret references migrate without exposing values.
- Cleanup selector cannot delete wrong customer/app resources.

## Rollback And Cleanup

- Move routing back to shared target.
- Keep shared Cloud Run service, images, and secrets until dedicated target is healthy for retention window.
- Mark migration `rollback_required` if route or health verification fails.

## Acceptance Gates

- Customer/app/environment/slot identity is unchanged.
- Dedicated project routing topology has live proof.
- Migration preserves domains, env metadata, deployment history, and rollback.
- Destructive cleanup is manually approved and audited.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
