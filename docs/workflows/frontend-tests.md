# frontend-tests.yml

## Role
Primitive check.

## Purpose
Runs frontend unit tests with coverage and optional artifact upload.

## Public Contract
- Source workflow: `.github/workflows/frontend-tests.yml`
- Inputs: `working-directory`, `system-name`, `node-version`, `test-command`, `unit-tests-directory`, `coverage-threshold`, `enforce-coverage`, `upload-artifact`, `checkout-ref`
- Secrets: none
- Outputs: `test-result`, `coverage-percent`

## Usage
Call directly from a consumer workflow before build or deploy work. Ordering belongs in the consumer workflow with `needs`.

Set `enforce-coverage: false` when a generated project enables unit tests but
does not want the coverage gate.

Use `checkout-ref` when a `workflow_run` chain must test the original triggering commit instead of the default branch commit.
