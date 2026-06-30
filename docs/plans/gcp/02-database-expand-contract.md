# Database Expand-Contract Migration Plan

Status: Created - needs table-level design
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Add GCP runtime data structures beside the current Vercel/Render model without breaking existing production records.

## Dependencies

- Depends on: Master database schema architecture
- Blocks: Backend runtime metadata, lifecycle state, BYO provider removal, deploy history

## Scope

- Create new schema-per-service tables for runtime deployments, domains, secret references, lifecycle, provisioning jobs, audit links, and migration links.
- Keep `env_provisioning` as compatibility during migration.
- Support shared-project and dedicated-project runtime scopes from day one.
- Store only secret metadata, never secret payloads.

## Non-Goals

- Dropping legacy Vercel/Render tables in the first migration.
- Moving customer databases into AlphaCI ownership.
- Rewriting unrelated billing or identity schemas.

## Implementation Checklist

- Define exact table names, columns, indexes, and ownership schema.
- Add forward migrations and practical rollback migrations.
- Add compatibility link from legacy provider records to new runtime deployment targets.
- Add validation queries for row counts, null checks, and ownership constraints.
- Add permission checks so anonymous/client roles cannot read runtime secret metadata.
- Define feature flags for dual-read or compatibility reads.

## Verification

- Migration applies on a copy of current schema.
- Rollback migration works where practical.
- Existing Vercel/Render records remain readable.
- New GCP target metadata can be inserted without legacy provider fields.
- Secret payload fields do not exist in runtime metadata tables.

## Rollback And Cleanup

- Disable GCP runtime feature flags.
- Keep legacy reads from `env_provisioning`.
- Do not drop legacy provider credential tables until cleanup audit is complete.

## Acceptance Gates

- New runtime schemas exist outside `public`.
- GCP metadata can be stored independently from Vercel/Render provider connections.
- Existing production flows do not require immediate data deletion.
- Data validation queries are documented.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
