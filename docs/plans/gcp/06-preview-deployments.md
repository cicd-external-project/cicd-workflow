# Preview Deployments Plan

Status: Created - needs PR lifecycle detail
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Support pull-request preview deployments as separate Cloud Run services with strict TTL, limits, secret isolation, and cleanup.

## Dependencies

- Depends on: 04 central workflow, 03 backend control plane, 05 managed domains for URLs
- Blocks: PR previews and bounded non-production deploys

## Scope

- PR preview deployment targets.
- Preview-specific service names, domains, metadata, and labels.
- Preview limits by tier.
- Preview secret rules.
- PR close/merge cleanup.
- Fork PR default-deny policy.

## Non-Goals

- Production rollout canaries; those use Cloud Run revision tags.
- Database cloning or database management.
- Unbounded branch deployment support.

## Implementation Checklist

- Represent previews separately from prod/staging targets.
- Create deterministic preview service/domain names using PR number and normalized slugs.
- Set min instances to 0 by default and cap max instances.
- Block production secrets unless explicit approval exists.
- Expire previews after PR close/merge or inactivity TTL.
- Add cleanup verification that cannot delete production/staging resources.

## Verification

- PR preview create/update/delete tests.
- Plan limit tests for active previews.
- Fork PR denied-by-default tests.
- Secret isolation tests.
- Cleanup cannot match prod/staging labels.
- Closed PR schedules deletion.

## Rollback And Cleanup

- Mark failed cleanup as `cleanup_required`.
- Delete preview-specific service, secrets, routes, and image tags only after ownership proof.
- Keep prod/staging services untouched.

## Acceptance Gates

- One PR preview can deploy and clean up safely.
- Preview URL, commit SHA, health, expiry, and cleanup status are visible.
- Plan limits prevent unbounded services, images, and secrets.
- Fork previews are disabled by default.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
