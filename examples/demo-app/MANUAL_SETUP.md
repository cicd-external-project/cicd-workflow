# Manual Setup Checklist

Everything described in [`README.md`](./README.md) is real, working pipeline
configuration. None of it is live yet. This session had no GitHub push
access, no Render or Vercel account access, and no ability to create actual
cloud resources — so every step below is something a human has to do by
hand, in order, before the first pipeline run can go green.

Each step states explicitly what's automated (nothing — that's the point of
this checklist) and why it couldn't be done here.

## 0. Repo layout decision

The generated workflow files use `working-directory: .` and
`defaults: { run: { working-directory: ./. } }` — they assume the app they
gate lives at the **root** of its own repository.

**Recommendation: push `backend/` and `frontend/` as two separate GitHub
repositories.** This matches what the workflow files already assume, so no
path rewriting is needed.

If you instead want them combined into one repo (e.g.
`flowci-demo-backend` and `flowci-demo-frontend` as subdirectories of a
single `flowci-demo` repo), every `working-directory: .` and the build job's
`defaults.run.working-directory: ./.` in both apps' `20-flowci-package.yml`
would need to change to the subdirectory path, and the `workflow_run`
trigger chain (which fires on workflow *name*, not path) would need each
app's three files renamed/suffixed so the backend and frontend chains don't
collide — the builder source supports this via a `workflowVariant` suffix,
but the files in this example were generated without it. Separate repos
avoid all of that. This step requires the owner's decision and GitHub org
access; it could not be performed in this session.

## 1. Create the GitHub repositories

Create two repos under the `cicd-external-project` org (or wherever the
owner wants them):

- `flowci-demo-backend`
- `flowci-demo-frontend`

**Could not be done here:** no GitHub push/repo-creation access from this
session.

## 2. Push the example code on a `test` branch

Push the contents of `examples/demo-app/backend/` to `flowci-demo-backend`,
and `examples/demo-app/frontend/` to `flowci-demo-frontend`, each as the
initial commit on a `test` branch (not `main` — the platform's branch model
starts new work on `test`).

**Could not be done here:** same reason as step 1 — no push access.

## 3. Confirm FlowCI access / installation requirements

Every stage's `validate-access` job calls
`https://flowci-be-test.onrender.com/api/v1/ci/validate` with
`Authorization: Bearer ${{ secrets.CI_TOKEN }}` and a JSON body of
`{ repo, stage, workflowRunId, headSha }`. This tells us the validation is a
bearer-token call against a FlowCI-hosted endpoint — it does **not** by
itself reveal whether a GitHub App installation, OAuth flow, or some other
out-of-band registration step is also required before `CI_TOKEN` is
considered valid for a given repo.

**Confirm with platform owner:** whether `flowci-demo-backend` and
`flowci-demo-frontend` need to be registered/connected in a FlowCI
dashboard or via a GitHub App installation before `CI_TOKEN` will validate
successfully, or whether a bare valid token is sufficient regardless of
repo registration. This detail is not visible from the workflow YAML alone.

## 4. Provision the Render service (backend)

`backend/render.yaml` documents the intended Render Blueprint shape (Docker
web service, `free` plan, `oregon` region, `healthCheckPath:
/api/v1/health`, `autoDeploy: false`) — but the pipeline itself does **not**
read this file. The `deploy-render` job in `20-flowci-package.yml` drives
deployment purely via a deploy hook URL + a post-deploy health check call,
both supplied as secrets. You can provision the service either way:

