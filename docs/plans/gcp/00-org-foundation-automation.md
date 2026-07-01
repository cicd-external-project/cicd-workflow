# Org Foundation Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Create the AlphaExplora GCP organization foundation, folder hierarchy, baseline projects, IAM groups, labels, and project-factory skeleton before shared runtime deployment work starts.

**Architecture:** A separate private cloud infrastructure repository, `alphaexplora-cloud`, owns stable organization and folder foundation from the start. A small manual/admin bootstrap can be used only to grant Terraform its initial permissions and configure remote state. AlphaCI consumes foundation outputs but does not own company-wide GCP folders, billing, IAM, DNS, certificates, or Terraform state. Inside `alphaexplora-cloud`, org/global IaC and AlphaCI project-specific IaC must be split into separate stacks and approval gates. Product access to dedicated customer projects remains disabled until routing, billing, cleanup, quota, and admin approval gates pass, but the organization/folder/project factory structure exists early so later migration is controlled instead of improvised.

**Tech Stack:** Terraform, Google Cloud Resource Manager, Cloud Billing, IAM, Service Usage, Cloud Storage remote state, GCP folders, project factory conventions, PowerShell verification scripts.

---

## Source Documents

- Master plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-provider-migration-plan.md`
- Index: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\alphaci-gcp-migration-index.md`
- IAM access request matrix: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\gcp-iam-access-request-matrix.md`
- Bootstrap/access plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\01-bootstrap-access.md`
- Shared-to-dedicated plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\10-shared-to-dedicated-migration.md`

## Decision

Use Terraform from the start for stable foundation resources in the private `alphaexplora-cloud` repository:

```text
folders
baseline projects
folder/project IAM bindings
billing links
labels/tags
state bucket
foundation service accounts
API enablement for foundation projects
```

Use PowerShell or `gcloud` scripts only for:

```text
read-only verification
initial admin bootstrap if Terraform cannot yet run
smoke-test cleanup helpers
evidence collection
```

Do not let the AlphaCI backend or `cicd-workflow` repository create organization folders or broad baseline IAM directly. The backend can request customer/app runtime changes only after the Terraform-owned foundation exists and the backend control-plane gates are complete.

## Repository Ownership

Create a separate private repository for the actual organization/foundation implementation:

```text
alphaexplora-cloud
```

That repository owns:

```text
GCP organization/folder Terraform
baseline project Terraform
folder/project IAM bindings
billing link policy
Terraform state bootstrap and backend config
Cloud DNS, wildcard certificates, load balancer foundation
project factory module skeleton
admin/bootstrap/verification gcloud scripts
foundation runbooks and evidence logs
```

IaC must be separated by blast radius inside this repository:

```text
org/global IaC:
  organization folders
  baseline projects
  billing links and billing export
  WIF foundations
  shared DNS/networking/certificates/load balancer foundation

AlphaCI project-specific IaC:
  shared runtime project resources
  Artifact Registry repositories
  Cloud Run baseline/service-account wiring
  Secret Manager containers and metadata policy
  AlphaCI project outputs consumed by backend/workflows

future customer/dedicated IaC:
  project factory outputs
  dedicated customer project baselines
  dedicated routing attachments
```

Do not mix org/global and AlphaCI project-specific resources in the same Terraform root. Org/global changes require cloud-operator/org-admin review; AlphaCI project-specific changes require cloud-operator and AlphaCI product-owner review after foundation outputs exist.

The AlphaCI repositories own only product/runtime work:

```text
cicd-workflow: reusable GitHub Actions workflows and deployment templates
cicd-workflow-be: AlphaCI backend/control plane
cicd-workflow-fe: AlphaCI dashboard
```

Until `alphaexplora-cloud` exists, this plan remains in `cicd-workflow` as the planning and handoff source. Once the cloud repo is created, copy or move this plan's implementation tasks into that repo and keep this file as the AlphaCI-facing dependency contract.

## Target Folder Hierarchy

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
|
|-- 20-customer-runtime
|   |-- shared
|   |   |-- ac-shared-prod
|   |   |-- ac-shared-dev
|   |
|   |-- dedicated
|   |   |-- customer projects created later by project factory
|
|-- 30-shared-infra
|   |-- ae-build
|   |-- ae-observability
|   |-- ae-network
|   |-- ae-dns
|
|-- 40-sandbox
|   |-- ae-sandbox
```

