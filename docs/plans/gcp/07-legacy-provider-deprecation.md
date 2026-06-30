# Legacy Provider Deprecation Plan

Status: Created - needs code inventory
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Remove bring-your-own Vercel/Render provider hosting from the target product while preserving migration visibility for existing legacy deployments.

## Dependencies

- Depends on: 02 database expand-contract, 03 backend control plane
- Blocks: GCP-only product surface, BYO provider removal, credential cleanup

## Scope

- Feature flags for legacy Vercel/Render providers.
- API rejection of new BYO provider deployment targets.
- Frontend removal of provider connection setup in normal flows.
- Legacy credential retention and cleanup policy.
- Migration-only read paths for existing Vercel/Render projects.

## Non-Goals

- Removing customer custom domains.
- Removing customer-provided env vars or external service URLs.
- Immediate deletion of legacy credential-bearing tables.

## Implementation Checklist

- Inventory Vercel/Render provider routes, services, UI, workflow references, docs, and DB tables.
- Add or preserve `GCP_DEPLOYMENTS_ENABLED`, `LEGACY_VERCEL_PROVIDER_ENABLED`, `LEGACY_RENDER_PROVIDER_ENABLED`, and `LEGACY_PROVIDER_CONNECTIONS_ENABLED`.
- Reject new `ownershipMode=byo` and `providerConnectionId` for managed deployment targets.
- Keep legacy records readable for migration status.
- Plan encrypted credential cleanup after migration and retention expiry.

## Verification

- Backend rejects new BYO provider targets.
- Frontend has no normal provider-connection creation controls.
- Legacy APIs are unavailable unless legacy/admin flag is enabled.
- Domain custom-flow does not require provider credentials.
- Existing legacy records can still show migration status.

## Rollback And Cleanup

- Re-enable legacy flags only for migration/admin paths if GCP rollout is paused.
- Do not restore BYO provider as a new customer-facing product feature without changing the master plan.

## Acceptance Gates

- New projects cannot select Vercel/Render/BYO provider hosting.
- Existing Vercel/Render targets are migration-only.
- Credential cleanup is auditable and delayed until safe.
- Custom domains and env vars remain supported.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
