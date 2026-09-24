"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classify = classify;
exports.versionTuple = versionTuple;
exports.cmpVersions = cmpVersions;
exports.candidatesFor = candidatesFor;
exports.pickLatest = pickLatest;
exports.scanAndUpdate = scanAndUpdate;
function classify(modelId) {
    const id = String(modelId || "").toLowerCase();
    if (id.startsWith("gpt-")) {
        if (/-mini(\b|$|-)/.test(id))
            return { family: "gpt", marker: "mini" };
        if (/-nano(\b|$|-)/.test(id))
            return { family: "gpt", marker: "nano" };
        if (/-pro(\b|$|-)/.test(id))
            return { family: "gpt", marker: "pro" };
        return { family: "gpt", marker: null };
    }
    if (id.startsWith("claude-")) {
        if (id.includes("haiku"))
            return { family: "claude", marker: "haiku" };
        if (id.includes("sonnet"))
            return { family: "claude", marker: "sonnet" };
        if (id.includes("opus"))
            return { family: "claude", marker: "opus" };
        return { family: "claude", marker: null };
    }
    if (id.startsWith("gemini-")) {
        if (id.includes("flash-lite"))
            return { family: "gemini", marker: "flash-lite" };
        if (id.endsWith("flash"))
            return { family: "gemini", marker: "flash" };
        if (id.endsWith("pro"))
            return { family: "gemini", marker: "pro" };
        return { family: "gemini", marker: null };
    }
    if (id.startsWith("deepseek-"))
        return { family: "deepseek", marker: null };
    return { family: "unknown", marker: null };
}
function versionTuple(modelId) {
    const id = String(modelId || "");
    const dotted = id.match(/(\d+\.\d+)/);
    if (dotted)
        return dotted[1].split(".").map((n) => parseInt(n, 10));
    const dashed = id.match(/-(\d+)-(\d+)/);
    if (dashed)
        return [parseInt(dashed[1], 10), parseInt(dashed[2], 10)];
    const single = id.match(/-(\d+)/);
    if (single)
        return [parseInt(single[1], 10), 0];
    return [0, 0];
}
function cmpVersions(a, b) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const x = a[i] || 0;
        const y = b[i] || 0;
        if (x !== y)
            return x - y;
    }
    return 0;
}
function candidatesFor(allIds, currentId) {
    const cur = classify(currentId);
    if (cur.family === "unknown")
        return [];
    return allIds.filter((id) => {
        if (/preview|exp\b|chat-latest|codex|audio|realtime|image|tts|whisper|embed|transcribe|search/i.test(id))
            return false;
        if (/-\d{4}-\d{2}-\d{2}$/.test(id))
            return false;
        if (/-\d{8}$/.test(id))
            return false;
        if (/-2\d{7}$/.test(id))
            return false;
        const c = classify(id);
        return c.family === cur.family && c.marker === cur.marker;
    });
}
function pickLatest(candidates) {
    if (candidates.length === 0)
        return null;
    return candidates
        .map((id) => ({ id, v: versionTuple(id) }))
        .sort((a, b) => {
        const c = cmpVersions(b.v, a.v);
        if (c !== 0)
            return c;
        return a.id.length - b.id.length;
    })[0].id;
}
async function scanAndUpdate(opts) {
    const { listRows, fetchCatalogs, updateRow, dryRun = false } = opts;
    const rows = await listRows();
    const groups = new Map();
    for (const r of rows) {
        if (!r.modelId || !r.provider)
            continue;
        const key = `${r.provider}|${r.baseUrl || ""}|${r.apiKeyEnv || ""}`;
        let bucket = groups.get(key);
        if (!bucket) {
            bucket = [];
            groups.set(key, bucket);
        }
        bucket.push(r);
    }
    const catalogs = await fetchCatalogs(groups);
    const changed = [];
    const skipped = [];
    for (const [key, items] of groups) {
        let catalog;
        if (catalogs instanceof Map) {
            catalog = catalogs.get(key);
        }
        else {
            catalog = catalogs[key];
        }
        if (!catalog || catalog.length === 0) {
            for (const it of items)
                skipped.push({ name: it.name, reason: "no catalog (provider unreachable or unsupported)" });
            continue;
        }
        for (const it of items) {
            const cands = candidatesFor(catalog, it.modelId);
            const latest = pickLatest(cands);
            if (!latest) {
                skipped.push({ name: it.name, reason: "no candidate found" });
                continue;
            }
            if (latest === it.modelId) {
                skipped.push({ name: it.name, reason: "already latest" });
                continue;
            }
            const cmp = cmpVersions(versionTuple(latest), versionTuple(it.modelId));
            if (cmp <= 0) {
                skipped.push({ name: it.name, reason: "already latest (tie)" });
                continue;
            }
            changed.push({ name: it.name, oldId: it.modelId, newId: latest, _ref: it._ref });
        }
    }
    if (!dryRun && updateRow) {
        for (const c of changed) {
            try {
                await updateRow(c, c.newId);
            }
            catch (err) {
                c.error = err instanceof Error ? err.message : String(err);
            }
        }
    }
    return { changed, skipped };
}
module.exports = {
    classify,
    versionTuple,
    cmpVersions,
    candidatesFor,
    pickLatest,
    scanAndUpdate,
};
//# sourceMappingURL=scanner.js.map