## Naming Decisions

Folder names:

```text
00-company-platform
10-products
20-customer-runtime
30-shared-infra
40-sandbox
alphaci
apicenter
shared
dedicated
```

Project names:

```text
AlphaExplora first-party products: ae-<product-slug>-<env>
AlphaCI shared customer runtime: ac-shared-<env>
AlphaCI dedicated customer runtime: ac-<customer-slug>-<env>
Infrastructure projects: ae-<infra-purpose>
Sandbox projects: ae-sandbox[-<suffix>]
```

Environment names:

```text
dev
stg
uat
prod
ops
sandbox
```

## Required Permissions Before Implementation

The current known authenticated user had project Owner on `alphaci-20260629` and billing admin on the billing account, but did not have org IAM policy read or folder list access. That is not enough for Terraform-owned org foundation.

Use the access request matrix as the source of truth:

```text
C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\gcp-iam-access-request-matrix.md
```

Minimum access categories that must be requested before implementation:

```text
human bootstrap access
Terraform foundation service account access
GitHub Actions deployer WIF access
Cloud Run runtime service account access
AlphaCI backend control-plane access
preview and artifact cleanup access
billing/cost export access
read-only operations access
future dedicated customer project factory access
```

Avoid broad basic `Owner` at organization level after bootstrap. Use groups, service accounts, narrowly scoped predefined roles, and later custom roles where audit logs show a stable permission set.

## Files To Create Or Modify

### `alphaexplora-cloud`

- Create `infra/gcp/foundation/README.md`: foundation overview and operator runbook.
- Create `infra/gcp/foundation/main.tf`: root Terraform module wiring.
- Create `infra/gcp/foundation/variables.tf`: organization ID, billing account, folder names, project IDs, labels, and regions.
- Create `infra/gcp/foundation/outputs.tf`: folder IDs, project IDs, project numbers, service account emails, state bucket name.
- Create `infra/gcp/foundation/versions.tf`: Terraform and Google provider constraints.
- Create `infra/gcp/foundation/backend.tf.example`: remote state backend template.
- Create `infra/gcp/foundation/folders.tf`: folder hierarchy.
- Create `infra/gcp/foundation/projects.tf`: baseline shared, product, infrastructure, and sandbox projects.
- Create `infra/gcp/foundation/iam.tf`: group and service-account IAM bindings.
- Create `infra/gcp/foundation/apis.tf`: baseline API enablement for foundation projects.
- Create `infra/gcp/foundation/labels.tf`: common label/tag locals.
- Create `scripts/gcp/verify-org-foundation.ps1`: read-only verification script.
- Create `docs/gcp/org-foundation-automation.md`: human runbook and evidence log.

### Related plan updates

- Update `docs/plans/alphaci-gcp-migration-index.md` so this plan is the first implementation slice.
- Update `docs/plans/alphaci-gcp-provider-migration-plan.md` so org foundation automation is not deferred.
- Update `docs/plans/gcp/01-bootstrap-access.md` so it consumes cloud repo outputs instead of owning folders/projects.
- Update `docs/plans/gcp/10-shared-to-dedicated-migration.md` so dedicated project factory uses the `20-customer-runtime/dedicated` folder created by `alphaexplora-cloud`.

### `cicd-workflow` planning handoff

- Keep this plan, the migration index, and AlphaCI-facing dependency contract updated until the cloud repo exists.
- Do not create live org Terraform, billing IAM, DNS, certificate, or load balancer files in `cicd-workflow`.
- After `alphaexplora-cloud` exists, link the cloud repo README and commit SHA from this plan.

## Terraform State Model

First version:

