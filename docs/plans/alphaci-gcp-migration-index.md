# AlphaCI GCP Migration Plan Index

Status: Living index for the AlphaCI migration from Vercel/Render to GCP
Branch: `feature/migrate-vercel-render-to-gcp`
Created: 2026-06-30
Master plan: `docs/plans/alphaci-gcp-provider-migration-plan.md`

## Purpose

Use this file as the entry point once the master brainstorm plan is split into smaller implementation plans. The master plan remains the decision source until a child plan is created and linked here.

Do not start broad implementation from the master plan alone. Pick one indexed area, create or update its focused child plan, then implement that slice behind the gates named here.

## Plan Map

| Order | Area | Child plan | Status | Blocks |
| --- | --- | --- | --- | --- |
| 0 | Master decisions and invariants | `docs/plans/alphaci-gcp-provider-migration-plan.md` | Active | All implementation plans |
| 1 | GCP bootstrap and access | `docs/plans/gcp/01-bootstrap-access.md` | Detailed | Live deploys, WIF, Artifact Registry, Secret Manager, Cloud Run |
| 2 | Database expand-contract migration | `docs/plans/gcp/02-database-expand-contract.md` | Detailed | Backend runtime metadata, lifecycle state, BYO removal |
| 3 | Backend control plane | `docs/plans/gcp/03-backend-control-plane.md` | Detailed | Provisioning jobs, idempotency, reconciliation, admin approvals |
| 4 | Central workflow replacement | `docs/plans/gcp/04-central-workflow-cloud-run.md` | Detailed | Docker build, Artifact Registry push, Cloud Run deploy, health probes |
| 5 | Domains and routing | `docs/plans/gcp/05-domains-routing.md` | Detailed | Managed domains, wildcard DNS, load balancer, custom domains |
| 6 | Preview deployments | `docs/plans/gcp/06-preview-deployments.md` | Detailed | PR services, TTL, preview secrets, cleanup |
| 7 | Legacy provider deprecation | `docs/plans/gcp/07-legacy-provider-deprecation.md` | Detailed | Vercel/Render feature flags, BYO provider removal, credential cleanup |
| 8 | Billing, limits, and lifecycle | `docs/plans/gcp/08-billing-limits-lifecycle.md` | Detailed | Trials, upgrades, downgrades, failed payments, cancellation |
| 9 | Operations and launch safety | `docs/plans/gcp/09-operations-launch-safety.md` | Detailed | Audit, observability, DR, quotas, admin tooling |
| 10 | Shared-to-dedicated migration | `docs/plans/gcp/10-shared-to-dedicated-migration.md` | Detailed | Production/business dedicated projects |

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

## Dependency Order

The work can overlap, but promotion gates cannot be skipped.

```text
01 bootstrap-access
  -> 04 central-workflow-cloud-run
  -> 05 domains-routing

02 database-expand-contract
  -> 03 backend-control-plane
  -> 06 preview-deployments
  -> 07 legacy-provider-deprecation
  -> 08 billing-limits-lifecycle

09 operations-launch-safety applies to every production rollout.
10 shared-to-dedicated-migration waits for 01, 03, 04, 05, 08, and 09.
```

## First Implementation Slice

Recommended first slice:

1. `01-bootstrap-access`: enable required APIs in `alphaci-20260629`, create WIF, deployer service account, runtime service account, Artifact Registry repo, and Secret Manager baseline.
2. `04-central-workflow-cloud-run`: deploy one disposable container to Cloud Run through GitHub Actions using WIF, then clean it up.
3. `02-database-expand-contract`: add isolated runtime schemas and metadata tables without changing existing Vercel/Render behavior.

This proves the GCP path without breaking the current production provider model.

## Promotion Gates

Shared-project launch requires:

- Bootstrap/access plan complete for shared runtime.
- Database expand-contract plan complete enough to store GCP runtime metadata.
- Backend control plane can create/update deployment targets safely.
- Central workflow can deploy, probe health, report outputs, and clean up.
- Managed domain routing works for the shared runtime path.
- Billing limits exist before relying on billing export.
- Legacy Vercel/Render creation is disabled for new managed deployments.

Production/business dedicated projects require:

- Dedicated project factory implemented and smoke-tested.
- Dedicated project routing topology approved and live-tested.
- Shared-to-dedicated migration tested with rollback.
- Manual approval gate for dedicated project cleanup.

## Open Index Rules

- If a child plan introduces a decision that changes the master plan, update the master plan first.
- If implementation discovers a GCP constraint, update the child plan and the master plan decision log.
- If a child plan becomes too large, split it again and add the new file here.
