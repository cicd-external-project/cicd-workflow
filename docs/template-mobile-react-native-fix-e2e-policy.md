# Template Setup: Mobile React Native (Fix E2E Policy Variant)

Template repository:
- `ImplementSprint/template-repo-mobile-react-native-fix-e2e-policy`

Current caller workflow ref (documented exactly):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@fix/e2e-policy`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites match the React Native template:
- Node.js 20+
- npm
- JDK 17+
- Android SDK 36 toolchain
- Xcode/CocoaPods for iOS local work on macOS

Commands:
```bash
npm install
npm start
npm run android
npm run pods
npm run ios
npm run verify
npm run maestro:validate
```

## Local Environment Variables

Create `.env` from `.env.example`:
- `RN_PUBLIC_APP_NAME`
- `RN_PUBLIC_APP_ENV`
- `RN_PUBLIC_API_BASE_URL`

## GitHub Repository Variables (Canonical)

Set in GitHub Actions variables:
- `MOBILE_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "mobile-rn",
  "dir": ".",
  "mobile_stack": "react-native",
  "enable_android_build": true,
  "enable_ios_build": true
}
```

How to fill each field:
- `name`: stable app label used in logs and reports.
- `dir`: repository-relative app path.
- `mobile_stack`: fixed value `react-native`.
- `enable_android_build` and `enable_ios_build`: explicit platform build controls.

## GitHub Repository Secrets

Required with current default caller settings:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`

Optional:
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get values:
- SonarCloud settings and account security token page
- Grafana Cloud k6 project settings
- GitHub PAT settings

## Current E2E Behavior in This Variant

This caller enables Maestro by default:
- `enable_maestro: true`
- `enable_maestro_ios: true`

It also exposes:
- `maestro_e2e_tier`: `auto | skip | smoke | full`

And adds schedule:
- Daily cron at `0 2 * * *`

Custom commands are wired for smoke/full Android and iOS scripts.

## First Run Checklist

1. Ensure `.maestro` flows are present and valid.
2. Set `MOBILE_SINGLE_SYSTEMS_JSON`.
3. Add Sonar secrets.
4. Push to `test` and validate smoke runs.
5. Use manual dispatch to test each `maestro_e2e_tier` mode.
6. Confirm scheduled runs are acceptable for your repository policy.

## Common Failure Modes

- Missing or incorrectly tagged Maestro flows.
- Tier command scripts not present in `package.json`.
- Unexpected nightly load from scheduled run.

For release credential setup, see:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)
