# @acegalaxy/lib-model-registry

Private git-dep — not published to npm.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


Notion-backed AI model registry — define model configs (provider, model, costs, capabilities) in a Notion table, sync to runtime via a single call.

Manage Claude / GPT / Gemini / DeepSeek configs (pricing, context window, aliases, capabilities) in one Notion DB; consumers load them at startup with safe fallbacks.

## Why

LLM model lineups change weekly: new versions, new prices, deprecations. Hardcoding pricing tables in every service means stale costs and stale routing. This package lets ops own the model catalog in Notion while services read a normalized map at boot — with a 3-layer fallback so a Notion outage never knocks production offline.

## Features

- **3-layer load**: Notion DB → local cache file → hardcoded defaults
- **Provider-agnostic**: Claude, GPT, Gemini, DeepSeek, Grok, etc.
- **Cost metadata**: `pricePerMTokIn` / `pricePerMTokOut` per model
- **Aliases**: resolve `gpt-4o-latest` / `claude-sonnet` → canonical key
- **Cache atomic writes** (mode 0600, tmp + rename)
- **5s Notion timeout** — never blocks boot
- Zero runtime deps (you bring your own Notion fetcher)

## Install

```bash
npm install "@acegalaxy/lib-model-registry@github:acegalaxy-co/lib-model-registry#v0.2.0"
```

## Quick start

### 1. Define models in Notion

Create a Notion DB with rows like:

| Key | Provider | Name | PricePerMTokIn | PricePerMTokOut | ContextWindow | Aliases |
|---|---|---|---|---|---|---|
| claude-opus-4 | anthropic | Claude Opus 4 | 15 | 75 | 200000 | opus, claude-opus |
| gpt-4o | openai | GPT-4o | 2.5 | 10 | 128000 | gpt4o |
| gemini-2.5-pro | google | Gemini 2.5 Pro | 1.25 | 10 | 1000000 | gemini-pro |

### 2. Load registry at runtime

```ts
import { loadModels } from "@acegalaxy/lib-model-registry";

const DEFAULTS = {
  "claude-opus-4": {
    provider: "anthropic",
    name: "Claude Opus 4",
    pricePerMTokIn: 15,
    pricePerMTokOut: 75,
    contextWindow: 200_000,
  },
};

const { models, source, warnings } = await loadModels({
  fetchRows: async () => myNotionAdapter.fetchModelsDB(),
  cachePath: "/var/cache/model-registry.json",
  defaults: DEFAULTS,
});

console.log(`loaded from ${source} (${Object.keys(models).length} models)`);
// loaded from notion (12 models)
```

### 3. Query model by name / alias

```ts
function resolve(key: string) {
  if (models[key]) return models[key];
  for (const [canonical, entry] of Object.entries(models)) {
    if (entry.aliases?.includes(key)) return models[canonical];
  }
  return models["gpt-4o"]; // your default
}

const m = resolve("opus");
const cost = (inTok * m.pricePerMTokIn + outTok * m.pricePerMTokOut) / 1_000_000;
```

## Load source semantics

| Source | When | Action |
|---|---|---|
| `notion` | `fetchRows()` returns non-empty within 5s | Cache written, return rows |
| `cache` | Notion failed/empty AND cache file exists | Return cached rows |
| `defaults` | Both above failed | Return hardcoded `defaults` |

`defaults` is **required** and must be non-empty — guarantees the loader always returns a usable map.

## API

### `loadModels(opts): Promise<LoadModelsResult>`

```ts
interface LoadModelsOpts {
  fetchRows?: () => Promise<ModelMap | null>;
  cachePath?: string;
  defaults: ModelMap;     // required, non-empty
  logger?: Logger;
}

interface LoadModelsResult {
  models: ModelMap;
  source: "notion" | "cache" | "defaults";
  warnings: string[];
}
```

### `writeCache(path, models, logger?)`

Atomic write helper if you manage cache externally.

### `NOTION_TIMEOUT_MS`

Constant: `5000`. Caller-imposed upper bound on `fetchRows()`.

## Bring your own Notion fetcher

This package does **not** call the Notion API directly — pass your own adapter as `fetchRows`. This keeps the package transport-free and lets you reuse your existing Notion client / auth / rate-limiter.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security issues: see [SECURITY.md](./SECURITY.md).