```text
State project: ae-security-admin or ae-alphaci-ops, chosen during admin bootstrap
State bucket: ae-tfstate-alphaci-gcp-foundation
State prefix: org-foundation
State access: Terraform operators and CI service account only
```

Remote state must not be stored in a developer laptop path as the source of truth. Local state is allowed only for a throwaway dry run before any real resource creation.

## Foundation Labels

Every Terraform-created project should include:

```text
managed_by=alphaci
owner=alphaexplora
foundation=org-foundation
environment=<dev|stg|uat|prod|ops|sandbox|shared>
runtime_scope=<platform|product|shared_customer_runtime|dedicated_customer_runtime|shared_infra|sandbox>
cost_center=<alphaexplora|alphaci|apicenter|customer-runtime|shared-infra>
```

Do not put customer email, raw repository name, or sensitive business details in project IDs, folder names, labels, or tags.

## Product Gate Boundary

Automation that should exist from the start:

```text
folder hierarchy
shared runtime projects
baseline infrastructure projects
project factory module skeleton
dedicated customer folder
dedicated project naming and metadata model
IAM and billing link patterns
verification scripts
```

Product behavior that remains disabled until later gates:

```text
automatically creating dedicated projects for every customer
moving production customer traffic to dedicated projects
customer-visible dedicated project controls
custom-domain routing across dedicated projects
active deletion of dedicated projects without manual approval
```

## Tasks

### Task 0: Create The private cloud repository

**Files:**

