# Comprehensive Git Workflow Guide

## Table of Contents

1. [Overview](#1-overview)
2. [Branch Strategy](#2-branch-strategy)
3. [Branch Naming Conventions](#3-branch-naming-conventions)
4. [Developer Daily Workflow](#4-developer-daily-workflow)
5. [Pull Request Standards](#5-pull-request-standards)
6. [Code Review Process](#6-code-review-process)
7. [Promotion Pipeline](#7-promotion-pipeline)
8. [Versioning Strategy](#8-versioning-strategy)
9. [Hotfix Workflow](#9-hotfix-workflow)
10. [Environment Map](#10-environment-map)
11. [CI/CD Integration](#11-cicd-integration)
12. [Auto-Revert and Rollback](#12-auto-revert-and-rollback)
13. [Quality Gates](#13-quality-gates)
14. [Git Hygiene Rules](#14-git-hygiene-rules)
15. [Common Scenarios and Recipes](#15-common-scenarios-and-recipes)
16. [Troubleshooting](#16-troubleshooting)

---

## 1) Overview

This document defines the end-to-end Git workflow for all repositories under the **ImplementSprint** organization. It covers branching, merging, code review, promotion, versioning, and CI/CD integration — aligned with the central-workflow reusable pipeline framework.

### Core Principles

- **Linear promotion**: code flows in one direction — `test` → `uat` → `main`
- **No direct pushes** to protected branches; all changes arrive via pull requests
- **Automated promotion**: merging into `test` auto-creates a PR to `uat`; merging into `uat` auto-creates a PR to `main`
- **Every merge triggers CI**: builds, tests, lint, security scans, and quality gates run on every push/PR to protected branches
- **Production is gated**: merges to `main` require a production-readiness gate and optional manual approval

---

## 2) Branch Strategy

### Long-Lived Branches

| Branch | Environment | Purpose | Protection Level |
|--------|-------------|---------|-----------------|
| `test` | Test / Preview | Integration branch — all feature work merges here first | Protected: require PR, require status checks |
| `uat` | UAT | User acceptance testing — promoted from `test` | Protected: require PR, require status checks |
| `main` | Production | Production releases — promoted from `uat` | Protected: require PR, require status checks, require approval |

Required status checks for `test` and `uat` must include:

- `E2E + k6 Enforcement Gate`
- `Pipeline Summary`

### Short-Lived Branches

| Branch Type | Prefix | Merges Into | Lifetime |
|-------------|--------|-------------|----------|
| Feature | `feature/` | `test` | Days to 1–2 weeks max |
| Bugfix | `bugfix/` | `test` | Days |
| Hotfix | `hotfix/` | `main` (then backport) | Hours to 1 day |
| Release prep | `release/` | `uat` or `main` | Days (optional, for coordinated releases) |
| Chore / Docs | `chore/` or `docs/` | `test` | Days |
| Experiment | `experiment/` | Never (delete after eval) | Variable |

### Branch Flow Diagram

```
  feature/xyz ──┐
  bugfix/abc ───┤
  chore/docs ───┤
                ▼
             [ test ] ──── auto PR ────▶ [ uat ] ──── auto PR ────▶ [ main ]
               │                           │                           │
               ▼                           ▼                           ▼
          Test / Preview              UAT Environment              Production
          (CI + deploy)              (CI + deploy)            (gate + deploy)
```

---

## 3) Branch Naming Conventions

### Format

```
<type>/<ticket-id>-<short-description>
```

### Examples

```
feature/IS-142-user-dashboard
bugfix/IS-305-login-timeout
hotfix/IS-410-payment-crash
chore/IS-500-upgrade-dependencies
docs/IS-600-api-documentation
experiment/try-new-auth-flow
```

### Rules

- Use **lowercase** and **hyphens** only (no underscores, no spaces, no uppercase)
- Always include the **Jira/ticket ID** when one exists
- Keep the description **short but meaningful** (3–5 words)
- Delete the branch **immediately after merge**
- Never reuse a deleted branch name

---

## 4) Developer Daily Workflow

### Starting New Work

```bash
# 1. Start from the latest test branch
git checkout test
git pull origin test

# 2. Create your feature branch
git checkout -b feature/IS-142-user-dashboard

# 3. Do your work — commit often with meaningful messages
git add .
git commit -m "feat(IS-142): add dashboard layout component"

# 4. Push to remote regularly (at least daily)
git push origin feature/IS-142-user-dashboard
```

### Keeping Your Branch Up to Date

```bash
# Rebase onto latest test to stay current (preferred over merge)
git fetch origin
git rebase origin/test

# If conflicts arise during rebase:
# 1. Resolve conflicts in each file
# 2. Stage resolved files
git add <resolved-file>
# 3. Continue rebase
git rebase --continue

# Force-push after rebase (your branch only — NEVER force-push protected branches)
git push --force-with-lease origin feature/IS-142-user-dashboard
```

### When Your Work Is Ready

```bash
# 1. Rebase one final time
git fetch origin
git rebase origin/test

# 2. Push
git push --force-with-lease origin feature/IS-142-user-dashboard

# 3. Open a PR targeting the `test` branch (see PR Standards below)
```

---

## 5) Pull Request Standards

### PR Title Format

```
<type>(<scope>): <short summary>
```

**Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `style`

**Examples**:

```
feat(dashboard): add user activity chart
fix(auth): resolve token refresh race condition
chore(deps): upgrade Next.js to 15.x
ci(pipeline): add Maestro E2E step for mobile
```

### PR Description Template

Every PR should include:

```markdown
## Summary
<!-- What does this PR do? Why? -->

## Related Tickets
<!-- Link Jira tickets: IS-142, IS-143 -->

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking fix)
- [ ] Refactor (no functional change)
- [ ] Docs / chore
- [ ] Breaking change (explain below)

## How to Test
<!-- Steps for reviewers to verify your changes -->

## Screenshots / Recordings
<!-- If UI changes, include before/after -->

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated for changes
- [ ] No new lint warnings or errors
- [ ] Self-reviewed my own code
- [ ] Destructive or risky changes are flagged
```

### PR Rules

| Rule | Requirement |
|------|-------------|
| Target branch | Feature/bugfix/chore → `test` only |
| Reviewers | Minimum **2 approvals** required |
| Status checks | All required CI checks must pass |
| Conversations | All review threads must be resolved |
| Size | Aim for < 400 lines changed; split large work |
| Draft PRs | Use draft status for work-in-progress |
| Labels | Apply: `frontend`, `backend`, `mobile`, `infra`, `breaking`, `hotfix` as applicable |
| Auto-delete | Branch is deleted automatically after merge |

---

## 6) Code Review Process

### Reviewer Responsibilities

1. **Correctness** — Does the code do what it claims?
2. **Tests** — Are there adequate tests? Do they cover edge cases?
3. **Style** — Does it follow project conventions and linting rules?
4. **Security** — Are there injection risks, hardcoded secrets, or unsafe patterns?
5. **Performance** — Are there obvious N+1 queries, memory leaks, or blocking calls?
6. **Architecture** — Does it fit the project structure? Is it in the right place?

### Review Timeline

| Priority | First review within | Resolution within |
|----------|--------------------|--------------------|
| Normal | 1 business day | 2 business days |
| Urgent / Hotfix | 2 hours | 4 hours |
| Blocking / Critical | Immediate | Same day |

### Review Etiquette

- Use **suggestion** mode for small fixes (GitHub's "Suggest changes" feature)
- Prefix comments with intent: `nit:`, `question:`, `blocker:`, `suggestion:`
- Approve with comments if only nits remain
- Explain the *why* when requesting changes, not just the *what*
- Re-review promptly after changes are addressed

---

## 7) Promotion Pipeline

### How Promotion Works

Promotion between environments is **automated via CI** — no manual branch merging or cherry-picking.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMOTION FLOW                               │
│                                                                 │
│  Push to test                                                   │
│    └→ CI (build, test, lint, security, sonar)                   │
│        └→ Version tag: test-v1.0.0.3                            │
│            └→ Deploy to test/preview                            │
│                └→ Auto-create PR: test → uat                    │
│                    (includes deployment links + evidence)       │
│                                                                 │
│  Merge PR into uat                                              │
│    └→ CI re-runs on uat                                         │
│        └→ Deploy to UAT                                         │
│            └→ Auto-create PR: uat → main                        │
│                (includes deployment links + evidence)           │
│                                                                 │
│  Merge PR into main                                             │
│    └→ CI runs on main                                           │
│        └→ Production gate (optional manual approval)            │
│            └→ Deploy to production                              │
│                └→ Version tag: main-v1.0.0.3                    │
│                    └→ Docker build + push to GHCR               │
│                        └→ Update repo About link                │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Generated Promotion PR Contents

When CI auto-creates a promotion PR (e.g., `test → uat`), the PR body includes:

- **Pre-merge checklist** with manual verification checkboxes
- **Deployment URLs** for each system (Vercel preview links)
- **Evidence table** (CI results, version tags, deployment counts)
- **Release summary** (version tag, commit SHA, diff compare link)
- **Quality gate results** (tests, lint, security, SonarCloud)

### Promotion Decision Matrix

| From → To | Trigger | Approval | Gates | Auto-deploy |
|-----------|---------|----------|-------|-------------|
| `test` → `uat` | Auto PR on push to `test` | 2 reviewer approvals | CI pass | Yes |
| `uat` → `main` | Auto PR on push to `uat` | 2 reviewer approvals + optional environment approval | CI pass + production gate | Yes (after gate) |

---

## 8) Versioning Strategy

### Tag Format

```
{prefix}{MAJOR}.{MINOR}.{PATCH}.{BUILD}
```

Four-segment semantic versioning with auto-increment.

### Tag Prefixes

| Branch | Global Prefix | Per-Stream Prefix | Example |
|--------|--------------|-------------------|---------|
| `test` | `test-v` | `test-{stream}-v` | `test-v1.0.0.3`, `test-frontend-a-v1.0.1.0` |
| `uat` | `uat-v` | `uat-{stream}-v` | `uat-v1.0.0.3`, `uat-mobile-expo-v1.0.0.5` |
| `main` | `main-v` | `main-{stream}-v` | `main-v1.0.0.3`, `main-frontend-a-v1.0.1.0` |

### Auto-Increment Rules (test branch)

```
BUILD increments by 1 on every push
BUILD rolls over at 10 → PATCH + 1, BUILD resets to 0
PATCH rolls over at 10 → MINOR + 1, PATCH resets to 0
MINOR rolls over at 10 → MAJOR + 1, MINOR resets to 0
First tag starts at: 1.0.0.0
```

### Promotion Tags (uat branch)

When code reaches `uat`, the latest matching `test-v*` or `test-{stream}-v*` version is mirrored to a `uat-v*` or `uat-{stream}-v*` tag. This keeps the same version number while marking the promotion into UAT.

### Release Tags (main branch)

When code reaches `main`, the latest matching `uat-v*` or `uat-{stream}-v*` version is **mirrored** to a `main-v*` or `main-{stream}-v*` tag. If a repository has not adopted UAT tags yet, the workflow falls back to the latest matching `test` tag.

### Multi-System Versioning

In multi-system repositories (e.g., monorepos with multiple frontends or mobile apps), each system gets its **own independent tag stream** based on its `version_stream` key:

```
test-frontend-a-v1.0.0.3
test-frontend-b-v1.0.1.0
test-mobile-expo-v1.0.0.5
test-mobile-kotlin-v1.0.0.2
```

---

## 9) Hotfix Workflow

Hotfixes bypass the normal `test → uat → main` flow for **critical production issues** only.

### When to Use a Hotfix

- Production is **down or degraded**
- A **security vulnerability** is actively exploitable
- A **data integrity** issue is occurring
- A **regulatory/compliance** deadline is at risk

### Hotfix Process

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/IS-410-payment-crash

# 2. Make the minimal fix
git add .
git commit -m "fix(IS-410): resolve payment processing crash"

# 3. Push and create PR targeting main
git push origin hotfix/IS-410-payment-crash
# → Open PR: hotfix/IS-410-payment-crash → main
```

```
┌──────────────────────────────────────────────────┐
│                 HOTFIX FLOW                       │
│                                                   │
│  main ← hotfix/IS-410-payment-crash               │
│    │     (PR with expedited review)               │
│    ▼                                              │
│  main (merged)                                    │
│    ├→ Production gate + deploy                    │
│    │                                              │
│  Backport:                                        │
│    ├→ Cherry-pick into uat                        │
│    └→ Cherry-pick into test                       │
│       (or merge main back into test)              │
└──────────────────────────────────────────────────┘
```

### Backporting After Hotfix

```bash
# After hotfix is merged to main, backport to uat and test
git checkout uat
git pull origin uat
git cherry-pick <hotfix-commit-sha>
git push origin uat

git checkout test
git pull origin test
git cherry-pick <hotfix-commit-sha>
git push origin test
```

### Hotfix Rules

| Rule | Requirement |
|------|-------------|
| Scope | **Minimal** — fix only the broken thing |
| Review | At least **1 senior reviewer**, expedited timeline |
| Testing | Must pass all CI gates (no skipping) |
| Backport | **Mandatory** — cherry-pick to `uat` and `test` within 24 hours |
| Post-mortem | Required for all production hotfixes |
| Skip auto-revert | Add `[skip-revert]` to commit message if auto-revert could interfere |

---

## 10) Environment Map

### Environment ↔ Branch ↔ Deployment Mapping

| Environment | Branch | Vercel Target | Docker Registry | Access |
|-------------|--------|---------------|-----------------|--------|
| **Test** | `test` | `preview` | — | Internal / Dev team |
| **UAT** | `uat` | `preview` | — | QA + Stakeholders |
| **Production** | `main` | `production` | GHCR (`ghcr.io`) | Public / End users |

### Secrets and Variables per Environment

Each environment requires its own set of secrets configured in GitHub:

```
Per-environment secrets:
├── VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID
├── SONAR_TOKEN / SONAR_PROJECT_KEY / SONAR_ORG
├── E2E_BASE_URL (optional, when Playwright targets non-local URL)
├── K6_CLOUD_TOKEN / K6_CLOUD_PROJECT_ID (when Grafana k6 is enabled)
├── DESCOPE_PROJECT_ID / DESCOPE_BASE_URL / DESCOPE_ISSUER
├── DESCOPE_M2M_CLIENT_ID / DESCOPE_M2M_CLIENT_SECRET
├── SLACK_WEBHOOK_URL / DISCORD_WEBHOOK_URL
├── GH_PR_TOKEN (for auto-promotion PRs and Vercel deployment PR comments)
└── GHCR credentials (main branch only)
```

### Environment-Specific Behavior

| Capability | Test | UAT | Production |
|-----------|------|-----|------------|
| Automated deploy | Yes | Yes | Yes (after gate) |
| Version tagging | `test-v*` | — | `main-v*` |
| Auto-promotion PR | → uat | → main | — |
| Docker build + GHCR push | No | No | Yes |
| Production gate | No | No | Yes |
| Manual approval | No | No | Optional |
| Audit log generation | No | No | Yes (365-day retention) |
| Auto-revert on failure | No | Yes | Yes |
| Maestro E2E (mobile) | No | Yes | No |
| Playwright E2E (web) | Yes (enforced) | Yes (enforced) | Optional |
| Grafana k6 (cloud) | Yes (enforced) | Yes (enforced) | Optional |
| Notification escalation (`@here`) | No | Yes | Yes |

---

## 11) CI/CD Integration

### What Runs on Every PR and Push

Every push or PR to `test`, `uat`, or `main` triggers the full pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                    CI PIPELINE STAGES                        │
│                                                             │
│  1. System Config                                           │
│     └→ Parse SYSTEMS_JSON, detect active systems            │
│                                                             │
│  2. Validate                                                │
│     └→ Verify system directories exist                      │
│                                                             │
│  3. Build + Test (matrix: per system)                       │
│     ├→ Install dependencies (npm/yarn/pnpm auto-detect)     │
│     ├→ Lint check                                           │
│     ├→ Unit tests + coverage                                │
│     ├→ Security scan (dependency audit + license check)     │
│     ├→ Build                                                │
│     └→ [mobile] Gradle build + Maestro E2E (uat only)      │
│                                                             │
│  4. SonarCloud                                              │
│     └→ Code quality + security analysis                     │
│                                                             │
│  5. Optional QA Extensions                                  │
│     ├→ Playwright E2E (multi-browser, local browser mode)    │
│     └→ Grafana k6 load tests (cloud)                        │
│                                                             │
│  6. Branch-Specific Actions                                 │
│     ├→ [test] Version tag → Deploy → Promote to uat        │
│     ├→ [uat]  Deploy → Promote to main                     │
│     └→ [main] Prod gate → Deploy → Version → Docker/GHCR   │
│                                                             │
│  7. Pipeline Summary                                        │
│     └→ Consolidated status report                           │
│                                                             │
│  8. Notifications                                           │
│     └→ Slack + Discord (always, even on failure/cancel)     │
└─────────────────────────────────────────────────────────────┘
```

### Active System Detection

The pipeline intelligently detects which systems have changed:

- **On push/PR**: `git diff` compares changed files against system directories
- **Shared file changes** (e.g., `.github/`, root configs) trigger **all** systems
- **On manual dispatch**: all configured systems always run

### Concurrency Controls

All pipelines use `cancel-in-progress: true` — if a new push arrives while CI is running on the same branch, the previous run is cancelled automatically.

---

## 12) Auto-Revert and Rollback

### Auto-Revert (Automated)

On `uat` and `main` branches, if critical jobs fail (deploy, production gate, versioning, Docker), the pipeline automatically attempts to revert the offending commit:

```
Failure detected on uat/main
    └→ 45-second cooldown
        └→ Attempt: git revert HEAD
            └→ If conflict: git revert -m 1 HEAD (merge revert)
                └→ If still fails: create marker commit for manual intervention
```

**Auto-revert is skipped when:**
- Commit message contains `[skip-revert]`, `[skip ci]`, `[ci skip]`
- Commit message starts with `Revert "`
- Repository is `central-workflow` or `CICD-Fe-Multi`

### Manual Rollback

For situations where auto-revert is insufficient or was skipped:

```bash
# Option 1: Revert the specific commit
git checkout main
git pull origin main
git revert <bad-commit-sha>
git push origin main

# Option 2: Revert a merge commit
git revert -m 1 <merge-commit-sha>
git push origin main

# Option 3: Reset to a known-good state (DESTRUCTIVE — use only as last resort)
git checkout main
git reset --hard <known-good-sha>
git push --force-with-lease origin main  # Requires admin override on protected branch
```

---

## 13) Quality Gates

### Gate Summary

Every PR must pass these gates before merge:

| Gate | Tool | Threshold | Blocks Merge |
|------|------|-----------|--------------|
| **Build** | Framework CLI | Must succeed | Yes |
| **Unit Tests** | Jest / JUnit | Must pass | Yes |
| **Coverage** | Jest + custom check | ≥ 80% (lines, functions, branches, statements) | Yes |
| **Lint** | ESLint | Zero errors | Yes |
| **Security Audit** | `npm audit` | No HIGH/CRITICAL | Yes |
| **License Check** | Custom script | Allowlist only | Yes |
| **SonarCloud** | SonarQube Scanner | Quality gate pass | Yes (when enabled) |
| **Playwright E2E** | Playwright | Browser suite must pass | Yes (mandatory on `test`,`uat`) |
| **Grafana k6 Load** | k6 + Grafana Cloud | Load profile must pass | Yes (mandatory on `test`,`uat`) |
| **Frontend Standards** | Custom check | Next.js + strict TS conventions | Yes (FE repos) |
| **Governance** | Reusable workflow | Coverage thresholds met | Yes |
| **Production Gate** | Reusable workflow | Checklist + optional approval | Yes (main only) |

### Allowed OSS Licenses

```
MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0,
0BSD, CC0-1.0, Unlicense, Python-2.0, BlueOak-1.0.0
```

Any dependency using a license outside this list will **fail** the security scan.

---

## 14) Git Hygiene Rules

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `style`, `revert`

**Examples**:

```
feat(auth): add biometric login support for mobile
fix(api): prevent null pointer on empty cart response
chore(deps): bump eslint from 8.x to 9.x
docs(readme): update local setup instructions
ci(pipeline): add coverage threshold to governance check
revert: revert "feat(auth): add biometric login support"
```

### Do's

- Commit **early and often** — small, logical commits are easier to review and revert
- Write commit messages in **imperative mood** ("add feature" not "added feature")
- **Rebase** feature branches onto `test` before opening a PR
- **Squash** noisy commits (e.g., "fix typo", "wip") before requesting review
- **Delete** branches after merge — no stale branches
- Use `--force-with-lease` instead of `--force` when force-pushing

### Don'ts

- **Never force-push** to `test`, `uat`, or `main`
- **Never commit** secrets, keys, tokens, or credentials
- **Never commit** `node_modules/`, build artifacts, or `.env` files
- **Never merge** your own PR without a second reviewer (exception: hotfixes with lead approval)
- **Never rewrite history** on shared/protected branches
- **Never use** `git merge` to update feature branches — use `git rebase`

### Branch Cleanup

```bash
# After merge, delete remote branch (usually automatic)
git push origin --delete feature/IS-142-user-dashboard

# Clean up local stale branches
git fetch --prune
git branch -d feature/IS-142-user-dashboard

# List merged branches that can be safely deleted
git branch --merged test | grep -v "test\|uat\|main"
```

---

## 15) Common Scenarios and Recipes

### Scenario 1: Start a New Feature

```bash
git checkout test && git pull origin test
git checkout -b feature/IS-142-user-dashboard
# ... write code, commit, push ...
# Open PR → test
# Wait for CI + 2 approvals → merge
# Auto-promotion to uat happens via CI
```

### Scenario 2: Fix a Bug Found in UAT

```bash
# Fix goes through the normal flow — branch from test, not uat
git checkout test && git pull origin test
git checkout -b bugfix/IS-305-login-timeout
# ... fix, commit, push ...
# Open PR → test → merge → auto-promotes to uat
```

### Scenario 3: Emergency Production Fix

```bash
# Hotfix branches from main
git checkout main && git pull origin main
git checkout -b hotfix/IS-410-payment-crash
# ... minimal fix, commit, push ...
# Open PR → main (expedited review)
# After merge: backport to uat and test via cherry-pick
```

### Scenario 4: Resolve Merge Conflicts in Promotion PR

```bash
# If the auto-created PR (test → uat) has conflicts:
git checkout uat && git pull origin uat
git merge origin/test
# Resolve conflicts
git add .
git commit -m "chore: resolve promotion conflicts test → uat"
git push origin uat
# The auto-promotion PR will update or a new one will be created
```

### Scenario 5: Multiple Developers on the Same Feature

```bash
# Option A: Shared feature branch (preferred for small teams)
git checkout test && git pull origin test
git checkout -b feature/IS-200-checkout-redesign
# Both developers push/pull on this branch
# Use rebase carefully; coordinate pushes

# Option B: Sub-branches (preferred for larger features)
git checkout -b feature/IS-200-checkout-redesign     # base feature branch
git checkout -b feature/IS-200-checkout-ui            # dev A's sub-branch
git checkout -b feature/IS-200-checkout-api           # dev B's sub-branch
# Sub-branches merge into the base feature branch first
# Base feature branch merges into test via PR
```

### Scenario 6: Revert a Bad Merge to Test

```bash
git checkout test && git pull origin test
git revert -m 1 <merge-commit-sha>
git push origin test
```

### Scenario 7: Skip Auto-Revert for a Known-Risky Deploy

```bash
# Add [skip-revert] to your commit message
git commit -m "feat(infra): migrate database schema [skip-revert]"
# CI will NOT auto-revert this commit if deploy fails
# You accept responsibility for manual rollback if needed
```

### Scenario 8: Trigger a Manual Pipeline Run

Go to **Actions** → select the master pipeline workflow → **Run workflow**:
- `run_deploy`: force deploy even without code changes
- `run_promotion`: force promotion PR creation
- `dry_run`: run pipeline without deploying or promoting
- `pipeline_mode`: override single/multi detection

---

## 16) Troubleshooting

### "CI is failing on my PR but it works locally"

1. Check the CI logs in the GitHub Actions tab for the specific error
2. Ensure your `node_modules` is fresh: `rm -rf node_modules && npm ci`
3. Verify you're on the correct Node.js / Java version (check workflow inputs)
4. Run `npm audit` locally — CI fails on HIGH/CRITICAL vulnerabilities
5. Run lint with `--max-warnings=0` — CI treats warnings as errors
6. Check coverage thresholds — CI requires ≥ 80% across all four metrics

### "Auto-promotion PR was not created"

1. Verify the `GH_PR_TOKEN` / `PR_TOKEN` secret is configured and not expired
2. Check if an open PR already exists for the same source → target (it gets updated, not duplicated)
3. Look at the promotion job logs in the pipeline run
4. Manual fallback: create the PR yourself (`test → uat` or `uat → main`)

### "Auto-revert happened but the fix was correct"

1. Auto-revert triggers on **any** critical job failure — including flaky deploys or transient errors
2. Re-push the same changes (auto-revert creates a revert commit, so re-applying is safe)
3. If auto-revert keeps triggering incorrectly, add `[skip-revert]` to the commit message
4. Investigate the original failure in the pipeline logs

### "I accidentally pushed to a protected branch"

- Branch protection should prevent this. If it happened:
  1. **Do not force-push** to fix it
  2. Create a revert commit: `git revert HEAD && git push`
  3. Notify the team lead and DevOps

### "My version tag is wrong or missing"

1. Tags are created automatically by CI — do not create them manually
2. Check the versioning job logs in the pipeline run
3. If a tag needs correction, contact DevOps to manually adjust
4. Each system in a multi-system repo has its own tag stream — verify the correct `version_stream`

### "SonarCloud analysis is failing"

1. Verify `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, and `SONAR_ORG` secrets are set
2. Run a preflight: check that the SonarCloud project exists and the token has access
3. Ensure `sonar-project.properties` exists in the repository root (or system directory)
4. Check for new code quality issues — the quality gate may be enforcing stricter rules

---

## Quick Reference Card

```
BRANCH FROM       MERGE INTO        VIA
──────────────    ──────────────    ──────────────
test              feature/*         git checkout -b
feature/*         test              PR (2 approvals)
test              uat               Auto PR (CI)
uat               main              Auto PR (CI)
main              hotfix/*          git checkout -b
hotfix/*          main              PR (expedited)
main              uat + test        Cherry-pick (backport)

COMMIT PREFIX     MEANING
──────────────    ──────────────
feat:             New feature
fix:              Bug fix
chore:            Maintenance
docs:             Documentation
refactor:         Code restructure
test:             Test changes
perf:             Performance
ci:               Pipeline changes
build:            Build system
style:            Formatting only
revert:           Revert previous

SPECIAL FLAGS     EFFECT
──────────────    ──────────────
[skip-revert]     Disable auto-revert for this commit
[skip ci]         Skip CI entirely (use sparingly)
[ci skip]         Same as [skip ci]
```

---

*This workflow applies to all repositories under the ImplementSprint organization. For pipeline-specific configuration (FE, backend, mobile), see the central-workflow reusable workflows and template callers.*
