# Template Setup: Mobile Multi (Remote-Sourced)

Remote source:
- `ImplementSprint/template-repo-mobile-multi` (default branch)

Verification date:
- 2026-04-10

Current caller workflow ref (documented exactly from remote default branch):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@maestro`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

This template is stack-first and multi-app ready:
- Expo apps in `expo/apps/*`
- React Native apps in `react-native/apps/*`
- Kotlin apps in `kotlin/apps/*`

Root commands:
```bash
npm install
npm run start
npm run android
npm run ios
npm run test
npm run lint
npm run verify
```

Kotlin commands:
```bash
npm run kotlin:assembleDebug
npm run kotlin:assembleRelease
npm run kotlin:test
npm run kotlin:lint
```

## Local Environment Variables

Expo root app expects:
- `EXPO_PUBLIC_APP_NAME`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_BASE_URL`

## GitHub Repository Variables (Canonical)

Required:
- `MOBILE_MULTI_SYSTEMS_JSON`

Recommended value:
```json
[
  {
    "name": "mobile-expo-starter",
    "dir": "expo/apps/mobile-expo-starter",
    "mobile_stack": "expo",
    "enable_android_build": true,
    "enable_ios_build": true,
    "enable_maestro": true,
    "enable_maestro_ios": true,
    "version_stream": "mobile-expo-starter"
  },
  {
    "name": "mobile-rn-starter",
    "dir": "react-native/apps/mobile-rn-starter",
    "mobile_stack": "react-native",
    "enable_android_build": true,
    "enable_ios_build": true,
    "enable_maestro": true,
    "enable_maestro_ios": true,
    "version_stream": "mobile-rn-starter"
  },
  {
    "name": "mobile-kotlin-starter",
    "dir": "kotlin/apps/mobile-kotlin-starter",
    "mobile_stack": "kotlin",
    "gradle_task": "assembleDebug",
    "enable_maestro": true,
    "version_stream": "mobile-kotlin-starter"
  }
]
```

How to fill each field:
- `name`: stable system label per mobile app lane.
- `dir`: repository-relative app path under stack folders.
- `mobile_stack`: stack selector (`expo`, `react-native`, `kotlin`).
- `gradle_task`: Kotlin release task(s) to run.
- `enable_android_build` and `enable_ios_build`: platform lane switches.
- `version_stream`: release/version channel label per system.

## GitHub Repository Secrets

Required with typical default mobile caller behavior:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`

Optional:
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get values:
- SonarCloud settings/token page
- Grafana Cloud k6 project settings
- GitHub PAT settings

## First Run Checklist

1. Configure app folders under each stack (`expo/apps`, `react-native/apps`, `kotlin/apps`).
2. Add `MOBILE_MULTI_SYSTEMS_JSON`.
3. Add Sonar secrets.
4. Push to `test` and confirm each configured app is discovered.
5. Validate Android/iOS behavior per app definition.

Stack-specific workflows in this template:
- `.github/workflows/mobile-expo-stack-caller.yml`
- `.github/workflows/mobile-react-native-stack-caller.yml`
- `.github/workflows/mobile-kotlin-stack-caller.yml`

These stack workflows are dispatch-only for targeted runs.
Default branch automation stays on `.github/workflows/mobile-pipeline-caller.yml`.

## Common Failure Modes

- Wrong `dir` paths in multi-systems JSON.
- Missing Kotlin system override causing wrong lane behavior.
- Sonar enabled without secrets.

For release credential setup, see:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)
