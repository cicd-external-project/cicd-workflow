# Template Setup: Mobile Expo Single

Template repository:
- `ImplementSprint/template-repo-mobile-single`

Current caller workflow ref (documented exactly):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@maestro`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites:
- Node.js 20+
- npm
- Expo toolchain
- Android Studio for Android local runs
- Xcode for iOS local runs (macOS)

Commands:
```bash
npm install
npm run start
npm run android
npm run ios
npm run lint
npm run typecheck
npm run test
npm run verify
```

## Local Environment Variables

Create `.env` from `.env.example`:
- `EXPO_PUBLIC_APP_NAME`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_BASE_URL`

Runtime config path:
- `src/config/appConfig.ts`

## App Identity Bootstrap

Before first release, update `app.config.ts`:
- `scheme`
- `android.package`
- `ios.bundleIdentifier`

Also update `.maestro` app IDs to match package/bundle identifiers.

## GitHub Repository Variables (Canonical)

Set in: Settings -> Secrets and variables -> Actions -> Variables

Required:
- `MOBILE_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "mobile-expo",
  "dir": ".",
  "mobile_stack": "expo",
  "enable_android_build": true,
  "enable_ios_build": true,
  "version_stream": "mobile-expo"
}
```

How to fill each field:
- `name`: stable app label used in workflow logs.
- `dir`: repository-relative app path (`.` for root app).
- `mobile_stack`: fixed value `expo` for this template.
- `enable_android_build` and `enable_ios_build`: toggle platform build lanes.
- `version_stream`: release/version channel label for your app.

## GitHub Repository Secrets

Set in: Settings -> Secrets and variables -> Actions -> Secrets

Required with current default caller settings:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`

Optional:
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get each value:
- Sonar values: SonarCloud settings and account token page
- k6 values: Grafana Cloud k6 settings
- `GH_PR_TOKEN`: GitHub PAT settings

## Current Maestro Behavior in This Template

Current workflow defaults in template caller:
- `enable_maestro: true`
- `enable_maestro_ios: true`

Maestro lanes are enabled by default for standard branch runs (`test`, `uat`, `main`).

## First Run Checklist

1. Create `.env` from `.env.example`.
2. Update app identity values in `app.config.ts`.
3. Set `MOBILE_SINGLE_SYSTEMS_JSON`.
4. Add Sonar secrets.
5. Push to `test`.
6. Validate build lanes.
7. Run `npm run maestro:validate` before promotion to ensure flow files are valid.

## Common Failure Modes

- App IDs in `.maestro` do not match real package/bundle IDs.
- Missing Sonar secrets with Sonar enabled -> preflight fails.
- Missing iOS toolchain on non-macOS -> iOS local and CI expectations mismatch.

For release credential setup, see:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)
