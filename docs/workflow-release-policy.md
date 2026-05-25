# Workflow Release Policy

Generated customer repositories must use stable release refs from `Tone-Lloyd-Sir-Catubag-CICD/cicd-workflow`. Do not generate customer workflows that point to `@main`.

## Stable Refs

- `v1` is the stable major release for generated customer repositories.
- Patch tags such as `v1.0.1` may be used for exact, immutable customer upgrades.
- Minor tags such as `v1.1` may add backwards-compatible workflow inputs, defaults, checks, and documentation.
- Breaking workflow input, output, secret, branch, or permission changes require `v2`.

## Development Refs

Internal development can use branch refs while validating changes inside this repository. Customer-facing templates, generated examples, and SaaS renderer output must pin to a stable tag.

## Compatibility Rules

- Existing inputs in a stable major version must keep their names and compatible types.
- New inputs must have safe defaults.
- Required secrets and variables must be documented before a release tag is published.
- Generated customer workflows must keep using thin caller workflows that invoke central reusable workflows.

## Release Checklist

1. Run workflow validation for changed templates and reusable workflows.
2. Confirm generated examples reference `@v1` or a specific stable release tag.
3. Update `catalog/workflow-refs.json` if a new stable major is introduced.
4. Update `docs/catalog-schema.md` when catalog fields change.
5. Publish the release tag after validation passes.
