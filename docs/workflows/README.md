# Basic Workflow Catalog

This reset keeps only the baseline GitHub Actions workflow library. New repositories should start from `workflow-templates/` and call these reusable workflows directly.

For the platform Create Project flow, workflow templates are selected through a
catalog model:

```text
repoShape -> projectTypeId -> workflowRecipeId -> options
```

The catalog should live in `catalog/`, starter source files should live in
`starter-templates/`, and renderable caller workflows should live in
`workflow-templates/`. MVP enables `single-app` only; monorepo/fullstack/library
and mobile should be added later as catalog-backed shapes.

## Remaining Reusable Workflows

| Workflow | Role | Purpose |
| --- | --- | --- |
| [validate-subscription.yml](validate-subscription.md) | access gate | Validate CI subscription access before paid workflow execution. |
| [lint-check.yml](lint-check.md) | primitive check | Run lint and optional format checks. |
| [frontend-tests.yml](frontend-tests.md) | primitive check | Run frontend unit tests with coverage. |
| [backend-tests.yml](backend-tests.md) | primitive check | Run backend unit and optional integration tests with coverage. |
| [mobile-tests.yml](mobile-tests.md) | primitive check | Run mobile unit tests with coverage. |
| [security-scan.yml](security-scan.md) | primitive check | Run dependency and source security scans. |
| [docker-build.yml](docker-build.md) | build | Build, optionally push, and scan Docker images. |
| [gcp-cloud-run-deploy.yml](gcp-cloud-run-deploy.md) | deploy | Build, push, deploy, and probe a GCP Cloud Run service through WIF. |
| [workflow-validation.yml](workflow-validation.md) | maintenance | Validate GitHub Actions workflow shape, contract docs, and templates. |

## Legacy Provider Workflows

These remain documented while the GCP migration is in progress, but new managed deployment targets should move to the GCP workflow path.

| Workflow | Purpose |
| --- | --- |
| [vercel-deploy.yml](vercel-deploy.md) | Legacy Vercel frontend deploy path. |
| [render-deploy.yml](render-deploy.md) | Legacy Render image deploy path. |

## Consumer Templates

| Template | Purpose |
| --- | --- |
| `workflow-templates/standalone-lint.yml` | Lint-only workflow. |
| `workflow-templates/fe-react.yml` | React frontend baseline: tests, lint, security, build, GCP Cloud Run deploy. |
| `workflow-templates/fe-nextjs.yml` | Next.js frontend baseline: tests, lint, security, build, GCP Cloud Run deploy. |
| `workflow-templates/be-nodejs.yml` | Node.js backend baseline: tests, lint, security, GCP Cloud Run deploy. |
| `workflow-templates/be-nestjs.yml` | NestJS backend baseline: tests, lint, security, GCP Cloud Run deploy. |

## GitHub Repository Setup For MVP Smoke

Generated consumer templates call reusable workflows from:

```text
cicd-external-project/cicd-workflow/.github/workflows/<workflow>.yml@feature/migrate-vercel-render-to-gcp
```

Before the local MVP smoke, the GitHub repository
`cicd-external-project/cicd-workflow` must exist, contain the current
workflow library files, and expose the migration feature branch while this GCP switch is under review.
For the smoke, keep this repository public so newly created private test repos
can call the reusable workflows without private reusable-workflow access policy
getting in the way. After the MVP loop is proven, the repository can move back
to private access with an org-owned repo creation model or a stricter GitHub
Actions access policy.

## Rules

- `.yml` files are GitHub Actions workflows or reusable workflow templates.
- `.md` files document workflow contracts only.
- Keep ordering in consumer workflows with `needs`.
- Keep all workflow runtime dependencies current. Node.js defaults should track the current Active LTS release, and GitHub Action pins should move to current stable major versions after checking runner compatibility.
- Do not add one template per option combination. Add project types, workflow
  recipes, and supported options to the catalog, then let the backend render the
  selected recipe.
- Do not reintroduce promotion, release, E2E, performance, or stack-composition workflows until the baseline is stable.
