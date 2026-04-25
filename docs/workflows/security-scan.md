# security-scan.yml

## Role
Primitive check.

## Purpose
Runs dependency audit and security-related checks.

## Public Contract
- Source workflow: `.github/workflows/security-scan.yml`
- Inputs: `working-directory`, `system-name`, `node-version`, `fail-on-high`
- Secrets: none
- Outputs: `audit-result`

## Usage
Call directly from consumer workflows. Keep branch policy decisions in the caller by setting `fail-on-high`.
