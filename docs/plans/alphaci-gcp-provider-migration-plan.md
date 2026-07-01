# AlphaCI GCP Provider Migration Plan

Status: Living brainstorm plan, hardened review pass 2026-06-30
Branch: `feature/migrate-vercel-render-to-gcp`
Created: 2026-06-29
GCP seed project: `alphaci-20260629`

## Purpose

AlphaCI currently models managed deployment around Vercel for frontend targets and Render for backend targets. The goal is to move the managed runtime to Google Cloud Platform while keeping the platform easy to operate now and easy to migrate into stronger tenant isolation later.

This document is intentionally provisional. Update it as product, security, cost, domain, and deployment decisions are made.

## Current Recommendation

Start by creating the separate private `alphaexplora-cloud` repository for GCP organization foundation, then launch the shared AlphaCI-managed runtime project:

```text
00-org-foundation-automation
  -> private alphaexplora-cloud repo
  -> folders, baseline projects, labels, IAM boundaries, Terraform state, project-factory skeleton
  -> shared runtime bootstrap
  -> Cloud Run deployments in shared runtime
```

Use `alphaci-20260629` as the current seed/shared project while the foundation automation is created, but do not let it become a hardcoded permanent assumption.

Design the data model, folder layout, and naming as if every deployment can move to a dedicated GCP project later. Automate the folder/project foundation from the start, but keep customer-dedicated project creation product-disabled until routing, billing, cleanup, quota, and admin approval gates pass.

Recommended first path:

```text
Private alphaexplora-cloud repo and Terraform-owned org/folder/project foundation now
Shared runtime launch after foundation bootstrap
Tenant/project abstraction from day one
Dedicated customer projects product-enabled later for paid or production workloads
```
## Master Plan And Split-Doc Index

This file remains the master decision source until implementation plans are split out.

Index file:

```text
docs/plans/alphaci-gcp-migration-index.md
```

Implementation board:

```text
docs/plans/alphaci-gcp-implementation-board.html
```

Split rule:

- Keep product decisions, invariants, resolved decisions, and open questions in this master plan.
- Put implementation details in focused child plans once work starts.
- Every child plan must link back to this master plan and the index.
- Keep the implementation board aligned with this master plan and the index; the board is for viewing, not the decision source.
- GCP IAM requests and role creation must stay aligned with `docs/plans/gcp/gcp-iam-access-request-matrix.md`.
- Live org-level Terraform, billing IAM, DNS, certificate, load balancer, and admin `gcloud` scripts belong in `alphaexplora-cloud`, not in AlphaCI product repos.
- Keep cloud IaC split by ownership scope inside `alphaexplora-cloud`: org/global IaC owns the AlphaExplora organization, folders, baseline projects, shared DNS/networking, billing export, WIF foundations, and shared platform services; product/project IaC owns AlphaCI-specific runtime resources such as shared runtime repos, Cloud Run service baselines, app-level service accounts, project-specific secrets metadata, and future dedicated customer project factory outputs.
- Do not mix org/global IaC and AlphaCI project-specific IaC in the same Terraform root or apply workflow. Global changes need cloud-operator approval; AlphaCI project-specific changes can be reviewed with product owners after the global foundation outputs exist.
- If a child plan changes a decision, update this master plan first.
- Do not let child plans duplicate contradictory defaults; the master plan wins unless explicitly updated.

Planned child plans:

| Order | Area | Child plan | Status |
| --- | --- | --- | --- |
| 1 | Cloud repo and org foundation automation | `docs/plans/gcp/00-org-foundation-automation.md` | Detailed |
| 2 | GCP bootstrap and access | `docs/plans/gcp/01-bootstrap-access.md` | Detailed |
| 3 | Database expand-contract migration | `docs/plans/gcp/02-database-expand-contract.md` | Detailed |
| 4 | Backend control plane | `docs/plans/gcp/03-backend-control-plane.md` | Detailed |
| 5 | Central workflow replacement | `docs/plans/gcp/04-central-workflow-cloud-run.md` | Detailed |
| 6 | Domains and routing | `docs/plans/gcp/05-domains-routing.md` | Detailed |
| 7 | Preview deployments | `docs/plans/gcp/06-preview-deployments.md` | Detailed |
| 8 | Legacy provider deprecation | `docs/plans/gcp/07-legacy-provider-deprecation.md` | Detailed |
| 9 | Billing, limits, and lifecycle | `docs/plans/gcp/08-billing-limits-lifecycle.md` | Detailed |
| 10 | Operations and launch safety | `docs/plans/gcp/09-operations-launch-safety.md` | Detailed |
| 11 | Shared-to-dedicated migration | `docs/plans/gcp/10-shared-to-dedicated-migration.md` | Detailed |
## Implementation Readiness Index

Use this index to split the master plan into implementation work. Do not start broad coding from this document alone; convert each area into a scoped implementation plan with tests and rollback gates.

0. Cloud repo and org foundation automation: private `alphaexplora-cloud` repo, Terraform-owned folders, baseline projects, IAM boundaries, labels, billing link policy, remote state, verification scripts, access request matrix, and project-factory skeleton.
1. GCP bootstrap and access: enabled APIs, WIF, service accounts, IAM matrix, Artifact Registry, Secret Manager, Cloud Run smoke deploy, billing export, budget alerts.
2. Database expand-contract migration: new runtime schemas/tables, compatibility links, feature flags, backfills, validation queries, rollback migrations.
3. Backend control plane: async jobs, idempotency, locks, reconciliation, audit events, admin approvals, safe error model.
4. Central workflow replacement: GitHub OIDC auth, Docker build, push by digest, Cloud Run deploy, synthetic health probe, output contract, static workflow tests.
5. Domain and routing: managed-domain base, temporary `itsandbox.site`, future domain cutover, load balancer topology, fallback domains, custom-domain verification.
6. Preview deployments: PR service lifecycle, TTL, limits, preview-scoped secrets, cleanup, fork policy.
7. Legacy provider deprecation: Vercel/Render feature flags, UI/API removal, legacy credential retention and cleanup, tracked migration state.
8. Operations and launch safety: quota registry, DR runbooks, incident playbooks, notifications, cost reporting, admin tooling.

## IaC Ownership Boundary

`alphaexplora-cloud` is the single cloud infrastructure repository, but it must not become one giant Terraform root. Split IaC by blast radius and approval scope:

| Scope | Examples | Owner gate | Terraform shape |
| --- | --- | --- | --- |
| Org/global IaC | Organization folders, baseline projects, billing links, WIF foundations, shared DNS/networking, wildcard certificates, load balancer foundation, billing export | Cloud operators / org admin | Separate org/global stacks |
| Product/project IaC | AlphaCI shared runtime Artifact Registry, Cloud Run service baselines, app service accounts, AlphaCI Secret Manager containers, per-product outputs, smoke-test resources | Cloud operators plus AlphaCI product owner | Separate AlphaCI project stacks |
| Customer/dedicated IaC | Dedicated customer project factory outputs, customer runtime baseline, dedicated routing attachments | Cloud operators plus manual customer-project gate | Disabled stack/module until dedicated-project gates pass |

AlphaCI backend automation can consume outputs and request runtime actions, but it must not directly mutate org folders, billing links, DNS zones, load balancer foundations, WIF pools, or broad IAM. Project-specific IaC can move faster than org/global IaC, but only after the dependency outputs are available and versioned.

## Key Argument

Creating one GCP project per user or app from day one is clean on paper, but it increases operational surface immediately:

- Project creation quotas and org-level permissions.
- Billing account linking.
- API enablement delays.
- IAM and service account setup.
- Artifact Registry setup.
- Cloud Run deploy permissions.
- Runtime secret provisioning and cleanup.
- Domain verification and certificate flow.
- Cost tracking and cleanup for abandoned projects.

The safer launch path is to make the shared project the first deployment tenant, not the permanent architecture.

## Target Architecture Direction

```text
GitHub Actions
  -> Workload Identity Federation
  -> Artifact Registry
  -> Cloud Run
  -> GCP Secret Manager
  -> Domain routing
  -> Billing export and labels
```

Vercel and Render provider logic should be placed behind feature flags during the transition, then removed from the default product path after GCP is stable. Existing Vercel/Render deployments need an intentional migration path, but new managed deployments should target GCP.

## Foolproof Implementation Rules

These rules are intentionally strict. If implementation work conflicts with them, stop and update this plan before coding around the conflict.


Ownership language clarification:

- Removed product concept: bring-your-own deployment provider, meaning customer-owned Vercel/Render hosting credentials or provider connections.
- Kept product concept: customer custom domains, meaning DNS aliases that route to AlphaCI-managed Cloud Run deployments.
- Kept product concept: customer-provided env vars and external service URLs, meaning customers can provide `DATABASE_URL`, API keys, OAuth credentials, and third-party service endpoints.
- Avoid using `ownershipType` for domains because it sounds like hosting ownership. Use `domainKind` instead.

Non-negotiable invariants:

- No static GCP service account JSON keys in GitHub, app config, logs, or local docs. Use Workload Identity Federation only.
- Every GCP identity, group, service account, and broad predefined role must be listed in `docs/plans/gcp/gcp-iam-access-request-matrix.md` before it is requested or granted.
- The actual GCP organization/foundation implementation must live in a separate private `alphaexplora-cloud` repo. AlphaCI repos consume outputs and must not own company-wide Terraform state or org-level admin scripts.
- New managed deployments use GCP Cloud Run only. Vercel and Render remain legacy migration paths behind feature flags.
- Bring-your-own deployment provider hosting is removed from the target product surface. Customers can bring env vars, custom domains, and external services, but not Vercel/Render/provider-hosting credentials.
- AlphaCI does not manage customer databases. AlphaCI stores and injects customer-provided env vars such as `DATABASE_URL`.
- The shared GCP project is a launch/runtime tenant, not a permanent architecture assumption.
- Every deployment record must be movable from shared project to dedicated project without changing customer/app identity.
- AlphaCI default domains remain stable even after a customer adds a custom domain.
- Production domain routing uses wildcard DNS plus global external Application Load Balancer and Certificate Manager. Cloud Run domain mapping is dev/manual fallback only.
- Secrets, access tokens, database URLs, and OAuth client secrets must never appear in workflow output, deployment history, dashboard errors, or logs.
- Every created GCP resource must have labels and enough metadata for cost attribution, cleanup, and migration.

Stop-the-line conditions:

- WIF cannot authenticate or the authenticated principal is not the expected deployer.
- Target `gcpProjectId` differs from the deployment target metadata.
- Required APIs are missing and the workflow is not explicitly allowed to enable them.
- Artifact Registry repo, runtime service account, Secret Manager references, or Cloud Run service name cannot be verified before deploy.
- Feature flags would expose Vercel/Render/bring-your-own deployment provider creation to new managed projects.
- A deployment succeeds but health checks fail; do not mark it healthy.
- A cleanup or migration step cannot prove which resources it owns.

## Required Platform Metadata

The backend should persist enough data to avoid guessing from names, URLs, branches, or provider-specific fields.

Deployment target metadata:

```text
ownerType: alphaexplora_product | alphaci_customer
runtimeScope: shared_project | dedicated_customer_project
productSlug
customerSlug
appSlug
environment: dev | stg | uat | prod
serviceSlot: web | api | worker | standalone
gcpProjectId
gcpProjectNumber
region
artifactRegistryLocation
artifactRegistryRepo
imageName
imageDigest
cloudRunServiceName
cloudRunRevision
runtimeServiceAccount
deployerServiceAccount
secretNamespace
defaultDomain
customDomains[]
domainBase
routingMode: load_balancer | cloud_run_mapping_dev_only
isPrimary
isFallback
isDeprecated
replacementDomainId
labels
provisioningStatus
deploymentStatus
lastHealthyRevision
lastDeploymentErrorCode
lastDeploymentErrorSafeMessage
previewId
previewType
previewSourceProvider
previewRepositoryFullName
previewPullRequestNumber
previewBranchHash
previewCommitSha
expiresAt
cleanupStatus
planTier
billingStatus
lifecycleStatus
entitlementState
migrationState
```

