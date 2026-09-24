// Smoke test for @acegalaxy/lib-model-registry — no network calls, just verify package loads + exports.
// Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");

test("@acegalaxy/lib-model-registry: dist/index.js loads + primary exports present", () => {
  const m = require("../dist/index.js");
  assert.equal(typeof m.loadModels, "function", "loadModels should be exported");
});
