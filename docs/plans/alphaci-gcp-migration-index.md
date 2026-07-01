# AlphaCI GCP Migration Plan Index

Status: Living index for the AlphaCI migration from Vercel/Render to GCP
Branch: `feature/migrate-vercel-render-to-gcp`
Created: 2026-06-30
Master plan: `docs/plans/alphaci-gcp-provider-migration-plan.md`
IAM access request matrix: `docs/plans/gcp/gcp-iam-access-request-matrix.md`
Cloud implementation repo: `alphaexplora-cloud`
Implementation board: `docs/plans/alphaci-gcp-implementation-board.html`

## Purpose

Use this file as the entry point once the master brainstorm plan is split into smaller implementation plans. The master plan remains the decision source until a child plan is created and linked here.

Do not start broad implementation from the master plan alone. Pick one indexed area, create or update its focused child plan, then implement that slice behind the gates named here.

Use the implementation board for review meetings and implementation walkthroughs:

```text
docs/plans/alphaci-gcp-implementation-board.html
```

## Plan Map

| Order | Area | Child plan | Status | Blocks |
| --- | --- | --- | --- | --- |
| 0 | Master decisions and invariants | `docs/plans/alphaci-gcp-provider-migration-plan.md` | Active | All implementation plans |
| 0A | Implementation board | `docs/plans/alphaci-gcp-implementation-board.html` | Active | Human review of decisions, tasks, access, and repo boundaries |
| 0B | Access-independent local implementation queue | `docs/plans/gcp/11-access-independent-local-implementation.md` | Active | Safe backend, workflow, frontend, database, and cloud-repo work while GCP access is blocked |
| 1 | Cloud repo and org foundation automation | `docs/plans/gcp/00-org-foundation-automation.md` | Detailed | private cloud repo, folders, baseline projects, IAM boundaries, access matrix, Terraform state |
| 2 | GCP bootstrap and access | `docs/plans/gcp/01-bootstrap-access.md` | Detailed | Live deploys, WIF, Artifact Registry, Secret Manager, Cloud Run |
| 3 | Database expand-contract migration | `docs/plans/gcp/02-database-expand-contract.md` | Detailed | Backend runtime metadata, lifecycle state, BYO removal |
| 4 | Backend control plane | `docs/plans/gcp/03-backend-control-plane.md` | In progress | Local capability service, GCP strategy resolver, and provisioning-job repository slices landed; orchestration, reconciliation, and approvals remain |
| 5 | Central workflow replacement | `docs/plans/gcp/04-central-workflow-cloud-run.md` | In progress | Backend caller generation and reusable GCP Cloud Run workflow contract landed; remaining caller-template updates and live smoke test remain |
| 6 | Domains and routing | `docs/plans/gcp/05-domains-routing.md` | Detailed | Managed domains, wildcard DNS, load balancer, custom domains |
| 7 | Preview deployments | `docs/plans/gcp/06-preview-deployments.md` | Detailed | PR services, TTL, preview secrets, cleanup |
| 8 | Legacy provider deprecation | `docs/plans/gcp/07-legacy-provider-deprecation.md` | In progress | Frontend BYO creation controls hidden/removed locally; backend rejection, DB guard, and credential cleanup remain |
| 9 | Billing, limits, and lifecycle | `docs/plans/gcp/08-billing-limits-lifecycle.md` | Detailed | Trials, upgrades, downgrades, failed payments, cancellation |
| 10 | Operations and launch safety | `docs/plans/gcp/09-operations-launch-safety.md` | Detailed | Audit, observability, DR, quotas, admin tooling |
| 11 | Shared-to-dedicated migration | `docs/plans/gcp/10-shared-to-dedicated-migration.md` | Detailed | Production/business dedicated projects |

## Blocker Register

Track blockers here when they cannot be fixed only by editing the AlphaCI repos. A blocker should not stop unrelated local work; it should define the promotion gate it blocks and the work that can continue safely.

| Blocker | Type | Blocks | Safe work while waiting | Clear condition |
| --- | --- | --- | --- | --- |
| GitHub private-repo branch protection unavailable for `alphaexplora-cloud` on the current GitHub plan | External GitHub plan limit | Enforced required reviews, CODEOWNERS, and required `Cloud static checks` on `main` | Keep repo private, squash-only, manual review, CODEOWNERS, no direct Terraform apply, and CI checks before merge | GitHub plan/ruleset support allows private repo branch protection, or repo visibility/plan changes are approved |
| GCP account reauthentication required for `abtorres.it@alphaexplora.com` | Operator auth | Live GCP inventory, API enablement, WIF creation, service account creation, and smoke deploys | Continue docs, IaC static checks, DB migrations, backend tests, workflow contract tests, and access requests | `gcloud auth login abtorres.it@alphaexplora.com` and `gcloud auth application-default login` complete successfully |
| GCP organization/folder permissions not granted yet | GCP IAM/access | Folder creation, org IAM review, project factory, billing-link automation, and dedicated-customer project placement | Keep Terraform foundation dry-run/static, maintain IAM matrix, and build app/backend code behind flags | Required roles from `docs/plans/gcp/gcp-iam-access-request-matrix.md` are granted and verified |
| Postgres/Supabase migration apply verification needs a disposable database URL | Local tooling/test environment | Promoting DB migration beyond local code review | Run `npm run db:verify:gcp-runtime-migration` with `GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL` when a local/shadow DB is available; defer shared/staging DB promotion until then | Migration and rollback apply cleanly against a Supabase shadow/local database |