Provisioning status values:

```text
requested
validating
provisioning_resources
ready_for_deploy
deploying
healthy
unhealthy
rollback_required
cleanup_required
suspended
deleting
deleted
failed
```

Rules for metadata:

- Do not infer customer, app, environment, or service slot from a Cloud Run service name when a stored field exists.
- Store project number as well as project ID because IAM, audit logs, and some APIs expose both.
- Store the last healthy revision before deploying a new revision.
- Store safe error codes separately from raw provider errors.
- Store enough domain routing metadata to move routing from shared project to dedicated project later.

## Database Schema Architecture

AlphaCI should continue the existing database convention: use Postgres schemas per service or bounded context, not one large `public` schema. The current backend already uses domain schemas such as `identity`, `billing`, `workflow`, `ci`, `env_provisioning`, `usage`, `audit`, and `support`; the GCP migration should extend that pattern instead of flattening new runtime tables into `public`.

Use schema-per-service/bounded-context, not schema-per-table. A service can own several tightly related tables inside one schema, and cross-service access should happen through backend service APIs, explicit repositories, or intentional read models rather than casual joins across unrelated schemas.

Recommended GCP migration schemas:

```text
env_provisioning       -- current/compatibility schema during Vercel/Render -> GCP migration
runtime_deployments    -- Cloud Run services, revisions, deploy history, health, rollbacks, previews
runtime_domains        -- default domains, custom domains, DNS verification, certificates, routing
runtime_secrets        -- Secret Manager metadata and references only; never secret payloads
billing_lifecycle      -- plan tier, trial, payment, downgrade, suspension, cancellation state
audit                  -- immutable audit events and correlation IDs
```

Schema rules:

- Do not put new GCP runtime, domain, lifecycle, or secret-reference tables in `public`.
- Keep `env_provisioning` as the compatibility schema while legacy Vercel/Render deployment records are being migrated.
- New GCP-specific state should land in the runtime schemas above, then old `env_provisioning` columns/tables can be deprecated or narrowed after migration.
- Store only secret metadata in the database: secret name, version/reference, scope, owner, timestamps, redaction state, and rotation status. Secret payloads live in GCP Secret Manager or GitHub Actions secrets when required.
- Shared identifiers across schemas should include `workspace_id`, `project_id`, `deployment_target_id`, `customer_slug`, `app_slug`, `environment`, `service_slot`, and `correlation_id`.
- Every schema change needs a forward migration and, where practical, a rollback migration.
- Runtime, domain, and secret schemas should be inaccessible to anonymous/client roles; writes should go through the backend service role and audited service methods.

## Non-Blocking Phase Strategy

Phases are completion gates, not global start blockers. A later phase can begin when its direct dependencies are satisfied and the work is isolated behind feature flags, test environments, or non-production targets.

Principles:

- Every phase must produce a working slice, not only design artifacts.
- A phase can be marked `started`, `runnable`, `limited`, or `complete`.
- `complete` means the phase satisfies its exit gates.
- `runnable` means the phase can be exercised safely in dev/test with known limits.
- `limited` means the phase works for the shared launch scope but not yet for production/business dedicated projects.
- Strict gates block promotion to broader rollout, not local implementation or parallel discovery.
- Work that affects production traffic, customer data, billing, IAM, domains, or cleanup still requires the manual approval gates in this plan.

Recommended overlap model:

```text
Phase 1 foundation can run while Phase 2 DB/control-plane migrations are built locally.
Phase 2 backend metadata can run before live GCP deploys if it writes isolated runtime_* schemas behind feature flags.
Phase 3 workflows can be built against disposable test targets once WIF and minimal APIs exist.
Phase 3C previews can be built after the base deploy path exists in dev/test, even before paid-tier production domains.
Phase 4 domain work can start with temporary managed-domain routing while dedicated customer routing remains blocked.
Phase 5 cost controls can start with AlphaCI plan limits before billing export reports are fully wired.
Dedicated customer projects remain a separate production-readiness gate, not a blocker for shared-project launch.
```

Runnable slice requirements:

```text
Phase 1 runnable: WIF-authenticated disposable Cloud Run deploy in alphaci-20260629, then cleanup.
Phase 2 runnable: backend can create GCP runtime metadata in new schemas without touching live Vercel/Render records.
Phase 2A runnable: new project creation cannot expose Vercel/Render BYO paths when legacy flags are off.
Phase 3 runnable: reusable workflow builds, pushes, deploys, probes health, and reports safe output for one test service.
Phase 3C runnable: one PR preview can be created and cleaned up without affecting staging/prod.
Phase 4 runnable: one generated managed-domain route works for a test service through the shared routing path.
Phase 5 runnable: plan limits enforce max deploys/previews/instances before relying on billing export.
```

Promotion rules:

- Dev/test work can proceed with temporary/manual setup if the plan records the gap and cleanup owner.
- UAT requires repeatable setup scripts or documented runbooks.
- Production shared-project launch requires Phase 1, Phase 2, Phase 3, shared-routing Phase 4, and basic Phase 5 controls to be `complete` for shared runtime scope.
- Production/business dedicated projects require the dedicated-project routing topology and project-factory gates to be `complete`.
- Custom domains require Phase 4 custom-domain gates to be `complete`; default managed-domain routing can launch first.
- Active image deletion requires Artifact Registry cleanup dry-run review even if deploys are already live.
## Phase Exit Gates

These gates define when a phase is complete enough for rollout. They do not prevent isolated implementation, local tests, or dev/test work in another phase when direct dependencies are met.

Phase 1, GCP platform foundation, is not done until:

- WIF auth works from GitHub Actions without JSON keys.
- Required APIs are enabled or the enablement flow is documented and tested.
- Artifact Registry exists in `asia-southeast1` or the chosen location.
- Deployer and runtime service accounts exist with least-privilege IAM.
- Secret Manager exists and secret access can be granted per runtime service account.
- A disposable Cloud Run service can deploy and be cleaned up.
- Billing labels and budget alerts are configured, and any billing export deferral has owner, reason, and target date.

Phase 2, backend provider model, is not done until:

- GCP target metadata is persisted and returned by APIs.
- Vercel/Render/bring-your-own deployment provider creation paths are hidden or disabled for new managed projects under feature flags.
- Customer env vars write to the GCP secret model, not Render/Vercel APIs.
- The backend can represent both shared-project and dedicated-project runtime scopes.
- Existing Vercel/Render projects have a migration status instead of being silently switched.

Phase 3, workflow deployment, is not done until:

- A reusable GCP workflow authenticates using WIF before build/push/deploy.
- Images push to Artifact Registry with deterministic names and immutable digests.
- Cloud Run deploy uses runtime service account, labels, region, project, and secret references from metadata.
- Workflow outputs include revision, image digest, service URL, health result, and safe logs URL.
- Health check failure does not mark deployment healthy. Health status must come from AlphaCI synthetic probes or workflow probes against the managed URL or Cloud Run URL, not from load-balancer backend health checks for serverless NEGs.
- Static workflow tests prove no service account JSON secret is referenced.

Phase 3C, preview deployments, is not done until:

- Preview deployments are represented as separate deployment targets from production/staging.
- Preview Cloud Run service names and domains are deterministic, normalized, and collision-safe.
- Preview secrets are scoped separately and production secrets are blocked unless explicitly approved.
- Closing or merging a PR triggers preview expiration and cleanup.
- Plan limits cap active previews, max instances, TTL, images, and preview-specific secrets.
- Cleanup tests prove preview deletion cannot delete production/staging services, images, domains, or secrets.

Phase 4, domains and networking, is not done until:

- The active managed deployment domain and wildcard route through the target load-balancer path; launch value is `itsandbox.site` and `*.itsandbox.site`.
- Certificate Manager covers root and wildcard domains.
- Domain reservation prevents two apps from claiming the same generated subdomain.
- The dashboard shows default domain, custom domain status, DNS instructions, certificate status, and last verification time.
- Custom domains are gated to production/business paid tiers.

Phase 5, cost and controls, is not done until:

- Plan limits and lifecycle states exist before depending on GCP billing export.
- Max instances, deploy frequency, image retention, and preview lifetime are enforced by AlphaCI.
- BigQuery billing export is enabled before customer workloads and used for reporting and margin checks, not real-time enforcement.
- Cleanup jobs can list only AlphaCI-owned resources by labels and metadata.

Dedicated customer projects are not production-ready until:

- Project creation, billing link, API enablement, IAM setup, Artifact Registry setup, Secret Manager setup, and cleanup are idempotent.
- Failed project provisioning leaves a clear `cleanup_required` or `failed` state.
- Migration from shared to dedicated preserves domains, env vars, deployment history, and rollback path.
- The chosen dedicated-project routing topology has passed a live smoke test for managed-domain traffic, custom-domain traffic, rollback, and cleanup.
- A manual approval gate exists before deleting a dedicated customer project.

## Rollback And Failure Rules

Deployment rollback rules:

- Always record `lastHealthyRevision` before deploying a new revision.
- If deploy command fails, keep the previous healthy revision serving traffic.
- If deploy succeeds but health check fails, mark deployment `unhealthy` or `rollback_required`, not `healthy`.
- Rollback should route traffic back to `lastHealthyRevision` when possible.
- If rollback cannot complete automatically, surface a manual recovery task with project, service, region, previous revision, and safe error message.

Provisioning rollback rules:

- Every provisioning operation needs an idempotency key tied to customer/app/environment/slot.
- Partial resources must be tagged before or immediately after creation.
- Cleanup must only delete resources with matching metadata and labels.
- Failed cleanup should leave `cleanup_required`, never pretend success.
- Do not delete secrets, images, or projects needed by the last healthy deployment.

Migration rollback rules:

- Shared-to-dedicated migration must be two-phase: deploy and verify dedicated target first, then move routing.
- Keep shared target available until dedicated target passes health checks and domain routing is verified.
- Do not retire old Cloud Run services, images, or secrets until the new target has been healthy for the agreed retention window.

## Manual Approval Points

Require explicit human approval before:

- Running live GCP smoke tests that create billable resources.
- Linking billing to a newly created dedicated customer project.
- Enabling production/business custom domains for a customer.
- Moving production traffic from shared project to dedicated project.
- Deleting Cloud Run services, Artifact Registry images, Secret Manager secrets, or dedicated customer projects.
- Disabling Vercel/Render legacy flags in production.
- Expanding IAM permissions beyond the least-privilege role set documented for the phase.

## Minimum Launch Defaults

Use these defaults unless a later implementation plan changes them explicitly:

- Default region: `asia-southeast1`.
- Lower/shared tiers: shared runtime project, shared Artifact Registry repo, AlphaCI-owned default domain only.
- Production/business paid tiers: dedicated customer project, customer-scoped Artifact Registry repo, custom domains allowed.
- Cloud Run lower-tier services: start with conservative CPU, memory, concurrency, and max-instance limits defined in AlphaCI plan settings before rollout.
- Artifact Registry cleanup: keep currently deployed images, keep the last 10 successful deploys per service, delete older lower-tier images after 30 days, and delete older production/business images after 90 days unless under incident hold. Cleanup policies must run in dry-run mode first and be reviewed before active deletion is enabled.
- Preview deployments: use separate Cloud Run services per PR, require expiration time and cleanup owner at creation, default min instances to 0, and delete after PR close or inactivity TTL.
- Trial/lower/shared tiers run in the shared runtime scope; production/business paid tiers get dedicated customer projects.
- Downgrades enter a grace state first; do not immediately delete dedicated infrastructure or remove custom domains without retention and approval rules.
- Dashboard status: never show success until deploy, synthetic health probe, and metadata persistence all succeed.

## Acceptance Checklist Before Implementation

Before implementation starts, the plan is considered ready only if these are true:

