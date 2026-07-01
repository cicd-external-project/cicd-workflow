# Database Expand-Contract Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add GCP runtime schemas and tables beside the existing Vercel/Render model so AlphaCI can migrate provider behavior without breaking the currently used database.

**Architecture:** Use schema-per-service / bounded-context schemas. Keep `env_provisioning` as the compatibility schema for legacy Vercel/Render data. Add new GCP runtime tables under dedicated schemas for deployments, domains, secret metadata, lifecycle, and provisioning jobs. Use expand-contract: create first, dual-read only where necessary, then remove old paths in a later migration after retention and audit.

**Tech Stack:** PostgreSQL, Supabase SQL migrations, NestJS repositories, Jest repository tests, feature flags, migration validation SQL.

---

## Existing Surfaces To Check First

- Migrations: `C:\Codes\cicd-ex\cicd-workflow-be\supabase\migrations`
- Rollbacks: `C:\Codes\cicd-ex\cicd-workflow-be\supabase\rollbacks`
- Migration verifier: `C:\Codes\cicd-ex\cicd-workflow-be\scripts\verify-gcp-runtime-migration.cjs`
- Env provisioning module: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\env-provisioning`
- Database service: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\database\database.service.ts`
- Audit module: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\audit`

## New Schema Boundaries

Create these schemas if absent:

```sql
runtime_deployments;
runtime_domains;
runtime_secrets;
billing_lifecycle;
gcp_operations;
```

Keep these schemas intact:

```sql
env_provisioning -- legacy/compatibility during Vercel/Render migration
audit            -- audit events and correlation IDs
projects         -- project ownership and workspace links
workflow         -- workflow generation/history data
ci               -- CI token/run reporting data
```

## Required Tables

### `runtime_deployments.deployment_targets`

Purpose: one target per workspace/project/app/environment/slot/runtime scope.

Required columns:

```text
id uuid primary key
workspace_id uuid not null
project_id uuid not null
owner_type text not null check in ('alphaexplora_product','alphaci_customer')
runtime_scope text not null check in ('shared_project','dedicated_customer_project')
product_slug text null
customer_slug text not null
app_slug text not null
environment text not null check in ('dev','stg','uat','prod','preview')
service_slot text not null check in ('web','api','worker','standalone')
provider text not null default 'gcp'
deployment_strategy text not null default 'gcp_cloud_run'
gcp_project_id text not null
gcp_project_number text null
region text not null
artifact_registry_location text not null
artifact_registry_repo text not null
image_name text not null
cloud_run_service_name text not null
runtime_service_account text not null
deployer_service_account text not null
provisioning_status text not null
deployment_status text not null
last_healthy_revision text null
last_deployment_error_code text null
last_deployment_error_safe_message text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Unique key: `(workspace_id, project_id, app_slug, environment, service_slot)`.

### `runtime_deployments.deployment_attempts`

Purpose: immutable deploy history and workflow output metadata.

Required columns: `deployment_target_id`, `correlation_id`, `repository_full_name`, `ref`, `commit_sha`, `workflow_run_id`, `image_digest`, `cloud_run_revision`, `status`, `health_probe_url`, `logs_url`, `safe_error_code`, `safe_error_message`, `started_at`, `finished_at`.

### `runtime_domains.domain_records`

Purpose: default AlphaCI URLs, fallback URLs, custom domains, and future managed-domain cutovers.

Required columns: `deployment_target_id`, `domain`, `domain_base`, `domain_kind`, `routing_mode`, `is_primary`, `is_fallback`, `is_deprecated`, `replacement_domain_id`, `certificate_status`, `dns_instructions`, `last_verified_at`.

### `runtime_secrets.secret_references`

Purpose: Secret Manager metadata only.

Required columns: `deployment_target_id`, `secret_name`, `secret_version_ref`, `scope`, `key_name`, `redaction_state`, `rotation_status`, `created_by`, `updated_at`.

Forbidden columns: `secret_value`, `database_url_plaintext`, `oauth_client_secret_plaintext`, `provider_token_plaintext`.

### `gcp_operations.provisioning_jobs`

Purpose: idempotent async jobs for provisioning, deploy orchestration, cleanup, reconciliation, and migration.

Required columns: `id`, `job_type`, `idempotency_key`, `workspace_id`, `project_id`, `deployment_target_id`, `status`, `attempt_count`, `max_attempts`, `locked_at`, `locked_by`, `next_retry_at`, `dead_letter_reason`, `safe_error_code`, `safe_error_message`, `created_at`, `updated_at`.

## Files To Create Or Modify

### Database

- Create `C:\Codes\cicd-ex\cicd-workflow-be\supabase\migrations\20260701_gcp_runtime_expand_contract.sql`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\supabase\rollbacks\20260701_gcp_runtime_expand_contract_down.sql`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\src\scripts\gcp-runtime-migration-verifier.ts`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\scripts\verify-gcp-runtime-migration.cjs`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\supabase\migrations\20260702_block_new_byo_provider_targets.sql`
- Create `C:\Codes\cicd-ex\cicd-workflow-be\supabase\rollbacks\20260702_block_new_byo_provider_targets_down.sql`

