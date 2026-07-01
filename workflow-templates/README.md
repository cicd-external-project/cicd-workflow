# Granular Workflow Templates

These templates are the consumer-facing entrypoints for new repositories.

- Copy the closest `*.yml` file into `.github/workflows/` in the consumer repo.
- Keep ordering in the copied workflow with `needs`.
- Call central reusable workflows directly from `cicd-external-project/cicd-workflow/.github/workflows/*.yml@feature/migrate-vercel-render-to-gcp` during the GCP migration branch.
- Every template starts with `validate-access`, then deploys successful pushes from `test`, `uat`, and `main` through `gcp-cloud-run-deploy.yml` using repository variables and Workload Identity Federation.
- Every `validate-access` job passes `validation-api-url` from `env.CI_VALIDATE_URL` so generated workflows can target the deployed backend or MVP tunnel.
- Do not use old long-pipeline caller files for new granular workflows.
- Keep runtime and action versions current. Default Node.js to the current Active LTS release, and update reusable workflow action pins when new stable major versions are released.

Each workflow template has a paired `*.properties.json` file for catalog metadata.

The platform catalog should choose templates through a composed model:

```text
repoShape -> projectTypeId -> workflowRecipeId -> options
```

Workflow templates are renderable recipe targets, not one-off files for every
possible option combination. Project types and workflow recipes should declare
which options they support, and the backend should remove or configure optional
jobs while keeping `validate-access` first.

## GCP Deployment Variables

Generated repositories must receive these repository variables before deploy-gcp can run:

- ALPHACI_GCP_PROJECT_ID`r
- ALPHACI_GCP_REGION`r
- ALPHACI_GCP_WORKLOAD_IDENTITY_PROVIDER`r
- ALPHACI_GCP_DEPLOYER_SERVICE_ACCOUNT`r
- ALPHACI_ARTIFACT_REGISTRY_REPOSITORY`r
- ALPHACI_CLOUD_RUN_SERVICE`r
- ALPHACI_RUNTIME_SERVICE_ACCOUNT`r
- ALPHACI_IMAGE_NAME`r

Do not add GOOGLE_APPLICATION_CREDENTIALS, service account JSON, VERCEL_TOKEN, or RENDER_API_KEY to generated deployment workflows.