- There are no open product architecture questions for the current scope.
- Shared-project launch and dedicated-project future path both use the same metadata model.
- Provider feature flags have clear default values for dev, test, uat, and prod.
- Security-sensitive values have a defined storage location and redaction rule.
- Every phase has an exit gate and a failure state.
- Every live GCP action has a cleanup path.
- Every customer-visible domain path has a default URL, custom-domain rule, and rollback behavior.

## Pre-Implementation Hardening Checklist

Before coding broad GCP replacement work, lock the decisions below. These are not abstract design questions; each one affects database migrations, workflow contracts, IAM bindings, rollout safety, or customer-visible behavior.

1. Bootstrap ownership:
   - Decide whether Phase 1 stable infrastructure is owned by Terraform, Pulumi, checked-in `gcloud` scripts, or a documented manual bootstrap runbook.
   - First recommendation: use checked-in bootstrap scripts/runbooks for the first shared-project smoke test, then move stable shared infrastructure into Terraform before production rollout.
   - Do not let the backend create organization folders, WIF pools, baseline Artifact Registry repos, billing export, DNS zones, load balancers, or wildcard certificates without an IaC or explicit admin-bootstrap owner.

2. Exact API/service enablement:
   - Use the GCP Services/API Matrix in this plan as the source of truth.
   - Each API must state whether it is required for shared launch, domain launch, billing/cost launch, security launch, or future dedicated-project launch.
   - The implementation must decide whether AlphaCI enables the API automatically, fails with setup instructions, or requires an admin bootstrap step.

3. Secret source of truth:
   - Runtime env vars go to GCP Secret Manager.
   - Build-only secrets may go to GitHub Actions secrets only when the build truly needs the value before runtime.
   - Raw secret values are write-only through AlphaCI after submission; dashboard/API reads return metadata and redacted status only.
   - Secret updates must write new versions or new references, not overwrite audit history.

4. Database table shape:
   - Define table names and ownership before implementation, not only schema names.
   - Minimum tables should cover deployment targets, deployment attempts, Cloud Run revisions, domain records, secret references, provisioning jobs, lifecycle entitlements, audit events, and migration links from legacy `env_provisioning`.
   - New tables must support expand-contract migration beside the current production schema and must not require immediate deletion of old Vercel/Render data.

5. Workflow concurrency:
   - Enforce one active deploy per workspace/project/app/environment/slot.
   - Cancel stale preview deployments for the same PR when a newer commit starts.
   - Do not auto-cancel production rollback jobs.
   - Every workflow run must carry a correlation ID that links GitHub Actions, backend deployment history, Cloud Run revision, and audit events.

6. Tier limits:
   - Replace vague limits with numeric defaults before enforcement code is written.
   - Required defaults: CPU, memory, concurrency, min instances, max instances, deploys per hour/day, active previews, preview TTL, image retention count, image retention days, and cleanup grace periods per tier.
   - Limits must live in AlphaCI plan settings, not only in workflow YAML.

7. Dedicated-project product gate:
   - Dedicated customer projects stay product-disabled until the routing topology is chosen, implemented, and live-smoke-tested.
   - Shared runtime launch is allowed to proceed without dedicated projects if shared routing, limits, rollback, cleanup, and billing controls are complete for the shared scope.

8. Operational SLOs and alerts:
   - Define deploy duration, stuck provisioning, failed cleanup, domain verification, billing export freshness, and preview cleanup backlog thresholds before broad rollout.
   - Alerting can start simple, but every threshold must have an owner and first response action.
## Operational Control Plane Requirements

The GCP migration needs an operational control plane, not only deployment workflows. The control plane is the part of AlphaCI that owns provisioning state, permissions, retries, reconciliation, cleanup, admin actions, and customer-visible lifecycle status.

### Infrastructure Ownership Boundary

Separate stable platform infrastructure from customer/app runtime resources.

Infrastructure-as-code should own stable AlphaCI platform resources:

```text
GCP organization folders
seed/shared runtime projects
billing export
org policies
Workload Identity Federation pools/providers
baseline IAM roles and service accounts
Artifact Registry baseline repositories
load balancer, wildcard DNS, Certificate Manager, serverless NEGs
observability sinks and budget alerts
Terraform/OpenTofu/Pulumi state storage
```

The AlphaCI backend may create or update customer/app runtime resources through controlled async jobs:

```text
deployment targets
Cloud Run services and revisions
Secret Manager secret metadata/references
preview services
custom-domain verification records
runtime labels
customer dedicated project provisioning after approval
cleanup requests
```

Rules:

- Do not create long-lived org-level IAM, WIF, load balancer, DNS, billing export, or baseline networking only through ad hoc backend code.
- Backend-created resources must be derived from stored metadata and idempotency keys.
- Infrastructure-as-code state and AlphaCI database state must both be recoverable.
- Any resource that can affect multiple customers belongs to infrastructure-as-code or an admin-approved operation.

### IAM And Authentication Matrix

Before implementation, define the exact IAM matrix:

```text
principal
allowed impersonation target
GCP project or folder scope
roles granted
GitHub org/repo/branch/workflow conditions
allowed environments
rotation/review owner
```

Required WIF policy decisions before implementation:

```text
allowedGitHubOrg
allowedCentralWorkflowRepo
allowedCallerRepos
allowedReusableWorkflowRefs
allowedBranches
allowedTags
allowedGitHubEnvironments
allowPullRequestPreviews
allowForkPullRequestPreviews
serviceAccountPerEnvironment
serviceAccountPerRuntimeScope
```

WIF rules:

- PR previews from forks must be disabled by default unless a separate untrusted-preview design is approved.
- Production deploys must require protected GitHub environments or protected branches.
- Reusable workflows must validate the expected repository, ref, event type, and environment before requesting GCP credentials.
- The WIF provider condition must be narrow enough that another GitHub organization or unrelated repository cannot exchange tokens.
Minimum IAM requirements:

- GitHub Actions authenticates through Workload Identity Federation only.
- WIF trust is restricted by GitHub organization, repository, workflow, branch/tag/environment, and audience where practical.
- Separate deployer service accounts from runtime service accounts.
- Runtime service accounts can read only the secrets needed by that service/environment/slot.
- Dedicated customer projects get customer-scoped service accounts and grants, not broad shared-project grants.
- Any role broader than a single app/environment/slot needs a written reason and review date.

### Async Provisioning Job System

Provisioning must be asynchronous and resumable. Project creation, API enablement, Artifact Registry creation, Cloud Run deploys, DNS/certificate changes, and cleanup can be slow or partially fail.

Required job model:

```text
jobId
jobType
idempotencyKey
workspaceId
projectId
deploymentTargetId
runtimeScope
requestedBy
status
attemptCount
nextRetryAt
lockKey
correlationId
safeErrorCode
safeErrorMessage
rawErrorReference
createdAt
updatedAt
expiresAt
```

Required job behavior:

- Every provisioning, deploy, migration, domain, preview, and cleanup action runs through a job record.
- Jobs must be idempotent and safe to retry after process crash or timeout.
- Jobs must use per-target locks so two deploys or migrations do not mutate the same target concurrently.
- Jobs need bounded retries, dead-letter states, and admin retry/cancel controls.
- Customer-visible status comes from job state plus verified runtime state, not from optimistic API responses.

### Reconciliation And Drift Detection

AlphaCI needs a scheduled reconciler that compares database state with actual GCP resources.

Reconciler checks:

```text
Cloud Run service exists and labels match metadata
last known healthy revision still exists
service account matches deployment target
Secret Manager references exist but payloads are not read
Artifact Registry images referenced by active deployments still exist
default and custom domains route to the expected target
preview deployments past TTL are marked for cleanup
resources with managed_by=alphaci but no matching DB record are orphan candidates
DB records with missing GCP resources are drift candidates
```

Rules:

- Safe drift can be repaired automatically only when ownership is proven by labels and metadata.
- Dangerous drift must create an admin review task, not auto-delete resources.
- Reconciliation must never delete production resources solely because one API list call failed.
- Orphan cleanup requires dry-run output before active deletion.

### Supply Chain And Image Security

The migration changes AlphaCI into a container platform. The plan must treat images as deployable artifacts, not opaque build output.

Required controls:

- Generate deterministic image names and immutable digest references.
- Store image digest in deployment metadata and deploy by digest where possible.
- Define when vulnerability scanning blocks deployment, warns only, or requires manual approval.
- Generate or preserve SBOM/provenance metadata for production/business deployments.
- Block static GCP JSON keys, `.env` files, token dumps, and secret-looking values in workflow logs and build artifacts.
- Define allowed base-image strategy for generated Dockerfiles.
- Keep build-time secrets separate from runtime secrets.
- Prove that rollback uses a known-good image digest and revision, not a mutable tag.

### Domain Safety And Takeover Protection

Domain management needs explicit ownership and collision rules.

Required controls:

- Reserve generated active managed-domain subdomains before exposing them; launch value uses `itsandbox.site`.
- Use canonical normalized slugs plus stable hash suffixes for generated domains.
- Prevent two workspaces from claiming the same generated subdomain or custom domain.
- Verify custom-domain ownership before routing traffic.
- Re-check domain ownership and DNS status periodically.
- Keep the AlphaCI default domain active after custom-domain setup unless the customer deletes the project.
- On downgrade/cancellation, remove custom-domain routing only after grace and notification rules are satisfied.
- Never route a custom domain to a target whose workspace/project ownership does not match the domain record.

### Customer Notifications And Lifecycle Messaging

Lifecycle operations need visible customer messaging, not only backend state.

Required notification events:

```text
trial ending
trial expired
payment past due
account suspended
project cleanup scheduled
preview created
preview expiring
preview deleted
deployment failed
rollback completed
custom domain pending DNS
custom domain verified
custom domain failing verification
migration to dedicated project scheduled
migration completed
legacy provider migration required
```

Notification rules:

- Destructive actions need advance notice, a deadline, and a recovery option when policy allows.
- Failed deploys should show safe error messages and correlation IDs, not raw provider output.
- Domain errors should show exact DNS records required and last verification time.
- Billing and runtime status must stay separate in the UI.

### Disaster Recovery And Incident Playbooks

Before production cutover, define recovery procedures for:

```text
AlphaCI database restore
infrastructure-as-code state restore
lost GitHub WIF access
bad IAM grant
Cloud Run deploy outage
broken load balancer or wildcard certificate
accidental resource deletion
runaway cost or abuse
leaked customer env var
bad shared-to-dedicated migration
domain takeover attempt
stuck cleanup job
```

Recovery rules:

- DR procedures must name the owner, required access, expected recovery time, and verification command/check.
- Backups must cover AlphaCI metadata, migration state, audit logs, and infrastructure-as-code state.
- Secret payload recovery depends on the source of truth: AlphaCI must not pretend it can recover customer-managed external services or databases.

### Quotas, Limits, And Capacity Registry

Maintain a registry of platform limits before launch:

```text
Cloud Run service limits
Cloud Run revision retention behavior
Artifact Registry storage and cleanup behavior
Certificate Manager and load balancer limits
URL map and host rule limits
serverless NEG limits
project creation and billing link quotas
API enablement delays
Secret Manager secret/version limits
GitHub Actions concurrency and artifact limits
AlphaCI plan limits by tier
```

Rules:

- The backend should reject requests that exceed AlphaCI plan limits before GCP rejects them.
- Quota failures should map to safe user-facing messages and admin action items.
- Limit increases need owner, justification, target date, and rollback plan.

### Admin Operations Surface

AlphaCI needs an internal admin surface before broad customer rollout.

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

Rules:

- Admin actions must be audited.
- Admin tools must display safe metadata only; never show secret payloads.
- Manual approval actions must record approver, reason, timestamp, and target resource IDs.

### Detailed Database Migration Requirements

The implementation plan must include database changes as first-class work:

