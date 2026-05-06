# Security Policy

## Supported versions

Only the latest minor of `0.x` receives security fixes during the alpha period.
Once `1.0` ships, the latest minor of the current major + previous major will
be supported.

## Reporting a vulnerability

Please email **security@acegalaxy.co** with:

- Description of the issue
- Steps to reproduce
- Affected version(s)
- Suggested fix (if any)

Do **not** open a public GitHub issue for security problems.

We aim to acknowledge reports within 3 business days and provide a remediation
or mitigation plan within 14 days for high-severity issues.

## Scope

In scope:

- The published `@acegalaxy/model-registry` package on npm
- Source code in this repository

Out of scope:

- Vulnerabilities in your Notion workspace, Notion API, or your `fetchRows`
  adapter (this package does not transport credentials)
- Issues in cache file paths supplied by the caller — caller is responsible for
  filesystem permissions on `cachePath`

## Hardening notes

- Cache files are written with mode `0600` and via atomic `tmp + rename`.
- `defaults` is required; the loader never returns an empty registry.
- `fetchRows` is bounded by a 5s timeout so a hung Notion call cannot block
  process startup.
