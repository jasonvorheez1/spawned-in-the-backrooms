// Projects — the INDEX, and nothing else. the project table stays as an index only. There is exactly one project and the game IS it: PROJECT_ID (spelled once in lib/schema.js) and ensure(), which mints that one row idempotently at boot.
const SCHEMA = require("lib/schema.js");

const PROJECT_ID = SCHEMA.PROJECT_ID;

export function ensure(objectApi) {
  return SCHEMA.ensureBuiltinProject(objectApi);
}

module.exports = {
  PROJECT_ID,
  ensure,
};
