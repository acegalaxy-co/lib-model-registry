// load-models — minimal example for @acegalaxy/lib-model-registry
//
// Setup:
//   npm install
//   npm run build
//   node examples/load-models.js

const { loadModels } = require("@acegalaxy/lib-model-registry");

(async () => {
  const models = await loadModels({
    token: process.env.NOTION_TOKEN,
    dbId: process.env.MODEL_DB_ID
  });
  console.log("Loaded", Object.keys(models).length, "models");
})();