- Create repository: `alphaexplora-cloud`
- Create local checkout after repository creation: `C:\Codes\cicd-ex\alphaexplora-cloud`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\README.md`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\CODEOWNERS`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\.gitignore`

Steps:

- [ ] Create `alphaexplora-cloud` as a private repository under the approved AlphaExplora GitHub organization.
- [ ] Restrict write/admin access to foundation operators only.
- [ ] Require pull request review from infrastructure owner or org admin group before merge.
- [ ] Add CODEOWNERS for `infra/gcp/**`, `scripts/gcp/**`, and `docs/gcp/**`.
- [ ] Add `.gitignore` entries for `.terraform/`, `*.tfstate`, `*.tfstate.*`, `.terraform.lock.hcl` policy decision, local credentials, and generated plan files.
- [ ] Document that the repo must never store service account JSON keys, OAuth tokens, database URLs, or secret payloads.

Verification:

```powershell
git -C C:\Codes\cicd-ex\alphaexplora-cloud status --short --branch
```

Expected: private cloud repo exists locally, has a protected default branch policy in GitHub, and has no Terraform state or credentials committed.
### Task 1: Add Foundation Terraform Skeleton

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\versions.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\variables.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\main.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\outputs.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\backend.tf.example`

Steps:

- [ ] Pin Terraform and Google provider versions in `versions.tf`.
- [ ] Define variables for `organization_id`, `billing_account`, `default_region`, `folder_names`, `project_ids`, `labels`, and `terraform_state_bucket`.
- [ ] Add outputs for folder IDs, project IDs, project numbers, state bucket, and foundation service accounts.
- [ ] Keep `backend.tf.example` as a template until the state bucket exists.

Verification:

```powershell
terraform -chdir=C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation fmt -check
terraform -chdir=C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation validate
```

Expected before provider initialization: validation may require `terraform init`; record exact output in the runbook.

### Task 2: Add Folder Hierarchy Terraform

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\folders.tf`

Steps:

- [ ] Create top-level folders: `00-company-platform`, `10-products`, `20-customer-runtime`, `30-shared-infra`, `40-sandbox`.
- [ ] Create child folders: `alphaci`, `apicenter`, `shared`, `dedicated`.
- [ ] Output all folder IDs.
- [ ] Add comments warning that moving production projects between folders can change inherited IAM/policies and needs review.

Verification:

```powershell
terraform -chdir=C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation plan -target=google_folder.company_platform -target=google_folder.products -target=google_folder.customer_runtime -target=google_folder.shared_infra -target=google_folder.sandbox
```

Expected: plan shows folder creation only; no projects or IAM changes in this targeted check.

### Task 3: Add Baseline Project Terraform

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\projects.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\labels.tf`

Steps:

- [ ] Define baseline projects for AlphaCI product environments and shared customer runtime.
- [ ] Put `ae-alphaci-*` projects under `10-products/alphaci`.
- [ ] Put `ac-shared-*` projects under `20-customer-runtime/shared`.
- [ ] Put shared infra projects under `30-shared-infra`.
- [ ] Apply common labels to every project.
- [ ] Link billing only where the operator has approved billing linkage.

Verification:

```powershell
terraform -chdir=C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation plan -target=google_project.alpha_ci_dev -target=google_project.alpha_ci_ops -target=google_project.customer_shared_dev
```

Expected: plan shows project creation/linkage for targeted baseline only.

### Task 4: Add IAM And API Enablement Terraform

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\iam.tf`
- Create `C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation\apis.tf`

Steps:

- [ ] Define foundation service accounts for Terraform automation and deploy automation.
- [ ] Assign least-privilege project/folder IAM, not organization-wide Owner.
- [ ] Enable only foundation APIs needed for each baseline project.
- [ ] Keep dedicated customer project factory permissions disabled until the dedicated-project gate passes.
- [ ] Record every broad role with reason and review date.

Verification:

```powershell
terraform -chdir=C:\Codes\cicd-ex\alphaexplora-cloud\infra\gcp\foundation plan -target=google_project_service.alpha_ci_ops_services
```

Expected: plan shows API enablement only for targeted project services.

### Task 5: Add Read-Only Foundation Verification Script

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\verify-org-foundation.ps1`

Script requirements:

- Accept `OrganizationId`, `ExpectedDomain`, and optional expected folder/project IDs.
- Run metadata-only `gcloud` checks.
- Verify folder visibility, project parent placement, billing link state, and enabled APIs.
- Never print access tokens, refresh tokens, service account keys, or secret values.
- Exit non-zero with safe remediation hints when permissions are missing.

Verification:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Codes\cicd-ex\alphaexplora-cloud\scripts\gcp\verify-org-foundation.ps1 -OrganizationId 905531103378 -ExpectedDomain alphaexplora.com
```

Expected before org permissions exist: safe failures for folder list/org visibility, no token output.

### Task 6: Add Foundation Runbook

**Files:**

- Create `C:\Codes\cicd-ex\alphaexplora-cloud\docs\gcp\org-foundation-automation.md`

Runbook must include:

- Required admin permissions.
- Link to the IAM access request matrix.
- Terraform state bootstrap steps.
- Exact folder hierarchy.
- Baseline project list.
- Billing link policy.
- IAM group/service account policy.
- Dry-run and apply commands.
- Verification commands.
- Rollback limitations for folders and projects.
- Evidence log section.

## Rollback

- Terraform-created test/sandbox projects can be scheduled for deletion only after owner approval.
- Production/product folders should not be deleted once projects are placed under them.
- Moving a project out of a folder can change inherited IAM and org policies; require review before moves.
- If Terraform foundation apply fails midway, run `terraform plan` again and inspect state before manual changes.
- Never use `git reset`, `terraform destroy`, or bulk project deletion as a shortcut for foundation rollback.

## Acceptance Gates

- Private `alphaexplora-cloud` repository exists with restricted write access, CODEOWNERS, branch protection, and no committed credentials or Terraform state.
- Terraform plan can represent the target folder hierarchy without manual console-only state.
- Foundation runbook names the required admin permissions and current access gaps.
- `verify-org-foundation.ps1` can safely report missing org/folder permissions without printing secrets.
- Shared runtime projects are placed under `20-customer-runtime/shared` or an explicitly documented temporary parent.
- Project factory skeleton exists for `20-customer-runtime/dedicated`, but customer-dedicated project creation remains product-disabled until plan 10 gates pass.
- Master plan and index list this plan as the first implementation dependency.
