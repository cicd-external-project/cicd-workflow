# GCP Cloud Run Deploy Reusable Workflow

Builds a Docker image from the caller repository, pushes it to Google Artifact Registry, deploys it to Cloud Run, and probes the resulting service URL.

This workflow is the GCP replacement path for new managed deployments. It must use GitHub OIDC Workload Identity Federation. Static GCP service account JSON keys are not allowed.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `system-name` | yes | | Display name for logs. |
| `working-directory` | no | `.` | Project directory. |
| `checkout-ref` | no | | Commit SHA or ref to checkout. |
| `source-branch` | no | | Source branch used for branch gating and image tags. |
| `environment` | no | `dev` | AlphaCI environment: `dev`, `uat`, `prod`, or `preview`. |
| `gcp-project-id` | yes | | Target GCP project ID. |
| `gcp-region` | yes | | Target Cloud Run region. |
| `workload-identity-provider` | yes | | Full Workload Identity Provider resource name. |
| `deployer-service-account` | yes | | Service account impersonated by GitHub Actions through WIF. |
| `artifact-registry-repository` | yes | | Artifact Registry repository name. |
| `image-name` | yes | | Container image name. |
| `cloud-run-service-name` | yes | | Cloud Run service name. |
| `runtime-service-account` | yes | | Runtime identity attached to Cloud Run. |
| `docker-context` | no | `.` | Docker build context relative to `working-directory`. |
| `dockerfile-path` | no | `Dockerfile` | Dockerfile path relative to `working-directory`. |
| `allow-preview` | no | `false` | Allows pull request preview deploys when explicitly enabled. |

## Secrets

No GCP JSON key secrets are accepted. Authentication must be via:

- `permissions.id-token: write`
- `google-github-actions/auth`
- `workload-identity-provider`
- `deployer-service-account`

## Permissions

The workflow requires:

```yaml
permissions:
  contents: read
  id-token: write
```

## Behavior

1. Checks out the requested source ref.
2. Authenticates to Google Cloud through Workload Identity Federation.
3. Configures Docker auth for Artifact Registry.
4. Builds and tags an image using source branch and commit SHA.
5. Pushes the image to Artifact Registry.
6. Deploys the image to Cloud Run using the approved runtime service account.
7. Reads the Cloud Run service URL.
8. Runs a basic `curl -fsS` health probe.

## Contract Test

Run this from the repository root:

```bash
node scripts/validate-gcp-cloud-run-workflow.cjs
```

The contract test checks required inputs, WIF permissions, required deployment steps, branch/preview gates, and forbidden static-key patterns.
