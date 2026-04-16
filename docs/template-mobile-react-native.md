# Template Setup: Mobile React Native

Template repository:
- `ImplementSprint/template-repo-react-native`

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
- JDK 17+
- Android Studio (SDK Platform 36, Build-Tools 36, Platform-Tools, Emulator)
- Xcode + CocoaPods for iOS local runs (macOS)

Windows environment variables for Android:
- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`
- Add platform-tools and emulator paths to `PATH`

Commands:
```bash
npm install
npm start
npm run android
npm run pods
npm run ios
npm run lint
npm run typecheck
npm run test:unit
npm run verify
```

## Local Environment Variables

Create `.env` from `.env.example`:
- `RN_PUBLIC_APP_NAME`
- `RN_PUBLIC_APP_ENV`
- `RN_PUBLIC_API_BASE_URL`

Runtime note:
- Bare React Native does not auto-inject `.env` into native runtime by default.
- This template has fallback logic in `src/config/appConfig.ts`.

## GitHub Repository Variables (Canonical)

Set in: Settings -> Secrets and variables -> Actions -> Variables

Required:
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
- `name`: stable app label used in reports.
- `dir`: repository-relative app path.
- `mobile_stack`: fixed value `react-native` for this template.
- `enable_android_build` and `enable_ios_build`: explicit platform switches.

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

## Current Maestro Behavior in This Template

Current workflow config defaults:
- `enable_maestro: true`
- `enable_maestro_ios: true`

Maestro is on by default for this template caller configuration.

## First Run Checklist

1. Configure Android prerequisites and run `npx react-native doctor`.
2. Create `.env` from `.env.example`.
3. Set `MOBILE_SINGLE_SYSTEMS_JSON`.
4. Add Sonar secrets.
5. Push to `test` and confirm lane selection.
6. Validate `.maestro` flow files before first release promotion.

## Common Failure Modes

- Missing Android SDK/JDK prerequisites.
- `.env` expected at native runtime without env bridge library.
- Missing Sonar secrets with Sonar enabled.

For release credential setup, see:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)
