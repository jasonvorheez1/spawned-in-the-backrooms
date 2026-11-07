// Level 1's referee: lays the lamps, crates, supplies and thresholds once, then runs the Flickering.
import L from "../../scripts/lib/data/level1.yml";
import { N, H, zoneOf, lampAt, cellCenter, shelfSlots, BACK, ARRIVE, hash } from "../../scripts/lib/level1.js";
import { spawnAlmond, spawnCrateL1 } from "../../scripts/lib/loot.js";
export const cadence = "250ms";
const LAMP_ON = 9;

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l1-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-geo.js" }, material: { roughness: 0.85, emissiveIntensity: 2 } });
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const k = lampAt(cx, cz); if (!k) continue;
      const c = cellCenter(cx, cz), tube = k === "tube";
      ctx.spawn({ tags: ["l1lamp"], feetPosition: { x: c.x, y: H - (tube ? 0.08 : 0.5), z: c.z }, primitive: tube ? { kind: "box", width: 0.35, height: 0.06, depth: 2.4 } : { kind: "sphere", radius: 0.09 },
        material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.2 },
        light: { kind: "point", color: tube ? "oklch(0.95 0.02 220)" : "oklch(0.9 0.08 80)", intensity: tube ? LAMP_ON : 2.5, distance: tube ? 20 : 9, shadow: { enabled: false } } });
    }
    // supplies: crates on the racks first, then loose ones; almond water; M.E.G. landmarks near arrival
    let crates = 0;
    for (let cx = 0; cx < N && crates < L.crates; cx++) for (let cz = 0; cz < N && crates < L.crates; cz++) {
      const slots = shelfSlots(cx, cz); if (!slots.length || hash(cx, cz, 91) > 0.7) continue;
      const p = slots[Math.floor(hash(cx, cz, 93) * slots.length)];
      spawnCrateL1(ctx, p); crates++;
    }
    for (let i = 0; i < L.almonds; i++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
      if (zoneOf(cx, cz) === "corridors" && ctx.random() < 0.7) continue;
      spawnAlmond(ctx, cellCenter(cx, cz));
    }
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    for (let i = 0; i < 3; i++) spawnAlmond(ctx, { x: a.x + 2 + i * 0.4, z: a.z - 2 });
    ctx.spawn({ id: "meg-cloth", feetPosition: { x: a.x + 2.4, y: 0, z: a.z - 2.6 }, primitive: { kind: "box", width: 1.4, height: 0.02, depth: 0.9 }, material: { color: "oklch(0.85 0.2 125)" },
      ui: '<div face="top" width="1.3m" style="font-size:120px;font-weight:900;color:#1d2a10;text-align:center">M.E.G.</div>' });
    // the thresholds: home to level 0
    ctx.spawn("l1-back", { feetPosition: { x: BACK.x + 0.5, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.4, y: 0, z: BACK.z }, light: { kind: "point", color: "oklch(0.85 0.12 92)", intensity: 3, distance: 6 } });
    s.nextFlicker = now + 60000;
  }
  // the pack: a manager, and hounds kept topped up (more while the lights are out)
  if (!s.packMgr) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  const want = L.hounds + (s.flicker === "dark" ? L.flickerHounds : 0);
  const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  if (have < want && now >= (s.nextHound ?? 0)) {
    s.nextHound = now + (s.flicker === "dark" ? 1500 : L.entityRespawn * 1000);
    for (let tries = 0; tries < 20; tries++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N), z = zoneOf(cx, cz);
      if (z !== "halls" && z !== "storage") continue;
      if (Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 4) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: { hp: L.houndHp, xp: L.xpHound } });
      break;
    }
  }
  // the Flickering: a stutter, then black, then the lights come back
  const lamps = () => ctx.query({ tags: ["l1lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const set = (on) => { for (const r of lamps()) { const o = ctx.place.objects[r.id]; if (!o) continue; o.light = { ...o.light, intensity: on ? (o.light?.distance > 10 ? LAMP_ON : 2.5) : 0 }; o.material = { ...o.material, emissiveIntensity: on ? 2.2 : 0 }; } };
  if (!s.flicker && now >= s.nextFlicker) { s.flicker = "warn"; s.flickerAt = now; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-flicker-buzz.mp3", volume: 0.5 }, { audience: { place: ctx.place.id } }); }
  if (s.flicker === "warn") { const t = (now - s.flickerAt) / 1000; set(Math.floor(t * 6) % 3 !== 0); if (t > L.flickerWarn) { s.flicker = "dark"; s.flickerAt = now; s.darkFor = (L.flickerLength[0] + ctx.random() * (L.flickerLength[1] - L.flickerLength[0])) * 1000; set(false); } }
  else if (s.flicker === "dark" && now - s.flickerAt > s.darkFor) { s.flicker = null; set(true); s.nextFlicker = now + (L.flickerEvery[0] + ctx.random() * (L.flickerEvery[1] - L.flickerEvery[0])) * 1000; }
}
