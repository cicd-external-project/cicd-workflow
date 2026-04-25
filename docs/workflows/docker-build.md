# docker-build.yml

## Role
Build.

## Purpose
Builds Docker images, optionally pushes them, and optionally scans them.

## Public Contract
- Source workflow: `.github/workflows/docker-build.yml`
- Inputs: `working-directory`, `image-name`, `dockerfile-path`, `push-image`, `scan-vulnerabilities`, `fail-on-vulnerabilities`, `build-args`, `generate-sbom`, `generate-provenance`, `release-tag`
- Secrets: none
- Outputs: `image-tag`, `image-digest`, `scan-result`

## Usage
Call after tests, lint, and security with `needs`. Only set `push-image: true` on trusted branches.