- New schemas and tables for runtime deployments, domains, secret references, lifecycle state, provisioning jobs, reconciliation findings, and admin approvals.
- Backfill from existing `env_provisioning` Vercel/Render records into compatibility or migration state tables.
- Dual-read or compatibility reads while legacy provider paths remain feature-flagged.
- Dual-write only where needed, with a named removal date and consistency checks.
- Encrypted legacy provider credentials cleanup after migration and retention policy expiry.
- Forward migrations, practical rollback migrations, and data validation queries for every phase.
- Tests that prove client/anonymous roles cannot read runtime secret metadata or admin-only operational tables.

## Current GCP Bootstrap State

Last checked: 2026-06-30 with `gcloud` authenticated as `abtorres.it@alphaexplora.com`.

Confirmed access and resources:

```text
active project: alphaci-20260629
project number: 840317199583
organization: alphaexplora.com / 905531103378
billing account: billingAccounts/01C34F-9DCD67-86DB82
project billing: enabled
project IAM for active user: roles/owner on alphaci-20260629
billing IAM for active user: roles/billing.admin on 01C34F-9DCD67-86DB82
visible org projects: alphaci-20260629, apicenter-alpha-20260623
```

Confirmed gaps:

```text
service accounts in alphaci-20260629: none yet
WIF pools in alphaci-20260629: none yet
Artifact Registry API: disabled
Cloud Run Admin API: disabled
Secret Manager API: disabled
Artifact Registry repos: none yet
Cloud Run services: none yet
org getIamPolicy: denied
folder list: denied
```

Bootstrap implication:

- Phase 1 can start inside `alphaci-20260629` after enabling required APIs.
- Full folder/project-factory work for dedicated customer projects needs additional organization/folder permissions or a separate admin bootstrap process.
- Do not assume folder creation, org IAM review, or dedicated customer project placement is currently automated or permission-ready.

## Current External Blockers

These are not code-design disagreements. They are outside-access, account, or platform constraints that should be tracked explicitly while local implementation continues.

| Blocker | Owner | Blocks | Safe work while waiting | Clear condition |
| --- | --- | --- | --- | --- |
| GitHub private-repo branch protection unavailable for `alphaexplora-cloud` on the current GitHub plan | GitHub org owner | Enforced required reviews, CODEOWNERS, and required checks on `main` | Keep private repo, squash-only merges, manual cloud-operator review, CODEOWNERS, no direct Terraform apply, and green `Cloud static checks` before merge | Upgrade/change GitHub plan, make the repo public, or enable an equivalent ruleset feature |
| GCP account reauthentication required for `abtorres.it@alphaexplora.com` | GCP account owner | Live inventory, API enablement, WIF/service-account creation, and Cloud Run smoke deploys from Codex | Continue local IaC, docs, workflow static tests, backend schema/code work, and access request preparation | Run `gcloud auth login abtorres.it@alphaexplora.com` and `gcloud auth application-default login` locally |
| GCP org/folder permissions not granted yet | GCP organization admin | Folder creation, org IAM, project factory, billing-link automation, and dedicated-customer project placement | Keep Terraform dry-run/static only, maintain IAM matrix, and implement product/runtime code behind feature flags | Required roles in `docs/plans/gcp/gcp-iam-access-request-matrix.md` are granted and verified |
| Postgres/Supabase migration apply verification needs a disposable database URL | Backend owner | Promotion of new runtime schemas beyond local code review | Run `npm run db:verify:gcp-runtime-migration` with `GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL` when a local/shadow DB is available; keep migration expand-only until then | Migration and rollback apply successfully against a Supabase shadow/local database |

## GCP Services/API Matrix

This matrix is the source of truth for which Google Cloud services AlphaCI needs and why. Implementation work must use the service IDs, not only friendly product names.

| Service ID | Product / API | Required for | Launch stance | Owner |
| --- | --- | --- | --- | --- |
| `cloudresourcemanager.googleapis.com` | Cloud Resource Manager API | project metadata, future project factory, labels, IAM/project lookup | Required before shared launch | Admin bootstrap / backend read paths |
| `serviceusage.googleapis.com` | Service Usage API | checking/enabling APIs in managed projects | Required before shared launch | Admin bootstrap first, backend/project factory later |
| `iam.googleapis.com` | IAM API | service accounts, IAM policy bindings | Required before shared launch | Admin bootstrap / backend provisioning jobs |
| `iamcredentials.googleapis.com` | IAM Service Account Credentials API | service account impersonation and WIF token exchange flows | Required before shared launch | Admin bootstrap |
| `sts.googleapis.com` | Security Token Service API | Workload Identity Federation from GitHub OIDC | Required before shared launch | Admin bootstrap |
| `run.googleapis.com` | Cloud Run Admin API | deploying and managing services/revisions | Required before shared launch | Workflow deployer and backend control plane |
| `artifactregistry.googleapis.com` | Artifact Registry API | storing Docker images | Required before shared launch | Workflow deployer / admin bootstrap |
| `secretmanager.googleapis.com` | Secret Manager API | runtime env-var secret storage and references | Required before shared launch | Backend secret writer / runtime service accounts |
| `logging.googleapis.com` | Cloud Logging API | logs links, diagnostics, incident review | Required before shared launch | Platform ops |
| `monitoring.googleapis.com` | Cloud Monitoring API | uptime checks, metrics, alerts | Required before shared launch | Platform ops |
| `dns.googleapis.com` | Cloud DNS API | managed domain DNS zones and custom-domain routing support | Required before domain launch | Infrastructure/IaC owner |
| `compute.googleapis.com` | Compute Engine API | global external Application Load Balancer, static IPs, URL maps, serverless NEGs | Required before domain launch | Infrastructure/IaC owner |
| `certificatemanager.googleapis.com` | Certificate Manager API | managed wildcard/root certificates | Required before domain launch | Infrastructure/IaC owner |
| `cloudbilling.googleapis.com` | Cloud Billing API | billing account/project link checks and future project factory | Required before dedicated-project launch; optional for shared-only smoke test if manually verified | Admin bootstrap / project factory |
| `billingbudgets.googleapis.com` | Cloud Billing Budget API | budgets and cost alerts | Required before broad paid rollout | Platform ops |
| `bigquery.googleapis.com` | BigQuery API | billing export dataset and cost reporting queries | Required before customer workload cost reporting | Platform ops / billing jobs |
| `containeranalysis.googleapis.com` | Container Analysis API | vulnerability and image metadata scanning path | Required before broad production rollout | Supply-chain/security owner |
| `cloudkms.googleapis.com` | Cloud KMS API | optional customer/platform-managed encryption keys | Optional unless CMEK is required | Security owner |
| `sqladmin.googleapis.com` | Cloud SQL Admin API | AlphaCI-owned database only if AlphaCI later moves its own DB to Cloud SQL | Not required for customer DBs | Platform DB owner if adopted |

Enablement rules:

- Shared launch must not start until WIF, Cloud Run, Artifact Registry, Secret Manager, Logging, and Monitoring are enabled and smoke-tested in `alphaci-20260629`.
- Domain launch must not start until Cloud DNS, Compute Engine, and Certificate Manager ownership is defined in IaC or an explicit admin bootstrap runbook.
- Dedicated customer projects must not be product-enabled until Cloud Billing, project factory API enablement, IAM provisioning, Artifact Registry, Secret Manager, Cloud Run, routing, cleanup, and budget behavior are proven end-to-end.
- Customer database support does not require Cloud SQL because AlphaCI does not manage customer databases; AlphaCI stores and injects customer-provided `DATABASE_URL` and related env vars.
- If an API is missing during workflow deployment, the workflow should fail with a safe setup error unless that workflow is explicitly authorized to enable the API.

## GCP Organization Shape

GCP folders should group ownership and environment boundaries. GCP projects are the deployable isolation boundary. Projects cannot contain other projects.

Proposed long-term shape:

```text
alphaexplora.com Organization
|
|-- 00-company-platform
|   |-- ae-billing-admin
|   |-- ae-identity-admin
|   |-- ae-security-admin
|
|-- 10-products
|   |-- alphaci
|   |   |-- ae-alphaci-prod
|   |   |-- ae-alphaci-stg
|   |   |-- ae-alphaci-dev
|   |   |-- ae-alphaci-ops
|   |
|   |-- apicenter
|   |   |-- ae-apicenter-prod
|   |   |-- ae-apicenter-stg
|   |   |-- ae-apicenter-dev
|   |
|   |-- project-alpha
|   |   |-- ae-project-alpha-prod
|   |   |-- ae-project-alpha-stg
|   |   |-- ae-project-alpha-dev
|   |
|   |-- project-beta
|   |   |-- ae-project-beta-prod
|   |   |-- ae-project-beta-stg
|   |   |-- ae-project-beta-dev
|
|-- 20-customer-runtime
|   |-- shared
|   |   |-- ac-shared-prod
|   |   |-- ac-shared-dev
|   |
|   |-- rfm
|   |   |-- ac-rfm-prod
|   |   |-- ac-rfm-dev
|
|-- 30-shared-infra
|   |-- ae-build
|   |-- ae-observability
|   |-- ae-network
|   |-- ae-dns
|
|-- 90-sandbox
|   |-- ae-sandbox
```

Folder meaning:

- `00-company-platform` is for AlphaExplora organization-level administration, security, billing, and identity projects.
- `10-products` is for first-party AlphaExplora products that the company builds and owns, such as AlphaCI, APICenter, Project Alpha, and Project Beta.
- Each product folder owns its own environment projects: `prod`, `stg`, `dev`, and optional `ops`.
- `20-customer-runtime` is only for customer deployments managed by AlphaCI.
- `30-shared-infra` is for shared networking, DNS, observability, and build infrastructure used across AlphaExplora products.
- `90-sandbox` is for experiments and throwaway work.

Naming rule:

- AlphaExplora-owned product projects use `ae-<product-slug>-<env>`.
- AlphaCI-managed customer runtime projects use `ac-<customer-slug>-<env>`.
- Use `ops` only when a product needs product-specific CI, admin jobs, schedulers, or support tooling that should not live in `prod`.

Do not defer this structure as a product afterthought. Create the private `alphaexplora-cloud` repo, then create the folder hierarchy, baseline shared-runtime placement, labels, IAM boundaries, and project-factory skeleton in `00-org-foundation-automation` before broad shared-runtime launch. `alphaci-20260629` can remain the current seed/shared project only if it is reconciled into the Terraform-owned foundation or explicitly documented as a temporary bootstrap exception.

## Naming Policy

Use names that separate business identity from provider location.

Stable logical key:

```text
customerSlug + appSlug + environment + serviceSlot
```

Example:

```text
customerSlug: rfm
appSlug: credit-flow
environment: prod
serviceSlot: api
```

Cloud Run service:

```text
ac-rfm-credit-flow-prod-api
ac-rfm-credit-flow-prod-web
```

Artifact Registry repository:

```text
ac-rfm-credit-flow
```

Artifact Registry layout decision:

- Accepted decision: for shared/lower-tier hosting, use a shared Docker repository per GCP project and region with structured image names.
- Accepted decision: for paid/production customers in dedicated GCP projects, use a customer-scoped repository or a small set of repositories in that customer's project.
- The cost difference between one shared standard repository and many standard repositories is usually not the deciding factor; stored bytes, network transfer, cleanup policy, and vulnerability scanning are the meaningful cost drivers.
- Do not count on cross-repository or cross-project layer deduplication as a cost-control strategy. Separate repositories or projects may store repeated base layers, so cleanup policies matter.

Example shared image names:

```text
asia-southeast1-docker.pkg.dev/alphaci-20260629/alphaci-apps/rfm/credit-flow/api:<sha>
asia-southeast1-docker.pkg.dev/alphaci-20260629/alphaci-apps/rfm/credit-flow/web:<sha>
```

Secret prefix:

```text
ac-rfm-credit-flow-prod-api-*
ac-rfm-credit-flow-prod-web-*
```

Service account:

```text
ac-rfm-credit-flow-prod-api@<gcp-project-id>.iam.gserviceaccount.com
```

