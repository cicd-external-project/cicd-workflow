# workflow-validation.yml

## Role
Maintenance.

## Purpose
Validates the baseline GitHub Actions workflow set, contract docs, and consumer templates.

## Public Contract
- Source workflow: `.github/workflows/workflow-validation.yml`
- Inputs: `systems-json`
- Secrets: none
- Outputs: none

## Usage
Runs inside `central-workflow`. It is not a consumer workflow template.

## Checks

- Action syntax through actionlint.
- Reusable workflow contract docs and contract comments.
- GCP Cloud Run deploy workflow contract through `scripts/validate-gcp-cloud-run-workflow.cjs`.
- Granular workflow template metadata and reusable workflow targets.
- Catalog and starter template integrity.
- Runtime/action pin policy.
- Template shape smoke checks.
