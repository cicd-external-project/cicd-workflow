# Access-Independent GCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every AlphaCI GCP migration slice that can be built, tested, reviewed, and documented before AlphaExplora receives the remaining GCP organization, folder, billing, DNS, and live deployment access.

**Architecture:** Build the product and workflow control plane behind feature flags and mocked/fake GCP adapters, while keeping all live cloud mutation isolated in `alphaexplora-cloud` and blocked by explicit access gates. Database changes remain expand-only and schema-bounded so the existing Vercel/Render path can keep running until the final cutover.

**Tech Stack:** NestJS, Supabase/Postgres SQL migrations, Jest, Next.js, GitHub Actions, Cloud Run workflow YAML, Terraform static checks, PowerShell verification scripts, Markdown/HTML planning board.

---

## Scope

This plan is the work queue for the period where we do not yet have enough GCP access to create folders, projects, WIF providers, service accounts, billing links, Cloud Run services, DNS records, certificates, or load balancer resources.

It does not replace the full phase plans. It maps the existing full index into safe local implementation units.

Authoritative phase map:

| Existing phase | Full plan | Safe local scope in this plan |
| --- | --- | --- |
| 00 | `docs/plans/gcp/00-org-foundation-automation.md` | Static Terraform modules, validation scripts, runbooks, repo governance, no apply |
| 01 | `docs/plans/gcp/01-bootstrap-access.md` | Bootstrap command design, env contract docs, fake outputs, no API enablement |
| 02 | `docs/plans/gcp/02-database-expand-contract.md` | Expand-only SQL, verifier scripts, repository tests, no shared/prod DB promotion |
| 03 | `docs/plans/gcp/03-backend-control-plane.md` | Mocked GCP adapter, job orchestration, reconciliation, audit events, no live GCP calls |
| 04 | `docs/plans/gcp/04-central-workflow-cloud-run.md` | Reusable workflow contract, caller generation, static validators, no live deploy |
| 05 | `docs/plans/gcp/05-domains-routing.md` | Domain model, API contracts, fake verification, UI, no DNS/cert/load balancer mutation |
| 06 | `docs/plans/gcp/06-preview-deployments.md` | Preview lifecycle model, limits, cleanup scheduling, fake Cloud Run adapter |
| 07 | `docs/plans/gcp/07-legacy-provider-deprecation.md` | Backend BYO rejection, DB guard, UI removal, docs cleanup, no destructive credential purge |
| 08 | `docs/plans/gcp/08-billing-limits-lifecycle.md` | Entitlement transitions, trial/upgrade/downgrade tests, no billing export query dependency |
| 09 | `docs/plans/gcp/09-operations-launch-safety.md` | Admin views, runbooks, audit events, readiness checklists, no production incident hooks |
| 10 | `docs/plans/gcp/10-shared-to-dedicated-migration.md` | Contracts and tests for future migration, no dedicated project creation |

## Current Local Prep Already Landed

- `cicd-workflow/.github/workflows/gcp-cloud-run-deploy.yml` exists with WIF-only deploy contract, Cloud Run preflights, digest deployment, and authenticated health probe.
- `cicd-workflow/scripts/validate-gcp-cloud-run-workflow.cjs` statically validates the GCP Cloud Run reusable workflow.
- `cicd-workflow/docs/workflows/gcp-cloud-run-deploy.md` documents the workflow contract.
- `cicd-workflow-be/src/modules/gcp-control/gcp-provider-capabilities.service.ts` and specs exist for GCP provider capability reporting.
- `cicd-workflow-be/src/modules/env-provisioning/deployment-strategy.resolver.ts` and specs include GCP strategy resolution.
- `cicd-workflow-be/src/modules/gcp-control/provisioning-jobs.repository.ts` and specs exist for local provisioning job persistence.
- `cicd-workflow-be/src/modules/workflows/staged-workflow.builder.ts` includes staged GCP Cloud Run caller generation.
- `cicd-workflow-be/supabase/migrations/20260701_gcp_runtime_expand_contract.sql` and rollback exist.
- `cicd-workflow-be/scripts/verify-gcp-runtime-migration.cjs` exists but needs a disposable database URL before apply verification can be trusted.
- `cicd-workflow-fe` hides or removes normal BYO/provider-connection creation controls when legacy provider connections are disabled.
- `alphaexplora-cloud` exists locally with Terraform foundation skeletons, modules, repo checks, and cloud runbooks.

## Hard Gates

Do not do these from this plan:

