# Changelog

All notable changes to @acegalaxy/lib-model-registry will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-10-14

### Fixed
- Scanner: Gemini IDs with an unrecognised suffix (codenames, other product lines, `-latest` aliases) no longer share one catch-all bucket, so a row is never bumped to an unrelated model. Such IDs now only match their own suffix; a trailing `-preview` still maps to the stable tier.
- Scanner: DeepSeek IDs follow the same rule (bucket by suffix after `v<version>`), and `versionTuple` reads `v<N>` versions, instead of treating every DeepSeek model as one bucket with version 0.

## [0.2.0] - 2026-09-24

### Changed
- Renamed from @acegalaxy/model-registry; private git-dep; npm package deprecated.

## [Unreleased]

## [0.1.0] - 2026-05-06

### Added
- Initial public release.
- Notion-backed AI model config registry.
- TypeScript source with `.d.ts` declarations shipped in `dist/`.
- MIT license.

[Unreleased]: https://github.com/acegalaxy-co/lib-model-registry/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/acegalaxy-co/lib-model-registry/releases/tag/v0.1.0
