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
- What GCP access is needed?
- What still needs user/operator input?

## Update Rules

- If a decision changes, update `docs/plans/alphaci-gcp-provider-migration-plan.md` first.
- If implementation order changes, update `docs/plans/alphaci-gcp-migration-index.md` and the HTML board.
- If live org/foundation Terraform or admin `gcloud` scripts are involved, the implementation belongs in `alphaexplora-cloud`.
- If task state needs to be shared across the team, move tracking to GitHub issues or a project tracker instead of relying on localStorage.

## Questions For The Next Iteration

- Should each task have an owner, due date, and shared status?
- Should the board show risk and cost per phase?
- Should the board be generated from Markdown instead of maintained manually?
- Should it link to GitHub issues or a GitHub Project once implementation starts?
