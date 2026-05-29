# Catalog Schema

The `catalog/` folder is the contract consumed by the SaaS API. It lets the API expose supported stacks, actions, providers, plans, and stable workflow refs without parsing workflow YAML.

## Files

- `stacks.json`: project stacks that can be generated.
- `actions.json`: selectable CI/CD capabilities.
- `providers.json`: deployment provider options and setup requirements.
- `plans.json`: plan limits and feature access.
- `workflow-refs.json`: stable reusable workflow and action locations.

## Common Fields

Catalog keys use dotted namespaces for selectable actions and lowercase identifiers for stacks, plans, and providers.

```json
{
  "key": "testing.playwright",
  "label": "Playwright E2E",
  "plan": "pro",
  "supportedStacks": ["nextjs"],
  "requiresSecrets": [],
  "requiresVariables": ["E2E_BASE_URL"],
  "generatedFiles": ["tests/e2e/playwright-e2e.ts"]
}
```

## Stack Contract

Each stack declares the template repository, default commands, master caller workflow key, and optional service workflow key. The SaaS API should validate wizard choices against `supportedPackageManagers`, `kind`, and the action catalog before provisioning begins.

## Plan Contract

Plans are ordered by `rank`. A plan can enable stacks, actions, auto-promotion, branch protection, private repositories, and team size. Stripe is the billing event source, but this catalog is the application authorization source for the MVP.

## Workflow Ref Contract

`workflow-refs.json` stores the current stable release tag and the canonical reusable workflow paths. Renderers should combine:

```text
{repository}/{workflow path}@{currentStable}
```

Example:

```text
Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow/.github/workflows/master-pipeline-fe.yml@v1
```
