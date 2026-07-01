# Domains And Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Provide Vercel-style AlphaCI-managed default domains and paid custom-domain aliases while keeping `itsandbox.site` temporary and preserving a future managed-domain cutover path.

**Architecture:** Deployment identity is separate from domain identity. Every deployment gets a generated AlphaCI-managed domain under the active `managedDomainBase`; during launch that is `itsandbox.site`. Shared runtime routing uses wildcard DNS, a global external Application Load Balancer, Certificate Manager, URL maps, and serverless NEGs owned by `alphaexplora-cloud`. Cloud Run domain mapping is allowed only for dev/manual experiments with owner and cleanup date. Dedicated customer project routing remains blocked until a separate topology proof passes.

**Tech Stack:** Cloud DNS, Certificate Manager, external Application Load Balancer, serverless NEGs, Cloud Run, Postgres domain records, NestJS domain services, frontend domain UI, synthetic probes.

---

## Existing Surfaces To Check First

- Domain table plan: `C:\Codes\cicd-ex\cicd-workflow\docs\plans\gcp\02-database-expand-contract.md`
- Frontend env provisioning UI: `C:\Codes\cicd-ex\cicd-workflow-fe\src\components\product\deployment-provisioning-setup.tsx`
- Frontend API contracts: `C:\Codes\cicd-ex\cicd-workflow-fe\src\lib\api\contracts.ts`
- Backend env provisioning: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\env-provisioning`

## Domain Model

Launch domain:

```text
managedDomainBase=itsandbox.site
```

Deployment identity fields that must not change during cutover:

```text
workspace_id
project_id
deployment_target_id
customer_slug
app_slug
environment
service_slot
gcp_project_id
cloud_run_service_name
```

Domain identity fields that can change:

```text
domain
domain_base
domain_kind
is_primary
is_fallback
is_deprecated
replacement_domain_id
routing_mode
certificate_status
last_verified_at
```

## Default Domain Patterns

```text
prod web: {appSlug}-{customerSlug}.{managedDomainBase}
prod api: api-{appSlug}-{customerSlug}.{managedDomainBase}
nonprod: {env}-{slot}-{appSlug}-{customerSlug}.{managedDomainBase}
preview: pr-{prNumber}-{appSlug}-{customerSlug}.{managedDomainBase}
```

Examples:

```text
credit-flow-rfm.itsandbox.site
api-credit-flow-rfm.itsandbox.site
uat-api-credit-flow-rfm.itsandbox.site
pr-42-credit-flow-rfm.itsandbox.site
```

## Files To Create Or Modify

### Backend

- Create `src/modules/runtime-domains/runtime-domains.module.ts`
- Create `src/modules/runtime-domains/runtime-domains.types.ts`
- Create `src/modules/runtime-domains/domain-reservation.service.ts`
- Create `src/modules/runtime-domains/domain-reservation.service.spec.ts`
- Create `src/modules/runtime-domains/domain-records.service.ts`
- Create `src/modules/runtime-domains/custom-domain-verification.service.ts`
- Create `src/modules/runtime-domains/managed-domain-cutover.service.ts`
- Create `src/modules/runtime-domains/runtime-domains.controller.ts`
- Create matching `.spec.ts` files.

### Frontend

- Create `src/lib/api/runtime-domains.ts`
- Modify `src/lib/api/contracts.ts`
- Create `src/hooks/use-runtime-domains.ts`
- Create `src/components/product/runtime-domain-panel.tsx`
- Create `tests/unit/runtime-domains-api.test.ts`
- Create `tests/unit/runtime-domain-panel.test.tsx`

### Infrastructure Docs

- Create `C:\Codes\cicd-ex\cicd-workflow\docs\gcp\managed-domain-routing.md`
- Extend foundation-repo bootstrap scripts only after DNS/load-balancer setup is approved by plan 01.

## Domain States

```text
reserved
pending_dns
verifying
active
failed
suspended
removed
deprecated
```

Rules:

- `reserved` is created before a generated domain is shown to the user.
- `active` requires successful route and certificate verification.
- `deprecated` means the domain still routes but should not be shown as primary.
- `removed` means AlphaCI no longer routes the domain.

## Tasks

### Task 1: Add Domain Reservation Tests

Test file: `src/modules/runtime-domains/domain-reservation.service.spec.ts`

Cases:

- Generates app-first prod web domain.
- Generates `api-` prod API domain.
- Generates env/slot nonprod domain.
- Normalizes invalid slug characters.
- Adds stable hash suffix when collision exists.
- Rejects raw branch names in domains.
- Reserves a domain atomically before returning it.

Run: `npm test -- src/modules/runtime-domains/domain-reservation.service.spec.ts`

### Task 2: Implement Domain Reservation Service

Rules:

- Input must include workspace, project, app slug, customer slug, environment, slot, and managed domain base.
- Service must not infer customer/app from existing Cloud Run service names.
- Reserved domains are stored in `runtime_domains.domain_records`.
- Generated domains use lowercase ASCII slugs and a hash suffix only when needed.
- Collision returns a safe retryable error if a unique domain cannot be generated.

### Task 3: Implement Domain Records API

Routes:

```text
GET /runtime-domains/projects/:projectId
POST /runtime-domains/projects/:projectId/custom-domains
POST /runtime-domains/:domainId/verify
DELETE /runtime-domains/:domainId
```

Rules:

- Listing shows AlphaCI default URL, fallback AlphaCI URL, and customer custom domains separately.
- Custom-domain creation requires production/business entitlement.
- Custom domains are aliases, not replacement deployment identities.
- Delete removes routing only after entitlement and lifecycle checks.

### Task 4: Implement Custom-Domain Verification

Behavior:

- Store DNS instructions in structured JSON.
- Verify ownership before routing traffic.
- Track certificate status and last verification time.
- Retry transient DNS/certificate failures without exposing internal provider errors.
- Do not route custom domain if another workspace already owns it.

### Task 5: Implement Managed-Domain Cutover Support

Rules:

- Add new managed domain as secondary first.
- Create new default URL records for existing deployments.
- Keep old `itsandbox.site` records as fallback for configured migration window.
- Dashboard shows primary and fallback URLs.
- Old domain retirement requires traffic logs, notification state, audit record, and manual approval.

### Task 6: Frontend Domain Panel

UI behavior:

- Shows default AlphaCI URL.
- Shows fallback AlphaCI URL during cutover.
- Shows custom-domain status and DNS instructions.
- Uses explicit status labels: `pending_dns`, `verifying`, `active`, `failed`, `suspended`, `removed`.
- Does not describe custom domains as provider ownership.

Verification:

```powershell
npm test -- tests/unit/runtime-domains-api.test.ts tests/unit/runtime-domain-panel.test.tsx
npm run lint
```

### Task 7: Shared Runtime Routing Smoke Test

Requires explicit approval because it touches DNS/load-balancer resources owned by `alphaexplora-cloud`.

Smoke path:

```text
*.itsandbox.site -> global static IP -> external Application Load Balancer -> serverless NEG -> Cloud Run service
```

Expected:

- `ac-smoke-domain-web.itsandbox.site` resolves.
- TLS certificate is valid.
- Request reaches smoke Cloud Run service.
- Synthetic probe records healthy.
- Removing test route does not affect other routes.

## Dedicated Project Routing Block

Do not enable production/business dedicated customer projects until one of these has a separate approved plan and live proof:

```text
Option B: central routing project with validated cross-project backend pattern
Option C: per-customer routing in dedicated projects
```

The proof must include managed-domain traffic, custom-domain traffic, rollback, and cleanup.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/runtime-domains/domain-reservation.service.spec.ts
npm test -- src/modules/runtime-domains/runtime-domains.controller.spec.ts
npm run typecheck
npm run lint
```

Frontend:

```powershell
npm test -- tests/unit/runtime-domains-api.test.ts tests/unit/runtime-domain-panel.test.tsx
npm run lint
```

Docs:

```powershell
git -C C:\Codes\cicd-ex\cicd-workflow diff --check -- docs/gcp/managed-domain-routing.md
```

## Rollback

- Keep Cloud Run service URL or existing AlphaCI default URL available while custom-domain routing is disabled.
- Remove custom-domain route without deleting deployment target.
- Keep `itsandbox.site` fallback through the defined window during managed-domain cutover.
- Freeze domain cleanup jobs during certificate/DNS incidents.

## Acceptance Gates

- Generated AlphaCI domain is reserved before display.
- Shared-runtime managed domain routes through the load-balancer path.
- Custom domains require verification and paid entitlement.
- Dashboard separates default, fallback, and custom domains.
- Dedicated-project routing remains disabled until live topology proof exists.
