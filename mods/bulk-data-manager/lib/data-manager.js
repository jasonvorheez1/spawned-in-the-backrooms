/**
 * data-manager.js — Runtime data registry for bulk game data.
 */

const _cache = {};
const _storageCache = {};

export function setStorageData(collection, records) {
  if (Array.isArray(records)) {
    _storageCache[collection] = records;
    delete _cache[collection];
  }
}

export function getStorageCollections() {
  return Object.keys(_storageCache);
}

export function _load(collection) {
  if (_cache[collection]) return _cache[collection];
  let records = [];

  let index = null;
  try { index = require('lib/data/registry-' + collection + '-index.json'); } catch (e) {}

  if (index && index.shards) {
    for (let i = 0; i < index.shards; i++) {
      try {
        const shard = require('lib/data/registry-' + collection + '-' + i + '.json');
        if (Array.isArray(shard)) { for (let j = 0; j < shard.length; j++) records.push(shard[j]); }
      } catch (e) {}
    }
  } else {
    try {
      const data = require('lib/data/registry-' + collection + '.json');
      if (Array.isArray(data)) records = data;
    } catch (e) {}
  }

  if (_storageCache[collection]) {
    const sr = _storageCache[collection];
    for (let i = 0; i < sr.length; i++) records.push(sr[i]);
  }

  _cache[collection] = records;
  return records;
}

export function getAll(collection) { return _load(collection); }

export function query(collection, predicate) {
  const data = _load(collection);
  const results = [];
  for (let i = 0; i < data.length; i++) { if (predicate(data[i])) results.push(data[i]); }
  return results;
}

export function find(collection, predicate) {
  const data = _load(collection);
  for (let i = 0; i < data.length; i++) { if (predicate(data[i])) return data[i]; }
  return null;
}

export function getById(collection, id) { return find(collection, function(r) { return r.id === id; }); }

export function count(collection, predicate) {
  if (!predicate) return _load(collection).length;
  return query(collection, predicate).length;
}

export function distinct(collection, field) {
  const data = _load(collection);
  const seen = {}, results = [];
  for (let i = 0; i < data.length; i++) {
    const val = data[i][field];
    if (val !== undefined && !seen[val]) { seen[val] = true; results.push(val); }
  }
  return results;
}

export function groupBy(collection, field) {
  const data = _load(collection);
  const groups = {};
  for (let i = 0; i < data.length; i++) {
    const key = data[i][field];
    if (key === undefined) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(data[i]);
  }
  return groups;
}

export function getRandom(collection, randomFn, predicate) {
  const pool = predicate ? query(collection, predicate) : _load(collection);
  if (pool.length === 0) return null;
  return pool[Math.floor(randomFn() * pool.length)];
}

export function sample(collection, n, randomFn, predicate) {
  const pool = predicate ? query(collection, predicate) : _load(collection);
  const len = pool.length;
  if (len === 0) return [];
  const cnt = n < len ? n : len;
  const indices = [];
  for (let i = 0; i < len; i++) indices.push(i);
  for (let i = 0; i < cnt; i++) {
    const j = i + Math.floor(randomFn() * (len - i));
    const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
  }
  const results = [];
  for (let i = 0; i < cnt; i++) results.push(pool[indices[i]]);
  return results;
}

export function getFields(collection) {
  const data = _load(collection);
  const seen = {}, fields = [];
  const limit = data.length < 100 ? data.length : 100;
  for (let i = 0; i < limit; i++) {
    const rec = data[i];
    if (!rec || typeof rec !== 'object') continue;
    const keys = Object.keys(rec);
    for (let k = 0; k < keys.length; k++) {
      if (!seen[keys[k]]) { seen[keys[k]] = true; fields.push(keys[k]); }
    }
  }
  return fields;
}

export function sort(collection, field, direction, predicate) {
  const pool = predicate ? query(collection, predicate) : _load(collection).slice();
  const desc = direction === 'desc';
  pool.sort(function(a, b) {
    const va = a[field], vb = b[field];
    if (va === vb) return 0;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    if (typeof va === 'string' && typeof vb === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
    return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
  });
  return pool;
}

export function clearCache(collection) {
  if (collection) { delete _cache[collection]; }
  else { for (const k in _cache) delete _cache[k]; }
}

module.exports = {
  getAll: getAll, query: query, find: find, getById: getById, count: count,
  distinct: distinct, groupBy: groupBy, getRandom: getRandom, sample: sample,
  getFields: getFields, sort: sort, clearCache: clearCache,
  setStorageData: setStorageData, getStorageCollections: getStorageCollections
};
