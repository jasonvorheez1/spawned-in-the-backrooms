/**
 * data-loader.js — Behavior for managing data collections.
 * Attached to both data-manager object (onSpawn) and godMode (onInput).
 * PATCHED: auto-unwraps GeoJSON FeatureCollection.
 */
const dm = require('lib/data-manager.js');
var SHARD_SIZE = 500;

var _dmIdCache = null;
export function getDmIdFrom(api) {
  if (_dmIdCache) return _dmIdCache;
  var q = api.query({ tags: ['data-manager'] });
  if (q.length > 0) { _dmIdCache = q[0].id; return _dmIdCache; }
  if (api.resolveObjectId) {
    var resolved = api.resolveObjectId('data-manager');
    if (resolved) { _dmIdCache = resolved; return _dmIdCache; }
  }
  _dmIdCache = api.id;
  return _dmIdCache;
}

export function isDataManager(api) {
  var tags = api.getProperty ? api.getProperty('tags') : [];
  if (Array.isArray(tags) && tags.indexOf('data-manager') >= 0) return true;
  return api.id.indexOf('data-manager') >= 0 || api.id.indexOf('dm-') >= 0;
}

export function saveSharded(api, colName, records) {
  var shardCount = Math.ceil(records.length / SHARD_SIZE);
  for (var si = 0; si < shardCount; si++) {
    (function(idx) {
      var shard = records.slice(idx * SHARD_SIZE, (idx + 1) * SHARD_SIZE);
      api.job('storage:set', { key: 'data/' + colName + '/' + idx, value: shard }, function() {});
    })(si);
  }
  api.job('storage:set', { key: 'data/' + colName + '/_meta', value: { shards: shardCount, total: records.length } }, function() {
    api.log('Saved "' + colName + '": ' + records.length + ' records in ' + shardCount + ' shards');
  });
}

export function getDmCollections(api) {
  var dmId = getDmIdFrom(api);
  var s = api.getObjectState(dmId);
  return (s && s.collections) ? s.collections : [];
}

export function setDmCollections(api, cols) {
  var dmId = getDmIdFrom(api);
  api.patchObjectState(dmId, { collections: cols });
}

export function servePage(api, colName, page, size, search, records) {
  var filtered = [];
  for (var fi = 0; fi < records.length; fi++) {
    if (search) {
      var match = false;
      var rKeys = Object.keys(records[fi]);
      for (var sk = 0; sk < rKeys.length; sk++) {
        if (String(records[fi][rKeys[sk]]).toLowerCase().indexOf(search) >= 0) { match = true; break; }
      }
      if (!match) continue;
    }
    filtered.push({ idx: fi, rec: records[fi] });
  }
  var totalFiltered = filtered.length;
  var start = page * size;
  var pageSlice = filtered.slice(start, start + size);
  var dmId = getDmIdFrom(api);
  api.patchObjectState(dmId, {
    _page: {
      collection: colName,
      page: page,
      pageSize: size,
      search: search,
      totalRecords: records.length,
      totalFiltered: totalFiltered,
      records: pageSlice
    }
  });
}

export function upsertCollection(api, colName, count, fields, source) {
  var cols = getDmCollections(api);
  var existing = -1;
  for (var ci = 0; ci < cols.length; ci++) {
    if (cols[ci].name === colName) { existing = ci; break; }
  }
  var entry = { name: colName, count: count, fields: fields, source: source, importedAt: api.getTick() };
  if (existing >= 0) cols[existing] = entry;
  else cols.push(entry);
  setDmCollections(api, cols);
}

// Helper to unwrap non-array JSON into an array
export function unwrapToArray(recs) {
  if (Array.isArray(recs)) return recs;
  if (recs && typeof recs === 'object') {
    // GeoJSON FeatureCollection
    if (Array.isArray(recs.features)) return recs.features;
    // Common wrappers
    var inner = recs.data || recs.records || recs.items || recs.rows || recs.results;
    if (Array.isArray(inner)) return inner;
  }
  return null;
}

