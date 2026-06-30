# Billing Limits And Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Model plan changes as runtime entitlement transitions with bounded compute, preview, cleanup, and migration behavior.

**Architecture:** Billing state and runtime state are separate. Billing webhooks or admin plan changes update entitlements first; runtime mutation follows through control-plane jobs. Trial/lower shared tiers use shared runtime; production/business paid tiers can use dedicated customer projects only after routing and project-factory gates pass.

**Tech Stack:** NestJS subscription module, billing lifecycle schema, GCP control plane, Stripe or existing billing integration, Cloud Billing export to BigQuery, budget alerts, frontend subscription and runtime status UI.

---

## Existing Surfaces To Check First

- Subscription module: `C:\Codes\cicd-ex\cicd-workflow-be\src\modules\subscription`
- Usage quotas migration: `C:\Codes\cicd-ex\cicd-workflow-be\supabase\migrations\20260614_usage_quotas.sql`
- Frontend subscribe page: `C:\Codes\cicd-ex\cicd-workflow-fe\src\app\subscribe\page.tsx`
- Frontend subscription API: `C:\Codes\cicd-ex\cicd-workflow-fe\src\lib\api\subscription.ts`

## Runtime Tiers

```text
trial -> shared_project
lower_shared -> shared_project
production_business -> dedicated_customer_project after project/routing gates
suspended -> keep current runtime temporarily, block risky mutations
canceled -> retain metadata during grace, then cleanup managed runtime resources
```

## Default Numeric Limits To Lock Before Code

Initial conservative defaults:

| Limit | Trial | Lower/shared paid | Production/business paid |
| --- | --- | --- | --- |
| Runtime scope | Shared | Shared | Dedicated after gates |
| Custom domains | 0 | 0 at first | 5 |
| Active previews per app | 0 | 1 | 5 |
| Cloud Run min instances | 0 | 0 | 0 unless approved |
| Cloud Run max instances | 1 | 2 | 5 default, tier configurable |
| Deploys per hour per app | 2 | 6 | 20 |
| Image retention count | 3 | 10 | 20 |
| Image retention days | 7 | 30 | 90 |
| Trial grace | 7 days | Not applicable | Not applicable |
| Failed payment grace | Not applicable | 14 days | 14 days |
| Downgrade grace | Not applicable | Not applicable | 30 days |
| Cancellation retention | 7 days | 30 days | 30 days |

These values may be adjusted before implementation, but code must not use vague limits.

## Files To Create Or Modify

- Create `src/modules/billing-lifecycle/billing-lifecycle.module.ts`
- Create `src/modules/billing-lifecycle/billing-lifecycle.types.ts`
- Create `src/modules/billing-lifecycle/entitlements.repository.ts`
- Create `src/modules/billing-lifecycle/entitlements.repository.spec.ts`
- Create `src/modules/billing-lifecycle/plan-limits.service.ts`
- Create `src/modules/billing-lifecycle/plan-limits.service.spec.ts`
- Create `src/modules/billing-lifecycle/lifecycle-transitions.service.ts`
- Create `src/modules/billing-lifecycle/lifecycle-transitions.service.spec.ts`
- Modify `src/modules/subscription/subscription.service.ts`
- Modify `src/modules/subscription/subscription.service.spec.ts`
- Create frontend hook `src/hooks/use-runtime-entitlements.ts`
- Create frontend component `src/components/product/runtime-entitlement-banner.tsx`

## Required Lifecycle Metadata

```text
planTier
billingStatus
runtimeScope
entitlementState
trialEndsAt
currentPeriodEndsAt
downgradeEffectiveAt
suspensionStartsAt
cleanupEligibleAt
customDomainEntitlement
previewEntitlement
migrationState
lastPlanChangeReason
```

Lifecycle states:

```text
active_trial
trial_expiring
active_lower_shared
active_production_business
upgrade_pending
migration_requested
migration_in_progress
migration_verified
downgrade_pending
payment_past_due
suspended
cancel_requested
canceled_at_period_end
canceled
cleanup_required
```

## Tasks

### Task 1: Add Plan Limit Tests

Test file: `src/modules/billing-lifecycle/plan-limits.service.spec.ts`

Cases:

- Trial has zero previews and zero custom domains.
- Lower/shared has one preview and zero custom domains at first.
- Production/business has custom domains and five previews by default.
- Max instances and deploy frequency are returned from plan settings.
- Limits are enforced before GCP operations are queued.

### Task 2: Add Lifecycle Transition Tests

Test file: `src/modules/billing-lifecycle/lifecycle-transitions.service.spec.ts`

Cases:

- Trial expiration blocks new deploys after grace and schedules cleanup.
- Upgrade to lower/shared lifts trial limits without moving runtime.
- Upgrade to production/business requests dedicated migration only after gates are enabled.
- Downgrade enters grace before removing custom domains or dedicated resources.
- Failed payment blocks risky mutations but keeps running services during grace.
- Cancellation cleanup never touches customer databases or external services.

### Task 3: Implement Entitlements Repository

Rules:

- Billing state and runtime state are separate fields.
- Every transition records actor, reason, timestamp, and previous state.
- Entitlement changes emit audit events.
- Cleanup eligibility is timestamped, not inferred on the fly.

### Task 4: Wire Subscription Events To Lifecycle

Rules:

- Billing success calls transition service, not runtime cleanup directly.
- Billing failure creates `payment_past_due` and notification jobs.
- Downgrade creates `downgrade_pending` with effective date.
- Cancellation creates `cancel_requested` or `canceled_at_period_end`.

### Task 5: Add Runtime Enforcement Points

Before provisioning/deploy/preview/custom-domain operations, backend must check:

```text
planTier
billingStatus
runtimeScope
previewEntitlement
customDomainEntitlement
maxInstances
deployFrequency
cleanupEligibleAt
```

### Task 6: Add Billing Export And Budget Plan

Use Cloud Billing export to BigQuery for reporting/margins, not real-time enforcement.

Required metadata:

```text
billingExportProjectId
billingExportDataset
standardUsageTable
detailedUsageTable
lastImportAt
lastSuccessfulReportAt
```

Budget alerts must exist before broad paid rollout.

## Verification Commands

Backend:

```powershell
npm test -- src/modules/billing-lifecycle/plan-limits.service.spec.ts
npm test -- src/modules/billing-lifecycle/lifecycle-transitions.service.spec.ts
npm test -- src/modules/billing-lifecycle/entitlements.repository.spec.ts
npm test -- src/modules/subscription/subscription.service.spec.ts
npm run typecheck
npm run lint
```

Frontend:

```powershell
npm test -- tests/unit/subscription.test.ts tests/unit/subscribe-page.test.tsx
npm run lint
```

## Rollback

- Restore previous entitlement state if billing event is reversed.
- Pause destructive cleanup jobs during billing incident.
- Keep runtime and billing state separate so payment errors do not imply immediate deletion.
- Dedicated project deletion always requires manual approval.

## Acceptance Gates

- Every plan transition has explicit state and customer-visible effect.
- Plan limits enforce before GCP quota or delayed billing export becomes the only control.
- Trial, upgrade, downgrade, failed payment, and cancellation journeys are tested.
- Customer databases and external services are never deleted by AlphaCI.
- Billing export is reporting/margin input, not the sole enforcement mechanism.