Avoid provider-baked names such as:

```text
render-rfm-api
vercel-rfm-web
gcp-rfm-api
```

Provider should be metadata:

```text
provider: gcp
gcpProjectId: alphaci-20260629
region: asia-southeast1
cloudRunServiceName: ac-rfm-credit-flow-prod-api
domain: api.credit-flow.customer-domain.com
```

## Labels

Attach labels to every manageable GCP resource:

```text
managed_by=alphaci
customer=rfm
app=credit-flow
environment=prod
slot=api
migration_group=shared-to-dedicated
```

Labels support filtering, cost attribution, cleanup, and migration tracking. They are not a complete billing-control system by themselves.

Label and slug rules:

- Use lowercase letters, numbers, and dashes for slugs that appear in GCP resource names or domains.
- Keep a canonical internal ID separate from mutable display names.
- Reserve length budget for suffixes such as environment, slot, PR number, and hash.
- If a generated name would exceed a GCP or DNS limit, truncate the human-readable part and append a stable hash.
- Never use customer-provided raw branch names, display names, email addresses, or repository names directly in domains, service accounts, service names, or labels.
- Every resource label set must include `managed_by=alphaci`, `customer`, `app`, `environment`, `slot`, and `runtime_scope` where applicable.

## Phase Plan

### Phase 1: GCP Platform Foundation

Set up the shared AlphaCI GCP runtime project:

- Confirm org and billing account.
- Use `alphaci-20260629` as the first managed deployment project.
- Configure Workload Identity Federation for GitHub Actions.
- Enable required APIs from the GCP Services/API Matrix, using service IDs and launch stance instead of friendly names only.
- For shared launch, minimum required APIs are Cloud Resource Manager, Service Usage, IAM, IAM Credentials, STS, Cloud Run, Artifact Registry, Secret Manager, Logging, and Monitoring.
- For domain launch, also require Cloud DNS, Compute Engine, and Certificate Manager.
- For billing/cost launch, also require Cloud Billing, Billing Budgets, and BigQuery billing export setup.
- Create Artifact Registry repositories.
- Create deployer service accounts.
- Create runtime service accounts.
- Define labels and naming policy.
- Set up billing export to BigQuery, or create an explicit deferral record with owner, reason, and target date.

### Phase 2: Backend Provider Model

Update `cicd-workflow-be` to support GCP as a deployment provider.

Initial goal:

- Add GCP beside Vercel and Render provider types during the transition.
- Put Vercel and Render creation/sync/deploy paths behind explicit feature flags.
- Disable Vercel and Render as options for new managed deployments once the GCP path is ready.
- Store `gcpProjectId`, `region`, `artifactRegistryRepo`, `cloudRunServiceName`, `runtimeServiceAccount`, and `domainMode`.
- Keep provider-agnostic deployment target records while removing bring-your-own deployment provider as a target product feature.
- Remove the bring-your-own deployment provider workflow from the target GCP product model; users provide environment values, custom domains, and external service URLs, not provider hosting credentials.
- Store customer-provided environment variables securely.
- Prefer GCP Secret Manager for runtime secrets.
- Do not provision or manage customer databases in the core product.
- Do not store runtime database credentials in GitHub Secrets unless a specific build-time workflow truly requires it.

Later goal:

- Add a project factory for dedicated customer projects.
- Add migration flow from shared project to dedicated project.


### Phase 2A: Remove Bring-Your-Own Deployment Provider Surface

Removing bring-your-own deployment provider support is a product, API, database, and UI change. It should be treated as a migration, not a text cleanup.

Target behavior:

- Users cannot create or select customer-owned Vercel/Render deployment provider connections.
- New deployment targets cannot use `ownershipMode = byo`.
- New deployment targets cannot provide `providerConnectionId`.
- Legacy Vercel/Render deployment targets remain readable for migration status only.
- Customer custom domains, customer-provided env vars, and external services remain supported.

Database changes:

- Add a forward migration that blocks new `ownership_mode = 'byo'` rows.
- Stop writing `provider_connection_id` for new deployment targets.
- Keep existing `provider_connections` rows only as legacy migration records until Vercel/Render migration is complete.
- Add a later cleanup migration that deletes or archives legacy provider connection rows after all legacy targets are migrated or removed.
- Do not drop credential-bearing tables until encrypted token cleanup has been verified and backed by an audit record.
- Add a migration note that `domainKind = customer_custom` is about DNS routing, not deployment provider ownership.

API changes:

- Remove provider connection create/list/revoke routes from the active product API surface, or gate them behind legacy-admin-only migration flags.
- Reject request payloads containing `ownershipMode = byo` or `providerConnectionId` for new managed deployment targets.
- Remove provider-connection fields from public frontend contracts after compatibility handling is complete.
- Return a clear migration-only error if a legacy client tries to create a bring-your-own provider target.

Frontend changes:

- Remove provider connection settings UI from normal workspace settings.
- Remove ownership/provider-connection selectors from project setup and env provisioning screens.
- Keep domain-management UI separate and label it as custom domain routing, not provider ownership.
- Keep env-var UI for customer-provided external services.

Test requirements:

- Backend rejects new `ownershipMode = byo` target creation.
- Backend rejects `providerConnectionId` on new managed targets.
- Frontend has no provider connection creation or selection controls in normal flows.
- Legacy provider connection APIs are unavailable unless the explicit legacy migration/admin flag is enabled.
- Domain tests prove `domainKind = customer_custom` does not require or imply provider credentials.

### Phase 3: Central Workflow Deployment

Update `cicd-workflow` reusable workflows to deploy containers to GCP.

For frontend and backend targets:

- Authenticate to GCP using Workload Identity Federation.
- Build Docker image.
- Push image to Artifact Registry.
- Deploy image to Cloud Run.
- Apply labels.
- Wire runtime service account.
- Connect secrets by reference.
- Read runtime env vars from GCP Secret Manager.

Frontend apps should not be assumed to be static-only. Next.js and React can both be containerized for the first GCP migration, even if static hosting options are evaluated later.

### Phase 3A: End-to-End Workflow Replacement Scope

The migration is not only a replacement for `vercel-deploy.yml` and `render-deploy.yml`. The full deployment path must be GCP-aware from project setup through post-deploy reporting.

Workflow-level changes:

- Add reusable `gcp-cloud-run-deploy.yml` for container deployment.
- Decide whether to keep `docker-build.yml` separate or fold build/push/deploy into the GCP deploy workflow.
- Authenticate with Workload Identity Federation, not static service account JSON.
- Build Docker images for frontend and backend targets.
- Push images to Artifact Registry.
- Deploy Cloud Run services by project, region, service name, image, runtime service account, labels, and env secret references.
- Support deployment slots such as `frontend`, `backend`, and `standalone`.
- Return outputs: service URL, revision name, image digest, deployment status, and logs URL. If a logs URL cannot be generated, return `logsUrl: null` plus a safe `logsUnavailableReason`.
- Add health-check and rollback behavior after Cloud Run deployment.

Backend and generation changes required before workflows are useful:

- Add `gcp` to deployment provider capabilities.
- Add `gcp_cloud_run` deployment strategy.
- Extend deployment target metadata with `gcpProjectId`, `region`, `artifactRegistryRepo`, `cloudRunServiceName`, `runtimeServiceAccount`, `domainMode`, and label fields.
- Update project scaffold/workflow generation to call the GCP reusable workflow with the right inputs.
- Update env provisioning so customer-provided env vars are stored in GCP Secret Manager and referenced by Cloud Run.
- Keep old Vercel/Render strategies only behind migration/legacy feature flags for existing projects.
- Remove bring-your-own Vercel/Render provider connection flows from the target product surface.

Operational changes required after workflows deploy successfully:

- Store deployment history for Cloud Run revisions.
- Surface Cloud Run service URL, revision, health status, and logs in the AlphaCI dashboard.
- Add cleanup paths for Cloud Run services, images, secret versions, domain mappings, and eventually dedicated projects.
- Add plan limits for max instances, CPU, memory, deploy frequency, image retention, and preview environment lifetime.
- Add migration handling for existing Render/Vercel projects so they can be moved intentionally instead of silently switching providers.
- Add feature-flag tests proving Vercel/Render are hidden or disabled for new projects when GCP-only mode is enabled.
- Add removal tests proving bring-your-own deployment provider creation is not offered in the target GCP flow.

### Phase 3B: Authentication, Preflight, and Test Coverage

The GCP workflow must be tested from the first authentication step through the final deployment result. The current Render and Vercel paths have provider-client tests and workflow-stage mapping, but the GCP migration needs equivalent coverage for Workload Identity Federation, permissions, inputs, and failure behavior.

Authentication and preflight checks:

- Validate required workflow inputs before any build starts: `gcpProjectId`, `region`, `workloadIdentityProvider`, `deployerServiceAccount`, `artifactRegistryRepo`, `cloudRunServiceName`, and image name.
- Validate GitHub job permissions include `id-token: write` for Workload Identity Federation and `contents: read` for checkout.
- Authenticate to GCP using WIF and fail early with a clear error if the provider, service account, or IAM binding is wrong.
- Run `gcloud auth list` or equivalent safe identity check after auth, without printing tokens.
- Verify the target project is the expected project before creating or deploying resources.
- Verify required APIs are enabled before build/deploy: Cloud Run, Artifact Registry, Secret Manager, and IAM-related APIs.
- Verify Artifact Registry exists and the deployer can push to it.
- Verify the Cloud Run deployer can deploy or update the target service.
- Verify the runtime service account exists and has only the needed secret access.
- Verify referenced Secret Manager secrets exist before deploy, or define whether the backend creates missing secrets.

Workflow tests and static validation:

- Add workflow contract docs for `gcp-cloud-run-deploy.yml` like the existing Render/Vercel workflow docs.
- Add YAML/static tests that assert required permissions, required inputs, and branch gates are present.
- Test that no static GCP service account JSON secret is required or referenced.
- Test that deploy jobs use WIF auth before `docker build`, Artifact Registry login, or `gcloud run deploy`.
- Test that image coordinates are generated for Artifact Registry, not GHCR, on the GCP path.
- Test branch/environment mapping for `test`, `uat`, `main`, and pull-request previews using the defaults below.
Branch and environment mapping defaults:

```text
main -> prod
uat -> uat
test -> dev
pull_request -> preview
feature/* -> no long-lived deploy by default; use PR preview if enabled
```

Rules:

- Only `main`, `uat`, and `test` create long-lived environment deployments by default.
- Pull requests create preview deployments only when the plan and repository settings allow previews.
- Direct feature-branch deployments are disabled by default to avoid unbounded services and domains.
- Branch mapping must be stored in backend project settings, not hardcoded only in workflow YAML.
- Workflow tests must fail if an unmapped branch can deploy to a long-lived environment.
- Test that workflow outputs include service URL, revision, image digest, and status where available.

Backend tests required before rollout:

- Capabilities endpoint includes `gcp` only when GCP provider support is enabled.
- Deployment strategy resolver maps GCP targets to `gcp_cloud_run`.
- Deployment target repository accepts and returns GCP metadata fields.
- Project generation emits GCP workflow calls with correct inputs and secret names.
- Env provisioning writes customer-provided env vars to GCP Secret Manager metadata paths, not Render/Vercel APIs.
- Project overview and dashboard summaries understand Cloud Run deployments and do not classify them as Render/Vercel.
- Local CI run stage mapping includes GCP deploy workflow names.
- Deployment history normalization supports Cloud Run revision states and failed deployment messages.

Failure-mode tests:

- Missing WIF provider produces an actionable setup error.
- Missing `id-token: write` fails before build.
- Wrong GCP project fails before deploy.
- Missing API fails with a remediation hint.
- Missing Artifact Registry repo fails before build push.
- Missing runtime service account fails before Cloud Run deploy.
- Missing Secret Manager secret fails before deploy or follows the explicit create-on-provision rule.
- Cloud Run deploy failure does not mark the deployment target as healthy.
- Health check failure is separate from deploy command failure.
- Error messages must not expose env var values, access tokens, or secret payloads.

