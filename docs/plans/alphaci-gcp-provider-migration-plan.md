# AlphaCI GCP Provider Migration Plan

Status: Living brainstorm plan, hardened review pass 2026-06-29  
Branch: `feature/migrate-vercel-render-to-gcp` 
Created: 2026-06-29  
GCP seed project: `alphaci-20260629`

## Purpose

AlphaCI currently models managed deployment around Vercel for frontend targets and Render for backend targets. The goal is to move the managed runtime to Google Cloud Platform while keeping the platform easy to operate now and easy to migrate into stronger tenant isolation later.

This document is intentionally provisional. Update it as product, security, cost, domain, and deployment decisions are made.

## Current Recommendation

Start with one shared AlphaCI-managed GCP project for the first implementation:

```text
alphaci-20260629
```

Design the data model and naming as if every deployment can move to a dedicated GCP project later. Do not hardcode the shared project as a global assumption.

Recommended first path:

```text
Shared GCP project now
Tenant/project abstraction from day one
Dedicated customer projects later for paid or production workloads
```

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
routingMode: load_balancer | cloud_run_mapping_dev_only
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

## Phase Exit Gates

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
- Health check failure does not mark deployment healthy.
- Static workflow tests prove no service account JSON secret is referenced.

Phase 3C, preview deployments, is not done until:

- Preview deployments are represented as separate deployment targets from production/staging.
- Preview Cloud Run service names and domains are deterministic, normalized, and collision-safe.
- Preview secrets are scoped separately and production secrets are blocked unless explicitly approved.
- Closing or merging a PR triggers preview expiration and cleanup.
- Plan limits cap active previews, max instances, TTL, images, and preview-specific secrets.
- Cleanup tests prove preview deletion cannot delete production/staging services, images, domains, or secrets.
Phase 4, domains and networking, is not done until:

- `itsandbox.site` and `*.itsandbox.site` route through the target load-balancer path.
- Certificate Manager covers root and wildcard domains.
- Domain reservation prevents two apps from claiming the same generated subdomain.
- The dashboard shows default domain, custom domain status, DNS instructions, certificate status, and last verification time.
- Custom domains are gated to production/business paid tiers.

Phase 5, cost and controls, is not done until:

- Plan limits and lifecycle states exist before depending on GCP billing export.
- Max instances, deploy frequency, image retention, and preview lifetime are enforced by AlphaCI.
- BigQuery billing export is used for reporting and margin checks, not real-time enforcement.
- Cleanup jobs can list only AlphaCI-owned resources by labels and metadata.

Dedicated customer projects are not production-ready until:

- Project creation, billing link, API enablement, IAM setup, Artifact Registry setup, Secret Manager setup, and cleanup are idempotent.
- Failed project provisioning leaves a clear `cleanup_required` or `failed` state.
- Migration from shared to dedicated preserves domains, env vars, deployment history, and rollback path.
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
- Artifact Registry cleanup: keep currently deployed images, keep the last 10 successful deploys per service, delete older lower-tier images after 30 days, and delete older production/business images after 90 days unless under incident hold.
- Preview deployments: use separate Cloud Run services per PR, require expiration time and cleanup owner at creation, default min instances to 0, and delete after PR close or inactivity TTL.
- Trial/lower/shared tiers run in the shared runtime scope; production/business paid tiers get dedicated customer projects.
- Downgrades enter a grace state first; do not immediately delete dedicated infrastructure or remove custom domains without retention and approval rules.
- Dashboard status: never show success until deploy, health check, and metadata persistence all succeed.

## Acceptance Checklist Before Implementation

Before implementation starts, the plan is considered ready only if these are true:

- There are no open product architecture questions for the current scope.
- Shared-project launch and dedicated-project future path both use the same metadata model.
- Provider feature flags have clear default values for dev, test, uat, and prod.
- Security-sensitive values have a defined storage location and redaction rule.
- Every phase has an exit gate and a failure state.
- Every live GCP action has a cleanup path.
- Every customer-visible domain path has a default URL, custom-domain rule, and rollback behavior.

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

- Reserve generated `itsandbox.site` subdomains before exposing them.
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
|-- 20-alphaci-customer-workloads
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
- `20-alphaci-customer-workloads` is only for customer deployments managed by AlphaCI.
- `30-shared-infra` is for shared networking, DNS, observability, and build infrastructure used across AlphaExplora products.
- `90-sandbox` is for experiments and throwaway work.

