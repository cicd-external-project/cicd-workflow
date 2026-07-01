# GCP IAM Access Request Matrix

Status: Draft request checklist for AlphaCI GCP migration
Updated: 2026-07-02
Scope: AlphaExplora organization, AlphaCI product projects, shared customer runtime, future dedicated customer projects, and shared infrastructure projects.

## Purpose

This document lists the Google Cloud access AlphaCI and the separate `alphaexplora-cloud` infrastructure repo need before implementation. Use it to request access from the GCP organization administrator and to create the first IAM groups, service accounts, WIF bindings, and custom-role candidates.

The rule is separation by identity:

```text
human admins bootstrap and approve
Terraform owns stable foundation
GitHub Actions deploys workloads
Cloud Run runtime reads only what it needs
AlphaCI backend coordinates product lifecycle through narrow control-plane permissions
finance/ops reads billing and observability without deployment power
```

Do not grant broad `roles/owner` or `roles/editor` as the normal operating model. Temporary bootstrap elevation must have an owner, reason, expiry date, and removal checklist.


## Access Request Blockers To Clear

| Blocker | Owner | Blocked live command | Safe local workaround | Clears when | Verification command after grant |
| --- | --- | --- | --- | --- | --- |
| AlphaExplora GCP account reauthentication | GCP account owner | `gcloud organizations list --format=json` and ADC-backed GCP SDK calls | Continue local backend/frontend/workflow/docs work with fake adapters and static validation | `abtorres.it@alphaexplora.com` is the active gcloud and ADC account | `gcloud auth list --filter=status:ACTIVE --format=json` |
| Organization and folder IAM grants | GCP organization admin | `terraform -chdir=infra/gcp/foundation plan` and folder/project factory checks | Keep foundation Terraform static-only and do not edit cloud repo until branch alignment is explicit | Required folder/project/billing roles in this matrix are granted | `gcloud resource-manager folders list --organization=<ORG_ID> --format=json` |
| Billing link permissions | Billing admin or finance owner | Billing-link portions of project factory and billing export setup | Keep billing docs, labels, and entitlement logic local | Billing User/Viewer/Costs Manager paths are granted as listed here | `gcloud billing accounts get-iam-policy <BILLING_ACCOUNT_ID> --format=json` |
| WIF/deployer bootstrap | Cloud operator | `gcloud iam workload-identity-pools create`, service account creation, and deployer IAM binding | Keep GitHub workflows WIF-only and statically validated | WIF pool/provider and service accounts exist through approved automation | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\gcp\verify-shared-runtime.ps1 -ProjectId <PROJECT_ID> -Region asia-southeast1` |
| DNS/certificate/load balancer foundation | Domain/network owner | Cloud DNS, Certificate Manager, and external Application Load Balancer mutations | Keep domain API/UI on fake verifier and managed-domain model | Authoritative DNS/project roles and certificate/load balancer roles are granted | `gcloud dns managed-zones list --project=<DNS_PROJECT_ID> --format=json` |
| Disposable DB migration verification | Backend owner | `npm run db:verify:gcp-runtime-migration` with a disposable DB URL | Keep migration expand-only; run safe no-URL failure locally | Local or shadow Postgres URL is available and confirmed non-production | `npm run db:verify:gcp-runtime-migration` with `GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL` |

## Identity Inventory To Create

| Identity | Type | Purpose | Long-lived? |
| --- | --- | --- | --- |
| `gcp-org-admins@alphaexplora.com` | Google Group | Break-glass organization administration and final IAM approval. | Yes, very small membership |
| `cloud-operators@alphaexplora.com` | Google Group | Humans allowed to run Terraform foundation after approval. | Yes |
| `gcp-platform-viewers@alphaexplora.com` | Google Group | Read-only project, billing, logging, and monitoring inspection. | Yes |
| `gcp-finance-viewers@alphaexplora.com` | Google Group | Billing reports, billing export, budgets, and cost review. | Yes |
| `ae-tf-foundation@<foundation-project>.iam.gserviceaccount.com` | Service account | Terraform foundation automation for folders, baseline projects, IAM, APIs, billing links, state bucket, and project factory skeleton. Used by `alphaexplora-cloud` only. | Yes |
| `alphaci-gha-deployer@<runtime-project>.iam.gserviceaccount.com` | Service account | GitHub Actions deployer reached through Workload Identity Federation. | Yes |
| `alphaci-shared-runtime@<runtime-project>.iam.gserviceaccount.com` | Service account | Cloud Run runtime identity for shared AlphaCI-managed services. | Yes |
| `alphaci-preview-cleaner@<runtime-project>.iam.gserviceaccount.com` | Service account | Scheduled cleanup of expired preview services and old images. | Yes |
| `alphaci-control-plane@<runtime-project>.iam.gserviceaccount.com` | Service account | Backend worker identity for runtime lifecycle, labels, secrets metadata, domains, and reconciliation. | Yes |
| `alphaci-billing-reader@<billing-export-project>.iam.gserviceaccount.com` | Service account | Reads BigQuery billing export and writes cost summaries back to AlphaCI. | Yes |

## Request 1: Human Bootstrap Access

This is the access needed before Terraform can own the foundation.

| Scope | Principal | Role | Why | Expiry |
| --- | --- | --- | --- | --- |
| Organization | `gcp-org-admins@alphaexplora.com` | `roles/resourcemanager.organizationAdmin` | Create/approve org-level folder and IAM bootstrap. | Permanent break-glass |
| Organization or approved parent folder | `cloud-operators@alphaexplora.com` | `roles/resourcemanager.folderAdmin` | Create and manage the planned folder hierarchy. | Remove after Terraform SA works, or keep as emergency operator |
| Organization or approved parent folder | `cloud-operators@alphaexplora.com` | `roles/resourcemanager.projectCreator` | Create baseline projects and future project-factory test projects. | Remove after Terraform SA works |
| Organization | `cloud-operators@alphaexplora.com` | `roles/browser` | Browse organization, folders, and projects during verification. | Keep or replace with viewer group |
| Billing account | `cloud-operators@alphaexplora.com` | `roles/billing.user` | Link newly created projects to the billing account. | Remove after Terraform SA works |
| Billing account | finance owner only | `roles/billing.admin` | Manage billing account, payment methods, billing export, and billing IAM. | Permanent finance/admin only |
| Foundation state project | `cloud-operators@alphaexplora.com` | `roles/storage.admin` | Create and bootstrap the Terraform state bucket. | Remove after state is created |
| Foundation state project | `cloud-operators@alphaexplora.com` | `roles/iam.serviceAccountAdmin` | Create the Terraform foundation service account. | Remove after Terraform SA works |
| Foundation state project | `cloud-operators@alphaexplora.com` | `roles/resourcemanager.projectIamAdmin` | Bind initial IAM for Terraform state and foundation service accounts. | Remove after Terraform SA works |
| Foundation/WIF project | `cloud-operators@alphaexplora.com` | `roles/iam.workloadIdentityPoolAdmin` | Create GitHub OIDC Workload Identity pools/providers. | Remove after Terraform SA works |

## Request 2: Terraform Foundation Service Account

Grant these to `ae-tf-foundation@<foundation-project>.iam.gserviceaccount.com`. This identity should be the normal owner of stable foundation changes after bootstrap.

| Scope | Role | Why |
| --- | --- | --- |
| Organization or approved parent folder | `roles/resourcemanager.folderAdmin` | Manage `00-company-platform`, `10-products`, `20-customer-runtime`, `30-shared-infra`, and `40-sandbox` folders. |
| Organization or approved parent folder | `roles/resourcemanager.projectCreator` | Create baseline AlphaCI, shared runtime, shared infrastructure, sandbox, and future dedicated projects. |
| Organization or approved parent folder | `roles/browser` | Read organization hierarchy during Terraform plan, apply, and drift checks. |
| Managed projects or parent folders | `roles/resourcemanager.projectIamAdmin` | Manage project-level IAM bindings that Terraform owns. |
| Billing account | `roles/billing.user` | Attach new Terraform-created projects to the billing account. |
| Managed projects | `roles/serviceusage.serviceUsageAdmin` | Enable and inspect required APIs. |
| Managed projects | `roles/iam.serviceAccountAdmin` | Create deployer, runtime, cleanup, billing-reader, and control-plane service accounts. |
| Managed service accounts only | `roles/iam.serviceAccountUser` | Configure resources to run as approved service accounts. |
| WIF host project | `roles/iam.workloadIdentityPoolAdmin` | Manage GitHub Workload Identity pools/providers. |
| Artifact Registry projects | `roles/artifactregistry.admin` | Create and configure repositories and cleanup policies. |
| Secret host/runtime projects | `roles/secretmanager.admin` | Create managed secret containers and IAM bindings. Secret values are still controlled by application flows. |
| Domain/network projects | `roles/dns.admin` | Manage `itsandbox.site` wildcard DNS and future AlphaExplora-owned zones if hosted in Cloud DNS. |
| Domain/network projects | `roles/compute.loadBalancerAdmin` | Manage external Application Load Balancer, URL maps, backend services, NEGs, target proxies, and forwarding rules. |
| Domain/network projects | `roles/certificatemanager.owner` | Manage wildcard and custom-domain certificates and certificate maps. |
| Terraform state bucket | `roles/storage.admin` during bootstrap, then narrower bucket/object access | Create bucket, enable versioning, and store Terraform state. Narrow after bootstrap. |
| Billing export project | `roles/bigquery.admin` during bootstrap | Create billing export dataset/tables/views. Narrow after bootstrap. |


## Request 2A: Foundation Terraform CI Through WIF

Grant this only after the private `alphaexplora-cloud` repository exists and branch protections are enabled.

| Scope | Role | Why |
| --- | --- | --- |
| Terraform foundation service account | `roles/iam.workloadIdentityUser` granted to the GitHub WIF principal for `alphaexplora-cloud` only | Allows foundation Terraform CI to impersonate `ae-tf-foundation` without a JSON key. |
| Terraform state bucket | Narrow bucket/object access after bootstrap | Allows Terraform plan/apply to read and update state. Prefer bucket-level access over project-wide Storage Admin after bootstrap. |
| Foundation repository GitHub environment | Protected environment approval, not a GCP IAM role | Requires admin/operator approval before Terraform apply touches org resources. |

WIF conditions for foundation Terraform must restrict at least:

```text
repository_owner == AlphaExplora approved GitHub organization
repository == alphaexplora-cloud
ref == protected default branch or approved release branch
workflow == approved Terraform plan/apply workflow
```
## Request 3: GitHub Actions Deployer Through WIF

Grant these to `alphaci-gha-deployer@<runtime-project>.iam.gserviceaccount.com`. GitHub receives no JSON key. GitHub OIDC must impersonate this service account through a WIF binding restricted by repository, branch/environment, and workflow.

| Scope | Role | Why |
| --- | --- | --- |
| Deployer service account | `roles/iam.workloadIdentityUser` granted to the GitHub WIF principal | Allows GitHub Actions OIDC to impersonate the deployer service account. |
| Target Cloud Run services or runtime project | `roles/run.developer` | Create/update Cloud Run services, revisions, and jobs used by AlphaCI deployments. |
| Target Cloud Run services, or runtime project during bootstrap only | `roles/run.invoker` | Allows the workflow's authenticated post-deploy health probe to call private Cloud Run service URLs. Prefer service-scoped binding after services exist. |
| Target Artifact Registry repo | `roles/artifactregistry.writer` | Push built container images. |
| Runtime service account only | `roles/iam.serviceAccountUser` | Deploy Cloud Run services that run as `alphaci-shared-runtime`. |
| Probe identity service account only | `roles/iam.serviceAccountOpenIdTokenCreator` or narrower approved equivalent | Allows `gcloud auth print-identity-token` for authenticated Cloud Run health probes without using JSON keys. |
| Runtime project | `roles/serviceusage.serviceUsageConsumer` | Required for some deployment flows and quota consumption checks. |
| Runtime project | `roles/logging.viewer` | Read deployment logs for health verification if workflow reports diagnostics. |
| Runtime project | `roles/monitoring.viewer` | Read metrics for smoke checks if workflow reports diagnostics. |

Do not grant the GitHub deployer `roles/owner`, `roles/editor`, billing roles, folder roles, organization roles, Secret Manager Admin, or Project IAM Admin.

## Request 4: Cloud Run Runtime Service Account

Grant these to `alphaci-shared-runtime@<runtime-project>.iam.gserviceaccount.com` and later equivalent dedicated-project runtime service accounts.

| Scope | Role | Why |
| --- | --- | --- |
| Specific runtime secrets only | `roles/secretmanager.secretAccessor` | Read assigned env-var secret payloads at runtime. Prefer per-secret bindings over project-wide access. |
| Runtime project | `roles/logging.logWriter` if not covered by platform defaults | Write application logs. |
| Runtime project | `roles/monitoring.metricWriter` if application writes custom metrics | Write custom metrics. |

The runtime service account must not deploy services, mutate Artifact Registry, create or delete secrets, update IAM, link billing, create projects, manage DNS, or manage certificates.

## Request 5: AlphaCI Backend Control Plane

Grant these to `alphaci-control-plane@<runtime-project>.iam.gserviceaccount.com`. This identity is used by backend workers, not by GitHub Actions.

| Scope | Role | Why |
| --- | --- | --- |
| Runtime project Cloud Run services | `roles/run.developer` | Create/update/delete AlphaCI-managed services, previews, and labels after product approval. |
| Runtime project Artifact Registry repo | `roles/artifactregistry.reader` | Resolve deployed image metadata and digests. |
| Runtime project Artifact Registry repo | `roles/artifactregistry.repoAdmin` only for cleanup worker, or avoid if cleanup is separate | Delete old images according to retention policy. |
| Managed secret containers | `roles/secretmanager.secretVersionAdder` | Add customer-provided env-var values without granting full secret admin. |
| Managed secret containers | `roles/secretmanager.viewer` | Read secret metadata, labels, and version status without reading payloads. |
| Runtime service account only | `roles/iam.serviceAccountUser` | Attach the approved runtime service account to Cloud Run services. |
| Domain/network project | `roles/dns.admin` only if backend manages DNS records directly | Create validation records or managed AlphaCI subdomains if Cloud DNS is authoritative. |
| Domain/network project | `roles/compute.loadBalancerAdmin` only if backend manages routing directly | Add/update serverless NEGs, URL maps, and backend services for project domains. |
| Domain/network project | `roles/certificatemanager.owner` only if backend manages certificates directly | Create/update certificate map entries for managed and custom domains. |
| Runtime project | `roles/logging.viewer` | Show deployment diagnostics without secret payloads. |
| Runtime project | `roles/monitoring.viewer` | Show service health and metrics. |

Prefer splitting domain/routing permissions into `alphaci-domain-manager@...` later instead of keeping them on the general backend worker.

## Request 6: Preview Cleanup And Artifact Cleanup

Grant these to `alphaci-preview-cleaner@<runtime-project>.iam.gserviceaccount.com`.

| Scope | Role | Why |
| --- | --- | --- |
| Preview Cloud Run services | `roles/run.developer` | Delete expired preview services and jobs. |
| Preview Artifact Registry repo | `roles/artifactregistry.repoAdmin` | Delete expired preview images according to retention policy. |
| Preview secrets | `roles/secretmanager.secretVersionManager` | Disable/destroy preview secret versions during cleanup. |
| Runtime project | `roles/logging.viewer` | Produce cleanup evidence without reading secret values. |

## Request 7: Billing, Cost, And Finance

| Scope | Principal | Role | Why |
| --- | --- | --- | --- |
| Billing account | `gcp-finance-viewers@alphaexplora.com` | `roles/billing.viewer` | View cost, invoices, transactions, and billing reports. |
| Billing account | billing export operator or finance owner | `roles/billing.costsManager` | Manage budgets and billing export to BigQuery without full billing account admin. |
| Billing export project/dataset | `alphaci-billing-reader@...` | `roles/bigquery.dataViewer` | Read billing export tables. |
| Billing export project | `alphaci-billing-reader@...` | `roles/bigquery.jobUser` | Run billing aggregation queries. |
| Billing summary destination | `alphaci-billing-reader@...` | `roles/bigquery.dataEditor` only on summary dataset | Write computed tenant/app cost summaries if stored in BigQuery. |

## Request 8: Read-Only Operations

| Scope | Principal | Role | Why |
| --- | --- | --- | --- |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/browser` | Browse project/resource hierarchy. |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/logging.viewer` | Read logs. |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/monitoring.viewer` | Read metrics and dashboards. |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/artifactregistry.reader` | Inspect image names, tags, and digests. |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/run.viewer` | Inspect Cloud Run services and revisions. |
| Managed projects | `gcp-platform-viewers@alphaexplora.com` | `roles/secretmanager.viewer` | Inspect secret metadata only. Does not allow reading payloads. |

