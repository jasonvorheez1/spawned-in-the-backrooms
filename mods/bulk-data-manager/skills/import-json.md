---
name: Import JSON Data
description: Import JSON data from a URL into the bulk data manager for use in game behaviors
---

---
description: Import JSON data from a URL into the bulk data manager
requiresArgs: false
---

# Import JSON Data

Import structured JSON data from a public URL into the bulk data manager for use in any game behavior.

## Prerequisites

The **bulk-data-manager** mod must be installed. It provides:
- A `data-manager` tagged object (server realm) that stores collections
- `scripts/data-loader.js` on godMode handling chunked import actions
- `scripts/lib/data-manager.js` for querying data from any behavior
- `scripts/creator-data-ui.js` as the god-mode panel

## How the Import Pipeline Works

1. **Client-side fetch** — The creator UI uses `globalThis.fetch` in the browser to download the JSON from a URL. The engine never touches the URL directly.
2. **Auto-unwrap** — If the response is not an array, the importer checks for common wrappers: `.features` (GeoJSON FeatureCollection), `.data`, `.records`, `.items`, `.rows`, `.results`.
3. **Chunking** — Records are split into batches of 250 and sent via `sendAction('dataImportChunk', ...)` with promise-chained delays.
4. **Finalize** — After all chunks, `sendAction('dataImportFinalize', ...)` triggers server-side sharded storage (500 records per shard) and updates collection metadata.
5. **Storage** — Shards saved at `data/<collection>/<index>`, manifest at `data/<collection>/_meta`. Survives restarts.

## Supported JSON Formats

- **Plain array**: `[{ "name": "Sword", "damage": 10 }, ...]`
- **GeoJSON FeatureCollection**: `{ "type": "FeatureCollection", "features": [...] }`
- **Wrapped arrays**: `{ "data": [...] }`, `{ "records": [...] }`, `{ "items": [...] }`, `{ "rows": [...] }`, `{ "results": [...] }`

## Using the Panel

1. Enter god mode
2. Open the **Data Manager** panel
3. Click **+ Import from URL**
4. Select **JSON** as the file type (default)
5. Enter a **collection name** (e.g. `enemies`, `items`, `geo_json`)
6. Paste the **JSON URL**
7. Click **Import** — progress shows as chunks send

## Querying Imported Data from Behaviors

```js
const dm = require('lib/data-manager.js');

// Get all records
const allItems = dm.getAll('items');

// Query with filter
const swords = dm.query('items', { type: 'sword' });

// Find one record
const boss = dm.find('items', { name: 'Dragon King' });

// Count records
const total = dm.count('items');

// Get unique values for a field
const types = dm.distinct('items', 'type');
```

## Size Limits and Gotchas

- **Large files (>5MB)** may fail silently — the browser has to download, parse, and push everything through the action pipeline.
- **`globalThis.setTimeout`** is not reliably available in all UI sandboxes. The importer uses promise chains instead.
- **`sendAction` at module load** may be undefined — always reference `globalThis.sendAction` at call time.
- **CORS** — The URL must allow cross-origin requests. Most raw GitHub URLs, Dropbox direct links, and public APIs work.
- **No server-side fetch** — There is no `http:get` job in the engine. All fetching happens client-side in the browser.

## Programmatic Import (from a behavior)

If you need to import data from within a behavior rather than the panel, send the actions manually:

```js
// From an onInput handler on godMode:
const records = [/* your data */];
const CHUNK = 250;
const chunks = Math.ceil(records.length / CHUNK);
for (let i = 0; i < chunks; i++) {
  const slice = records.slice(i * CHUNK, (i + 1) * CHUNK);
  // These would need to be sent via sendAction from client UI
  // or accumulated in data-manager state directly via:
  // dm.setStorageData('my-collection', records);
}
```

For server-side bulk loading, use `dm.setStorageData(collectionName, records)` directly in a behavior's `onSpawn`, then call the storage save pattern from `data-loader.js`.
