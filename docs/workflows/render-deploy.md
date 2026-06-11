# Render Image Deploy Reusable Workflow

Builds a Docker image from the caller repository, pushes it to GitHub Container Registry, then triggers a Render deploy through the Render deploy API with the pushed image URL.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `system-name` | yes | | Display name for logs. |
| `environment` | no | `test` | FlowCI environment label. |
| `branch` | no | | Source branch used for branch gating and image tags. |
| `working-directory` | no | `.` | Reserved for compatibility with generated callers. |
| `docker-context` | no | `.` | Docker build context. Monorepo backends normally use `backend`. |
| `dockerfile-path` | no | `Dockerfile` | Dockerfile path. Monorepo backends normally use `backend/Dockerfile`. |
| `image-name` | yes | | GHCR package/image name. |
| `checkout-ref` | no | | Commit SHA or ref to checkout. |

## Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `RENDER_API_KEY` | yes | Render API key with access to the target workspace/service. |
| `RENDER_SERVICE_ID` | yes | Render service ID to deploy. |
| `RENDER_OWNER_ID` | yes | Render workspace owner ID used in the service image object. |
| `RENDER_REGISTRY_CREDENTIAL_ID` | no | Render registry credential ID for private image pulls. |

## Permissions

The caller must allow:

```yaml
permissions:
  contents: read
  packages: write
```

## Behavior

1. Checks out the requested source ref.
2. Logs in to GHCR using `github.token`.
3. Builds and pushes an image tagged with the branch and commit SHA.
4. Calls `PATCH /v1/services/{serviceId}` to point the service at the pushed image repository/name.
5. Calls `POST /v1/services/{serviceId}/deploys` with the pushed `imageUrl`.

The workflow reports that a Render deploy was triggered. It does not claim the Render deploy completed, because Render deployment completion is asynchronous.