export function onSpawn(api) {
  if (!isDataManager(api)) return;
  var collections = getDmCollections(api);
  for (var i = 0; i < collections.length; i++) {
    var col = collections[i];
    (function(colName) {
      api.job('storage:get', { key: 'data/' + colName + '/_meta' }, function(metaResult) {
        if (metaResult.ok && metaResult.data.value && metaResult.data.value.shards) {
          var meta = metaResult.data.value;
          var shards = meta.shards;
          var allRecords = [];
          var loaded = 0;
          for (var si = 0; si < shards; si++) {
            (function(idx) {
              api.job('storage:get', { key: 'data/' + colName + '/' + idx }, function(shardResult) {
                if (shardResult.ok && Array.isArray(shardResult.data.value)) {
                  for (var r = 0; r < shardResult.data.value.length; r++) {
                    allRecords[idx * 500 + r] = shardResult.data.value[r];
                  }
                }
                loaded++;
                if (loaded === shards) {
                  allRecords = allRecords.filter(function(r) { return r !== undefined; });
                  dm.setStorageData(colName, allRecords);
                  api.log('Loaded "' + colName + '": ' + allRecords.length + ' records (' + shards + ' shards)');
                  servePage(api, colName, 0, 25, '', allRecords);
                }
              });
            })(si);
          }
        } else {
          api.job('storage:get', { key: 'data/' + colName }, function(result) {
            if (result.ok && Array.isArray(result.data.value)) {
              dm.setStorageData(colName, result.data.value);
              api.log('Loaded "' + colName + '": ' + result.data.value.length + ' records');
              servePage(api, colName, 0, 25, '', result.data.value);
            }
          });
        }
      });
    })(col.name);
  }
}

