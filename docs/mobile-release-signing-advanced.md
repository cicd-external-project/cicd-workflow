# Mobile Release Signing (Advanced)

This guide is advanced and future-facing. Current template CI defaults are mostly debug/simulator focused.

Use this guide when you need production-grade signed artifacts.

## Android Signing

What you need:
- Upload keystore file (`.jks` or `.keystore`)
- Keystore password
- Key alias
- Key password

Recommended GitHub secrets:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

How to obtain values:
- Generate keystore with `keytool` (or use existing enterprise keystore)
- Base64-encode keystore for GitHub secret transport
- Store raw keystore in secure vault, not in repository

Minimum process:
1. Generate/import keystore.
2. Store signing values in secrets manager.
3. Decode keystore inside CI job at runtime.
4. Wire Gradle signing config to CI-provided values.
5. Build signed `release` artifacts.

## iOS Signing

What you need:
- Apple Developer Team
- Distribution certificate
- Provisioning profile(s)
- App Store Connect/API credentials for automated upload

Recommended GitHub secrets:
- `IOS_P12_BASE64`
- `IOS_P12_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_KEYCHAIN_PASSWORD`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY`

How to obtain values:
- Apple Developer Portal for certificates/profiles
- App Store Connect Users and Access -> Keys for API key material

Minimum process:
1. Export cert as `.p12` and provision profile.
2. Base64-encode assets and store in secrets.
3. Create temporary keychain on CI runner.
4. Import cert/profile and run signed archive/export.
5. Upload with Transporter/Fastlane/App Store Connect API.

## Security Requirements

- Never commit raw signing files.
- Rotate credentials periodically and on team membership changes.
- Restrict secret visibility to required repositories/environments.
- Use environment-protected deployments for production signing jobs.

## Recommended Environment Separation

- `test`: no production signing secrets
- `uat`: optional staging signing identities only
- `main`: production signing identities with approval gates

## Template Integration Notes

- Mobile templates in this workspace are CI-ready for debug flows.
- Add signing only when release automation is enabled for your product lane.
- Keep signing logic separate from smoke/e2e jobs to reduce blast radius.