- Run `terraform apply`.
- Run `gcloud projects create`.
- Enable GCP APIs in a real project.
- Create WIF providers, service accounts, IAM bindings, Artifact Registry repositories, Secret Manager secrets, Cloud Run services, DNS records, certificates, load balancer resources, billing exports, or folders.
- Run a real Cloud Run smoke deploy.
- Run production/shared database migrations.
- Delete legacy Vercel/Render credentials or provider data.
- Remove existing Vercel/Render runtime support from production paths before the feature flag cutover.

Every local task must satisfy these guardrails:

- Live GCP calls are behind an interface that can be replaced by a fake adapter in tests.
- New DB writes are expand-only and do not require deleting old provider rows.
- New API behavior is feature-flagged where it changes current production behavior.
- Tests prove legacy provider creation can be blocked without breaking env-var storage.
- Docs name the blocked live command and the access condition that unblocks it.

## Repo Boundaries

| Repo | Safe local work | Forbidden until access |
| --- | --- | --- |
| `alphaexplora-cloud` | Terraform fmt/validate, module skeletons, sample tfvars, no-secret checks, no-apply checks, runbooks, access matrix | Applying Terraform, creating projects/folders, changing org IAM, changing DNS/certs/load balancer |
| `cicd-workflow` | Reusable workflow YAML, static validators, caller template docs, workflow catalog metadata | Live GitHub Actions deploy to GCP, real Artifact Registry push, real Cloud Run smoke deploy |
| `cicd-workflow-be` | DB migrations, fake GCP adapter, orchestration, reconciliation, domain/preview/billing/lifecycle models, backend BYO rejection | Real GCP SDK mutation, production DB migration, destructive provider credential cleanup |
| `cicd-workflow-fe` | Dashboard and settings UI for managed GCP path, domain/preview/lifecycle surfaces backed by local API contracts | UI that claims live deployment/domain verification is complete before backend evidence exists |

## Recommended Execution Order

1. Backend BYO rejection and database guard.
2. Backend fake GCP adapter plus orchestrator and reconciler.
3. Central workflow caller-template integration and static tests.
4. Domain model, API, UI, and fake route verifier.
5. Preview deployment lifecycle and cleanup with fake Cloud Run adapter.
6. Billing, trial, upgrade, downgrade, cancellation, and runtime-limit tests.
7. Admin, audit, readiness, and runbook surfaces.
8. `alphaexplora-cloud` static Terraform/module/runbook hardening.

This order keeps every step testable without GCP access and reduces the risk that later live GCP access reveals missing product contracts.

## Acceptance Gates For This Plan

- `cicd-workflow-be`: `npm test -- --runInBand`, `npm run typecheck`, and `npm run lint` pass or failures are documented as pre-existing and unrelated.
- `cicd-workflow-fe`: `npm test -- --runInBand`, `npm run lint`, and `npm run build` pass or failures are documented as pre-existing and unrelated.
- `cicd-workflow`: `node scripts\validate-gcp-cloud-run-workflow.cjs` passes and actionlint passes for changed workflows.
- `alphaexplora-cloud`: no-secret and no-direct-apply checks pass; Terraform files pass `terraform fmt -check`; `terraform validate` passes after `terraform init` is available locally.
- `git diff --check` passes for every repo touched.
- The implementation board links this plan and shows access-independent work as a tracked task group.

---

## Task 1: Backend BYO Provider Rejection And DB Guard

**Files:**

- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.controller.ts`
- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.service.ts`
- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.repository.ts`
- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.controller.spec.ts`
- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.service.spec.ts`
- Modify: `cicd-workflow-be/src/modules/env-provisioning/provider-connections.repository.spec.ts`
- Create: `cicd-workflow-be/supabase/migrations/20260702_block_new_byo_provider_connections.sql`
- Create: `cicd-workflow-be/supabase/rollbacks/20260702_block_new_byo_provider_connections_down.sql`

- [x] **Step 1: Write controller/service tests that reject new provider connections**

Add assertions that `POST /provider-connections` returns a 410 or 403-style product error when legacy provider connections are disabled, while read/list endpoints continue to work for existing rows.

Expected test behavior:

```text
create provider connection with provider=vercel -> rejected
create provider connection with provider=render -> rejected
list existing provider connections -> allowed
delete existing provider connection -> allowed only for cleanup
env var storage APIs -> unchanged
```

- [x] **Step 2: Add the service-level guard**

Use the existing feature flag/capability pattern rather than removing the module. The service should keep existing provider records readable so current users are not broken during migration.

Implementation rule:

```ts
if (!this.capabilities.legacyProviderConnectionsEnabled) {
  throw new GoneException({
    code: 'LEGACY_PROVIDER_CONNECTIONS_DISABLED',
    message: 'New Vercel and Render provider connections are disabled for the managed GCP migration.',
  });
}
```

- [x] **Step 3: Add an expand-safe database guard**

The migration must block new BYO provider connection inserts only when they are created through the legacy connection table. It must not delete existing rows and must not block customer env vars.

Migration shape:

```sql
create or replace function env_provisioning.reject_new_legacy_provider_connections()
returns trigger
language plpgsql
as $$
begin
  raise exception 'New Vercel and Render provider connections are disabled for the managed GCP migration'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists reject_new_legacy_provider_connections on env_provisioning.provider_connections;