### Backend

- Create `src/modules/gcp-runtime/gcp-runtime.types.ts`
- Create `src/modules/gcp-runtime/deployment-targets-gcp.repository.ts`
- Create `src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts`
- Create `src/modules/gcp-runtime/domain-records.repository.ts`
- Create `src/modules/gcp-runtime/secret-references.repository.ts`
- Create `src/modules/gcp-runtime/gcp-runtime.module.ts`
- Modify `src/app.module.ts` to import the new module.

## Tasks

### Task 1: Write Failing Repository Tests For GCP Target Metadata

Test file: `src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts`

Required tests:

- Inserts a shared-project GCP target without `provider_connection_id`.
- Rejects missing `gcp_project_id`, `region`, or `cloud_run_service_name`.
- Stores `runtime_scope=shared_project` and `provider=gcp`.
- Reads by `workspace_id`, `project_id`, `environment`, and `service_slot`.
- Never returns secret payload fields.

Run:

```powershell
npm test -- src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts
```

Expected before implementation: fail because repository/module does not exist.

### Task 2: Create The Expand Migration

Migration requirements:

- Create schemas if not exists.
- Create all required tables.
- Add check constraints for enum-like text fields.
- Add indexes for workspace/project/environment/slot lookup.
- Add indexes for `correlation_id`, `idempotency_key`, and cleanup status.
- Enable RLS or restrict grants consistent with existing Supabase patterns.
- Grant no anonymous/client write access to runtime or secret-reference tables.

Validation queries:

```sql
select schema_name from information_schema.schemata where schema_name in ('runtime_deployments','runtime_domains','runtime_secrets','billing_lifecycle','gcp_operations');
select table_schema, table_name from information_schema.tables where table_schema in ('runtime_deployments','runtime_domains','runtime_secrets','billing_lifecycle','gcp_operations') order by table_schema, table_name;
select column_name from information_schema.columns where table_schema = 'runtime_secrets' and table_name = 'secret_references' and column_name ilike '%value%';
```

Expected: schemas and tables exist; last query returns zero rows.

Verifier command:

```powershell
$env:GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54322/postgres"
npm run db:verify:gcp-runtime-migration
```

Safety rules:

- Localhost database URLs are allowed by default.
- Remote database URLs require `GCP_RUNTIME_MIGRATION_VERIFY_ALLOW_REMOTE=true`.
- Remote database names must include `shadow`, `verify`, `test`, or `local`.
- The verifier masks database credentials before printing the target URL.
- Passing the script means apply and rollback executed successfully against the selected disposable database.

### Task 3: Create The Rollback Migration

Rollback rules:

- Drop only objects created by `20260701_gcp_runtime_expand_contract.sql`.
- Do not touch `env_provisioning`.
- Do not touch legacy provider connection tables.
- Include warning comments for destructive drops.

### Task 4: Block New BYO Provider Targets Without Deleting Existing Rows

Behavior:

- Add constraints or trigger checks that block new `ownership_mode='byo'` records for new managed deployment targets.
- Keep existing BYO/provider records readable.
- Add a migration note explaining that customer custom domains and env vars are still supported.

Rollback removes only the new block, not existing data.

### Task 5: Implement Repository Layer

Repository rules:

- All inserts require `workspaceId`, `projectId`, `appSlug`, `environment`, and `serviceSlot`.
- GCP identifiers are stored as data, not inferred from names.
- Secret repositories store metadata only.
- Repository methods return safe objects that do not contain raw provider errors or secret values.

Verification:

```powershell
npm test -- src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts
npm run typecheck
```

### Task 6: Backfill Planning Without Running Destructive Changes

Start with read-only queries:

```sql
select provider, count(*) from env_provisioning.deployment_targets group by provider;
select ownership_mode, count(*) from env_provisioning.deployment_targets group by ownership_mode;
select count(*) from env_provisioning.provider_connections;
```

If exact table names differ, update this plan with discovered names before writing backfill SQL.

## Verification Commands

Run from `C:\Codes\cicd-ex\cicd-workflow-be`:

```powershell
npm test -- src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts
npm test -- src/config/app.config.spec.ts
npm run typecheck
npm run lint
```

For SQL, run migrations against a disposable/local database copy first. Never run destructive rollback verification against production.

## Rollback

- Disable GCP deployment feature flags.
- Keep reads from `env_provisioning` active.
- Revert only expand migration objects if no production GCP runtime rows exist.
- If production rows exist, write a data-preserving rollback plan before dropping tables.

## Acceptance Gates

- New schemas and tables exist outside `public`.
- Existing Vercel/Render records remain readable.
- New GCP deployment targets can be created without `provider_connection_id`.
- Runtime secret metadata contains no raw secret values.
- New BYO provider targets are blocked for managed deployments while legacy records remain available for migration.
