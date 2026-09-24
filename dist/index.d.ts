export declare const NOTION_TIMEOUT_MS = 5000;
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
export declare function writeCache(cachePath: string, models: ModelMap, logger?: Logger): void;
export declare function loadModels(opts: LoadModelsOpts): Promise<LoadModelsResult>;
//# sourceMappingURL=index.d.ts.map