## Request 9: Dedicated Customer Project Factory Gate

Do not enable this product path until the dedicated-project gate in `10-shared-to-dedicated-migration.md` passes. The access can be prepared but should stay disabled by feature flag and admin approval.

| Scope | Principal | Role | Why |
| --- | --- | --- | --- |
| `20-customer-runtime/dedicated` folder | `ae-tf-foundation@...` | `roles/resourcemanager.projectCreator` | Create dedicated customer projects through the approved factory pattern. |
| Dedicated customer projects | `ae-tf-foundation@...` | `roles/resourcemanager.projectIamAdmin` | Apply baseline IAM. |
| Dedicated customer projects | `ae-tf-foundation@...` | `roles/serviceusage.serviceUsageAdmin` | Enable Cloud Run, Artifact Registry, Secret Manager, Logging, Monitoring, and IAM APIs. |
| Billing account | `ae-tf-foundation@...` | `roles/billing.user` | Link dedicated projects to billing. |
| Dedicated customer projects | `alphaci-control-plane@...` only after gate | Narrow runtime lifecycle roles | Manage only the customer resources AlphaCI owns. |

## APIs That Need To Be Enabled

Enable APIs through Terraform, not by manual console drift.

| API | Needed for |
| --- | --- |
| `cloudresourcemanager.googleapis.com` | Organizations, folders, projects, and project metadata. |
| `serviceusage.googleapis.com` | API enablement automation. |
| `iam.googleapis.com` | Service accounts, IAM bindings, custom roles, and WIF resources. |
| `iamcredentials.googleapis.com` | Service account impersonation/token exchange flows. |
| `sts.googleapis.com` | Workload Identity Federation token exchange. |
| `artifactregistry.googleapis.com` | Container image storage. |
| `run.googleapis.com` | Cloud Run services/jobs. |
| `secretmanager.googleapis.com` | Env-var secret storage. |
| `logging.googleapis.com` | Logs. |
| `monitoring.googleapis.com` | Metrics and alerting. |
| `cloudbilling.googleapis.com` | Billing link inspection and billing export setup. |
| `bigquery.googleapis.com` | Billing export analysis. |
| `dns.googleapis.com` | Cloud DNS zones and records for `itsandbox.site` or future domain. |
| `compute.googleapis.com` | External Application Load Balancer, serverless NEGs, URL maps, forwarding rules. |
| `certificatemanager.googleapis.com` | Managed certificates and certificate maps. |

