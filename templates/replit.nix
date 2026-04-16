{ pkgs }:

let
  # Runtime selector: change this to match your service baseline.
  # Examples: pkgs.nodejs_20, pkgs.nodejs_22, pkgs.python311
  runtime = pkgs.nodejs_22;

  # Optional extra dependencies for build/test tooling on Replit.
  # Add entries like pkgs.git, pkgs.openssl, pkgs.python311.
  extraDeps = [
  ];
in
{
  deps = [
    runtime
  ] ++ extraDeps;
}
