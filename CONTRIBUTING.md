# Contributing to @acegalaxy/model-registry

Thanks for considering a contribution!

## Quick start

```bash
git clone https://github.com/acegalaxy-co/ace_commons-model-registry-nodejs.git
cd ace_commons-model-registry-nodejs
npm install
npm test
```

Requires Node.js >= 20.

## Workflow

1. Fork the repo and create a feature branch from `main`.
2. Keep changes small and focused — one logical change per PR.
3. Add or update tests under `test/` for any behavior change.
4. Run `npm test` and ensure it passes.
5. Open a PR describing the change, motivation, and any breaking impact.

## Code style

- TypeScript, strict mode.
- No new runtime dependencies without discussion (this package is intentionally zero-dep).
- Prefer pure functions; side effects (fs, network) gated behind opts.
- Public API additions need JSDoc + README update.

## Commit messages

Conventional Commits style preferred:

```
feat(loader): support multi-region cache fallback
fix(scanner): handle Notion select option rename
docs: clarify defaults requirement
```

## Reporting bugs

Open a GitHub issue with:

- What you expected
- What happened
- Minimal reproduction (Node version, OS, code snippet)

## Security

Do **not** open public issues for security problems. See [SECURITY.md](./SECURITY.md).
