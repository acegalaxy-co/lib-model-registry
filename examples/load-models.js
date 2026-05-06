// load-models — minimal example for @kanelr/model-registry
//
// Setup:
//   npm install
//   npm run build
//   node examples/load-models.js

const { loadModels } = require("@kanelr/model-registry");

(async () => {
  const models = await loadModels({
    token: process.env.NOTION_TOKEN,
    dbId: process.env.MODEL_DB_ID
  });
  console.log("Loaded", Object.keys(models).length, "models");
})();