## Split Rule

Each child plan must include:

- Scope and non-goals.
- Inputs and dependencies from earlier plans.
- Database changes, if any.
- Backend/API changes, if any.
- Workflow changes, if any.
- GCP resources and IAM changes, if any.
- Feature flags and rollout gates.
- Tests and live smoke checks.
- Rollback and cleanup behavior.
- Acceptance criteria.

## IaC Scope Rule

All live cloud IaC belongs in `alphaexplora-cloud`, but it must be split by ownership scope:

- Org/global stacks: organization folders, baseline projects, billing links/export, WIF foundations, DNS/networking/certificates/load balancer foundation.
- AlphaCI project-specific stacks: shared runtime resources, Artifact Registry, Cloud Run baselines, app service accounts, Secret Manager containers/metadata policy, product outputs.
- Future dedicated-customer stacks: project factory outputs and dedicated customer project baselines, disabled until dedicated-project gates pass.

Do not mix org/global and AlphaCI project-specific resources in one Terraform root or apply workflow.

## Dependency Order

The work can overlap, but promotion gates cannot be skipped.

```text
00 org-foundation-automation
  -> private alphaexplora-cloud repo
  -> access request matrix
  -> 01 bootstrap-access
  -> 04 central-workflow-cloud-run
  -> 05 domains-routing

00 org-foundation-automation
  -> 02 database-expand-contract
  -> 03 backend-control-plane
  -> 06 preview-deployments
  -> 07 legacy-provider-deprecation
  -> 08 billing-limits-lifecycle

09 operations-launch-safety applies to every production rollout.
10 shared-to-dedicated-migration waits for 00, 01, 03, 04, 05, 08, and 09.
```

## Access-Independent Work Queue

Use `docs/plans/gcp/11-access-independent-local-implementation.md` while GCP organization, folder, billing, DNS, WIF, and live deployment access are not ready.

That plan is intentionally local-first:

- backend work uses fake GCP adapters, product-level runtime states, and tests
- database work stays expand-only and does not delete existing Vercel/Render data
- workflow work uses static validators and caller-template checks
- frontend work uses backend contracts and local states without claiming live cloud success
- `alphaexplora-cloud` work stays Terraform/static-check/runbook only

Promotion back to the full phase sequence happens after the access blockers clear and the live-access handoff in the access-independent plan is complete.

## First Implementation Slice

Recommended first slice:

1. `00-org-foundation-automation`: create the private `alphaexplora-cloud` repo, then create the Terraform-owned folder hierarchy, baseline projects, labels, IAM boundaries, access request matrix, state model, and project-factory skeleton there.
2. `01-bootstrap-access`: consume foundation outputs, enable required APIs, create WIF/deployer/runtime service accounts, Artifact Registry, and Secret Manager baseline for the shared runtime.
3. `04-central-workflow-cloud-run`: deploy one disposable container to Cloud Run through GitHub Actions using WIF, then clean it up.
4. `02-database-expand-contract`: add isolated runtime schemas and metadata tables without changing existing Vercel/Render behavior.

This proves the GCP path without breaking the current production provider model.

## Promotion Gates

Shared-project launch requires:

- Private `alphaexplora-cloud` repo exists with protected writes, then org foundation automation is complete or explicitly bootstrapped with Terraform state, folder IDs, baseline project placement, and verification evidence.
- Bootstrap/access plan complete for shared runtime.
- Database expand-contract plan complete enough to store GCP runtime metadata.
- Backend control plane can create/update deployment targets safely.
- Central workflow can deploy, probe health, report outputs, and clean up.
- Managed domain routing works for the shared runtime path.
- Billing limits exist before relying on billing export.
- Legacy Vercel/Render creation is disabled for new managed deployments.

Production/business dedicated projects require:

- Dedicated customer folder and project-factory skeleton exist from org foundation automation.
- Dedicated project factory implemented and smoke-tested.
- Dedicated project routing topology approved and live-tested.
- Shared-to-dedicated migration tested with rollback.
- Manual approval gate for dedicated project cleanup.

## Open Index Rules

- If a child plan introduces a decision that changes the master plan, update the master plan first.
- If implementation discovers a GCP constraint, update the child plan and the master plan decision log.
- If a child plan becomes too large, split it again and add the new file here.
- If a task creates live org/global Terraform, AlphaCI project-specific Terraform, or admin `gcloud` scripts, implement it in `alphaexplora-cloud` and link the resulting commit from this index.
- If the board no longer matches the source plans, update the source plan first, then update `alphaci-gcp-implementation-board.html`.