Live smoke tests, behind explicit approval:

- Deploy a disposable backend container to the shared AlphaCI GCP project.
- Deploy a disposable frontend container to the shared AlphaCI GCP project.
- Verify env var injection from Secret Manager without exposing values in logs.
- Verify health check and dashboard status update.
- Verify cleanup removes Cloud Run service, test image tags, and test secrets.


### Phase 3C: Preview Deployments

Preview deployments should be supported, but they must be bounded by plan limits, TTLs, cleanup, and secret rules from day one.

Recommended model:

- Use separate Cloud Run services for pull-request preview deployments.
- Use Cloud Run revision tags for pre-traffic testing, canaries, and rollout validation on an existing service, not as the main customer PR-preview product model.
- Do not clone or manage customer databases for previews. Customers provide preview-safe env vars or reuse a non-production external database they control.
- Do not inject production secrets into previews by default.
- Every preview must have an owner, source PR/branch, commit SHA, expiration time, labels, and cleanup state.

Why separate services for PR previews:

- Each preview can have isolated env vars, service account, labels, limits, health status, and cleanup lifecycle.
- Preview URLs can follow AlphaCI's active managed-domain model cleanly, using `itsandbox.site` during launch.
- Closing a PR can delete the whole preview service without touching production/staging revisions.
- It avoids mixing customer-facing preview lifecycle with production rollout traffic rules.

Why keep revision tags:

- Cloud Run supports deploying a new revision with no traffic and a tag URL for testing before traffic migration.
- Tagged revisions are useful for production validation and gradual rollouts.
- Tags should be removed when no longer needed to avoid stale preview surfaces and surprise cost behavior.

Preview URL pattern:

```text
pr-{prNumber}-{appSlug}-{customerSlug}.{managedDomainBase}
pr-{prNumber}-api-{appSlug}-{customerSlug}.{managedDomainBase}
```

Preview service names:

```text
ac-{customerSlug}-{appSlug}-pr-{prNumber}-web
ac-{customerSlug}-{appSlug}-pr-{prNumber}-api
```

Branch preview fallback, if non-PR previews are later supported:

```text
br-{branchHash}-{appSlug}-{customerSlug}.{managedDomainBase}
ac-{customerSlug}-{appSlug}-br-{branchHash}-{slot}
```

Do not place raw branch names directly in service names or domains. Normalize and hash branch names to avoid invalid characters, long names, collisions, and accidental information exposure.

Preview metadata:

```text
previewId
previewType: pull_request | branch
sourceProvider: github
repositoryFullName
pullRequestNumber
branchName
branchHash
commitSha
baseEnvironment
previewEnvironment
expiresAt
closedAt
cleanupStatus
planTier
billingStatus
lifecycleStatus
entitlementState
migrationState
previewDomain
previewCloudRunServiceName
```

Preview lifecycle states:

```text
requested
building
deploying
healthy
unhealthy
expired
cleanup_required
deleting
deleted
failed
```

Preview limits:

- Trial: previews disabled by default. Lower/shared paid: maximum 1 active preview per app until cost behavior is proven.
- Production/business paid tiers: previews enabled with a default limit of 5 active previews per app and automatic cleanup.
- Internal AlphaExplora products: previews enabled with a default limit of 10 active previews per product and mandatory TTL/cleanup labels.
- Default TTL: delete preview services 72 hours after PR close, or 7 days after creation if the PR remains inactive.
- Preview max instances default to 1 unless the paid/internal plan explicitly raises it.
- Preview minimum instances default to 0 and require explicit approval to raise.

Preview secret rules:

- Preview deployments can inherit non-sensitive app settings from the base environment.
- Preview deployments must use preview-scoped secrets when secrets differ from dev/staging.
- Production secrets require explicit approval and should normally be blocked for previews.
- Secret names should include preview identity when preview-specific values are stored.
- Deleting a preview must remove preview-specific secrets only, never shared base-environment secrets.

Preview cleanup rules:

- PR closed or merged: mark preview `expired`, then delete Cloud Run preview services, preview-specific secrets, preview URL routes, and image tags after retention.
- PR reopened or updated: redeploy the same preview identity with the new commit SHA.
- Cleanup must verify labels and metadata before deleting anything.
- Failed cleanup leaves `cleanup_required` with a safe error message.

Preview deployment is not done until:

- The backend can create, update, list, expire, and delete preview targets separately from prod/staging targets.
- The workflow can deploy preview services with WIF, Artifact Registry, Cloud Run, labels, health checks, and safe outputs.
- The dashboard shows preview URL, source PR, commit SHA, health, expiration, and cleanup status.
- Closing a PR triggers or schedules cleanup.
- Plan limits prevent unbounded preview services, images, and secrets.
- Tests prove preview cleanup cannot delete production/staging resources.

### Phase 4: Domains and Networking

Start simple but do not trap production domains in a weak design.

Recommended modes:

- AlphaCI-owned default domain first for fast setup.
- Customer-owned custom domain as a production/business paid-tier workflow.
- Wildcard DNS for generated AlphaCI deployment subdomains.
- Global external Application Load Balancer as the target production routing layer.
- Certificate Manager wildcard certificate for AlphaCI-managed subdomains.
- Cloud Run domain mapping only as a simple/dev fallback, not the main product path.

### Load Balancer And Dedicated Project Routing Decision

This is a blocker before production/business dedicated customer projects. The shared launch model can use one load balancer in the shared runtime project. Dedicated customer projects require a deliberate routing topology because serverless NEGs and Cloud Run backends have project/location ownership constraints.

Allowed options to evaluate before implementing dedicated customer routing:

```text
Option A: shared runtime only at launch
- one shared load balancer routes active managed-domain subdomains to Cloud Run services in the shared runtime project
- dedicated customer projects are deferred until the topology below is validated

Option B: central routing project with validated cross-project backend pattern
- one routing project owns DNS/load balancer/certificates
- dedicated customer projects own Cloud Run services
- cross-project service referencing, IAM, Shared VPC, and operational ownership must be proven in a live smoke test before production

Option C: per-customer routing in dedicated projects
- each dedicated customer project owns its own Cloud Run services and routing resources
- DNS delegation/CNAME strategy must avoid fighting the global wildcard managed domain
- cost and certificate limits must be accepted before rollout
```

Current recommendation:

- Use Option A for Phase 1 and lower/shared tiers.
- Treat Option B or C as a separate design gate before enabling production/business dedicated customer projects.
- Do not claim dedicated customer projects are production-ready until a live routing proof shows managed-domain traffic, custom-domain traffic, rollback, and cleanup all work across the chosen topology.
Domain-management model:

- `itsandbox.site` is the temporary AlphaCI-owned launch root site for now.
- The root site is for the AlphaCI product/control plane: public site, dashboard, auth, and docs as needed.
- Managed customer deployments live under generated subdomains of the active AlphaCI managed domain. During launch that domain is `itsandbox.site`, similar to Vercel's `vercel.app` model.
- Every managed deployment gets an AlphaCI-owned URL immediately after deploy.
- Customers can later add their own custom domains without losing the AlphaCI-owned fallback URL.
- Customer custom domains are optional production/business paid-tier aliases added later through a domain-management workflow.


Managed-domain cutover model:

- Treat `itsandbox.site` as a temporary launch domain, not a permanent product assumption.
- Store the active managed domain as configuration and metadata, for example `managedDomainBase=itsandbox.site` now and `managedDomainBase=<future-domain>` later.
- Store generated URLs as domain records with `domainBase`, `domain`, `domainKind`, `isPrimary`, `isFallback`, `isDeprecated`, and `replacementDomainId` instead of deriving everything from one hardcoded suffix.
- Keep deployment identity separate from domain identity: customer/app/environment/slot must not change when the managed domain changes.
- When AlphaCI gets the permanent domain, add it as a second managed domain first, provision wildcard DNS/cert/load-balancer routing, then generate new default URLs on the new domain.
- Keep old `itsandbox.site` URLs as fallbacks during a defined migration window so existing OAuth callbacks, webhooks, bookmarks, and customer docs do not break immediately.
- Dashboard should show the current primary AlphaCI URL, any fallback AlphaCI URL, and any customer custom domain separately.
- New projects should use the newest active managed domain after cutover; existing projects can be migrated lazily or in batches.
- Do not delete or disable `itsandbox.site` routing until logs show no meaningful traffic or the retention/migration window has ended.

Managed-domain cutover acceptance criteria:

- A specific fallback window is defined before cutover starts, for example 90 days unless changed by launch policy.
- The plan states whether old managed-domain URLs proxy, redirect, or both during the fallback window.
- New projects use the newest active managed domain only after wildcard DNS, certificates, load-balancer routing, and dashboard links pass smoke tests.
- Existing projects get both old and new AlphaCI managed-domain records during migration.
- OAuth callback, webhook, and customer documentation risks are tracked before disabling the old managed domain.
- `itsandbox.site` cannot be disabled until traffic logs, audit records, and customer notification state satisfy the retirement gate.
- Disabling the old domain requires explicit human approval and a rollback plan.
Default domain behavior:

- AlphaCI owns and controls DNS for the active managed deployment domain. During launch this is `itsandbox.site`.
- AlphaCI reserves deployment subdomains to avoid collisions and takeover risk.
- The default AlphaCI URL should remain stable even after a customer adds a custom domain.
- Custom domains become aliases/routes to the same deployment, not replacements for the underlying AlphaCI deployment identity.
- Target production path: wildcard DNS plus a global external Application Load Balancer and Certificate Manager wildcard certificate for AlphaCI-managed subdomains.
- Cloud Run services should sit behind serverless network endpoint groups attached to the load balancer.
- Do not rely on Cloud Run domain mappings as the production path for generated customer subdomains; keep them only as a dev/simple fallback.
- Production Cloud Run services should use ingress settings compatible with the load-balancer path and should not expose unmanaged service URLs as the primary customer URL.
- Public web/API services may be internet-reachable through the load balancer; internal/admin services must require explicit auth and should not be exposed through default public routes.

Target routing architecture:

```text
DNS wildcard: *.{managedDomainBase}  # launch value: *.itsandbox.site
  -> global static IP
  -> external Application Load Balancer
  -> URL map / host rules
  -> serverless NEG
  -> Cloud Run service

Certificate Manager:
  - {managedDomainBase}      # launch value: itsandbox.site
  - *.{managedDomainBase}    # launch value: *.itsandbox.site
```

Default AlphaCI domain patterns:

```text
{appSlug}-{customerSlug}.{managedDomainBase}
{slot}-{appSlug}-{customerSlug}.{managedDomainBase}
{env}-{slot}-{appSlug}-{customerSlug}.{managedDomainBase}
```

Examples:

```text
credit-flow-rfm.itsandbox.site
api-credit-flow-rfm.itsandbox.site
uat-api-credit-flow-rfm.itsandbox.site
```

Recommended first version:

```text
prod web: {appSlug}-{customerSlug}.{managedDomainBase}
prod api: api-{appSlug}-{customerSlug}.{managedDomainBase}
nonprod: {env}-{slot}-{appSlug}-{customerSlug}.{managedDomainBase}
```

Custom customer domain patterns:

```text
app.customer.com
api.customer.com
staging-app.customer.com
staging-api.customer.com
```

Domain states to track:

```text
pending_dns
verifying
active
failed
suspended
removed
```

Domain data to store:

```text
domain
domainKind: alphaci_default | alphaci_fallback | customer_custom
environment
slot
gcpProjectId
cloudRunServiceName
domainBase
routingMode: load_balancer | cloud_run_mapping_dev_only
isPrimary
isFallback
isDeprecated
replacementDomainId
certificateStatus
dnsInstructions
lastVerifiedAt
```

Implementation notes:

