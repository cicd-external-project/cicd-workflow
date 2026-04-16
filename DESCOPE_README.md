# Descope Integration Guide for Central Workflow

## 1) Purpose

This document explains:

- what Descope is,
- how to use it in application layers (web, backend, mobile),
- how to enforce it in GitHub Actions CI/CD,
- how to model each tribe as a tenant in a multi-tribe architecture.

---

## 2) What is Descope?

Descope is an identity and access management platform that provides:

- Authentication: email/password, passwordless, MFA, SSO
- Authorization support: roles, permissions, and token claims
- Tenant support for multi-organization isolation
- Machine-to-machine (M2M) authentication for automation and services
- Security/audit controls for governance and compliance

For this project, Descope is the central trust layer across all tribe systems and repositories.

---

## 3) Where Descope fits in this project

### Application Layer

- Frontend (Next.js): sign-in/session handling and route protection
- Backend (Nest.js): JWT validation + role/scope guards
- Mobile (React Native/Expo and Kotlin): OIDC/PKCE login and token-based API access

### Platform Layer

- Cross-tribe API access control via token scopes
- Tenant isolation so one tribe cannot access another tribe’s protected resources
- Standardized identity policy across all repositories

### CI/CD Layer (GitHub Actions)

- Preflight identity checks before deploy/promotion
- Environment-specific Descope configuration checks
- M2M token validation for pipeline-safe service access
- Current orchestrators still use `secrets: inherit` in some call chains for delivery velocity; migrate to explicit secret mapping during the CI/CD hardening phase.

---

## 4) Tenant model: each tribe as one tenant

Recommended model:

- One tenant per tribe (example: `tribe-alpha`, `tribe-bravo`, `tribe-campus-one`)
- Global platform users can have multi-tenant access when needed
- Tribe users remain tenant-scoped by default

### Role model

Tenant-scoped roles:

- `tribe-lead`
- `fe-dev`
- `be-dev`
- `mobile-dev`
- `qa`

Global roles:

- `platform-admin`
- `devops-engineer`
- `security-compliance`

### Scope model (example)

- `tribe:{tenant}:read`
- `tribe:{tenant}:write`
- `shared:read`
- `shared:write`
- `pipeline:deploy`
- `pipeline:promote`

### Token claims to enforce

At minimum, APIs should validate:

- issuer (`iss`)
- audience (`aud`)
- expiry (`exp`)
- tenant (`tenant_id` custom claim)
- roles/scopes (`roles`, `scope`)

---

## 5) GitHub Actions integration pattern

Use a reusable Descope gate workflow and call it from FE/mobile/backend orchestrators before deployment and promotion jobs.

### 5.1 Required GitHub Environment Secrets

Create per environment (`test`, `uat`, `main`/`prod`):

- `DESCOPE_PROJECT_ID`
- `DESCOPE_BASE_URL`
- `DESCOPE_ISSUER`
- `DESCOPE_M2M_CLIENT_ID`
- `DESCOPE_M2M_CLIENT_SECRET`

Optional policy variables:

- `DESCOPE_EXPECTED_AUDIENCE`
- `DESCOPE_REQUIRED_SCOPE`

### 5.2 Reusable workflow example

Create `.github/workflows/descope-preflight.yml`:

```yaml
name: "Reusable: Descope Preflight"

on:
  workflow_call:
    inputs:
      expected_audience:
        type: string
        required: true
      required_scope:
        type: string
        required: false
        default: ""
    secrets:
      DESCOPE_PROJECT_ID:
        required: true
      DESCOPE_BASE_URL:
        required: true
      DESCOPE_ISSUER:
        required: true
      DESCOPE_M2M_CLIENT_ID:
        required: true
      DESCOPE_M2M_CLIENT_SECRET:
        required: true

permissions:
  contents: read

jobs:
  preflight:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Validate required config
        run: |
          set -euo pipefail
          test -n "${{ secrets.DESCOPE_PROJECT_ID }}"
          test -n "${{ secrets.DESCOPE_BASE_URL }}"
          test -n "${{ secrets.DESCOPE_ISSUER }}"
          test -n "${{ inputs.expected_audience }}"

      - name: Validate JWKS endpoint
        run: |
          set -euo pipefail
          curl -fsSL "${{ secrets.DESCOPE_ISSUER }}/.well-known/jwks.json" >/dev/null

      - name: Request M2M token
        id: token
        run: |
          set -euo pipefail
          RESPONSE=$(curl -fsSL -X POST "${{ secrets.DESCOPE_BASE_URL }}/oauth2/v1/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            --data-urlencode "grant_type=client_credentials" \
            --data-urlencode "client_id=${{ secrets.DESCOPE_M2M_CLIENT_ID }}" \
            --data-urlencode "client_secret=${{ secrets.DESCOPE_M2M_CLIENT_SECRET }}" \
            --data-urlencode "audience=${{ inputs.expected_audience }}")

          ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
          if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
            echo "Failed to obtain access token"
            exit 1
          fi

          echo "token_present=true" >> "$GITHUB_OUTPUT"

      - name: Validate scope policy (optional)
        if: ${{ inputs.required_scope != '' }}
        run: |
          echo "Scope policy configured: ${{ inputs.required_scope }}"
          echo "Implement token claim decode/verification step here if scope must be strictly enforced in CI"
```

### 5.3 Call from orchestrators

In FE/mobile/backend pipeline workflows, add a gate job:

```yaml
descope-gate:
  name: "Descope Preflight"
  uses: ./.github/workflows/descope-preflight.yml
  with:
    expected_audience: ${{ vars.DESCOPE_EXPECTED_AUDIENCE }}
    required_scope: ${{ vars.DESCOPE_REQUIRED_SCOPE }}
  secrets: inherit
```

Then set deploy/promotion jobs to `needs: [descope-gate, ...]`.

---

## 6) Branch and environment policy

Suggested enforcement policy:

- `test`: config and token retrieval checks (light gate)
- `uat`: full preflight + protected endpoint smoke test
- `main`: full preflight + strict scope policy + approval gate

This aligns with existing branch strategy (`test` -> `uat` -> `main`).

---

## 7) Backend enforcement checklist (Nest.js)

- Validate JWT against Descope issuer/JWKS
- Enforce audience and expiration
- Enforce tenant claim (`tenant_id`) per resource access
- Enforce role/scope guards per endpoint
- Log auth failures with correlation IDs for auditability

---

## 8) Mobile/web enforcement checklist

- Use secure OIDC flow (PKCE for mobile/public clients)
- Store tokens securely (platform secure storage)
- Refresh/rotate tokens safely
- Attach bearer tokens to API calls only to allowed domains
- Handle session expiry and re-auth consistently

---

## 9) Operational decisions to finalize

- SonarCloud and Descope policy alignment (required quality/security gates)
- Free vs Pro considerations for identity/compliance requirements
- GitHub hosted vs self-hosted runner model for auth-sensitive jobs
- Repository privacy policy by project category

---

## 10) Suggested rollout plan

1. Pilot one tribe tenant in `test`
2. Add backend JWT validation + role/scope guards
3. Add reusable `descope-preflight` in CI/CD
4. Enforce in `uat` promotions
5. Enforce in `main` with approval and audit checks
6. Scale to all tribes using a standard tenant/role template

---

## 11) Definition of done for Descope adoption

- All active repos use Descope-based auth checks in app runtime
- CI/CD gates validate Descope configuration and token path
- Tribe tenant boundaries are enforced by API authorization
- Promotion to `main` is blocked when Descope gate fails
- Security/compliance can audit identity decisions per environment
