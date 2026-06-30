# Operations And Launch Safety Plan

Status: Created - needs alert thresholds
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Define the operational controls that make the GCP provider safe to run: audit, observability, alerts, DR, quotas, reconciliation, and admin tooling.

## Dependencies

- Depends on: All production-facing plans
- Blocks: Broad production rollout

## Scope

- Audit event coverage.
- Synthetic probes and deploy health.
- Alert thresholds.
- Quota and capacity registry.
- Disaster recovery runbooks.
- Admin operations surface.
- Supply-chain and image cleanup safeguards.

## Non-Goals

- Replacing product implementation plans.
- Skipping child-plan acceptance gates.

## Implementation Checklist

- Define required audit events and payload redaction rules.
- Define stuck provisioning, failed deploy, cleanup backlog, billing export freshness, and deploy-duration alerts.
- Create DR runbooks for bad deploy, broken WIF, bad secret, domain/cert failure, billing export failure, and shared-to-dedicated migration failure.
- Create quota registry for Cloud Run, Artifact Registry, Secret Manager, certificates, load balancers, serverless NEGs, and project creation.
- Define admin views for jobs, drift, rollbacks, previews, domains, costs, and audit by correlation ID.
- Require Artifact Registry cleanup dry-run before active deletion.

## Verification

- Audit payloads never include secrets.
- Synthetic health failure blocks healthy status.
- Reconciler reports drift safely.
- Cleanup dry-run output is reviewable.
- Admin destructive action records approver, reason, timestamp, and target IDs.

## Rollback And Cleanup

- Freeze cleanup jobs during incident.
- Disable GCP deployments with feature flag.
- Roll back Cloud Run traffic to last healthy revision where possible.
- Keep legacy migration paths available only as defined in provider deprecation plan.

## Acceptance Gates

- Production rollout has alerts, runbooks, owners, and verification commands.
- Admin tooling can recover failed jobs without database surgery.
- Cost, quota, domain, deploy, and cleanup risks have named controls.
- No broad rollout happens without audit and observability coverage.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
