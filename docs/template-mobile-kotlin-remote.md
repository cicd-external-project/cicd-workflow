# Template Setup: Mobile Kotlin (Remote-Sourced)

Remote source:
- `ImplementSprint/template-repo-mobile-kotlin` (default branch)

Verification date:
- 2026-04-10

Current caller workflow ref (documented exactly from remote default branch):
- `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@main`

## Required Branches

Create:
- `test`
- `uat`
- `main`

## Local Development Setup

Prerequisites:
- JDK 17+
- Android SDK + Gradle toolchain

Commands:
```bash
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew test
./gradlew connectedAndroidTest
./gradlew lint
```

## Local Environment Variables

No required app-level `.env` variables are documented for this Kotlin-only template baseline.

## GitHub Repository Variables (Canonical)

Required:
- `MOBILE_SINGLE_SYSTEMS_JSON`

Recommended value:
```json
{
  "name": "mobile-kotlin",
  "dir": ".",
  "mobile_stack": "kotlin",
  "enable_android_build": true,
  "enable_ios_build": false,
  "version_stream": "mobile-kotlin"
}
```

How to fill each field:
- `name`: stable app label.
- `dir`: repository-relative app directory.
- `mobile_stack`: fixed value `kotlin`.
- `enable_android_build` and `enable_ios_build`: set Android true and iOS false for Kotlin-only setups.
- `version_stream`: release/version stream label.

## GitHub Repository Secrets

Required with default mobile Sonar behavior:
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`

Optional:
- `K6_CLOUD_TOKEN`
- `K6_CLOUD_PROJECT_ID`

Recommended:
- `GH_PR_TOKEN`

Where to get values:
- SonarCloud organization/project settings and token page
- Grafana Cloud k6 settings
- GitHub PAT settings

## First Run Checklist

1. Confirm local Gradle build passes.
2. Set `MOBILE_SINGLE_SYSTEMS_JSON` with `mobile_stack: kotlin`.
3. Add Sonar secrets.
4. Push to `test` and confirm Kotlin lane selection.

## Common Failure Modes

- `mobile_stack` not set to `kotlin`.
- iOS build not explicitly disabled in Kotlin-only setup.
- Sonar enabled but missing secrets.

For release credential setup, see:
- [mobile-release-signing-advanced.md](mobile-release-signing-advanced.md)