- AlphaCI-owned domains should be automatic and low-friction.
- Customer custom domains need DNS instructions, verification status, certificate status, and retry behavior.
- Use the load-balancer path for generated AlphaCI managed-domain subdomains and production custom domains.
- Cloud Run domain mapping may be used only for manual/dev experiments with explicit owner and cleanup date.
- The dashboard should show both the AlphaCI default URL and any customer custom domain.

Resolved domain decisions:

- Default AlphaCI deployment URLs are app-first under the active managed domain, for example `{appSlug}-{customerSlug}.{managedDomainBase}` during launch.
- Production custom domains are limited to production/business paid tiers at first.
- OAuth callbacks for AlphaCI platform auth are managed by AlphaCI on the AlphaCI-owned site/dashboard domains.
- OAuth callbacks for deployed customer apps are customer-owned configuration. AlphaCI stores and injects the required environment variables, shows the default and custom callback URLs in the dashboard, and keeps the AlphaCI managed-domain URL as a fallback. Customers still own their OAuth provider credentials and redirect URI registration.

### Phase 5: Cost Tracking and Billing Controls

Use labels and billing export for cost attribution.

Add platform-level controls before relying on GCP billing data:

- Plan limits in AlphaCI.
- Deployment count limits.
- Service size limits.
- Build frequency limits.
- Manual approval for paid runtime tiers.
- Budget alerts.
- Periodic BigQuery cost reports.

Billing export is useful for reporting and margin analysis, but it should not be the only enforcement mechanism.

Billing export setup requirements:

- Choose the BigQuery dataset location before enabling billing export.
- Enable Standard usage cost export and Detailed usage cost export before customer workloads are deployed.
- Treat billing export as forward-looking; do not assume historical costs before export enablement will be backfilled.
- Store billing export dataset/project/table names in platform configuration.
- Add a scheduled cost-import/reporting job after export is enabled, but keep runtime enforcement based on AlphaCI plan limits rather than delayed billing data.


## Customer Lifecycle And Plan Transitions

Plan changes must be modeled as state transitions, not one-off billing events. A billing change can affect runtime scope, custom domains, previews, limits, cleanup, and migration state.

Plan/runtime tiers:

```text
trial
lower_shared
production_business
suspended
canceled
```

Runtime scope by tier:

```text
trial: shared_project
lower_shared: shared_project
production_business: dedicated_customer_project
suspended: keep current runtime temporarily, block risky mutations
canceled: retain metadata during grace period, then cleanup runtime resources
```

Default entitlements:

| Capability | Trial | Lower/shared paid | Production/business paid |
| --- | --- | --- | --- |
| Runtime project | Shared | Shared | Dedicated customer project |
| AlphaCI managed-domain URL | Yes | Yes | Yes |
| Customer custom domain | No | No at first | Yes |
| Preview deployments | Disabled by default | 1 active preview per app | 5 active previews per app by default |
| Max instances | Very low | Low/tier-based | Higher/tier-based |
| Artifact retention | Short | 30 days plus recent versions | 90 days plus recent versions |
| Dedicated project | No | No | Yes |
| Manual approval for destructive cleanup | Yes | Yes | Yes |

Trial signup journey:

1. User creates workspace and project.
2. AlphaCI creates deployment metadata in the shared runtime scope.
3. Deployments use `alphaci-20260629` or the current shared runtime project.
4. User gets an AlphaCI-owned default domain under the active managed domain, using `itsandbox.site` during launch.
5. User can provide env vars and external service URLs, but AlphaCI does not manage their database.
6. Trial limits apply to deploy frequency, max services, max instances, image retention, preview count, and runtime size.
7. Trial resources must have `expiresAt`, owner, labels, and cleanup state.

Trial expiration journey:

1. Enter `trial_expiring` notification window before the trial ends.
2. At expiration, block new deploys, new previews, custom domains, and dedicated-project migration.
3. Keep existing services available for a default 7-day trial grace period, with min instances at 0 and low max-instance limits.
4. After grace, mark runtime resources `cleanup_required` and schedule cleanup for 7 days later unless the user upgrades or requests immediate deletion.
5. Keep project metadata, deployment history, and env-var metadata for account recovery, but do not keep secret payloads longer than the retention policy allows.

Trial to paid upgrade journey:

1. Billing succeeds and plan changes from `trial` to a paid tier.
2. Existing shared-project deployments keep their default AlphaCI managed-domain URLs; `itsandbox.site` URLs remain fallback aliases after a future managed-domain cutover.
3. If upgraded to lower/shared paid, lift trial limits but keep runtime in the shared project.
4. If upgraded to production/business paid, start dedicated customer project provisioning.
5. Dedicated project migration is two-phase: provision and deploy dedicated target first, then move routing after health checks pass.
6. Custom domains become available only after production/business entitlement is active.
7. Existing secrets/env metadata are migrated or recreated in the target runtime scope without exposing values.

Lower/shared paid to production/business upgrade journey:

1. Mark customer runtime as `migration_requested`.
2. Create or reuse dedicated customer GCP project.
3. Link billing, enable APIs, create Artifact Registry, service accounts, Secret Manager namespace, and labels.
4. Deploy the same image or latest approved image to the dedicated project.
5. Verify health checks and domain routing.
6. Move default managed-domain routing to the dedicated target, including any active and fallback AlphaCI-owned domains.
7. Enable custom-domain workflow.
8. Keep shared runtime as rollback until the dedicated target has been healthy for the retention window.
9. Retire shared services only after verification and manual approval if production traffic was involved.

Production/business downgrade to lower/shared paid journey:

Do not immediately delete dedicated infrastructure. Downgrade must protect uptime and give the customer a clear choice.

1. Mark account `downgrade_pending`.
2. Stop new custom-domain additions, new dedicated-project migrations, and higher-tier resource increases.
3. Keep current production services running during a default 30-day downgrade grace period.
4. Disable or expire preview deployments beyond lower-tier limits.
5. Keep existing custom domains active during the 30-day grace period, but mark them as requiring plan resolution.
6. Offer choices:
   - keep production/business plan,
   - migrate back to shared runtime if supported,
   - archive the project,
   - delete managed runtime resources.
7. If migrating back to shared runtime, deploy and verify shared target before moving routing.
8. Remove custom domains if the final lower/shared tier does not include them.
9. Delete dedicated project resources only after manual approval and retention checks.

Production/business downgrade to trial is not supported. Treat it as downgrade to lower/shared paid or cancellation, depending on billing state.

Failed payment journey:

1. Enter `payment_past_due` state.
2. Send notifications and show dashboard warning.
3. Keep existing production services running during a default 14-day payment grace period.
4. Block new deploys, new previews, new custom domains, resource increases, and dedicated project creation.
5. If payment recovers, restore entitlements without redeploying unless a deployment was queued.
6. If payment does not recover, transition to `suspended`, then `canceled` after the retention period.

Cancellation journey:

1. Mark account `cancel_requested` or `canceled_at_period_end`.
2. Keep services running until the paid period ends unless the user requests immediate shutdown.
3. At period end, transition to `suspended` and block deploys/mutations.
4. Keep metadata and recovery window for a default 30-day retention period.
5. Cleanup runtime resources after retention with manual approval for dedicated projects.
6. Never delete customer external services or databases because AlphaCI does not own them.

Project state effects:

| Event | Existing shared project deployments | Existing dedicated customer project deployments | Custom domains | Preview deployments |
| --- | --- | --- | --- | --- |
| Trial starts | Create in shared runtime | Not allowed | Not allowed | Disabled by default |
| Trial expires | Freeze deploys, then cleanup after grace | Not applicable | Not allowed | Delete/expire |
| Upgrade to lower/shared paid | Keep running, lift limits | Not applicable | Still unavailable at first | Limited |
| Upgrade to production/business | Migrate to dedicated if needed | Keep or create dedicated | Enable | Enabled with limits |
| Downgrade to lower/shared paid | Keep or migrate into shared limits | Grace, then migrate/archive/delete by policy | Grace, then remove if no entitlement | Reduce/delete over limit |
| Payment past due | Keep running during grace, block changes | Keep running during grace, block changes | Keep during grace | Expire extras |
| Cancellation | Keep until period end, then suspend/cleanup | Keep until period end, then suspend/cleanup with approval | Remove during cleanup | Delete |

Required lifecycle metadata:

```text
planTier
billingStatus
runtimeScope
entitlementState
trialEndsAt
currentPeriodEndsAt
downgradeEffectiveAt
suspensionStartsAt
cleanupEligibleAt
customDomainEntitlement
previewEntitlement
migrationState
lastPlanChangeReason
```

Lifecycle states:

```text
active_trial
trial_expiring
active_lower_shared
active_production_business
upgrade_pending
migration_requested
migration_in_progress
migration_verified
downgrade_pending
payment_past_due
suspended
cancel_requested
canceled_at_period_end
canceled
cleanup_required
```

Lifecycle invariants:

- Plan downgrade changes entitlements first; it does not immediately delete running production infrastructure.
- Destructive cleanup needs explicit ownership proof from metadata and labels.
- Dedicated customer projects require manual approval before deletion.
- Default AlphaCI managed-domain URLs should remain stable through upgrade and migration; fallback domains should remain available through the defined retention window.
- Custom domains are aliases and can be removed without changing the underlying AlphaCI deployment identity.
- A project over the new downgraded limits may keep running during grace, but new deploys and scale increases are blocked until it fits the plan.
- Customer-provided external services and databases are never deleted by AlphaCI.
- Billing state and runtime state must be separate fields; do not infer one from the other.


## Audit And Observability Requirements

Every lifecycle or infrastructure mutation must write an audit event before the user sees the operation as complete.

Required audit events:

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

Audit rules:

- Audit payloads must never include secret values, tokens, database URLs, or OAuth client secrets.
- Audit events must include workspace, project, actor, action, timestamp, target resource ID, safe status, and correlation ID.
- Every workflow run should emit or return a correlation ID that links GitHub Actions, backend deployment history, Cloud Run revision, and dashboard status.
- Cleanup and deletion events must include the metadata/label selector used to prove ownership.
## Migration From Shared Project to Dedicated Project

Paid/production customers should get dedicated GCP projects. For a customer currently running in the shared project, migration means:

1. Create a dedicated GCP project.
2. Link billing.
3. Enable required APIs.
4. Create Artifact Registry repository.
5. Create runtime service accounts.
6. Recreate or migrate customer-provided environment variables in Secret Manager.
7. Deploy the same images to the new Cloud Run services.
8. Move domain routing.
9. Update AlphaCI metadata from old `gcpProjectId` to new `gcpProjectId`.
10. Retire old services after verification.

This only stays simple if names, labels, and metadata are designed this way from the beginning.

## Provider Deprecation Policy

Target direction:

- GCP Cloud Run is the only managed deployment provider for new AlphaCI-hosted projects.
- Vercel and Render remain feature-flagged legacy providers during migration only.
- Bring-your-own deployment provider hosting is removed from the target product model.
- Customers can still bring external services through environment variables, such as `DATABASE_URL`, API keys, and OAuth credentials.
- AlphaCI owns the deployment surface it manages: GitHub Actions, Artifact Registry, Cloud Run, Secret Manager, domains, and deployment status.
- Existing Vercel/Render projects must be migrated intentionally through a tracked migration flow before legacy provider flags are removed.

Feature flags to add or preserve:

```text
GCP_DEPLOYMENTS_ENABLED=true
LEGACY_VERCEL_PROVIDER_ENABLED=false
LEGACY_RENDER_PROVIDER_ENABLED=false
LEGACY_PROVIDER_CONNECTIONS_ENABLED=false
```

Rollout rule:

```text
Legacy flags may stay enabled in dev/test while migration is being verified.
Production should default to GCP-only for new projects once Cloud Run deploy smoke tests pass.
```

## Resolved Decisions

