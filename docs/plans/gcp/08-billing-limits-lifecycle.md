# Billing Limits And Lifecycle Plan

Status: Created - needs numeric limits
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Model plan changes as runtime entitlement transitions with bounded compute, preview, cleanup, and migration behavior.

## Dependencies

- Depends on: 02 lifecycle schema, 03 backend controls, 01 billing export setup
- Blocks: Trials, paid upgrades, downgrades, failed payments, cancellation, cost controls

## Scope

- Trial, lower/shared paid, production/business paid, suspended, and canceled states.
- Runtime scope by tier.
- Numeric plan limits.
- Upgrade/downgrade/payment/cancellation journeys.
- Billing export and budget alert integration.
- Cleanup eligibility and retention windows.

## Non-Goals

- Stripe product/pricing implementation details unless needed by lifecycle state.
- Real-time enforcement from delayed billing export.
- Deleting customer-owned external services or databases.

## Implementation Checklist

- Define numeric limits for CPU, memory, concurrency, min/max instances, deploy frequency, active previews, TTL, and image retention.
- Persist billing/runtime state separately.
- Implement trial expiration, upgrade, downgrade, failed payment, cancellation, and retention transitions.
- Enable billing export before customer workloads if complete cost history is required.
- Add budget alerts and scheduled cost reports.
- Gate custom domains and dedicated projects to production/business paid tiers.

## Verification

- Trial expiry blocks deploys after grace and schedules cleanup.
- Upgrade to production/business provisions or migrates dedicated runtime only after approval gates.
- Downgrade enters grace before removing custom domains or dedicated resources.
- Failed payment blocks risky mutations but keeps running services during grace.
- Cancellation cleanup never touches customer databases.

## Rollback And Cleanup

- Restore previous entitlement state if billing webhook/job is reversed.
- Pause destructive cleanup jobs on billing incident.
- Keep runtime and billing states separate so payment errors do not imply resource deletion.

## Acceptance Gates

- Every plan transition has an explicit state and customer-visible effect.
- Plan limits enforce before GCP quota or billing export becomes the only control.
- Dedicated project deletion requires manual approval.
- Billing export is reporting/margin input, not sole enforcement mechanism.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
