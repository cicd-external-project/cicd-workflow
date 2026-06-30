# Domains And Routing Plan

Status: Created - needs routing topology proof
Branch: eature/migrate-vercel-render-to-gcp
Created: 2026-06-30
Master plan: docs/plans/alphaci-gcp-provider-migration-plan.md
Index: docs/plans/alphaci-gcp-migration-index.md

## Objective

Provide Vercel-style AlphaCI-managed default domains and paid custom-domain aliases using wildcard DNS, Certificate Manager, and load-balancer routing without hardcoding `itsandbox.site` permanently.

## Dependencies

- Depends on: 01 bootstrap access, 04 deploy path
- Blocks: Managed URLs, custom domains, dedicated-project production readiness

## Scope

- Active managed domain configuration and metadata.
- Temporary `itsandbox.site` launch domain and future cutover.
- Wildcard DNS and global external Application Load Balancer for shared runtime.
- Certificate Manager root/wildcard certificates.
- Domain reservation, verification, and takeover protection.
- Custom-domain paid-tier workflow.

## Non-Goals

- Production dedicated customer project routing until topology is separately approved.
- Using Cloud Run domain mappings as the main product path.
- Managing customer OAuth provider credentials.

## Implementation Checklist

- Store `managedDomainBase`, domain records, fallback records, and replacement domain links.
- Reserve generated subdomains before exposing them.
- Implement shared-runtime wildcard/load-balancer route first.
- Define custom-domain DNS instructions, verification, certificate status, and retries.
- Define `itsandbox.site` fallback window and proxy/redirect behavior before permanent domain cutover.
- Smoke-test managed-domain traffic, custom-domain traffic, rollback, and cleanup before dedicated projects.

## Verification

- Generated domain collision tests.
- Custom-domain ownership verification tests.
- Certificate status and retry tests.
- Load-balancer route smoke test for one shared Cloud Run service.
- Old managed-domain fallback behavior test during cutover.

## Rollback And Cleanup

- Keep AlphaCI default URL stable when custom domain fails.
- Retain old managed-domain fallback until retirement gates pass.
- Disable custom-domain route without changing deployment identity.

## Acceptance Gates

- One shared-runtime service is reachable through the managed domain path.
- Domain metadata supports future managed-domain cutover.
- Custom domains are gated to production/business paid tiers.
- Dedicated project routing remains disabled until a separate live proof passes.

## Notes

Update this child plan when implementation starts. If a decision changes the migration direction, update the master plan first, then this file.
