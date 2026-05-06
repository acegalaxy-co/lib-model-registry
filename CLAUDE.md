# @kanelr/model-registry

> **NPM commons library** — 3-layer LLM model registry: Notion DB → cache file → hardcoded defaults. Survives Notion outages and missing cache. Includes provider catalog scanner for daily auto-bump.
> Cross-cutting rules: see framework `../../rules/00-index.md`.
> ⭐⭐⭐ **Harness Architecture (P0)**: Mọi feature mới BẮT BUỘC route qua 1 trong 5 surfaces (slash command / hook / subagent / MCP / permission). Đọc `../../rules/meta/02-harness-architecture.md`. KHÔNG add ad-hoc scripts.

## Module purpose

Resolve LLM model metadata (pricing, context window, aliases) with graceful 3-layer fallback. Daily scanner auto-bumps catalog from provider APIs.

## Key files

- `index.js` — entry point (resolver + cache)
- `scanner.js` — provider catalog scanner (cron daily)

## Embedded vs imported

Per-project independence — KHÔNG `require()` module này từ project khác. Copy code OK, scope isolation; consumers inject Notion DB ID + cache path.

## Tests

`npm test` (runs `node --test test/`).
