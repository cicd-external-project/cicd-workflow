# Central Workflow Cloud Run Plan

Status: Created - needs workflow contract
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Replace Vercel/Render deployment jobs with a container-native reusable workflow that authenticates with WIF, builds images, pushes to Artifact Registry, deploys to Cloud Run, probes health, and reports safe outputs.

## Dependencies

- Depends on: 01 bootstrap access, 02 metadata shape
- Blocks: GCP deployments, preview deployments, live smoke checks

## Scope

- Reusable `gcp-cloud-run-deploy.yml`.
- Required workflow inputs and output contract.
- Docker build for frontend/backend/standalone services.
- Artifact Registry push by immutable digest.
- Cloud Run deploy/update with labels, runtime service account, and Secret Manager references.
- Synthetic health probe and rollback behavior.

## Non-Goals

- Static-only frontend optimization.
- Cloud SQL provisioning for customer apps.
- Custom-domain routing implementation.

## Implementation Checklist

- Validate required inputs before build.
- Validate GitHub permissions include `id-token: write` and `contents: read`.
- Authenticate to GCP using WIF before any registry or deploy step.
- Verify target project, APIs, Artifact Registry repo, runtime service account, and secrets.
- Build and push image to Artifact Registry.
- Deploy Cloud Run service with metadata labels.
- Run synthetic health probe and emit safe outputs.
- Store or return correlation ID, service URL, revision, image digest, health status, and logs URL.

## Verification

- Static YAML tests for permissions, inputs, and no JSON-key secret.
- Contract tests for branch/environment mapping.
- Failure tests for missing WIF, missing API, wrong project, missing repo, missing secret, and health failure.
- Live disposable deploy smoke test behind explicit approval.

## Rollback And Cleanup

- Route traffic back to `lastHealthyRevision` where possible.
- Mark deployment `rollback_required` if automatic rollback fails.
- Do not mark healthy until deploy, probe, and metadata persistence all succeed.

## Acceptance Gates

- One disposable backend and frontend container can deploy through WIF.
- No service account JSON key is referenced.
- Image digest, revision, health, and safe logs output are produced.
- Health failure is distinct from deploy command failure.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
