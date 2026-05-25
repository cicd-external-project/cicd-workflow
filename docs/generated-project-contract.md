# Generated Project Contract

Generated repositories are customer-owned projects managed by the CI/CD SaaS control plane. The platform writes only the CI/CD files needed to bootstrap the selected stack and records all required setup gaps in the dashboard.

## Required Files

Every generated project should include:

- `.github/workflows/master-pipeline-fe.yml` or `.github/workflows/master-pipeline-be.yml`
- `cicd.config.json`
- `README.md` setup instructions

Optional generated files depend on selected catalog actions:

- `tests/e2e/playwright-e2e.ts`
- `tests/performance/k6-smoke.js`
- stack-specific sanity tests

## Workflow Rules

- Generated workflows must be thin callers.
- Generated workflows must reference `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow` with a stable release tag such as `@v1`.
- Generated workflows must not point to `@main`.
- The default branch flow is `test -> uat -> main`.

## Idempotency Rules

Provisioning must be safe to retry:

- If the repository already exists from a previous attempt, continue rather than creating a duplicate.
- If a branch already exists, skip branch creation.
- If a generated file already exists with matching content, skip rewriting it.
- If required provider secrets are missing, record a setup item instead of storing customer provider secrets in the platform.

## Managed Marker

Future existing-repo onboarding should include a managed marker in generated files before overwriting them. Until then, existing repository onboarding must create a setup branch and pull request instead of pushing directly to `main`.
