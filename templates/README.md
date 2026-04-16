# Templates

This folder contains reusable starter templates used by ImplementSprint repositories.

## Replit Nix Template

File: `replit.nix`

Purpose:

- Standardize Replit runtime dependencies across repositories.
- Keep runtime selection explicit and easy to customize.

Usage:

1. Copy `templates/replit.nix` into your repository root as `replit.nix`.
2. Set `runtime` to your baseline runtime package.
3. Add optional tools in `extraDeps` when needed.
4. Keep the selected runtime aligned with your Docker/CI defaults unless intentional.

Example customizations:

- Node 20: set `runtime = pkgs.nodejs_20;`
- Node 22 + OpenSSL: keep `runtime = pkgs.nodejs_22;` and add `pkgs.openssl` to `extraDeps`.
