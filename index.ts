"use strict";

// @kanelr/model-registry — 3-layer LLM model loader.
//
// Layer 1: Notion DB (source of truth, scheduler updates this)
// Layer 2: local cache file (synced after each successful Notion load)
// Layer 3: hardcoded defaults (shipped in code, last resort)

import * as fs from "fs";
import * as path from "path";

export const NOTION_TIMEOUT_MS = 5000;

export interface ModelEntry {
  /** Provider canonical name, e.g. "openai" */
  provider?: string;
  /** Display name, e.g. "GPT-4o" */
  name?: string;
  /** USD per million input tokens */
  pricePerMTokIn?: number;
  /** USD per million output tokens */
  pricePerMTokOut?: number;
  /** Context window in tokens */
  contextWindow?: number;
  /** Aliases that resolve to this canonical key */
  aliases?: string[];
  [k: string]: unknown;
}

export type ModelMap = Record<string, ModelEntry>;

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export interface LoadModelsOpts {
  /** Async fn returning Notion rows shaped as ModelMap. Optional — skips Layer 1. */
  fetchRows?: () => Promise<ModelMap | null | undefined>;
  /** Local cache file path. Optional — skips Layer 2 read/write. */
  cachePath?: string;
  /** Required — last-resort fallback. Must be non-empty. */
  defaults: ModelMap;
  /** Defaults to console-backed logger. */
  logger?: Logger;
}

export type LoadSource = "notion" | "cache" | "defaults";

export interface LoadModelsResult {
  models: ModelMap;
  source: LoadSource;
  warnings: string[];
}

function _defaultLogger(): Logger {
  return {
    info: (msg) => console.log(`[model-registry] ${msg}`),
    warn: (msg) => console.warn(`[model-registry] ${msg}`),
    error: (msg) => console.error(`[model-registry] ${msg}`),
  };
}

function _readCache(cachePath: string | undefined, logger: Logger): ModelMap | null {
  if (!cachePath) return null;
  try {
    if (!fs.existsSync(cachePath)) return null;
    const txt = fs.readFileSync(cachePath, "utf8");
    const obj = JSON.parse(txt) as { models?: unknown };
    if (
      !obj ||
      typeof obj.models !== "object" ||
      obj.models === null ||
      Object.keys(obj.models as Record<string, unknown>).length === 0
    ) {
      logger.warn(`cache empty/invalid at ${cachePath}`);
      return null;
    }
    return obj.models as ModelMap;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`cache read failed: ${msg}`);
    return null;
  }
}

export function writeCache(cachePath: string, models: ModelMap, logger: Logger = _defaultLogger()): void {
  if (!cachePath) return;
  try {
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${cachePath}.tmp.${process.pid}`;
    const payload = JSON.stringify(
      { writtenAt: new Date().toISOString(), models },
      null,
      2,
    );
    fs.writeFileSync(tmp, payload, { mode: 0o600 });
    fs.renameSync(tmp, cachePath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`cache write failed: ${msg}`);
  }
}

export async function loadModels(opts: LoadModelsOpts): Promise<LoadModelsResult> {
  const { fetchRows, cachePath, defaults, logger } = opts || ({} as LoadModelsOpts);
  const log = logger || _defaultLogger();
  const warnings: string[] = [];

  if (!defaults || typeof defaults !== "object" || Object.keys(defaults).length === 0) {
    throw new Error("loadModels: defaults required and non-empty");
  }

  // Layer 1: Notion
  if (typeof fetchRows === "function") {
    try {
      const promise = fetchRows();
      const timed: Promise<never> = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Notion timeout")), NOTION_TIMEOUT_MS),
      );
      const rows = await Promise.race([promise, timed]);
      if (rows && typeof rows === "object" && Object.keys(rows).length > 0) {
        log.info(`loaded ${Object.keys(rows).length} models from Notion`);
        if (cachePath) writeCache(cachePath, rows, log);
        return { models: rows, source: "notion", warnings };
      }
      warnings.push("Notion returned empty rows");
      log.warn("Notion returned empty rows — falling back");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Notion fail: ${msg}`);
      log.warn(`Notion fail: ${msg} — falling back to cache/defaults`);
    }
  }

  // Layer 2: cache
  const cached = _readCache(cachePath, log);
  if (cached) {
    log.info(`loaded ${Object.keys(cached).length} models from cache (${cachePath})`);
    return { models: cached, source: "cache", warnings };
  }

  // Layer 3: defaults
  log.info(`loaded ${Object.keys(defaults).length} models from hardcoded defaults`);
  return { models: defaults, source: "defaults", warnings };
}

module.exports = { loadModels, writeCache, NOTION_TIMEOUT_MS };