create trigger reject_new_legacy_provider_connections
before insert on env_provisioning.provider_connections
for each row
execute function env_provisioning.reject_new_legacy_provider_connections();
```

If the actual table/schema name differs, inspect `20260608_env_provisioning.sql` and use the existing schema and table names exactly.

- [x] **Step 4: Add rollback**

Rollback shape:

```sql
drop trigger if exists reject_new_legacy_provider_connections on env_provisioning.provider_connections;
drop function if exists env_provisioning.reject_new_legacy_provider_connections();
```

- [x] **Step 5: Run local verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- provider-connections --runInBand
npm run typecheck
```

Expected:

```text
provider connection creation rejection tests pass
existing list/delete behavior tests pass
TypeScript completes without new errors
```

- [x] **Step 6: Commit**

Commit message:

```text
Block new legacy provider connections locally
```

---

## Task 2: Backend Fake GCP Adapter And Control-Plane Orchestrator

**Files:**

- Create: `cicd-workflow-be/src/modules/gcp-control/gcp-runtime.adapter.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/fake-gcp-runtime.adapter.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/gcp-provisioning-orchestrator.service.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/gcp-provisioning-orchestrator.service.spec.ts`
- Modify: `cicd-workflow-be/src/modules/gcp-control/gcp-control.module.ts`
- Modify: `cicd-workflow-be/src/modules/gcp-control/gcp-control.types.ts`

- [ ] **Step 1: Define the adapter contract**

The adapter contract must express what the backend needs without binding tests to Google SDK classes.

Contract shape:

```ts
export interface GcpRuntimeAdapter {
  ensureProject(input: EnsureProjectInput): Promise<EnsureProjectResult>;
  ensureArtifactRegistry(input: EnsureArtifactRegistryInput): Promise<EnsureArtifactRegistryResult>;
  ensureRuntimeServiceAccount(input: EnsureRuntimeServiceAccountInput): Promise<EnsureRuntimeServiceAccountResult>;
  ensureCloudRunService(input: EnsureCloudRunServiceInput): Promise<EnsureCloudRunServiceResult>;
  getCloudRunService(input: GetCloudRunServiceInput): Promise<GetCloudRunServiceResult>;
}
```

The result types must include only stable product fields:

```text
gcpProjectId
region
resourceName
serviceUrl
labels
etag or revision when available
```

- [ ] **Step 2: Implement fake adapter**

The fake adapter returns deterministic resource names and stores calls in memory for assertions.

Expected fake output example:

```text
project: alphaci-shared-dev
registry: asia-southeast1-docker.pkg.dev/alphaci-shared-dev/alphaci
serviceUrl: https://alpha-demo-dev-uc.a.run.app
```

- [ ] **Step 3: Write orchestrator tests first**

Test these cases:

```text
new shared-tier project target -> creates provisioning job and marks planned resources ready through fake adapter
idempotency key repeated -> returns the existing job instead of creating duplicates
paid dedicated-tier target -> records dedicated-project intent but does not call live creation without approval
adapter failure -> job becomes failed with retryable error and correlation id
```

- [ ] **Step 4: Implement orchestrator**

The orchestrator should:

- create or reuse a provisioning job
- resolve shared vs dedicated runtime placement
- call only the injected `GcpRuntimeAdapter`
- persist each step result through `provisioning-jobs.repository.ts`
- emit audit event metadata if the existing audit service is available in the module
- return a product-level status object to controllers or workers

- [ ] **Step 5: Wire module provider**

Use fake adapter by default until live GCP access exists.

Provider rule:

```ts
{
  provide: GCP_RUNTIME_ADAPTER,
  useClass: FakeGcpRuntimeAdapter,
}
```

Do not instantiate Google SDK clients in this task.

