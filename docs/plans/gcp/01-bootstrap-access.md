# GCP Bootstrap And Access Plan

Status: Created - needs implementation detail
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Prepare the shared AlphaCI GCP runtime project so GitHub Actions and AlphaCI backend jobs can deploy to Cloud Run without static service account keys.

## Dependencies

- Depends on: Master plan decisions
- Blocks: WIF, Artifact Registry, Secret Manager, Cloud Run smoke deploys, future dedicated project factory

## Scope

- Enable required shared-runtime APIs in `alphaci-20260629`.
- Create WIF pool/provider and deployer service account bindings for GitHub Actions.
- Create runtime service accounts with least-privilege Secret Manager access.
- Create baseline Artifact Registry repository or repositories for shared launch.
- Document billing export and budget-alert setup or an explicit temporary deferral.
- Produce one disposable Cloud Run smoke deployment and cleanup runbook.

## Non-Goals

- Dedicated customer project factory automation.
- Production custom-domain routing.
- Customer database provisioning.

## Implementation Checklist

- Confirm active org, billing account, project number, and owner permissions.
- Enable APIs from the master GCP Services/API Matrix required for shared launch.
- Define exact WIF attribute conditions for GitHub org, central workflow repo, caller repos, refs, and protected environments.
- Create deployer and runtime service accounts with review dates for every non-viewer role.
- Create Artifact Registry location/repo in `asia-southeast1`.
- Create Secret Manager baseline and naming convention.
- Record bootstrap commands in a repeatable runbook or checked-in script.

## Verification

- Metadata-only `gcloud` auth and project verification.
- WIF identity check from GitHub Actions without printing tokens.
- Artifact Registry push permission check.
- Cloud Run deploy/update permission check.
- Secret Manager read access check from runtime service account only.
- Cleanup smoke test removes disposable service, image tags, and test secrets.

## Rollback And Cleanup

- Disable or remove test WIF bindings if misconfigured.
- Delete disposable Cloud Run service and test images by exact labels.
- Do not delete shared baseline resources without manual approval.

## Acceptance Gates

- No JSON GCP service account keys are required.
- One disposable service deploys to Cloud Run through WIF and is cleaned up.
- All required shared-launch APIs are enabled or documented with an owner/date.
- IAM roles are documented with scope, reason, and review owner.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