export function onInput(api, input) {
  if (isDataManager(api)) return;

  // Page request
  if (input.actions.dataRequestPage && input.actionData?.dataRequestPage) {
    var rp = input.actionData.dataRequestPage;
    var rpName = rp.collection;
    var rpPage = rp.page != null ? rp.page : 0;
    var rpSize = rp.pageSize || 25;
    var rpSearch = (rp.search || '').toLowerCase();
    if (!rpName) return;

    var rpRecords = dm.getAll(rpName);
    if (rpRecords.length > 0) {
      servePage(api, rpName, rpPage, rpSize, rpSearch, rpRecords);
    } else {
      api.job('storage:get', { key: 'data/' + rpName }, function(result) {
        if (result.ok && Array.isArray(result.data.value)) {
          dm.setStorageData(rpName, result.data.value);
          servePage(api, rpName, rpPage, rpSize, rpSearch, result.data.value);
        } else {
          servePage(api, rpName, rpPage, rpSize, rpSearch, []);
        }
      });
    }
  }

  // Chunked import
  api.log('data-loader onInput: ' + Object.keys(input.actions).filter(function(k){return input.actions[k]}).join(','));
  if (input.actions.dataImportChunk && input.actionData?.dataImportChunk) {
    var ch = input.actionData.dataImportChunk;
    if (!ch.collection || !Array.isArray(ch.records)) return;
    var existing = dm.getAll(ch.collection);
    if (ch.chunkIndex === 0) existing = [];
    for (var ci = 0; ci < ch.records.length; ci++) existing.push(ch.records[ci]);
    dm.setStorageData(ch.collection, existing);
    api.log('Chunk ' + (ch.chunkIndex + 1) + '/' + ch.totalChunks + ' for "' + ch.collection + '": ' + existing.length + ' records so far');
  }

  // Finalize chunked import
  if (input.actions.dataImportFinalize && input.actionData?.dataImportFinalize) {
    var fin = input.actionData.dataImportFinalize;
    if (!fin.collection) return;
    var finRecords = dm.getAll(fin.collection);
    saveSharded(api, fin.collection, finRecords);
    api.job('storage:del', { key: 'data/' + fin.collection }, function() {});
    dm.clearCache(fin.collection);
    upsertCollection(api, fin.collection, finRecords.length, fin.fields || (finRecords.length > 0 ? Object.keys(finRecords[0]) : []), fin.url || 'unknown');
    api.toast('Imported "' + fin.collection + '": ' + finRecords.length + ' records', { duration: 4 });
    servePage(api, fin.collection, 0, 25, '', finRecords);
  }

  // Legacy client-side import
  if (input.actions.dataImport && input.actionData?.dataImport) {
    var d = input.actionData.dataImport;
    var collection = d.collection;
    var records = d.records;
    var url = d.url || 'unknown';
    if (!collection || !Array.isArray(records)) return;

    saveSharded(api, collection, records);
    dm.setStorageData(collection, records);
    dm.clearCache(collection);
    upsertCollection(api, collection, d.count || records.length, d.fields || (records.length > 0 ? Object.keys(records[0]) : []), url);
    api.toast('Imported "' + collection + '": ' + (d.count || records.length) + ' records', { duration: 4 });
    api.patchObjectState(getDmIdFrom(api), { _page: null });
  }

  // Refresh
  if (input.actions.dataRefresh && input.actionData?.dataRefresh) {
    var refName = input.actionData.dataRefresh.collection;
    if (!refName) return;
    api.job('storage:get', { key: 'data/' + refName }, function(result) {
      if (result.ok && Array.isArray(result.data.value)) {
        dm.setStorageData(refName, result.data.value);
        dm.clearCache(refName);
        api.toast('Refreshed "' + refName + '": ' + result.data.value.length + ' records');
      }
    });
  }

  // Delete collection
  if (input.actions.dataDelete && input.actionData?.dataDelete) {
    var delName = input.actionData.dataDelete.collection;
    if (!delName) return;
    api.job('storage:del', { key: 'data/' + delName }, function() {});
    dm.setStorageData(delName, []);
    dm.clearCache(delName);
    var delCols = [], oldCols = getDmCollections(api);
    for (var di = 0; di < oldCols.length; di++) {
      if (oldCols[di].name !== delName) delCols.push(oldCols[di]);
    }
    setDmCollections(api, delCols);
    api.toast('Deleted collection "' + delName + '"', { duration: 3 });
  }

  // Edit record
  if (input.actions.dataEditRecord && input.actionData?.dataEditRecord) {
    var ed = input.actionData.dataEditRecord;
    if (!ed.collection || ed.index == null || !ed.updates) return;
    var edRecords = dm.getAll(ed.collection);
    if (ed.index < 0 || ed.index >= edRecords.length) return;
    var keys = Object.keys(ed.updates);
    for (var ek = 0; ek < keys.length; ek++) edRecords[ed.index][keys[ek]] = ed.updates[keys[ek]];
    dm.setStorageData(ed.collection, edRecords);
    dm.clearCache(ed.collection);
    saveSharded(api, ed.collection, edRecords);
    api.toast('Updated record #' + ed.index, { duration: 2 });
    var epg = api.getObjectState(getDmIdFrom(api))?._page;
    servePage(api, ed.collection, epg ? epg.page : 0, epg ? epg.pageSize : 25, epg ? (epg.search || '') : '', edRecords);
  }

  // Add record
  if (input.actions.dataAddRecord && input.actionData?.dataAddRecord) {
    var ad = input.actionData.dataAddRecord;
    if (!ad.collection || !ad.record) return;
    var adRecords = dm.getAll(ad.collection);
    adRecords.push(ad.record);
    dm.setStorageData(ad.collection, adRecords);
    dm.clearCache(ad.collection);
    var adCols = getDmCollections(api);
    for (var ai = 0; ai < adCols.length; ai++) {
      if (adCols[ai].name === ad.collection) { adCols[ai].count = adRecords.length; break; }
    }
    setDmCollections(api, adCols);
    saveSharded(api, ad.collection, adRecords);
    api.toast('Added record to "' + ad.collection + '"', { duration: 2 });
    var apg = api.getObjectState(getDmIdFrom(api))?._page;
    servePage(api, ad.collection, apg ? apg.page : 0, apg ? apg.pageSize : 25, apg ? (apg.search || '') : '', adRecords);
  }

  // Delete record
  if (input.actions.dataDeleteRecord && input.actionData?.dataDeleteRecord) {
    var dr = input.actionData.dataDeleteRecord;
    if (!dr.collection || dr.index == null) return;
    var drRecords = dm.getAll(dr.collection);
    if (dr.index < 0 || dr.index >= drRecords.length) return;
    drRecords.splice(dr.index, 1);
    dm.setStorageData(dr.collection, drRecords);
    dm.clearCache(dr.collection);
    var drCols = getDmCollections(api);
    for (var dri = 0; dri < drCols.length; dri++) {
      if (drCols[dri].name === dr.collection) { drCols[dri].count = drRecords.length; break; }
    }
    setDmCollections(api, drCols);
    saveSharded(api, dr.collection, drRecords);
    api.toast('Deleted record from "' + dr.collection + '"', { duration: 2 });
    var dpg = api.getObjectState(getDmIdFrom(api))?._page;
    servePage(api, dr.collection, dpg ? dpg.page : 0, dpg ? dpg.pageSize : 25, dpg ? (dpg.search || '') : '', drRecords);
  }
}
