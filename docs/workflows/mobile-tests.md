# mobile-tests.yml

## Role
Primitive check.

## Purpose
Runs mobile unit tests with coverage and optional artifact upload.

## Public Contract
- Source workflow: `.github/workflows/mobile-tests.yml`
- Inputs: `working-directory`, `system-name`, `node-version`, `test-command`, `coverage-threshold`, `upload-artifact`
- Secrets: none
- Outputs: `test-result`, `coverage-percent`

## Usage
Keep this as the only mobile reusable workflow in the baseline. Add mobile build and E2E workflows later in a separate phase.
