# Legacy Provider Deprecation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remove bring-your-own Vercel/Render provider hosting from the target product while preserving migration visibility for existing legacy deployments.

**Architecture:** New managed deployments become GCP-only. Vercel/Render remain behind legacy flags for existing migration records only. Customer custom domains and customer-provided env vars remain supported because they are not deployment-provider ownership. Credential-bearing legacy tables are retained until migration and audited cleanup are complete.

**Tech Stack:** NestJS env provisioning module, Supabase migrations, feature flags, Next.js provider settings UI, frontend hooks/API clients, Jest tests.

---

## Inventory First

Search these areas before editing:

```powershell
rg -n "vercel|render|providerConnection|provider_connection|ownershipMode|ownership_mode|byo" C:\Codes\cicd-ex\cicd-workflow-be C:\Codes\cicd-ex\cicd-workflow-fe C:\Codes\cicd-ex\cicd-workflow
```

Known files:

- Backend env provisioning: `src/modules/env-provisioning`
- Frontend provider UI: `src/components/settings/deployment-providers-section.tsx`
- Frontend provider hook: `src/hooks/use-provider-connections.ts`
- Frontend env provisioning API: `src/lib/api/env-provisioning.ts`
- Workflow files: `vercel-deploy.yml`, `render-deploy.yml`
- Workflow docs: `docs/workflows/render-deploy.md`

## Feature Flags

```text
GCP_DEPLOYMENTS_ENABLED=true after GCP smoke tests
LEGACY_VERCEL_PROVIDER_ENABLED=false for production new-project flow
LEGACY_RENDER_PROVIDER_ENABLED=false for production new-project flow
LEGACY_PROVIDER_CONNECTIONS_ENABLED=false for production normal UI/API
```

Legacy flags may remain enabled in dev/test for migration verification.

## Files To Modify Or Create

### Backend

- Modify `src/config/app.config.ts`
- Modify `src/config/app.config.spec.ts`
- Modify `src/modules/env-provisioning/deployment-targets.controller.ts`
- Modify `src/modules/env-provisioning/deployment-targets.controller.spec.ts`
- Modify `src/modules/env-provisioning/deployment-targets.service.ts`
- Modify `src/modules/env-provisioning/deployment-targets.service.spec.ts`
- Modify `src/modules/env-provisioning/deployment-strategy.resolver.ts`
- Create migration `supabase/migrations/20260702_block_new_byo_provider_targets.sql`
- Create rollback `supabase/rollbacks/20260702_block_new_byo_provider_targets_down.sql`

### Frontend

- Modify or remove normal usage of `src/components/settings/deployment-providers-section.tsx`
- Modify `src/hooks/use-provider-connections.ts` so normal flows do not create provider connections when legacy flag is disabled.
- Modify `src/components/product/deployment-provisioning-setup.tsx` to remove provider ownership selectors from new managed setup.
- Modify `tests/unit/deployment-providers-section.test.tsx`
- Modify `tests/unit/deployment-provisioning-setup.test.tsx`

### Workflow Repo

- Keep `vercel-deploy.yml` and `render-deploy.yml` only as legacy migration workflows until removal is approved.
- Add docs note that new managed deployments use `gcp-cloud-run-deploy.yml`.

## Tasks

### Task 1: Add Backend Rejection Tests

Tests:

- New managed target with `ownershipMode=byo` returns a migration-only error.
- New managed target with `providerConnectionId` returns a migration-only error.
- Existing legacy target remains readable.
- Domain payload with `domainKind=customer_custom` is accepted without provider credentials.
- Customer env vars are accepted and stored as env/secret metadata.

Run:

```powershell
npm test -- src/modules/env-provisioning/deployment-targets.controller.spec.ts src/modules/env-provisioning/deployment-targets.service.spec.ts
```

### Task 2: Add Database Guard

Migration behavior:

- Block new `ownership_mode='byo'` rows for new managed deployment targets.
- Stop writing `provider_connection_id` for new GCP targets.
- Preserve existing provider connection rows as legacy migration records.
- Add comment explaining that custom domains and env vars are still supported.

Rollback removes only the new guard.

### Task 3: Update API Contracts

API rules:

- Remove provider connection create/list/revoke from normal product surface or gate behind legacy-admin-only flag.
- Reject request payloads containing `ownershipMode=byo` or `providerConnectionId` for new managed deployments.
- Return clear safe message: `Bring-your-own deployment provider hosting is no longer available for new managed deployments.`
- Do not use this error for custom domains or customer-provided env vars.

### Task 4: Update Frontend New-Project Flow

UI rules:

- Remove provider connection settings from normal workspace settings.
- Remove ownership/provider selectors from project setup and env provisioning screens.
- Keep domain management UI separate and label it as custom domain routing.
- Keep env-var UI for customer-provided external services.

### Task 5: Add Legacy Admin/Migration View Rule

Legacy records can remain visible only for migration status and admin cleanup. They must not offer new token submission from the normal UI.

### Task 6: Cleanup Documentation

Docs must say:

- New managed deployments use GCP Cloud Run.
- Vercel/Render are legacy migration paths only.
- BYO provider hosting is removed.
- Custom domains and external env vars are still supported.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/env-provisioning/deployment-targets.controller.spec.ts src/modules/env-provisioning/deployment-targets.service.spec.ts src/modules/env-provisioning/deployment-strategy.resolver.spec.ts
npm run typecheck
npm run lint
```

Frontend:

```powershell
npm test -- tests/unit/deployment-providers-section.test.tsx tests/unit/deployment-provisioning-setup.test.tsx tests/unit/env-provisioning-api.test.ts
npm run lint
```

Search verification:

```powershell
rg -n "ownershipMode.*byo|providerConnectionId|Render|Vercel|provider connection" C:\Codes\cicd-ex\cicd-workflow-fe\src C:\Codes\cicd-ex\cicd-workflow-be\src
```

Expected: remaining references are legacy/admin/migration only or tests.

## Rollback

- Re-enable legacy flags only for migration/admin paths if GCP rollout is paused.
- Do not restore BYO provider hosting as a new customer-facing feature without changing the master plan.
- Do not delete encrypted legacy credentials until all legacy records are migrated or expired and cleanup is audited.

## Acceptance Gates

- New projects cannot select Vercel/Render/BYO provider hosting.
- Backend rejects `ownershipMode=byo` and `providerConnectionId` for new managed deployments.
- Existing Vercel/Render targets are readable for migration status.
- Customer custom domains and env vars remain supported.
- Credential cleanup is auditable and delayed until safe.
