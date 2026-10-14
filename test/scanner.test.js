// Scanner bucket logic — no network calls. Catalog below is a snapshot of real
// Google model IDs so the buckets are exercised against realistic noise.
// Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");

const { classify, candidatesFor, pickLatest, scanAndUpdate } = require("../dist/scanner.js");

const GOOGLE_CATALOG = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-preview-tts",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-image",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-lite",
  "gemini-nano-banana-2.1",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-omni-1.1-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-4-argon",
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-embedding-2",
  "gemini-3.8-live",
  "gemini-3.8-live-extended-thinking",
];

const latestFor = (id, catalog = GOOGLE_CATALOG) => pickLatest(candidatesFor(catalog, id));

test("gemini: standard tiers bump within the same tier", () => {
  assert.equal(latestFor("gemini-2.5-flash"), "gemini-3.8-flash");
  assert.equal(latestFor("gemini-2.5-flash-lite"), "gemini-3.5-flash-lite");
  assert.equal(latestFor("gemini-2.5-pro"), "gemini-2.5-pro");
});

test("gemini: preview ID resolves to the stable line of the same tier", () => {
  assert.equal(classify("gemini-3.1-flash-lite-preview").marker, "flash-lite");
  assert.equal(latestFor("gemini-3.1-flash-lite-preview"), "gemini-3.5-flash-lite");
});

test("gemini: unrecognised suffix is never lumped with other odd IDs", () => {
  const odd = "gemini-3.7-flash-video-understanding-eap";
  assert.deepEqual(candidatesFor(GOOGLE_CATALOG, odd), []);
  assert.equal(latestFor(odd), null);
  assert.deepEqual(candidatesFor(GOOGLE_CATALOG, "gemini-4-argon"), ["gemini-4-argon"]);
  assert.deepEqual(candidatesFor(GOOGLE_CATALOG, "gemini-3.8-live"), ["gemini-3.8-live"]);
});

test("gemini: other product lines do not join the flash bucket", () => {
  assert.ok(!candidatesFor(GOOGLE_CATALOG, "gemini-2.5-flash").includes("gemini-omni-1.1-flash"));
  assert.notEqual(classify("gemini-omni-1.1-flash").marker, "flash");
  assert.notEqual(classify("gemini-flash-latest").marker, "flash");
});

test("gpt + claude buckets unchanged", () => {
  assert.equal(latestFor("gpt-5.5", ["gpt-5.5", "gpt-5.6", "gpt-5.6-mini", "gpt-5.7-pro"]), "gpt-5.6");
  assert.equal(latestFor("gpt-5.5-mini", ["gpt-5.5-mini", "gpt-5.6", "gpt-5.6-mini"]), "gpt-5.6-mini");
  assert.equal(latestFor("claude-sonnet-4-5", ["claude-sonnet-4-5", "claude-sonnet-5", "claude-opus-4-8"]), "claude-sonnet-5");
  assert.deepEqual(classify("claude-haiku-4-5"), { family: "claude", marker: "haiku" });
});

test("scanAndUpdate: odd gemini ID is skipped, not bumped to an unrelated model", async () => {
  const updates = [];
  const rows = [
    { name: "Gemini", modelId: "gemini-3.7-flash-video-understanding-eap", provider: "openai-compat", apiKeyEnv: "K" },
    { name: "Flash", modelId: "gemini-3.7-flash", provider: "openai-compat", apiKeyEnv: "K" },
  ];
  const { changed, skipped } = await scanAndUpdate({
    listRows: async () => rows,
    fetchCatalogs: async (groups) => new Map([...groups.keys()].map((k) => [k, GOOGLE_CATALOG])),
    updateRow: async (c, newId) => { updates.push([c.name, newId]); },
  });
  assert.deepEqual(changed.map((c) => [c.name, c.newId]), [["Flash", "gemini-3.8-flash"]]);
  assert.deepEqual(updates, [["Flash", "gemini-3.8-flash"]]);
  assert.deepEqual(skipped, [{ name: "Gemini", reason: "no candidate found" }]);
});

test("deepseek: buckets by suffix, version read from v<N>", () => {
  const catalog = ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro", "deepseek-v4.1-flash", "deepseek-v5-pro", "deepseek-v5"];
  assert.equal(latestFor("deepseek-v4-pro", catalog), "deepseek-v5-pro");
  assert.equal(latestFor("deepseek-v4", catalog), "deepseek-v5");
  assert.deepEqual(candidatesFor(catalog, "deepseek-chat"), ["deepseek-chat"]);
  assert.equal(latestFor("deepseek-v4-pro", ["deepseek-chat", "deepseek-v4-pro", "deepseek-v4.1-flash"]), "deepseek-v4-pro");
});
