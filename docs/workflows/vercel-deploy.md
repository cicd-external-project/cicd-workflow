# Vercel Deploy Reusable Workflow

Deploys a frontend application to Vercel through the Vercel CLI. This remains a legacy provider workflow during the GCP migration and should stay feature-flagged off for new managed deployments once the GCP path is active.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `system-name` | yes | | Display name for logs. |
| `working-directory` | no | `.` | Project directory. |
| `checkout-ref` | no | | Commit SHA or ref to checkout. |
| `source-branch` | no | | Source branch allowed to deploy. Only `test`, `uat`, and `main` are accepted. |
| `environment` | no | `preview` | Vercel environment: `preview` or `production`. |

## Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `VERCEL_TOKEN` | yes | Vercel API token. |
| `VERCEL_ORG_ID` | yes | Vercel organization ID. |
| `VERCEL_PROJECT_ID` | yes | Vercel project ID. |

## Permissions

The workflow requires:

```yaml
permissions:
  contents: read
```

## Behavior

1. Checks out the requested source ref.
2. Installs Node.js and the Vercel CLI.
3. Pulls the Vercel environment configuration.
4. Builds the app with `vercel build`.
5. Deploys the prebuilt output with `vercel deploy --prebuilt`.

This workflow should not be used for new GCP-managed deployment targets.