## Custom Role Candidates

Start with predefined roles for the first bootstrap because they are easier to audit and supported by Google documentation. After the first working deployment, create custom roles only where they materially reduce standing privilege.

| Candidate custom role | Base permissions to inspect from audit logs | Intended principal |
| --- | --- | --- |
| `AlphaCICloudRunDeployer` | Cloud Run service create/update/get/list, operation get, Artifact Registry upload/download, service account actAs on approved runtime identity, service invoke for health probes, and approved OIDC token minting for the probe identity. | `alphaci-gha-deployer@...` |
| `AlphaCISecretVersionWriter` | Add/list/get/disable secret versions on approved AlphaCI secret names, no payload access except write path. | `alphaci-control-plane@...` |
| `AlphaCIDomainRouter` | Manage URL maps, backend services, serverless NEGs, certificate map entries, DNS records in approved managed zones. | Future `alphaci-domain-manager@...` |
| `AlphaCIPreviewJanitor` | Delete preview Cloud Run services, delete preview images, disable/destroy preview secret versions. | `alphaci-preview-cleaner@...` |

Creating custom roles at the organization level requires an IAM role administrator path such as `roles/iam.organizationRoleAdmin`. Creating custom roles at a project level requires a project role admin path. The org admin should decide where custom roles live.