- [ ] **Step 6: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- gcp-control --runInBand
npm run typecheck
```

Expected:

```text
gcp-control tests pass
no live GCP credentials are required
```

- [ ] **Step 7: Commit**

Commit message:

```text
Add local GCP provisioning orchestrator
```

---

## Task 3: Backend Reconciler And Runtime Status Model

**Files:**

- Create: `cicd-workflow-be/src/modules/gcp-control/gcp-runtime-reconciler.service.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/gcp-runtime-reconciler.service.spec.ts`
- Modify: `cicd-workflow-be/src/modules/gcp-runtime/deployment-targets-gcp.repository.ts`
- Modify: `cicd-workflow-be/src/modules/gcp-runtime/deployment-targets-gcp.repository.spec.ts`
- Modify: `cicd-workflow-be/src/modules/projects/project-deployments.service.ts`
- Modify: `cicd-workflow-be/src/modules/projects/project-deployments.service.spec.ts`

- [ ] **Step 1: Write reconciler tests**

Cover:

```text
target exists in DB and fake Cloud Run service exists -> status becomes healthy
target exists in DB and fake Cloud Run service is missing -> status becomes drifted
fake adapter throws permission error -> status becomes blocked_by_access
job failed previously and retry is allowed -> status becomes retry_pending
```

- [ ] **Step 2: Implement status enum mapping**

Use product states that do not expose provider implementation details:

```text
pending
provisioning
ready
degraded
drifted
blocked_by_access
failed
archived
```

- [ ] **Step 3: Persist reconciliation evidence**

Each reconciliation should store:

```text
lastCheckedAt
lastObservedRevision
lastObservedUrl
lastErrorCode
lastErrorMessage
correlationId
```

Do not store GCP access tokens or secret payloads.

- [ ] **Step 4: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- gcp-runtime gcp-control project-deployments --runInBand
npm run typecheck
```

Expected:

```text
reconciler tests pass
runtime status can be rendered by existing project deployment views
```

- [ ] **Step 5: Commit**

Commit message:

```text
Add local GCP runtime reconciliation
```

---

## Task 4: Central Workflow Caller Template Integration

**Files:**

- Modify: `cicd-workflow/workflow-templates/fe-nextjs.yml`
- Modify: `cicd-workflow/workflow-templates/fe-react.yml`
- Modify: `cicd-workflow/workflow-templates/be-nodejs.yml`
- Modify: `cicd-workflow/workflow-templates/be-nestjs.yml`
- Modify: `cicd-workflow/workflow-templates/*.properties.json`
- Modify: `cicd-workflow/catalog/workflow-recipes.json`
- Modify: `cicd-workflow/catalog/project-types.json`
- Modify: `cicd-workflow/scripts/validate-gcp-cloud-run-workflow.cjs`
- Modify: `cicd-workflow/docs/workflows/README.md`
- Modify: `cicd-workflow/docs/workflows/gcp-cloud-run-deploy.md`

- [ ] **Step 1: Add static tests for generated caller shape**

Extend the validator so it checks:

```text
caller uses ./.github/workflows/gcp-cloud-run-deploy.yml or the approved central ref
caller passes environment, service name, region, project id, image name, and health path
caller does not contain VERCEL_TOKEN, RENDER_API_KEY, GCP service account JSON, or gcloud auth activate-service-account
caller maps test/dev/uat/main exactly to approved target environments
```

- [ ] **Step 2: Update caller templates**

Each app template should call the GCP reusable workflow after tests pass. Keep legacy provider deploy jobs feature-flagged or disabled in the generated output while the migration branch is active.

Expected caller job shape:

```yaml
deploy-gcp:
  needs: [test]
  uses: alphaexplora/cicd-workflow/.github/workflows/gcp-cloud-run-deploy.yml@feature/migrate-vercel-render-to-gcp
  with:
    environment: ${{ github.ref_name == 'main' && 'prod' || github.ref_name == 'uat' && 'uat' || 'dev' }}
    region: asia-southeast1
    service_name: ${{ vars.ALPHACI_CLOUD_RUN_SERVICE }}
    gcp_project_id: ${{ vars.ALPHACI_GCP_PROJECT_ID }}
    artifact_registry_repository: ${{ vars.ALPHACI_ARTIFACT_REGISTRY_REPOSITORY }}
    image_name: ${{ vars.ALPHACI_IMAGE_NAME }}
    health_path: /health
  secrets: inherit
```

If GitHub expression syntax cannot safely express the ternary chain in this format, use the existing workflow's approved environment mapping pattern.

- [ ] **Step 3: Update recipe metadata**

Catalog entries should show:

```text
deploymentProvider: gcp-cloud-run
legacyProviders: []
requiresSecrets: []
requiresVariables: ALPHACI_GCP_PROJECT_ID, ALPHACI_CLOUD_RUN_SERVICE, ALPHACI_ARTIFACT_REGISTRY_REPOSITORY, ALPHACI_IMAGE_NAME
```

