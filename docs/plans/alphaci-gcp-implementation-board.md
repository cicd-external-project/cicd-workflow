# AlphaCI GCP Implementation Board

Open the static board:

```text
docs/plans/alphaci-gcp-implementation-board.html
```

Use it during planning and implementation reviews to view:

- implementation order
- repo ownership boundaries
- accepted decisions
- task groups
- task completion tracking and percentages
- external blocker tracking
- access checklist
- questions to tune the board
- links back to source plans

Current implementation note: backend, frontend, and central workflow local prep is in progress. The backend now has GCP provider capability reporting, `/capabilities.deploymentProviders`, GCP runtime config flags, GCP strategy resolution, a completed local provisioning-job repository slice, a fake GCP runtime adapter, a local provisioning orchestrator, a runtime reconciler, staged workflow generation for GCP Cloud Run caller jobs, and a local runtime domain API with fake DNS verification, local preview deployment limit/target/cleanup services, local runtime entitlement transition decisions, and local GCP runtime admin/readiness visibility. The central workflow repo now has the reusable GCP Cloud Run deploy workflow, GCP caller templates, static contract validator, and workflow docs. The frontend hides/removes normal BYO/provider-connection creation controls when legacy provider connections are disabled and has local project domains, preview deployments, runtime entitlements, and GCP runtime admin panels. Credential cleanup, DNS/cert/load-balancer routing, and live GCP smoke execution remain blocked behind later tasks and access gates. Backend BYO creation rejection, the expand-only provider-connection DB guard, and the safe GCP runtime migration verifier are locally prepared.

Access-independent implementation queue: `docs/plans/gcp/11-access-independent-local-implementation.md` is the active companion plan while GCP organization, folder, billing, DNS, WIF, and live deployment access are blocked. It maps the full 00-10 phase index into safe local work: fake-adapter backend implementation, expand-only DB guards, workflow static validation, frontend contract/UI work, and cloud-repo Terraform/runbook static checks.

The source Markdown plans remain authoritative. The HTML board is a viewer and should be updated whenever plan order, decision status, task ownership, or access requirements change.

Task checkbox state is stored in the browser's localStorage for this file. Tasks labeled `(local prep done)` are counted as complete from the source HTML so the board reflects committed local prep even on a fresh browser. Manual checkbox tracking is useful for local planning reviews, but it is not a team source of truth until the board is connected to issues or a project tracker.

## Current Board Purpose

The first version is designed for decision and implementation visibility with lightweight local tracking.

It answers:

- What do we do first?
- Which repo owns each area?
- What decisions are already accepted?
- Which tasks belong to each phase?
- What percentage of tracked tasks are complete?
- Which blockers are external or permission-bound?
- What GCP access is needed?
- What still needs user/operator input?
- What can still move while access is blocked?

## Current Blocker Register

| Blocker | Owner | Blocked live command | Workaround / allowed work | Clears when | Verification after access |
| --- | --- | --- | --- | --- | --- |
| GitHub private-repo branch protection unavailable on current plan | GitHub org owner | GitHub required-review/ruleset enforcement on private `alphaexplora-cloud` `main` | Keep repo private, squash-only, delete branches on merge, use CODEOWNERS, require manual cloud-operator review, and keep `Cloud static checks` green before merge. | AlphaExplora upgrades GitHub plan, makes the repo public, or enables an equivalent ruleset feature. | Confirm GitHub rulesets/branch protection from settings or `gh api`. |
| GCP active account needs non-interactive-safe reauthentication | GCP account owner | `gcloud organizations list --format=json` and ADC-backed GCP SDK calls | Continue local IaC, docs, static validation, DB/schema work, workflow contract tests, and access-request preparation. | `gcloud auth login abtorres.it@alphaexplora.com` and `gcloud auth application-default login` are refreshed locally. | `gcloud auth list --filter=status:ACTIVE --format=json` |
| GCP org/folder IAM not granted yet | GCP organization admin | `terraform -chdir=infra/gcp/foundation plan` and project factory checks | Keep `alphaexplora-cloud` foundation code dry-run/static only and implement product code behind feature flags. | Required org/folder/billing roles in `gcp-iam-access-request-matrix.md` are approved and verified. | `gcloud resource-manager folders list --organization=<ORG_ID> --format=json` |
| Local Postgres/Supabase migration apply check needs a disposable database | Backend owner | `npm run db:verify:gcp-runtime-migration` with a disposable DB URL | Verifier fails safely without a URL and masks DB targets; keep shared/staging promotion blocked until apply/rollback and table checks pass. | Migration and rollback are applied successfully against a Supabase shadow/local database. | `npm run db:verify:gcp-runtime-migration` with `GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL`. |
| `alphaexplora-cloud` branch alignment | Foundation owner | Cloud-repo static hardening commits under the never-leave-feature-branch rule | Continue AlphaCI backend/frontend/workflow/database work on `feature/migrate-vercel-render-to-gcp`; do not edit `alphaexplora-cloud` yet. | `alphaexplora-cloud` is confirmed or created on `feature/migrate-vercel-render-to-gcp` before cloud-repo edits. | `git -C C:\Codes\cicd-ex\alphaexplora-cloud branch --show-current` |
| actionlint unavailable locally | Workflow owner | `actionlint` verification of changed workflow templates | Use the GCP workflow contract validator, JSON parsing checks, forbidden-pattern scans, and `git diff --check`. | actionlint is installed locally, or the user explicitly approves a temporary download and execution. | `actionlint` from `C:\Codes\cicd-ex\cicd-workflow`. |

## Latest Verification Evidence

Final access-independent review on 2026-07-02:

- `cicd-workflow`: `node scripts\validate-gcp-cloud-run-workflow.cjs` passed; `git diff --check` passed.
- `cicd-workflow-be`: `npm test -- --runInBand` passed with 102 suites and 875 tests; `npm run typecheck` passed; `npm run lint` passed.
- `cicd-workflow-fe`: `npm test -- --runInBand --coverage=false` passed with 32 suites and 267 tests; `npm run lint` passed; `npm run build` passed after clearing stale `.next` output and allowing network access for Google Fonts.
- `cicd-workflow-be`: `npm run db:verify:gcp-runtime-migration` without `GCP_RUNTIME_MIGRATION_VERIFY_DATABASE_URL` exited non-zero with the expected safe message and did not mutate a database.

## Update Rules

- If a decision changes, update `docs/plans/alphaci-gcp-provider-migration-plan.md` first.
- If implementation order changes, update `docs/plans/alphaci-gcp-migration-index.md` and the HTML board.
- If a blocker cannot be fixed locally, add it to the blocker register with owner, impact, workaround, and clear condition.
- If live org/foundation Terraform or admin `gcloud` scripts are involved, the implementation belongs in `alphaexplora-cloud`.
- If task state needs to be shared across the team, move tracking to GitHub issues or a project tracker instead of relying on localStorage.

## Questions For The Next Iteration

- Should each task have an owner, due date, and shared status?
- Should the board show risk and cost per phase?
- Should the board be generated from Markdown instead of maintained manually?
- Should it link to GitHub issues or a GitHub Project once implementation starts?
