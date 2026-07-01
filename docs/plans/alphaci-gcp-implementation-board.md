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

The source Markdown plans remain authoritative. The HTML board is a viewer and should be updated whenever plan order, decision status, task ownership, or access requirements change.

Task checkbox state is stored in the browser's localStorage for this file. It is useful for local planning reviews, but it is not a team source of truth until the board is connected to issues or a project tracker.

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

## Current Blocker Register

| Blocker | Owner | Impact | Workaround / allowed work | Clears when |
| --- | --- | --- | --- | --- |
| GitHub private-repo branch protection unavailable on current plan | GitHub org owner | `alphaexplora-cloud` cannot technically require PR reviews, CODEOWNERS, or required checks on `main` yet. | Keep repo private, squash-only, delete branches on merge, use CODEOWNERS, require manual cloud-operator review, and keep `Cloud static checks` green before merge. | AlphaExplora upgrades GitHub plan, makes the repo public, or enables an equivalent ruleset feature. |
| GCP active account needs non-interactive-safe reauthentication | GCP account owner | Live org/project inventory and bootstrap commands cannot run reliably from Codex. | Continue local IaC, docs, static validation, DB/schema work, workflow contract tests, and access-request preparation. | `gcloud auth login abtorres.it@alphaexplora.com` and `gcloud auth application-default login` are refreshed locally. |
| GCP org/folder IAM not granted yet | GCP organization admin | Terraform cannot create folders, project factory resources, org IAM, or dedicated-customer project placement. | Keep `alphaexplora-cloud` foundation code dry-run/static only and implement product code behind feature flags. | Required org/folder/billing roles in `gcp-iam-access-request-matrix.md` are approved and verified. |
| Local Postgres/Supabase migration apply check missing | Backend owner | SQL migration is reviewed and tested around app code, but not yet applied to a real database locally. | Keep migration expand-only and do not promote to shared/staging DB until an apply/rollback check passes. | Migration and rollback are applied successfully against a Supabase shadow/local database. |

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