## Access We Should Explicitly Refuse

| Access | Reason |
| --- | --- |
| Static service account JSON keys | Replaced by Workload Identity Federation and service account impersonation. |
| Organization-wide `roles/owner` or `roles/editor` for automation | Too broad; hard to audit and unsafe for CI/CD. |
| Project Owner for GitHub Actions | Deployment should not imply IAM, billing, folder, or secret-administration power. |
| Runtime service account with Secret Manager Admin | Runtime only needs to access assigned secret payloads. |
| Runtime service account with Cloud Run Admin/Developer | Runtime should run code, not deploy code. |
| Billing admin for deployers or backend workers | Billing access belongs to finance/admin bootstrap, not deployment. |
| Domain registrar access for backend workers | Backend may manage DNS records in Cloud DNS, not registrar ownership. |

## Evidence To Attach To The Access Request

Before requesting access, attach:

```text
organization_id
billing_account_id
foundation_state_project_id
foundation_repo_full_name: <github-org>/alphaexplora-cloud
runtime_project_id
domain_network_project_id
billing_export_project_id
GitHub org/repo names allowed for WIF
GitHub environments/branches allowed for deploy
temporary domain: itsandbox.site
target region: asia-southeast1
```

After access is granted, capture:

```text
gcloud organizations list --format=json
gcloud resource-manager folders list --organization=<ORG_ID> --format=json
gcloud projects get-iam-policy <PROJECT_ID> --format=json
gcloud billing accounts get-iam-policy <BILLING_ACCOUNT_ID> --format=json
gcloud services list --enabled --project=<PROJECT_ID> --format=json
```

Do not capture access tokens, refresh tokens, service account keys, secret payloads, database URLs, OAuth client secrets, or private DNS provider credentials.

## Source References

- Google IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions
- Workload Identity Federation: https://docs.cloud.google.com/iam/docs/workload-identity-federation
- Folder access control: https://docs.cloud.google.com/resource-manager/docs/access-control-folders
- Cloud Billing access control: https://docs.cloud.google.com/billing/docs/how-to/billing-access
- Service Usage access control: https://docs.cloud.google.com/service-usage/docs/access-control
- Cloud Run IAM roles: https://docs.cloud.google.com/run/docs/reference/iam/roles
- Artifact Registry access control: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Secret Manager access control: https://docs.cloud.google.com/secret-manager/docs/access-control
- Cloud DNS roles and permissions: https://docs.cloud.google.com/dns/docs/access-control
- Cloud Storage IAM roles: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- BigQuery IAM roles: https://docs.cloud.google.com/bigquery/docs/access-control
