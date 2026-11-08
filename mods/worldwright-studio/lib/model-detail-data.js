// Shared by the god-seat page validator and the private browser viewer. No geometry lives here.
// Node IDs use the same 0..255 imported-node budget as lib/data/workbench.yml.
export const LIMITS = Object.freeze({
  version: 1,
  maxOperations: 384,
  maxNodes: 256,
  maxNodeId: 255,
  maxProtectedNodes: 256,
  minResolution: 16,
  maxResolution: 96,
  maxCoordinate: 99999,
  maxRadius: 99999,
  sourceHashLength: 64
});
const KINDS = ['add', 'cut', 'inflate', 'smooth', 'flatten'];
const OP_KEYS = ['node', 'kind', 'center', 'radius', 'strength', 'normal', 'shape', 'resolution', 'color'];
const DETAIL_KEYS = ['version', 'operations', 'protectedNodes', 'sourceHash'];
function record(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid ' + label);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw Error('Unknown ' + label + ' field: ' + key + '; store a recipe, not geometry');
}
function node(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,2})$/.test(value) || Number(value) > LIMITS.maxNodeId)
    throw Error('Detail node must be an imported node ID from 0 to ' + LIMITS.maxNodeId);
}
function vector(value, label) {
  if (!Array.isArray(value) || value.length !== 3) throw Error('Detail ' + label + ' needs three local coordinates');
  for (const n of value) if (!Number.isFinite(n) || Math.abs(n) > LIMITS.maxCoordinate) throw Error('Detail ' + label + ' must be finite and within ' + LIMITS.maxCoordinate);
}
function checkOperation(value) {
  record(value, OP_KEYS, 'detail operation');
  for (const key of OP_KEYS) if (!Object.prototype.hasOwnProperty.call(value, key)) throw Error('Missing detail operation field: ' + key);
  node(value.node);
  if (!KINDS.includes(value.kind)) throw Error('Unknown detail brush kind');
  vector(value.center, 'center');
  vector(value.normal, 'normal');
  if (!value.normal.some(n => n !== 0)) throw Error('Detail normal must be nonzero');
  if (!Number.isFinite(value.radius) || value.radius <= 0 || value.radius > LIMITS.maxRadius) throw Error('Detail radius must be positive and at most ' + LIMITS.maxRadius);
  if (!Number.isFinite(value.strength) || value.strength < 0 || value.strength > 1) throw Error('Detail strength must be from 0 to 1');
  if (value.shape !== 'sphere' && value.shape !== 'box') throw Error('Detail shape must be sphere or box');
  if (!Number.isInteger(value.resolution) || value.resolution < LIMITS.minResolution || value.resolution > LIMITS.maxResolution) throw Error('Detail resolution must be an integer from 16 to 96');
  if (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)) throw Error('Detail color must be #rrggbb');
}
export function blankDetail() { return { version: 1, operations: [], protectedNodes: [] }; }
export function validateOperation(value) {
  checkOperation(value);
  return JSON.parse(JSON.stringify(value));
}
export function validateDetail(value) {
  record(value, DETAIL_KEYS, 'model detail');
  if (value.version !== LIMITS.version) throw Error('Unsupported model-detail version');
  if (!Array.isArray(value.operations) || value.operations.length > LIMITS.maxOperations) throw Error('Model detail allows at most ' + LIMITS.maxOperations + ' ordered operations');
  for (const operation of value.operations) checkOperation(operation);
  if (!Array.isArray(value.protectedNodes) || value.protectedNodes.length > LIMITS.maxProtectedNodes) throw Error('Too many protected detail nodes');
  const seen = {};
  for (const id of value.protectedNodes) {
    node(id);
    if (seen[id]) throw Error('Duplicate protected detail node: ' + id);
    seen[id] = true;
  }
  // SHA-256 of the original GLB bytes. Optional until the first edit; never insert or normalize it.
  if (Object.prototype.hasOwnProperty.call(value, 'sourceHash') && (typeof value.sourceHash !== 'string' || !/^[0-9a-f]{64}$/i.test(value.sourceHash))) throw Error('Detail sourceHash must be a 64-digit SHA-256 hex digest');
  // Protection guards NEW edits in the viewer, not this ordered replay of earlier edits.
  // Preserve key order and values too: validation must never make an old document dirty.
  return JSON.parse(JSON.stringify(value));
}
