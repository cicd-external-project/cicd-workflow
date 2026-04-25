# validate-subscription.yml

## Role
Access gate.

## Purpose
Validates CI subscription access before paid workflow execution.

## Public Contract
- Source workflow: `.github/workflows/validate-subscription.yml`
- Inputs: none
- Secrets: `CI_TOKEN`
- Outputs: none

## Usage
Add as the first job in consumer workflows when subscription enforcement is required.
