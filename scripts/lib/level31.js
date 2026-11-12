// Level 31 "The Roller Rink": the one map every file builds to. Metres; +x east, +z south; floor y = 0; ceiling H.
export const H = 5, T = 0.3;
export const B = { x0: -42, x1: 42, z0: -30, z1: 30 }; // the building
export const RINK = { cx: 0, cz: 0, half: 10, r: 12, rail: 12.3 }; // a stadium: a 20 m straight with a 12 m radius end each side
export const ZONES = { // dressed by their own files; each is open to the carpet aisle round the rink
  arcade: { x0: 42, x1: 58, z0: -30, z1: 6 }, // the back room, through the east wall (Shelly Nov 12: a 2nd room)
  party: { x0: 26, x1: 42, z0: -30, z1: 6 },
  food: { x0: 26, x1: 42, z0: 6, z1: 30 },
  rental: { x0: 2, x1: 24, z0: 21, z1: 30 },
  shop: { x0: -42, x1: -28, z0: -12, z1: 12 },
  cinema: { x0: -12, x1: 12, z0: -30, z1: -19 },
  dj: { x0: -9, x1: -3, z0: 14.5, z1: 18 },
};
export const ARRIVE = { x: -30, y: 0.1, z: 27 }; // just inside the plywood door (south wall, west end)
export const DOOR = { x: -30, z: 30 };
export const BACK = { x0: 42, x1: 58, z0: -30, z1: 6, doorZ: -12, doorW: 3.6, doorH: 3.2 }; // the arcade's own room east of the hall
export const onRink = (x, z) => { const dx = Math.max(0, Math.abs(x - RINK.cx) - RINK.half); return Math.hypot(dx, z - RINK.cz) <= RINK.r; };
export const zoneAt = (x, z) => { if (onRink(x, z)) return "rink"; for (const [k, r] of Object.entries(ZONES)) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return k; return "carpet"; };

// Skating on the wood (Shelly Nov 12: slip and slide in shoes, travel fine on bought skates with roller physics). All numbers Savi's picks.
export const SKATE = {
  shoe: { push: 1.3, top: 3.4, drag: 0.4, slipSpeed: 2.0, slipTurn: 0.7, slipFor: 0.8, slipKick: 2.0, slipEvery: 1.2 },
  roll: { push: 3.6, sprintPush: 5.2, top: 7.5, sprintTop: 10.5, drag: 0.7, brake: 8.5, turn: 150, turnFast: 60 },
};
// one step of the rink: where the body's flat velocity goes next. w is the mover's scratch, rnd a 0..1 roll.
export function skateStep(K, skates, w, dir, pressing, sprinting, vx, vz, dt, nowMs, rnd) {
  let sp = Math.hypot(vx, vz); const dl = Math.hypot(dir.x, dir.z), dx = dl > 0.01 ? dir.x / dl : 0, dz = dl > 0.01 ? dir.z / dl : 0, go = pressing && dl > 0.01;
  let hx = sp > 0.2 ? vx / sp : dx, hz = sp > 0.2 ? vz / sp : dz;
  if (!skates) { // shoes on polished wood: barely any grip, and a hard turn at speed takes your feet out
    const k = K.shoe; if (nowMs < (w.slipUntil ?? 0)) { sp = Math.max(0, sp - k.drag * dt); return { x: hx * sp, z: hz * sp }; }
    if (go) { let nx = vx + dx * k.push * dt, nz = vz + dz * k.push * dt; const n = Math.hypot(nx, nz); if (n > k.top) { nx *= k.top / n; nz *= k.top / n; }
      if (sp > k.slipSpeed && hx * dx + hz * dz < k.slipTurn && nowMs > (w.slipNext ?? 0)) { w.slipNext = nowMs + k.slipEvery * 1000; w.slipUntil = nowMs + k.slipFor * 1000; const a = (rnd - 0.5) * 2.4, c = Math.cos(a), s = Math.sin(a); return { x: (hx * c - hz * s) * (sp + k.slipKick), z: (hx * s + hz * c) * (sp + k.slipKick), slipped: true }; }
      return { x: nx, z: nz }; }
    sp = Math.max(0, sp - k.drag * dt); return { x: hx * sp, z: hz * sp };
  }
  const k = K.roll;
  if (!go) { sp = Math.max(0, sp - k.drag * dt); return { x: hx * sp, z: hz * sp }; } // let go and you glide
  const dot = hx * dx + hz * dz;
  if (dot < -0.4 && sp > 0.6) { sp = Math.max(0, sp - k.brake * dt); return { x: hx * sp, z: hz * sp }; } // lean back: toe stop
  const top = sprinting ? k.sprintTop : k.top, f = Math.min(1, sp / k.sprintTop), maxTurn = (k.turn + (k.turnFast - k.turn) * f) * Math.PI / 180 * dt; // wide arcs at speed
  let ang = Math.atan2(hx * dz - hz * dx, dot); ang = Math.max(-maxTurn, Math.min(maxTurn, ang));
  const c = Math.cos(ang), s = Math.sin(ang); const rx = hx * c - hz * s, rz = hx * s + hz * c;
  sp = sp < top ? Math.min(top, sp + (sprinting ? k.sprintPush : k.push) * Math.max(0.25, dot) * dt) : Math.max(top, sp - k.drag * 2 * dt);
  return { x: rx * sp, z: rz * sp };
}