- [ ] **Step 4: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow
node scripts\validate-gcp-cloud-run-workflow.cjs
git diff --check
```

If actionlint is available:

```powershell
actionlint .github/workflows/*.yml workflow-templates/*.yml
```

Expected:

```text
static validator passes
no GCP JSON key auth appears in generated workflow templates
```

- [ ] **Step 5: Commit**

Commit message:

```text
Point workflow templates at GCP Cloud Run
```

---

## Task 5: Domain Management Without DNS Access

**Files:**

- Create: `cicd-workflow-be/src/modules/domains/domains.module.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.controller.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.controller.spec.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.service.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.service.spec.ts`
- Create: `cicd-workflow-be/src/modules/domains/domain-verifier.ts`
- Create: `cicd-workflow-be/src/modules/domains/fake-domain-verifier.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.repository.ts`
- Create: `cicd-workflow-be/src/modules/domains/domains.repository.spec.ts`
- Create: `cicd-workflow-be/supabase/migrations/20260702_runtime_domains.sql`
- Create: `cicd-workflow-be/supabase/rollbacks/20260702_runtime_domains_down.sql`
- Create: `cicd-workflow-fe/src/lib/api/domains.ts`
- Create: `cicd-workflow-fe/src/components/product/project-domains-panel.tsx`
- Create: `cicd-workflow-fe/tests/unit/project-domains-panel.test.tsx`

- [ ] **Step 1: Add domain tables**

Schema intent:

```text
runtime_domains
- id
- workspace_id
- project_id
- deployment_target_id
- hostname
- kind: managed_subdomain | custom_domain
- status: pending | verifying | active | failed | archived
- dns_target
- verification_token_hash
- last_checked_at
- last_error_code
- created_at
- updated_at
```

The default managed hostname pattern is:

```text
<project-slug>-<environment>.itsandbox.site
```

The schema must also support a later managed domain cutover by storing the managed domain as data, not hardcoding `itsandbox.site` in multiple services.

- [ ] **Step 2: Write service tests**

Cover:

```text
reserve managed subdomain for dev -> alpha-demo-dev.itsandbox.site
reserve managed subdomain for prod -> alpha-demo.itsandbox.site
reserve custom domain -> pending verification
custom domain cannot be attached to two active projects
domain remains pending when fake verifier returns missing CNAME
domain becomes active when fake verifier returns expected route target
```

- [ ] **Step 3: Implement fake verifier**

Fake verifier should accept deterministic inputs:

```text
hostname
expectedTarget
mode: missing | matched | mismatched
```

It must not query real DNS.

- [ ] **Step 4: Add frontend panel**

The panel should show:

```text
managed AlphaCI URL
custom domain list
verification status
required DNS target
retry verification action
```

It must not claim SSL is active until backend status is `active`.

- [ ] **Step 5: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- domains --runInBand
npm run typecheck

cd C:\Codes\cicd-ex\cicd-workflow-fe
npm test -- project-domains-panel --runInBand
npm run lint
```

Expected:

```text
domain API and UI tests pass without DNS access
managed hostname remains configurable for later domain cutover
```

- [ ] **Step 6: Commit**

Commit message:

```text
Add local domain management model
```

---

## Task 6: Preview Deployment Lifecycle Without Cloud Run Access

**Files:**

- Create: `cicd-workflow-be/src/modules/previews/previews.module.ts`
- Create: `cicd-workflow-be/src/modules/previews/previews.service.ts`
- Create: `cicd-workflow-be/src/modules/previews/previews.service.spec.ts`
- Create: `cicd-workflow-be/src/modules/previews/previews.repository.ts`
- Create: `cicd-workflow-be/src/modules/previews/previews.repository.spec.ts`
- Create: `cicd-workflow-be/src/modules/previews/preview-cleanup.service.ts`
- Create: `cicd-workflow-be/src/modules/previews/preview-cleanup.service.spec.ts`
- Create: `cicd-workflow-be/supabase/migrations/20260702_preview_deployments.sql`
- Create: `cicd-workflow-be/supabase/rollbacks/20260702_preview_deployments_down.sql`
- Modify: `cicd-workflow-be/src/modules/workflows/staged-workflow.builder.ts`
- Modify: `cicd-workflow-be/src/modules/workflows/staged-workflow.builder.spec.ts`
- Create: `cicd-workflow-fe/src/components/product/project-previews-panel.tsx`
- Create: `cicd-workflow-fe/tests/unit/project-previews-panel.test.tsx`

- [ ] **Step 1: Add preview deployment schema**

Fields:

```text
preview_deployments
- id
- workspace_id
- project_id
- pull_request_number
- source_branch
- commit_sha
- deployment_target_id
- cloud_run_service_name
- preview_url
- status
- expires_at
- created_at
- updated_at
- cleaned_up_at
```

- [ ] **Step 2: Write lifecycle tests**

Cover:

```text
PR opened -> preview target planned
PR synchronized -> preview target updated
PR closed -> preview target marked cleanup_pending
TTL expired -> cleanup job selects preview
free/trial plan over limit -> preview rejected with clear entitlement error
fork PR without approval -> preview blocked
```

- [ ] **Step 3: Generate preview workflow contract**

Preview caller output must use the same reusable Cloud Run workflow but with preview-specific service name and labels:

```text
service_name: alphaci-<project-slug>-pr-<number>
environment: preview
labels: tenant_id, project_id, pull_request_number, ttl
```

- [ ] **Step 4: Implement fake cleanup**

Cleanup service marks resources as cleaned locally and records the names it would delete:

```text
Cloud Run service
Artifact Registry image tags
Secret versions scoped to preview
domain mapping or route rule
```

No live delete command is allowed in this task.

- [ ] **Step 5: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- previews staged-workflow --runInBand
npm run typecheck

cd C:\Codes\cicd-ex\cicd-workflow-fe
npm test -- project-previews-panel --runInBand
```

Expected:

```text
preview lifecycle is fully testable without Cloud Run access
cleanup records intended deletions but does not call GCP
```

- [ ] **Step 6: Commit**

Commit message:

```text
Add local preview deployment lifecycle
```

---

## Task 7: Billing, Trial, Upgrade, Downgrade, And Runtime Limits

**Files:**

- Modify: `cicd-workflow-be/src/modules/subscription/subscription.service.ts`
- Modify: `cicd-workflow-be/src/modules/subscription/subscription.service.spec.ts`
- Modify: `cicd-workflow-be/src/modules/usage/usage-quota.service.ts`
- Modify: `cicd-workflow-be/src/modules/usage/usage-quota.service.spec.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/runtime-entitlements.service.ts`
- Create: `cicd-workflow-be/src/modules/gcp-control/runtime-entitlements.service.spec.ts`
- Create: `cicd-workflow-be/supabase/migrations/20260702_runtime_entitlements.sql`
- Create: `cicd-workflow-be/supabase/rollbacks/20260702_runtime_entitlements_down.sql`
- Create: `cicd-workflow-fe/src/components/product/runtime-entitlements-panel.tsx`
- Create: `cicd-workflow-fe/tests/unit/runtime-entitlements-panel.test.tsx`

- [ ] **Step 1: Write transition matrix tests**

Test this customer journey:

| Event | Expected project behavior |
| --- | --- |
| trial starts | shared runtime allowed, limited previews, custom domains disabled if policy requires paid |
| trial expires without payment | new deploys blocked, existing project remains visible, cleanup is not destructive |
| upgrade to paid | deploys resume, custom domains allowed, previews use paid limits |
| downgrade | existing production stays visible, new previews/dedicated project creation blocked if tier no longer permits them |
| payment failure grace period | deploys may be limited according to policy, no automatic project deletion |
| cancellation | deploys disabled at end of term, env vars retained according to retention policy |

- [ ] **Step 2: Implement runtime entitlement service**

Inputs:

```text
workspaceId
plan
subscriptionStatus
projectCount
previewCount
customDomainCount
runtimePlacement: shared | dedicated
```

Outputs:

```text
canDeploy
canCreatePreview
canAttachCustomDomain
canCreateDedicatedProject
limitReasons[]
```

- [ ] **Step 3: Connect usage quota checks**

Use existing usage quota service where possible. The runtime entitlement service should be the product-facing boundary for GCP deployment decisions.

- [ ] **Step 4: Add UI summary**

Show:

```text
current deployment ability
preview limit
custom domain availability
dedicated project availability
reason when blocked
```

- [ ] **Step 5: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- subscription usage runtime-entitlements --runInBand
npm run typecheck

cd C:\Codes\cicd-ex\cicd-workflow-fe
npm test -- runtime-entitlements-panel --runInBand
```

Expected:

```text
trial, upgrade, downgrade, payment failure, and cancellation behavior is explicit
no journey deletes customer projects automatically
```

- [ ] **Step 6: Commit**

Commit message:

```text
Add runtime entitlement transitions
```

---

## Task 8: Admin, Audit, And Launch-Readiness Surfaces

**Files:**

- Modify: `cicd-workflow-be/src/modules/audit/audit-events.service.ts`
- Modify: `cicd-workflow-be/src/modules/audit/audit-events.service.spec.ts`
- Modify: `cicd-workflow-be/src/modules/admin/admin.controller.ts`
- Modify: `cicd-workflow-be/src/modules/admin/admin.service.ts`
- Modify: `cicd-workflow-be/src/modules/admin/admin.service.spec.ts`
- Create: `cicd-workflow-be/src/modules/admin/gcp-runtime-admin.view.ts`
- Create: `cicd-workflow-fe/src/lib/api/admin-gcp-runtime.ts`
- Create: `cicd-workflow-fe/src/app/admin/gcp-runtime/page.tsx`
- Create: `cicd-workflow-fe/tests/unit/admin-gcp-runtime-page.test.tsx`
- Modify: `cicd-workflow/docs/plans/alphaci-gcp-implementation-board.html`
- Modify: `cicd-workflow/docs/plans/alphaci-gcp-implementation-board.md`

- [ ] **Step 1: Define audit events**

Events:

```text
gcp.runtime.provision.requested
gcp.runtime.provision.succeeded
gcp.runtime.provision.failed
gcp.runtime.reconcile.drifted
gcp.domain.verification.requested
gcp.domain.verification.succeeded
gcp.preview.cleanup.requested
gcp.preview.cleanup.succeeded
legacy_provider_connection.create_blocked
```

- [ ] **Step 2: Add admin read model**

Admin view should show:

```text
workspace
project
runtime placement
deployment target status
last provisioning job
last reconciliation result
domain status
preview count
blocked entitlement reason
last audit event
```

- [ ] **Step 3: Add frontend admin page**

The page should be dense and operational:

```text
filters by status, owner, runtime placement
table of affected projects
drift/blocked badges
links to project and audit event details
```

- [ ] **Step 4: Update board**

Board should show:

```text
access-independent plan linked
local progress task group
current blockers unchanged
local prep percentage reflects completed source-tagged tasks
```

- [ ] **Step 5: Run verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- audit admin --runInBand
npm run typecheck

cd C:\Codes\cicd-ex\cicd-workflow-fe
npm test -- admin-gcp-runtime-page --runInBand
npm run lint

cd C:\Codes\cicd-ex\cicd-workflow
git diff --check
```

Expected:

```text
admin can inspect local GCP runtime state without GCP access
board links the access-independent work queue
```

- [ ] **Step 6: Commit**

Commit message:

```text
Add GCP runtime admin visibility
```

---

## Task 9: Cloud Repo Static Hardening

**Files:**

- Modify: `alphaexplora-cloud/README.md`
- Modify: `alphaexplora-cloud/docs/gcp/org-foundation-automation.md`
- Modify: `alphaexplora-cloud/docs/gcp/repo-governance.md`
- Modify: `alphaexplora-cloud/docs/gcp/access-request-matrix.md`
- Modify: `alphaexplora-cloud/infra/gcp/foundation/*.tf`
- Modify: `alphaexplora-cloud/infra/gcp/modules/*/*.tf`
- Modify: `alphaexplora-cloud/scripts/repo/check-no-secrets.ps1`
- Modify: `alphaexplora-cloud/scripts/repo/check-no-direct-apply.ps1`
- Modify: `alphaexplora-cloud/scripts/gcp/verify-org-foundation.ps1`

- [ ] **Step 1: Add static no-mutation validation**

The checks should fail if repo files include:

```text
terraform apply
gcloud projects create
gcloud services enable
gcloud iam service-accounts create
gcloud run deploy
service_account_key
private_key
refresh_token
```

Allow those strings only in docs sections that explicitly say "do not run until access is granted" if the check supports an allowlist.

- [ ] **Step 2: Add fake output examples**

Document expected foundation outputs so product repos can integrate locally:

```text
shared_runtime_project_id = alphaci-shared-runtime-dev
artifact_registry_repository = alphaci
default_region = asia-southeast1
managed_domain = itsandbox.site
deployer_service_account = alphaci-gha-deployer@<project>.iam.gserviceaccount.com
```

- [ ] **Step 3: Terraform static checks**

Run:

```powershell
cd C:\Codes\cicd-ex\alphaexplora-cloud
terraform -chdir=infra/gcp/foundation fmt -check
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\repo\check-no-secrets.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\repo\check-no-direct-apply.ps1
```

Expected:

```text
Terraform formatting passes
no credentials or static keys are committed
no direct apply workflow is present
```

- [ ] **Step 4: Commit**

Commit message:

```text
Harden cloud repo static checks
```

---

## Task 10: Disposable Database Migration Verification

**Files:**

- Modify: `cicd-workflow-be/scripts/verify-gcp-runtime-migration.cjs`
- Modify: `cicd-workflow-be/src/scripts/gcp-runtime-migration-verifier.ts`
- Modify: `cicd-workflow-be/src/scripts/gcp-runtime-migration-verifier.spec.ts`
- Modify: `cicd-workflow-be/docs/deployment-provisioning.md`

- [ ] **Step 1: Improve verifier failure messages**

Verifier must print:

```text
which migration file is being applied
which rollback file is being applied
which schema/table check failed
whether the database URL came from GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL
confirmation that no production/shared URL should be used
```

It must not print the database URL value.

- [ ] **Step 2: Add test for missing URL**

Expected output:

```text
GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL is required for apply verification.
Use a local or disposable shadow database. Do not point this at production or shared staging.
```

- [ ] **Step 3: Run without URL**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
npm run db:verify:gcp-runtime-migration
```

