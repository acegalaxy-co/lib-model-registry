"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTION_TIMEOUT_MS = void 0;
exports.writeCache = writeCache;
exports.loadModels = loadModels;
// @acegalaxy/lib-model-registry — 3-layer LLM model loader.
//
// Layer 1: Notion DB (source of truth, scheduler updates this)
// Layer 2: local cache file (synced after each successful Notion load)
// Layer 3: hardcoded defaults (shipped in code, last resort)
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.NOTION_TIMEOUT_MS = 5000;
function _defaultLogger() {
    return {
        info: (msg) => console.log(`[model-registry] ${msg}`),
        warn: (msg) => console.warn(`[model-registry] ${msg}`),
        error: (msg) => console.error(`[model-registry] ${msg}`),
    };
}
function _readCache(cachePath, logger) {
    if (!cachePath)
        return null;
    try {
        if (!fs.existsSync(cachePath))
            return null;
        const txt = fs.readFileSync(cachePath, "utf8");
        const obj = JSON.parse(txt);
        if (!obj ||
            typeof obj.models !== "object" ||
            obj.models === null ||
            Object.keys(obj.models).length === 0) {
            logger.warn(`cache empty/invalid at ${cachePath}`);
            return null;
        }
        return obj.models;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`cache read failed: ${msg}`);
        return null;
    }
}
function writeCache(cachePath, models, logger = _defaultLogger()) {
    if (!cachePath)
        return;
    try {
        const dir = path.dirname(cachePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const tmp = `${cachePath}.tmp.${process.pid}`;
        const payload = JSON.stringify({ writtenAt: new Date().toISOString(), models }, null, 2);
        fs.writeFileSync(tmp, payload, { mode: 0o600 });
        fs.renameSync(tmp, cachePath);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`cache write failed: ${msg}`);
    }
}
async function loadModels(opts) {
    const { fetchRows, cachePath, defaults, logger } = opts || {};
    const log = logger || _defaultLogger();
    const warnings = [];
    if (!defaults || typeof defaults !== "object" || Object.keys(defaults).length === 0) {
        throw new Error("loadModels: defaults required and non-empty");
    }
    // Layer 1: Notion
    if (typeof fetchRows === "function") {
        try {
            const promise = fetchRows();
            const timed = new Promise((_, rej) => setTimeout(() => rej(new Error("Notion timeout")), exports.NOTION_TIMEOUT_MS));
            const rows = await Promise.race([promise, timed]);
            if (rows && typeof rows === "object" && Object.keys(rows).length > 0) {
                log.info(`loaded ${Object.keys(rows).length} models from Notion`);
                if (cachePath)
                    writeCache(cachePath, rows, log);
                return { models: rows, source: "notion", warnings };
            }
            warnings.push("Notion returned empty rows");
            log.warn("Notion returned empty rows — falling back");
        }
        catch (err) {
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
module.exports = { loadModels, writeCache, NOTION_TIMEOUT_MS: exports.NOTION_TIMEOUT_MS };
//# sourceMappingURL=index.js.map