- **Via Blueprint:** `render blueprint launch` against `render.yaml` (or
  the Render dashboard's "New Blueprint" flow pointed at the repo) — Render
  reads the file directly.
- **Via dashboard manually:** create a new Web Service, runtime "Docker",
  point it at the repo's `Dockerfile`, set health check path to
  `/api/v1/health`.

Either way, once the service exists, capture from the Render dashboard:

- The deploy hook URL (Render → service → Settings → Deploy Hook)
- The live service URL, to build the health check URL
  (`<service-url>/api/v1/health`)

Because the pipeline keys deploy targets per branch with `_TEST`/`_UAT`/
`_MAIN`-suffixed secrets (falling back to an unsuffixed default), decide
whether you want one Render service shared across environments or three
separate services (test/uat/production). Three separate services is the
safer choice since `autoDeploy: false` means FlowCI's hook is the only
deploy trigger either way.

**Could not be done here:** no Render account access; this requires the
owner's Render credentials.

## 5. Provision the Vercel project (frontend)

The frontend has zero custom deploy config — `next.config.ts` is an
untouched default. Vercel's standard Next.js auto-detection handles build
and runtime once a project exists. Create a new Vercel project pointed at
`flowci-demo-frontend`, then capture:

- A Vercel API token (account or team-scoped)
- The Vercel Org ID
- The Vercel Project ID

**Could not be done here:** no Vercel account access; this requires the
owner's Vercel credentials.

## 6. Add secrets to the right place

The `deploy-vercel-standalone` job's reusable workflow
(`vercel-deploy.yml`) declares a job-level
`environment: { name: ${{ inputs.environment }} }` — meaning Vercel deploys
run under a **GitHub Environment** named `preview` or `production`
(resolved from the branch: `main` → `production`, everything else →
`preview`). If you want environment-scoped protection or environment-scoped
secrets for Vercel, create `preview` and `production` GitHub Environments
in the `flowci-demo-frontend` repo settings and place the Vercel secrets
there.

The `deploy-render` job's reusable workflow does **not** declare a GitHub
Environment — it resolves its target purely from per-branch secret name
suffixes. Render secrets should be plain repository secrets (or
organization secrets), not environment-scoped.

| Secret | Used by | Where to set it | Notes |
|--------|---------|------------------|-------|
| `CI_TOKEN` | Both apps, every stage (`validate-access`, `report-results`) | Repo secrets on both repos | Bearer token for the FlowCI validate/report endpoints |
| `CI_REPORT_URL` | Both apps, every stage (`report-results`) | Repo secrets on both repos | Where stage results get POSTed |
| `GH_PR_TOKEN` | Both apps, `promote-to-uat`/`promote-to-main` | Repo secrets on both repos | Optional — falls back to the default `github.token` if unset or empty |
| `SONAR_TOKEN` | Both apps, `sonar` job | Repo secrets on both repos | Optional/conditional — see step 7 |
| `SONAR_PROJECT_KEY` | Both apps, `sonar` job | Repo secrets on both repos | Optional/conditional |
| `SONAR_ORGANIZATION` | Both apps, `sonar` job | Repo secrets on both repos | Optional/conditional |
| `RENDER_DEPLOY_HOOK_URL_TEST` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_DEPLOY_HOOK_URL` if unset |
| `RENDER_DEPLOY_HOOK_URL_UAT` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_DEPLOY_HOOK_URL` if unset |
| `RENDER_DEPLOY_HOOK_URL_MAIN` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_DEPLOY_HOOK_URL` if unset |
| `RENDER_DEPLOY_HOOK_URL` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Fallback used when no per-branch hook is set |
| `RENDER_HEALTHCHECK_URL_TEST` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_HEALTHCHECK_URL` if unset |
| `RENDER_HEALTHCHECK_URL_UAT` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_HEALTHCHECK_URL` if unset |
| `RENDER_HEALTHCHECK_URL_MAIN` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Falls back to `RENDER_HEALTHCHECK_URL` if unset |
| `RENDER_HEALTHCHECK_URL` | Backend, `deploy-render` | Repo secrets on `flowci-demo-backend` | Fallback; deploy job errors with "No Render health URL resolved" if nothing resolves |
| `VERCEL_STANDALONE_TOKEN` | Frontend, `deploy-vercel-standalone` | Repo secrets, or `preview`/`production` Environment secrets on `flowci-demo-frontend` | Passed into the reusable workflow as `VERCEL_TOKEN` |
| `VERCEL_STANDALONE_ORG_ID` | Frontend, `deploy-vercel-standalone` | Repo secrets, or Environment secrets | Passed in as `VERCEL_ORG_ID` |
| `VERCEL_STANDALONE_PROJECT_ID` | Frontend, `deploy-vercel-standalone` | Repo secrets, or Environment secrets | Passed in as `VERCEL_PROJECT_ID` |

All of the above were verified by reading the actual `00-flowci-access.yml`,
`10-flowci-quality.yml`, and `20-flowci-package.yml` files in both
`backend/` and `frontend/`, plus the called reusable workflows
(`render-deploy.yml`, `vercel-deploy.yml`, `promotion.yml`) in
`cicd-workflow/.github/workflows/`. No secret name here was guessed.

**Could not be done here:** no GitHub repo-settings access to actually
create secrets; the values themselves also don't exist yet until steps 4–5
are done.

## 7. SonarCloud (optional — safe to defer)

The `sonar` job in `10-flowci-quality.yml` only runs
`if: needs.branch-policy.outputs.sonar-enabled == 'true'`, and that flag is
computed from whether `SONAR_TOKEN`, `SONAR_ORGANIZATION`, and
`SONAR_PROJECT_KEY` are **all** non-empty. If you don't set these three
secrets, the job is skipped cleanly — it does not fail the Quality Gate.
This step can be deferred indefinitely without blocking a green pipeline.

If you do want it active:

1. Create a SonarCloud project for each app.
2. `backend/sonar-project.properties` already specifies
   `sonar.projectKey=flowci-demo-backend` and
   `sonar.organization=cicd-external-project` — your SonarCloud project key
   and org must match these values (or you edit the file to match your
   actual SonarCloud project).
3. Add the three secrets to both repos.

**Could not be done here:** no SonarCloud account access.

## 8. Configure branch protection

Set branch protection rules on `test`, `uat`, and `main` in both repos.

The root `CLAUDE.md` convention for this platform calls for required status
checks named `E2E + k6 Enforcement Gate` and `Pipeline Summary`. **Neither
of those jobs exists anywhere in this demo app's generated workflow files**
— I verified this by reading all three workflow files in both `backend/`
and `frontend/` and grepping the `staged-workflow.builder.ts` source for
those exact strings; there is no match. The central `cicd-workflow` catalog
does contain standalone `pipeline-summary.yml` and `playwright-e2e.yml` /
`grafana-k6.yml` reusable workflows, but none of the three files generated
for this demo app call them.

**Confirm with platform owner:** whether this 3-stage Access/Quality/Package
bundle is a deliberately slimmed-down generator preset (no E2E/k6/summary
jobs by design for simple example apps) versus an older generator output
that predates those gates being added to the standard bundle. Until that's
confirmed, the branch protection required checks that **do** exist in these
files and can be required today are the job names actually present:
`validate-access`, `backend-tests`/`frontend-tests`, `lint`, `security`, and
`build`. Do not configure `E2E + k6 Enforcement Gate` or `Pipeline Summary`
as required checks for these two repos specifically — they will never
report a status and will permanently block merges.

**Could not be done here:** no GitHub repo-settings access.

## 9. First pipeline run

Push an initial commit to `test` on both repos (or merge a PR into `test`)
and watch the three workflows fire in sequence: Access Gate → Quality Gate
→ Package Gate, each triggering the next via `workflow_run` once the prior
one's conclusion is `success`.

**Likely first-run failure modes, in rough order of likelihood:**

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Access Gate fails immediately with `FlowCI authorization failed (HTTP ...)` | `CI_TOKEN` missing/invalid, or repo not registered with FlowCI (see step 3) | Verify the secret value; confirm registration with platform owner |
| Quality Gate never starts | Access Gate didn't conclude with `success` (check the Access Gate run itself) | Fix whatever failed in Access Gate first — `workflow_run` only fires on completion, not specifically on success, but the Quality Gate's own `if:` gates on `conclusion == 'success'` |
| `backend-tests`/`frontend-tests` fails on coverage | Coverage below 80% (test) or 90% (uat/main) | Add tests, or confirm threshold expectations with the team before merging up the chain |
| `deploy-render` fails with "No Render health URL resolved" | None of `RENDER_HEALTHCHECK_URL_<ENV>` or the fallback `RENDER_HEALTHCHECK_URL` are set | Add the missing secret from step 4 |
| `deploy-render` succeeds but health check times out | Wrong health check path, or Render service still cold-starting on the free plan | Confirm `/api/v1/health` responds 200 once the service is awake; consider the free-plan cold-start delay |
| `deploy-vercel-standalone` fails with a project/org mismatch error | `VERCEL_STANDALONE_PROJECT_ID` or `_ORG_ID` wrong, or secrets placed in the wrong GitHub Environment scope | Re-check step 5/6 values and where they were placed (repo vs `preview`/`production` Environment) |
| `promote-to-uat`/`promote-to-main` doesn't open a PR | Deploy job didn't report `success` or `skipped` | Check the deploy job's actual conclusion; the promotion job requires one of those two outcomes |
| Sonar step unexpectedly skipped | One of the three Sonar secrets is empty/missing | Expected behavior if you deferred step 7 — not a bug |

## Summary: what's automated vs what's not

Nothing in this checklist is automated — every single step requires the
repo owner's own GitHub, Render, SonarCloud, and Vercel credentials, none of
which this session has access to. What *is* already done is the pipeline
configuration itself: the three workflow files per app, the Dockerfile, and
`render.yaml` are complete and require no further editing under the
separate-repos plan from step 0.
