// Which side of a body a shot came from: front / back / left / right, from the body's yaw (deg, 0 faces -Z) and the shooter.
const D2R = Math.PI / 180;
export function flinchDir(yaw, at, from) {
  const dx = from.x - at.x, dz = from.z - at.z, y = (yaw ?? 0) * D2R;
  const fd = dx * -Math.sin(y) + dz * -Math.cos(y), rd = dx * Math.cos(y) + dz * -Math.sin(y);
  return Math.abs(fd) >= Math.abs(rd) ? (fd >= 0 ? "front" : "back") : (rd >= 0 ? "right" : "left");
}
// a unit ground vector from `from` toward `at` (the way a shot pushes)
export function awayFrom(at, from) { const dx = at.x - from.x, dz = at.z - from.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; }