Expected:

```text
command exits non-zero with a clear missing-url message
no database is mutated
```

- [ ] **Step 4: Run with disposable URL when available**

Run only after a disposable local or Supabase shadow database exists:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow-be
$env:GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'
npm run db:verify:gcp-runtime-migration
Remove-Item Env:\GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL
```

Expected:

```text
migration applies
schema checks pass
rollback applies
post-rollback checks pass
```

- [ ] **Step 5: Commit**

Commit message:

```text
Harden GCP runtime migration verifier
```

---

## Task 11: Final Access-Independent Readiness Review

**Files:**

- Modify: `cicd-workflow/docs/plans/alphaci-gcp-migration-index.md`
- Modify: `cicd-workflow/docs/plans/alphaci-gcp-implementation-board.html`
- Modify: `cicd-workflow/docs/plans/alphaci-gcp-implementation-board.md`
- Modify: `cicd-workflow/docs/plans/gcp/gcp-iam-access-request-matrix.md`
- Modify: `cicd-workflow/docs/plans/gcp/01-bootstrap-access.md`

- [ ] **Step 1: Confirm every local phase has evidence**

Evidence checklist:

```text
BYO creation blocked in backend tests
env var storage still works
fake GCP provisioning orchestrator passes tests
reconciler reports ready/drifted/blocked_by_access states
workflow caller templates validate statically
domain APIs/UI work with fake verifier
preview APIs/UI work with fake cleanup
entitlement transitions are tested
admin GCP runtime page renders local state
cloud repo static checks pass
```

- [ ] **Step 2: Update blockers**

Each remaining blocker must include:

```text
owner
blocked live command
safe local workaround
clear condition
verification command after access is granted
```

- [ ] **Step 3: Produce live-access handoff**

Add or update the live-access checklist in `01-bootstrap-access.md`:

```text
authenticate AlphaExplora GCP account
verify org/folder roles
verify billing account user rights
init remote Terraform state
run Terraform plan only
create WIF and deployer service account through approved path
run first disposable Cloud Run smoke deploy
destroy disposable smoke resources
record evidence in board/index
```

- [ ] **Step 4: Run repository-level verification**

Run:

```powershell
cd C:\Codes\cicd-ex\cicd-workflow
node scripts\validate-gcp-cloud-run-workflow.cjs
git diff --check

