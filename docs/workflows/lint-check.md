# lint-check.yml

## Role
Primitive check.

## Purpose
Runs lint and optional formatting checks for Node-based projects.

## Public Contract
- Source workflow: `.github/workflows/lint-check.yml`
- Inputs: `working-directory`, `system-name`, `node-version`, `lint-command`, `format-check-command`, `fail-on-warning`
- Secrets: none
- Outputs: `lint-result`

## Usage
Call directly from consumer workflows. It normally runs in parallel with tests and security scans.