Naming rule:

- AlphaExplora-owned product projects use `ae-<product-slug>-<env>`.
- AlphaCI-managed customer runtime projects use `ac-<customer-slug>-<env>`.
- Use `ops` only when a product needs product-specific CI, admin jobs, schedulers, or support tooling that should not live in `prod`.

For phase 1, we can defer most of this structure and operate inside `alphaci-20260629`, while recording metadata that supports this future shape.

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
- Enable required APIs:
  - Cloud Resource Manager API.
  - IAM APIs needed for WIF.
  - Cloud Run API.
  - Artifact Registry API.
  - Secret Manager API.
  - Cloud Billing APIs only if billing automation is in first scope; otherwise record the billing-export deferral owner, reason, and target date.
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
- Preview URLs can follow AlphaCI's `itsandbox.site` domain model cleanly.
- Closing a PR can delete the whole preview service without touching production/staging revisions.
- It avoids mixing customer-facing preview lifecycle with production rollout traffic rules.

Why keep revision tags:

- Cloud Run supports deploying a new revision with no traffic and a tag URL for testing before traffic migration.
- Tagged revisions are useful for production validation and gradual rollouts.
- Tags should be removed when no longer needed to avoid stale preview surfaces and surprise cost behavior.

Preview URL pattern:

```text
pr-{prNumber}-{appSlug}-{customerSlug}.itsandbox.site
pr-{prNumber}-api-{appSlug}-{customerSlug}.itsandbox.site
```

Preview service names:

```text
ac-{customerSlug}-{appSlug}-pr-{prNumber}-web
ac-{customerSlug}-{appSlug}-pr-{prNumber}-api
```

Branch preview fallback, if non-PR previews are later supported:

```text
br-{branchHash}-{appSlug}-{customerSlug}.itsandbox.site
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

Domain-management model:

- `itsandbox.site` is the AlphaCI-owned root site for now.
- The root site is for the AlphaCI product/control plane: public site, dashboard, auth, and docs as needed.
- Managed customer deployments live under generated subdomains of `itsandbox.site`, similar to Vercel's `vercel.app` model.
- Every managed deployment gets an AlphaCI-owned URL immediately after deploy.
- Customers can later add their own custom domains without losing the AlphaCI-owned fallback URL.
- Customer custom domains are optional production/business paid-tier aliases added later through a domain-management workflow.

Default domain behavior:

- AlphaCI owns and controls DNS for `itsandbox.site`.
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
DNS wildcard: *.itsandbox.site
  -> global static IP
  -> external Application Load Balancer
  -> URL map / host rules
  -> serverless NEG
  -> Cloud Run service

Certificate Manager:
  - itsandbox.site
  - *.itsandbox.site
```

Default AlphaCI domain patterns:

```text
{appSlug}-{customerSlug}.itsandbox.site
{slot}-{appSlug}-{customerSlug}.itsandbox.site
{env}-{slot}-{appSlug}-{customerSlug}.itsandbox.site
```

Examples:

```text
credit-flow-rfm.itsandbox.site
api-credit-flow-rfm.itsandbox.site
uat-api-credit-flow-rfm.itsandbox.site
```

Recommended first version:

```text
prod web: {appSlug}-{customerSlug}.itsandbox.site
prod api: api-{appSlug}-{customerSlug}.itsandbox.site
nonprod: {env}-{slot}-{appSlug}-{customerSlug}.itsandbox.site
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
domainKind: alphaci_default | customer_custom
environment
slot
gcpProjectId
cloudRunServiceName
routingMode: load_balancer | cloud_run_mapping_dev_only
certificateStatus
dnsInstructions
lastVerifiedAt
```

Implementation notes:

- AlphaCI-owned domains should be automatic and low-friction.
- Customer custom domains need DNS instructions, verification status, certificate status, and retry behavior.
- Use the load-balancer path for generated `itsandbox.site` subdomains and production custom domains.
- Cloud Run domain mapping may be used only for manual/dev experiments with explicit owner and cleanup date.
- The dashboard should show both the AlphaCI default URL and any customer custom domain.

Resolved domain decisions:

- Default AlphaCI deployment URLs are app-first: `{appSlug}-{customerSlug}.itsandbox.site`.
- Production custom domains are limited to production/business paid tiers at first.
- OAuth callbacks for AlphaCI platform auth are managed by AlphaCI on the AlphaCI-owned site/dashboard domains.
- OAuth callbacks for deployed customer apps are customer-owned configuration. AlphaCI stores and injects the required environment variables, shows the default and custom callback URLs in the dashboard, and keeps the `itsandbox.site` URL as a fallback. Customers still own their OAuth provider credentials and redirect URI registration.

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
| Default `itsandbox.site` domain | Yes | Yes | Yes |
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
4. User gets an AlphaCI-owned default domain under `itsandbox.site`.
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
2. Existing shared-project deployments keep their default `itsandbox.site` URLs.
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
6. Move default `itsandbox.site` routing to the dedicated target.
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
- Default `itsandbox.site` URLs should remain stable through upgrade and migration.
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

1. Default deployment URLs are app-first under `itsandbox.site`.
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

## Remaining Open Questions

None for the current planning scope. AlphaExplora owns and decides first-party product slugs when each product is created, then deploys those products under `10-products` using `ae-<product-slug>-<env>`.

## Current Leaning

Recommended default decisions unless later changed:

- Runtime: Cloud Run.
- Image storage: Artifact Registry, using shared repositories for shared/lower-tier hosting and customer-scoped repositories in dedicated paid/production projects.
- Artifact Registry cleanup policy: keep currently deployed images, keep recent successful deploys, and delete older images by age window.
- Auth from GitHub: Workload Identity Federation.
- Runtime secrets: GCP Secret Manager.
- Customer databases: customer-managed; AlphaCI only stores and injects customer-provided env vars.
- First project model: shared `alphaci-20260629` for the AlphaCI platform and lower-tier/shared hosting.
- Customer isolation model: paid/production customers get dedicated GCP projects.
- Default region: `asia-southeast1`.
- Frontend and backend services live in the same GCP project and region by default.
- AlphaExplora-owned products such as AlphaCI, APICenter, Project Alpha, and Project Beta live under `10-products`; these are first-party products AlphaExplora creates, names, deploys, and owns, not AlphaCI tenants.
- Domain model: app-first AlphaCI-owned default domains on `itsandbox.site`, routed through wildcard DNS plus a global external Application Load Balancer; customer custom domains are paid-tier aliases added later.
- Custom domains: production/business paid tiers only at first.
- Cost model: labels plus AlphaCI plan limits plus billing export.
- Provider policy: GCP-only for new managed deployments; Vercel/Render legacy paths behind feature flags; bring-your-own deployment provider hosting removed.
- Branch mapping: `main -> prod`, `uat -> uat`, `test -> dev`, pull requests -> preview when enabled.
- Customer lifecycle model: trial and lower/shared paid tiers use shared runtime; production/business paid tiers use dedicated projects; downgrades use grace, entitlement reduction, and explicit migration/archive/delete choices.
- Preview deployment model: separate Cloud Run services per PR with TTL, limits, preview-scoped secrets, and cleanup; revision tags only for pre-traffic testing and canaries.
- Database model: schema-per-service/bounded-context, with GCP runtime state split across deployment, domain, secret-reference, lifecycle, and audit schemas; `env_provisioning` stays as the legacy compatibility schema during migration.
- Control plane model: stable shared infrastructure is owned by infrastructure-as-code; customer/app runtime changes run through idempotent async backend jobs with locks, retries, reconciliation, and admin review.
- Launch-readiness model: supply-chain security, domain takeover protection, customer notifications, disaster recovery, quota registry, and admin operations are required before broad production rollout.

## Update Log

- 2026-06-29: Created initial living brainstorm plan from GCP migration discussion.
- 2026-06-29: Clarified that AlphaCI does not manage customer databases; it only stores and injects customer-provided environment variables.
- 2026-06-29: Added end-to-end GCP workflow replacement scope beyond the reusable deployment YAML files.
- 2026-06-29: Added auth, preflight, static validation, backend, failure-mode, and live smoke test coverage for the GCP workflow path.
- 2026-06-29: Added provider deprecation policy: feature-flag Vercel/Render as legacy paths and remove bring-your-own deployment provider hosting from the target product model.
- 2026-06-29: Added Vercel-style domain management model with automatic AlphaCI-owned default URLs and optional customer custom domains.
- 2026-06-29: Set AlphaCI default managed deployment domain to `itsandbox.site`.
- 2026-06-29: Clarified that `itsandbox.site` is the AlphaCI root site and generated project subdomains behave like Vercel-style default deployment URLs.
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