cd C:\Codes\cicd-ex\cicd-workflow-be
npm test -- --runInBand
npm run typecheck

cd C:\Codes\cicd-ex\cicd-workflow-fe
npm test -- --runInBand
npm run lint
```

Expected:

```text
all local gates pass or unrelated pre-existing failures are documented with command output
no step requires GCP organization access
```

- [ ] **Step 5: Commit**

Commit message:

```text
Document access-independent GCP readiness
```

---

## Live Access Handoff After This Plan

When the required GCP access is granted, switch back to the full phase index and execute these gated checks in order:

1. `docs/plans/gcp/00-org-foundation-automation.md`: run `terraform plan` for foundation only.
2. `docs/plans/gcp/01-bootstrap-access.md`: create WIF, deployer/runtime identities, Artifact Registry, and smoke secret through approved automation.
3. `docs/plans/gcp/04-central-workflow-cloud-run.md`: run one disposable Cloud Run deployment through GitHub Actions.
4. `docs/plans/gcp/05-domains-routing.md`: verify wildcard DNS, certificate, load balancer, and default managed domain routing.
5. `docs/plans/gcp/02-database-expand-contract.md`: apply migrations to a disposable DB, then staging, then production only after approval.
6. `docs/plans/gcp/03-backend-control-plane.md`: swap fake adapter for live adapter behind feature flag.
7. `docs/plans/gcp/06-preview-deployments.md`: run PR preview smoke test and cleanup.
8. `docs/plans/gcp/07-legacy-provider-deprecation.md`: complete legacy provider retirement after GCP path is stable.

## Self-Review

- Spec coverage: Every existing 00-10 phase has a safe local scope or an explicit live-access gate.
- Placeholder scan: No unresolved placeholder markers or open-ended deferred-work language is used.
- Type consistency: GCP runtime, domain, preview, entitlement, and audit states use stable product-level names rather than Google SDK-specific names.
- Risk check: No task requires live GCP mutation, production database migration, or destructive legacy provider cleanup.