1. Default deployment URLs are app-first under the active AlphaCI managed domain; `itsandbox.site` is only the temporary launch domain and must be replaceable later.
2. Customer custom domains are limited to production/business paid tiers at first.
3. AlphaCI chooses the OAuth callback policy: AlphaCI manages platform auth callbacks, while customer app OAuth remains customer-owned env/provider configuration.
4. AlphaCI-owned subdomains come first; custom domains are optional production/business paid-tier aliases added later.
5. `Project Alpha`, `Project Beta`, and similar labels mean AlphaExplora product/project groups outside AlphaCI, not individual AlphaCI customers.
6. Paid/production customers get dedicated GCP projects.
7. The default GCP region is `asia-southeast1`.
8. Frontend and backend services live in the same GCP project and region by default.
9. Artifact Registry starts with shared repositories for shared/lower-tier hosting and customer-scoped repositories inside dedicated paid/production projects.
10. Artifact Registry cleanup uses both count and age: always keep currently deployed images, keep recent successful deploys, and delete older images by tier retention window.
11. Custom domains are limited to production/business paid tiers at first.
12. AlphaExplora-owned products like AlphaCI and APICenter live under `10-products`, with one folder per product and environment projects named `ae-<product-slug>-<env>`; AlphaExplora decides each product slug internally when the product is created.
13. Preview deployments use separate Cloud Run services per PR; Cloud Run revision tags are reserved for rollout validation and canary-style testing.
14. Plan lifecycle transitions are explicit: trial and lower/shared tiers use shared runtime, production/business tiers use dedicated projects, and downgrades enter grace before migration, archive, or cleanup.
15. Bring-your-own deployment provider removal requires API, UI, DB, tests, and encrypted credential cleanup; customer custom domains and customer-provided env vars remain supported.
16. Long-lived branch deployments are limited to `main`, `uat`, and `test`; pull requests use bounded preview deployments.
17. Database architecture uses separate Postgres schemas per service or bounded context; new GCP runtime tables must not be added to `public`, and `env_provisioning` remains a migration compatibility schema.
18. The GCP migration requires an operational control plane: infrastructure-as-code for stable platform resources, async backend jobs for app/runtime resources, reconciliation, admin approvals, and audited cleanup.
19. Supply-chain, domain-takeover, quota, notification, disaster-recovery, and admin-tooling requirements are launch blockers, not optional day-two polish.
20. Dedicated customer project routing is not production-ready until the load-balancer/serverless-NEG topology is chosen and proven with a live smoke test.
21. Deployment health must be proven with AlphaCI synthetic probes or workflow probes; do not rely on load-balancer backend health checks for serverless NEGs.
22. `itsandbox.site` is a temporary launch managed domain; a future managed-domain cutover needs fallback duration, redirect/proxy behavior, traffic-retirement gates, and approval rules.
23. Billing export must be enabled before customer workloads if we want complete cost history for the GCP rollout.
24. Artifact Registry cleanup must be reviewed in dry-run mode before enabling active deletion.
25. Phases are non-blocking work tracks: each phase must become independently runnable, while strict gates block promotion to wider rollout rather than all parallel implementation.
26. Org/folder/project foundation is automated from the start through Terraform. Dedicated customer project automation may be built early, but customer-dedicated project creation remains product-disabled until routing, billing, cleanup, quota, and admin approval gates pass.

## Remaining Open Questions

No product-direction questions are open for the current planning scope. AlphaExplora owns and decides first-party product slugs when each product is created, then deploys those products under `10-products` using `ae-<product-slug>-<env>`.

Implementation questions that must be closed in child plans:

- What exact numeric limits apply to trial, lower/shared paid, and production/business paid tiers?
- Which dedicated-project routing topology will be approved after the shared launch path works?
- Which secrets, if any, are allowed in GitHub Actions secrets instead of Secret Manager because they are build-only?
- What exact alert thresholds define stuck provisioning, failed deploy, cleanup backlog, and stale billing export?

## Current Leaning

Recommended default decisions unless later changed:

- Runtime: Cloud Run.
- Image storage: Artifact Registry, using shared repositories for shared/lower-tier hosting and customer-scoped repositories in dedicated paid/production projects.
- Artifact Registry cleanup policy: keep currently deployed images, keep recent successful deploys, and delete older images by age window.
- Auth from GitHub: Workload Identity Federation.
- Runtime secrets: GCP Secret Manager.
- Customer databases: customer-managed; AlphaCI only stores and injects customer-provided env vars.
- Foundation model: Terraform-owned folder/project foundation starts before shared runtime rollout; `alphaci-20260629` remains the current seed/shared project only until reconciled into the foundation or documented as a temporary bootstrap exception.
- First runtime model: shared runtime for AlphaCI platform/lower-tier hosting after org foundation bootstrap.
- Customer isolation model: paid/production customers get dedicated GCP projects.
- Default region: `asia-southeast1`.
- Frontend and backend services live in the same GCP project and region by default.
- AlphaExplora-owned products such as AlphaCI, APICenter, Project Alpha, and Project Beta live under `10-products`; these are first-party products AlphaExplora creates, names, deploys, and owns, not AlphaCI tenants.
- Domain model: app-first AlphaCI-owned default domains under the active managed domain; `itsandbox.site` is the temporary launch domain, future managed domains must be configurable, and customer custom domains are paid-tier aliases added later.
- Custom domains: production/business paid tiers only at first.
- Cost model: labels plus AlphaCI plan limits plus billing export.
- Provider policy: GCP-only for new managed deployments; Vercel/Render legacy paths behind feature flags; bring-your-own deployment provider hosting removed.
- Branch mapping: `main -> prod`, `uat -> uat`, `test -> dev`, pull requests -> preview when enabled.
- Customer lifecycle model: trial and lower/shared paid tiers use shared runtime; production/business paid tiers use dedicated projects; downgrades use grace, entitlement reduction, and explicit migration/archive/delete choices.
- Preview deployment model: separate Cloud Run services per PR with TTL, limits, preview-scoped secrets, and cleanup; revision tags only for pre-traffic testing and canaries.
- Database model: schema-per-service/bounded-context, with GCP runtime state split across deployment, domain, secret-reference, lifecycle, and audit schemas; `env_provisioning` stays as the legacy compatibility schema during migration.
- Control plane model: stable foundation and shared infrastructure are owned by Terraform from the start; customer/app runtime changes run through idempotent async backend jobs with locks, retries, reconciliation, and admin review.
- Launch-readiness model: supply-chain security, domain takeover protection, customer notifications, disaster recovery, quota registry, and admin operations are required before broad production rollout.
- Routing readiness model: shared runtime can use the shared load balancer first; dedicated customer project routing requires a separate validated topology decision before production rollout.
- Health readiness model: deploy success requires synthetic/workflow health probes, not load-balancer backend health for serverless NEGs.
- Cost readiness model: billing export should be enabled before customer workloads, and Artifact Registry deletion policies must start as dry-runs.
- Phase execution model: phases can overlap, but every phase must produce a runnable slice and satisfy its own promotion gates before broader rollout.

## Update Log

- 2026-06-29: Created initial living brainstorm plan from GCP migration discussion.
- 2026-06-29: Clarified that AlphaCI does not manage customer databases; it only stores and injects customer-provided environment variables.
- 2026-06-29: Added end-to-end GCP workflow replacement scope beyond the reusable deployment YAML files.
- 2026-06-29: Added auth, preflight, static validation, backend, failure-mode, and live smoke test coverage for the GCP workflow path.
- 2026-06-29: Added provider deprecation policy: feature-flag Vercel/Render as legacy paths and remove bring-your-own deployment provider hosting from the target product model.
- 2026-06-29: Added Vercel-style domain management model with automatic AlphaCI-owned default URLs and optional customer custom domains.
- 2026-06-29: Set the temporary AlphaCI launch managed deployment domain to `itsandbox.site`.
- 2026-06-29: Clarified that `itsandbox.site` is the temporary AlphaCI launch root site and generated project subdomains behave like Vercel-style default deployment URLs.
- 2026-06-29: Accepted wildcard DNS plus global external Application Load Balancer and Certificate Manager as the target production domain architecture.
- 2026-06-29: Resolved domain, project grouping, dedicated customer project, region, service co-location, OAuth callback, and Artifact Registry layout decisions.
- 2026-06-29: Accepted the Artifact Registry recommendation: shared repositories for shared/lower tiers and customer-scoped repositories for paid/production dedicated projects.
- 2026-06-29: Clarified AlphaExplora-owned product folder structure: first-party products live under `10-products`, separate from AlphaCI-managed customer workloads.
- 2026-06-29: Closed the product-slug open question: AlphaExplora decides first-party product slugs internally when products are created.
- 2026-06-29: Added APICenter as a concrete AlphaExplora-owned product example under `10-products`.
- 2026-06-29: Hardened the plan with implementation invariants, required metadata, phase exit gates, rollback rules, manual approval points, minimum launch defaults, and acceptance checklist.
- 2026-06-29: Added preview deployment model: separate Cloud Run services per PR, bounded by TTL, plan limits, secret rules, and cleanup; revision tags reserved for rollout validation.
- 2026-06-29: Added customer lifecycle and plan transition rules for trial, upgrade, downgrade, failed payment, cancellation, project effects, and lifecycle metadata.
- 2026-06-29: Clarified BYO terminology: remove bring-your-own deployment providers, but keep customer custom domains and customer-provided env vars/external services.
- 2026-06-29: Adversarial plan review tightened BYO removal, DB/API cleanup, branch mapping, preview limits, lifecycle grace periods, label naming, audit events, and Cloud Run ingress/domain guardrails.
- 2026-06-29: Added database schema architecture: schema-per-service/bounded-context, no new GCP runtime tables in `public`, and `env_provisioning` kept as migration compatibility.
- 2026-06-29: Added operational control plane requirements covering infrastructure ownership, IAM matrix, async provisioning, reconciliation, supply-chain security, domain safety, notifications, DR, quotas, admin tooling, and detailed DB migration work.

- 2026-06-30: Added managed-domain cutover model so `itsandbox.site` remains a temporary launch domain and future AlphaCI managed domains can be added without changing deployment identity.
- 2026-06-30: Added review hardening for routing topology, synthetic health probes, concrete WIF policy decisions, managed-domain cutover acceptance, billing export timing, Artifact Registry dry-runs, live GCP bootstrap state, and implementation index.
- 2026-06-30: Added non-blocking phase strategy so phases can overlap as independently runnable slices while strict gates control rollout promotion.
- 2026-06-30: Added split-doc index, pre-implementation hardening checklist, exact GCP services/API matrix, and implementation questions that must close inside child plans.
- 2026-06-30: Created actual child split plans under docs/plans/gcp/ and updated the split-doc index statuses from planned to created.
- 2026-06-30: Expanded all child split plans into detailed implementation plans with concrete files, tasks, tests, rollback, and acceptance gates.
- 2026-07-01: Changed foundation direction so org folders, baseline projects, IAM boundaries, labels, Terraform state, and project-factory skeleton are automated first in `00-org-foundation-automation`; shared runtime still launches before customer-dedicated projects are product-enabled.
- 2026-07-01: Added `gcp-iam-access-request-matrix.md` so every required GCP group, service account, predefined role, custom-role candidate, API, and refused access pattern is requestable before implementation.
- 2026-07-01: Decided actual org/foundation Terraform and admin gcloud scripts must live in a separate private `alphaexplora-cloud` repository; AlphaCI repos keep plans, dependency contracts, and runtime consumers only.
- 2026-07-01: Added an external blocker register for GitHub private-repo branch protection limits, GCP reauthentication, missing org/folder IAM, and local Supabase migration-apply verification.
- 2026-07-01: Added local prep for the migration blocker: `npm run db:verify:gcp-runtime-migration` applies and rolls back the GCP runtime migration against an explicit local/shadow database URL.
- 2026-07-01: Added local prep progress for GCP strategy resolution, provisioning-job repository completion, backend GCP Cloud Run caller generation, and frontend removal of normal BYO/provider-connection creation controls.
