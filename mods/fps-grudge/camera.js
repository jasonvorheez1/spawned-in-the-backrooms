// ASHLINE first-person eye on the `look` contract: the engine integrates the mouse raw (pinpoint, no smoothing);
// this rig adds what a shooter needs on top: the eye drops for crouch and slide, RMB+Q/E rolls and shifts it round
// a corner (stopped short of walls), the fov narrows to the optic's zoom, sensitivity scales 1/zoom so a scope
// feels 1:1, recoil punches the view and settles, and the held gun (a local viewmodel) sways, bobs, kicks and
// comes to the eye. It shares ctx.session.fps[<body id>] with scripts/player.js on this machine.
import C from "./lib/data/combat.yml";
import { raycast } from "builtin/physics";
import VM from "./lib/data/viewmodels.yml";
// the modular action vocabulary (viewmodels.yml schema) folded onto the mixer's keys once: `synth` = no clip, made in code
for (const r of Object.values(VM.enari ?? {})) {
  const c = r.clips ?? (r.clips = {});
  for (const k of Object.keys(c)) if (c[k] === "synth") delete c[k];
  c.reload ??= c.reload_tactical; c.empty ??= c.reload_empty; c.fireAds ??= c.fire_ads;
}
import { muzzleOf } from "./lib/gun.js";
import { holdGun, holdFists, release } from "./lib/gunhands.js";
import GH from "./lib/data/gunhands.yml";
import NADES from "./lib/data/grenades.yml";
import { nadeModel } from "./lib/grenade.js";

// every viewmodel .glb is baked to art/vmstd/STANDARD.md: metres, barrel -Z, origin = the eye, hip pose inside the file, its bounds floor
// a pin at standard.floor. The engine stands that floor on feetPosition, so one offset for all puts the file's origin on the camera.
const VM_DEPTH = 0;
const VM_OFF = [0, VM.standard?.floor ?? -100, 0];
const vmOffset = () => VM_OFF;

const R2D = 180 / Math.PI, D2R = Math.PI / 180;
const GHJAB = 260;
const lerp = (a, b, k) => a + (b - a) * k;
// this machine's own viewmodels (audience local): read by handle, never a place-index page (a miss on a fresh or retired id held the frame)
const live = (ctx, id) => (id ? ctx.getObject(id) : null);
export function finiteNumber(value, fallback) { return typeof value === "number" && isFinite(value) ? value : fallback; }

function vmParams(st, kit) {
  const a = kit?.att ?? {};
  return { cls: st.cls, len: +(st.len * st.lenMul).toFixed(3), hue: st.hue, optic: a.optic ?? (st.scoped ? "scope" : ""), muzzle: a.muzzle ?? (st.suppressed ? "supp" : ""), grip: a.grip ?? "", mag: a.mag ?? "", stock: a.stock ?? "", barrel: a.barrel ?? "", pellets: st.pellets ?? 1 };
}

// third person shoulder rig, metres / degrees
const TPS = { back: 2.6, side: 0.62, up: 0.18, adsBack: 1.3, adsSide: 0.5, fov: 72, adsFov: 52 };
export function update(ctx, dt) {
  const target = ctx.self.target;
  if (!target) return;
  const f = ((ctx.session.fps ??= {})[target.id] ??= { recoil: { p: 0, y: 0 }, spray: 0, nextShot: 0, adsT: 0, zoomStep: 0 });
  const e = (f.eye ??= { h: C.camera.eye, lean: 0, fov: C.camera.fov, bob: 0, kick: 0 });
  const st = f.st, s = target.state ?? {}, now = ctx.now();
  const k = 1 - Math.exp(-dt * 14);

  // eye height: stand, crouch, slide, dead on the floor
  const hTarget = s.dead ? 0.35 : f.sliding ? C.camera.slideEye : s.crouch ? C.camera.crouchEye : C.camera.eye;
  e.h = lerp(e.h, hTarget, 1 - Math.exp(-dt * 12));
  const view = ctx.self.view;
  const yaw = view ? view.yaw * R2D : 0, pitch = view ? view.pitch * R2D : 0;
  const right = { x: Math.cos(yaw * D2R), y: 0, z: -Math.sin(yaw * D2R) };
  const pos = target.feetPosition, scale = finiteNumber(target.effectiveScale?.y, 1);
  const base = { x: pos.x, y: pos.y + e.h * scale, z: pos.z };

  // the peek: roll toward the side and slide the eye out, never through a wall
  const leanDir = s.dead ? 0 : (s.lean ?? 0);
  let reach = C.camera.leanShift;
  if (leanDir) { const h = raycast(ctx, base, { x: right.x * leanDir, y: 0, z: right.z * leanDir }, { distance: C.camera.leanShift + 0.2, bodies: "static", ignoreEntities: [target.id] }); if (h) reach = Math.max(0, h.distance - 0.2); }
  e.lean = lerp(e.lean, leanDir, 1 - Math.exp(-dt * 10));
  const shift = e.lean * reach, drop = Math.abs(e.lean) * 0.06;
  const dt0 = (now - (f.dodgeAt ?? -1e9)) / 420, dk = dt0 >= 0 && dt0 < 1 ? Math.sin(dt0 * Math.PI) : 0, dd = f.dodgeDir;
  const dodgeRoll = dk * (dd === "l" ? 5 : dd === "r" ? -5 : 0), dodgePitch = 0, dodgeDrop = dk * 0.35; f.dodgeK = dk; // aim never moves: tilt, drop, fov punch and the gun dip only
  const eye = { x: base.x + right.x * shift, y: base.y - drop - dodgeDrop, z: base.z + right.z * shift };

  // recoil punch settles back toward zero
  const rec = f.recoil; const back = C.recoil.recoverDegS * dt * (now - (f.lastShot ?? 0) > 90 ? 1 : 0.15);
  rec.p = Math.max(0, rec.p - back - rec.p * 3.2 * dt * (now - (f.lastShot ?? 0) > 90 ? 1 : 0)); rec.y -= rec.y * Math.min(1, 4 * dt);
  // enari-engine recoil: createRecoil rotates the camera for good; the pattern index walks back one a frame after 2x the fire interval
  const en = f.enari;
  if (en && en.idx > 1 && now - (f.lastShot ?? 0) > 2 * (st?.interval ?? 100)) en.idx--;
  // the kick settles: once the trigger rests the view slides back to where the mouse holds it (never a permanent climb)
  if (en && now - (f.lastShot ?? 0) > (st?.interval ?? 100) + 60) { const kd = Math.exp(-dt * 7); en.p *= kd; en.y *= kd; if (Math.abs(en.p) < 0.01) en.p = 0; if (Math.abs(en.y) < 0.01) en.y = 0; }
  const fy = VM.enari ? yaw + (en?.y ?? 0) : yaw - rec.y, fp = VM.enari ? Math.max(-89, Math.min(89, pitch + (en?.p ?? 0))) : Math.min(89, pitch + rec.p + dodgePitch);
  ctx.self.feetPosition = eye;
  ctx.self.rotation = { yaw: fy, pitch: fp, roll: -e.lean * C.camera.leanDeg + dodgeRoll };
  f.cam = { pos: eye, yaw: fy, pitch: fp };
  // third person (U): the eye swings out behind the right shoulder, pulled in before a wall; a scope still goes to the eye
  const tpsWant = !!s.tps && !(st?.scoped && (f.adsT ?? 0) > 0.5) && !target.parent;
  f.tpsT = lerp(f.tpsT ?? 0, tpsWant ? 1 : 0, 1 - Math.exp(-dt * 10));
  f.tpsOn = f.tpsT > 0.5;
  if (f.tpsT > 0.01) {
    const d = { x: -Math.sin(fy * D2R) * Math.cos(fp * D2R), y: Math.sin(fp * D2R), z: -Math.cos(fy * D2R) * Math.cos(fp * D2R) };
    const ads = f.adsT ?? 0, side = (s.lean ?? 0) < 0 ? -1 : 1;
    const back = lerp(TPS.back, TPS.adsBack, ads), sh = lerp(TPS.side, TPS.adsSide, ads) * side;
    const want = { x: -d.x * back + right.x * sh, y: -d.y * back + TPS.up, z: -d.z * back + right.z * sh };
    const wl = Math.hypot(want.x, want.y, want.z) || 1;
    const hit = raycast(ctx, eye, { x: want.x / wl, y: want.y / wl, z: want.z / wl }, { distance: wl + 0.3, bodies: "static", ignoreEntities: [target.id] });
    const k2 = (hit ? Math.max(0, hit.distance - 0.3) / wl : 1) * f.tpsT;
    f.tpsPull = Math.min(f.tpsPull ?? 1, k2); f.tpsPull = lerp(f.tpsPull, k2, 1 - Math.exp(-dt * (k2 < f.tpsPull ? 40 : 6))); // snap in at a wall, ease back out
    const cp = { x: eye.x + want.x * f.tpsPull, y: eye.y + want.y * f.tpsPull, z: eye.z + want.z * f.tpsPull };
    ctx.self.feetPosition = cp;
    ctx.self.rotation = { yaw: fy, pitch: fp, roll: 0 };
    // the crosshair's point in the world: the round flies from the head to it, so what is under the dot is what gets hit
    const t0 = Math.max(0, (eye.x - cp.x) * d.x + (eye.y - cp.y) * d.y + (eye.z - cp.z) * d.z), o2 = { x: cp.x + d.x * t0, y: cp.y + d.y * t0, z: cp.z + d.z * t0 };
    const ah = raycast(ctx, o2, d, { distance: 400, ignoreEntities: [target.id] });
    f.cam.aim = ah ? ah.position : { x: o2.x + d.x * 400, y: o2.y + d.y * 400, z: o2.z + d.z * 400 };
  }
  ctx.self.hideLocalPlayer = !f.tpsOn;

  // zoom: iron sights to 12x; the variable scope's wheel step rides zoomStep
  const adsT = f.adsT ?? 0;
  let zoom = 1;
  if (st) { const full = st.zoomMax > st.zoom ? st.zoom + (st.zoomMax - st.zoom) * (f.zoomStep ?? 0) / 4 : st.zoom; zoom = 1 + (full - 1) * adsT; }
  const fovT = 2 * Math.atan(Math.tan((C.camera.fov * D2R) / 2) / zoom) * R2D;
  e.fov = lerp(e.fov, fovT, 1 - Math.exp(-dt * 25));
  if (VM.enari) { const zf = st?.scoped ? 20 : f.tpsOn ? TPS.adsFov : 50; e.fov = lerp(e.fov, adsT > 0.5 ? zf : f.tpsOn ? TPS.fov : 80, 1 - Math.exp(-dt * 25)); }
  ctx.self.fov = e.fov + (f.dodgeK ?? 0) * 6;
  const sens = 3 * (1 / Math.max(1, zoom)) * (zoom > 1.05 ? C.camera.adsSens : 1) * (f.touch && f.aimSlow ? C.assist.slowdown : 1);
  const sensE = VM.enari ? 3 * Math.max(0.22, Math.min(1, e.fov / 80)) : sens; // zoomed in, the mouse slows with the lens
  if (Math.abs((ctx.self.sensitivity ?? 3) - sensE) > 0.01) ctx.self.sensitivity = sensE;

  // the fists: your animated FPS hands, on slot 3 and for the left jab (V) with any gun
  const jabbing = f.jab && now - (f.punchAt ?? -1e9) < 560;
  if (VM.enari && f.tpsOn) { const vm = live(ctx, f.vm); if (vm && vm.visible !== false) vm.visible = false; const aid = ctx.session.firstPersonArms?.[target.id]?.current, am = aid ? ctx.getObject(aid) : null; if (am && am.visible !== false) { am.visible = false; release(am); } return; } // third person: the body's gun is the one you see
  if (VM.enari) { enariView(ctx, f, s, st, target, now, dt, yaw, pitch); return; }
  // the installed hands mod's arms: when they stand, they are the only hands drawn (the old baked arms retire)
  // the mod keeps its local arms id in this machine's session: read it there, never a far lookup
  const armsId = ctx.session.firstPersonArms?.[target.id]?.current ?? null, arms = armsId ? ctx.getObject(armsId) : null;
  // creator, Oct 9: "get rid of all these trash polygon guns you made and use the real ones, with real hands":
  // with VM.realHands on, every slot wears its uploaded arms+gun model and the mod's stand-in arms stay hidden
  if (VM.realHands && arms && arms.visible !== false) { arms.visible = false; release(arms); }
  // the mod's arms of ANY body (a helper's or builder's included) never draw on this camera while the real uploaded hands are on
  if (VM.realHands && now - (f.armSweep ?? 0) > 500) { f.armSweep = now; for (const r of ctx.query({ tags: ["fp-arms-viewmodel"] })) { const o = ctx.getObject(r.id); if (o && o.visible !== false) o.visible = false; } }
  const modHands = !VM.realHands && !!(arms && arms.state?.rfphOwned);
  if (modHands && (s.dead)) { arms.visible = false; release(arms); }
  else if (modHands && arms.visible === false && !(s.slot === "fists" && VM.knife && !jabbing && !modHands)) arms.visible = true;
  if (modHands && s.slot === "fists" && !s.dead) {
    if (f.kv && live(ctx, f.kv)) { ctx.destroy(f.kv); f.kv = null; }
    if (f.fv && live(ctx, f.fv)) { ctx.destroy(f.fv); f.fv = null; }
    if (f.vm && live(ctx, f.vm)) live(ctx, f.vm).visible = false;
    const pt = (now - (f.punchAt ?? -1e9)) / (GHJAB);
    const v0 = target.velocity ?? { x: 0, z: 0 }, sp0 = Math.hypot(v0.x, v0.z); e.bob += dt * sp0 * 1.6;
    const bb = Math.min(1, sp0 / 6) * 0.01;
    holdFists(arms, pt >= 0 && pt < 1 ? { side: f.punchSide === "L" ? "L" : "R", t: pt } : null, { x: Math.sin(e.bob) * bb + e.lean * 0.02, y: -Math.abs(Math.cos(e.bob)) * bb - (f.dodgeK ?? 0) * 0.08 });
    return;
  }
  if (s.slot === "fists" && !jabbing && !s.dead && VM.knife) { if (f.fv && live(ctx, f.fv)) live(ctx, f.fv).visible = false; knifeView(ctx, f, s, target, now, dt); return; }
  if (f.kv && live(ctx, f.kv)) { live(ctx, f.kv).visible = false; f.kShown = false; }
  if ((s.slot === "fists" || jabbing) && !s.dead) { if (f.fv && live(ctx, f.fv)) live(ctx, f.fv).visible = (f.fArm ?? 2) === 2; fistsView(ctx, f, s, target, now, dt, jabbing); return; }
  if (f.fv && live(ctx, f.fv)) { ctx.destroy(f.fv); f.fv = null; }
  // the held gun: your uploaded model when the class has one, else the modular scripted gun
  if (!st) return;
  const kit = s.kit?.[s.slot];
  const params = vmParams(st, kit);
  let vmKey = VM.byWeapon?.[kit?.id] ?? VM.byClass[st.cls];
  if (st.cls === "rifle" && [30, 35, 40, 45, 50, 55, 60].includes(st.hue)) vmKey = VM.warmRifle;
  const vd = vmKey && !modHands ? VM[vmKey] : null; // with the mod's hands every gun is the modular gun they grip
  const key = vd ? vmKey + "|" + (params.optic || "") : "s|" + JSON.stringify(params);
  if (f.fv && modHands && live(ctx, f.fv)) { ctx.destroy(f.fv); f.fv = null; }
  if (s.dead) { if (f.vm && live(ctx, f.vm)) live(ctx, f.vm).visible = false; if (f.fv && live(ctx, f.fv)) { ctx.destroy(f.fv); f.fv = null; } return; }
  if (f.vmKey !== key || !f.vm || (!live(ctx, f.vm) && now - (f.vmSpawnAt ?? 0) > 1500)) { // a fresh local spawn may not be listed yet: never re-spawn a heavy model every frame
    f.vmSpawnAt = now;
    if (f.vm && live(ctx, f.vm)) { live(ctx, f.vm).visible = false; ctx.destroy(f.vm); } // the old gun leaves before the new one is ever drawn
    const off = vd ? vmOffset(vd) : null;
    const optic = vd && vd.rail && params.optic ? [{ feetPosition: { x: vd.rail[0] + off[0], y: vd.rail[1] + off[1], z: vd.rail[2] + off[2] }, scale: 1, castShadow: false, primitive: { kind: "scripted", script: "mods/fps-grudge/lib/gun.js", params: { ...params, only: "optic" } } }] : [];
    f.vm = vd
      ? ctx.spawn({ audience: "local", visibleInFirstPerson: true, visible: false, castShadow: false, receiveShadow: false, model: { id: vd.model, offset: off, materials: vd.materials ?? {} }, scale: 1, mixer: { base: { clip: vd.clips?.hold ?? "idle", loop: "loop", weight: 1 } }, feetPosition: { attach: "camera", x: 0, y: 0, depth: 0 }, children: optic })
      : ctx.spawn({ audience: "local", visibleInFirstPerson: true, castShadow: false, receiveShadow: false, primitive: { kind: "scripted", script: "mods/fps-grudge/lib/gun.js", params }, feetPosition: { attach: "camera", x: 0.16, y: -0.17, depth: 0.42 } });
    f.gunMuzzle = vd ? null : muzzleOf(params);
    f.vmKey = key; f.vd = vd; f.vmShot = f.kickAt; f.vmReload = 0; f.vmBase = vd?.clips?.hold ?? "Scene"; f.vmInspect = f.inspectAt; f.vmDraw = f.drawAt;
    f.vmArm = 0; // 0 spawned hidden · 1 hold (and draw) written · 2 a tick later: drawn. A model never shows its bind pose
  }
  const vm = live(ctx, f.vm);
  if (!vm) return;
  if (vd && (f.vmArm ?? 2) < 2) {
    vm.visible = false;
    if (!f.vmArm) { vm.anim.base = { clip: vd.clips?.hold ?? "idle", loop: "loop", weight: 1 }; if (vd.clips?.draw) vm.anim.act = { clip: vd.clips.draw, loop: "once", clampWhenFinished: true, weight: 1, blend: "override" }; f.vmArm = 1; return; }
    f.vmArm = 2;
  }
  settleAct(vm);
  const scopedOptic = ["x8", "var412", "var36", "acog", "thermal"].includes(params.optic) || (st.scoped && !params.optic);
  vm.visible = !(scopedOptic && adsT > 0.85) && (!vd || f.vmArm === 2);
  const v = target.velocity ?? { x: 0, z: 0 }, sp = Math.hypot(v.x, v.z);
  e.bob += dt * sp * 1.6;
  const bobA = Math.min(1, sp / 6) * (1 - adsT * 0.85) * (target.grounded === false ? 0.3 : 1);
  const kickT = Math.max(0, 1 - (now - (f.kickAt ?? -1e9)) / 90);
  e.kick = lerp(e.kick, kickT, 1 - Math.exp(-dt * 40));
  const reloadK = s.reloadUntil > now ? 1 : 0, drawK = vd?.clips?.draw ? 0 : Math.max(0, 1 - (now - (f.drawAt ?? -1e9)) / 350); // a row with its own Draw clip raises the gun itself
  const dgk = f.dodgeK ?? 0, bx = Math.sin(e.bob) * 0.012 * bobA + e.lean * 0.02 + dgk * (f.dodgeDir === "l" ? -0.04 : f.dodgeDir === "r" ? 0.04 : 0), by = -Math.abs(Math.cos(e.bob)) * 0.01 * bobA - reloadK * 0.12 - drawK * 0.2 - dgk * 0.07;
  if (vd) {
    // the model's own clips: a shot plays Fire, a reload plays Reload (Reload_Empty on an empty mag)
    if (vd.clips) {
      if (f.kickAt && f.kickAt !== f.vmShot) { f.vmShot = f.kickAt; vm.anim.act = { clip: (adsT > 0.5 && vd.clips.fireAds) || vd.clips.fire, loop: "once", weight: 1, speed: 1.6, blend: "override" }; }
      // a row with its own gait loops walks/runs by speed over the frozen hold; inspect plays once on I
      const c = vd.clips;
      if (c.walk || c.run) {
        const bc = c.run && sp > 5.2 ? c.run : c.walk && sp > 0.6 ? c.walk : c.hold;
        if (bc !== f.vmBase) { f.vmBase = bc; vm.anim.base = bc === c.hold ? { clip: bc, loop: "loop", weight: 1 } : { clip: bc, loop: "loop", weight: 1, speed: bc === c.walk ? Math.max(0.7, sp / 4) : 1 }; }
      }
      if (c.draw && f.drawAt && f.drawAt !== f.vmDraw) { f.vmDraw = f.drawAt; vm.anim.act = { clip: c.draw, loop: "once", clampWhenFinished: true, weight: 1, blend: "override" }; } // a slot swap back to this gun draws it again
      if (c.inspect && f.inspectAt && f.inspectAt !== f.vmInspect) { f.vmInspect = f.inspectAt; if (!(s.reloadUntil > now)) vm.anim.act = { clip: c.inspect, loop: "once", weight: 1, blend: "override" }; }
      if (s.reloadUntil > now && f.vmReload !== s.reloadUntil) { f.vmReload = s.reloadUntil; vm.anim.act = { clip: (s.ammo?.[s.slot] ?? 0) === 0 ? vd.clips.empty : vd.clips.reload, loop: "once", weight: 1, blend: "override" }; }
    }
    const animReload = vd.clips ? 0 : reloadK;
    // standard frame: the file's origin IS the eye; ADS slides it by -sight so the rear sight lands on the eye axis
    const sx = -vd.sight[0] * adsT, sy = -vd.sight[1] * adsT;
    const byv = by + reloadK * 0.12 - animReload * 0.12;
    const px = sx + bx, py = sy + byv, pd = e.kick * 0.03 - adsT * 0.02;
    vm.feetPosition = { attach: "camera", x: px, y: py, depth: pd };
    vm.rotation = { yaw: 0, pitch: e.kick * 2 * (1 - adsT * 0.6) - animReload * 20, roll: animReload * 20 };
    // the barrel tip in the camera frame (x right, y up, depth ahead): scripts/player.js starts tracer and flash there
    const m = vd.muzzle ?? [0.17, -0.12, -0.9];
    f.muzzleCam = { x: m[0] + px, y: m[1] + py, depth: -m[2] + pd }; f.muzzleAt = now;
    return;
  }
  const sightY = params.optic ? -0.105 : -0.085;
  const hp = modHands && GH.hip ? GH.hip : { x: 0.16, y: -0.17, depth: 0.42 };
  const x = lerp(hp.x, 0, adsT) + bx, y = lerp(hp.y, sightY, adsT) + by - (s.crouch ? 0.01 : 0);
  vm.feetPosition = { attach: "camera", x, y, depth: lerp(hp.depth, 0.3, adsT) + e.kick * 0.045 };
  const gy = lerp(4, 0, adsT), dep = lerp(hp.depth, 0.3, adsT) + e.kick * 0.045;
  vm.rotation = { yaw: gy, pitch: e.kick * 2.5 * (1 - adsT * 0.6) - reloadK * 25, roll: reloadK * 30 };
  if (modHands) { arms.visible = vm.visible !== false; holdGun(arms, { x, y, depth: dep, yaw: gy, pitch: e.kick * 2.5 * (1 - adsT * 0.6) - reloadK * 25, roll: reloadK * 30 }, params); }
  const gm = f.gunMuzzle ?? muzzleOf(params), cy = Math.cos(gy * D2R), sy2 = Math.sin(gy * D2R);
  f.muzzleCam = { x: x + gm.x * cy + gm.z * sy2, y: y + gm.y, depth: dep - (-gm.x * sy2 + gm.z * cy) }; f.muzzleAt = now;
}

// a one-shot on the act channel holds its last frame over the base forever: once it has played out, clear it so the
// base loop (hold, walk, run, idle, sprint, block, take) shows again
function settleAct(o) { const a = o?.anim?.act; if (a && typeof a === "object" && a.finished) o.anim.act = null; }

// the hands: base channel walks the gait (idle, walk, sprint, block loop), act channel plays the one-shots
function fistsView(ctx, f, s, target, now, dt, jabbing) {
  const vd = VM.fists, c = vd.clips;
  if (f.vm && live(ctx, f.vm)) live(ctx, f.vm).visible = false;
  if (!f.fv || (!live(ctx, f.fv) && now - (f.fvSpawnAt ?? 0) > 1500)) {
    f.fvSpawnAt = now;
    const materials = { ...(vd.materials ?? {}) }; for (const h of vd.hide ?? []) materials[h] = { opacity: 0, transparent: true, depthWrite: false }; // the file's spec-gloss skin never draws: its maps are mounted here
    f.fArm = 0;
    f.fv = ctx.spawn({ audience: "local", visibleInFirstPerson: true, visible: false, castShadow: false, receiveShadow: false, model: { id: vd.model, offset: VM_OFF, materials }, scale: 1,
      mixer: { base: { clip: c.idle, loop: "loop", weight: 1 } }, feetPosition: { attach: "camera", x: 0, y: 0, depth: 0 } });
    f.fBase = c.idle; f.fPunch = 0; f.fInspect = 0; f.fBlock = false; f.idleSince = now;
  }
  const fv = live(ctx, f.fv);
  if (!fv) return;
  if ((f.fArm ?? 2) < 2) { // hidden until the idle and the equip are written; shown a tick later
    fv.visible = false;
    if (!f.fArm) { fv.anim.base = { clip: c.idle, loop: "loop", weight: 1 }; fv.anim.act = { clip: jabbing ? c.punchL : c.equip, loop: "once", weight: 1, blend: "override", speed: jabbing ? 1.4 : 1.2 }; if (jabbing) f.fPunch = f.punchAt; f.fArm = 1; return; }
    f.fArm = 2; fv.visible = true;
  }
  settleAct(fv);
  const v = target.velocity ?? { x: 0, z: 0 }, sp = Math.hypot(v.x, v.z);
  const block = !!s.blocking;
  const taking = !!s.defusing;
  const base = taking ? c.take : block ? c.block : sp > 5.2 ? c.sprint : sp > 0.6 ? c.walk : (now - (f.idleSince ?? now) > 9000 ? c.fidget : c.idle);
  if (sp > 0.6 || block) f.idleSince = now;
  if (base !== f.fBase) { f.fBase = base; fv.anim.base = { clip: base, loop: "loop", weight: 1, speed: base === c.walk ? Math.max(0.7, sp / 4) : 1 }; }
  if (taking !== !!f.fTake) { f.fTake = taking; fv.anim.act = { clip: taking ? c.takeIn : c.takeOut, loop: "once", clampWhenFinished: true, weight: 1, blend: "override", speed: 1.3 }; }
  if (block !== f.fBlock) { f.fBlock = block; fv.anim.act = { clip: block ? c.blockIn : c.blockOut, loop: "once", clampWhenFinished: true, weight: 1, blend: "override", speed: 1.5 }; }
  if (f.punchAt && f.punchAt !== f.fPunch) { f.fPunch = f.punchAt; fv.anim.act = { clip: f.punchSide === "L" ? c.punchL : c.punchR, loop: "once", weight: 1, blend: "override", speed: 1.4 }; }
  if (f.inspectAt && f.inspectAt !== f.fInspect && !block) { f.fInspect = f.inspectAt; fv.anim.act = { clip: c.inspect, loop: "once", clampWhenFinished: true, weight: 1, blend: "override" }; }
  const e = f.eye, bob = Math.min(1, sp / 6) * 0.006;
  e.bob += dt * sp * 1.6;
  const dg = f.dodgeK ?? 0;
  fv.feetPosition = { attach: "camera", x: Math.sin(e.bob) * bob + e.lean * 0.02 + dg * (f.dodgeDir === "l" ? -0.05 : f.dodgeDir === "r" ? 0.05 : 0), y: -Math.abs(Math.cos(e.bob)) * bob - dg * 0.08, depth: 0 };
}

// the knife: your animated knife arm on slot 3; LMB alternates the two slashes
function knifeView(ctx, f, s, target, now, dt) {
  const vd = VM.knife, c = vd.clips;
  if (f.vm && live(ctx, f.vm)) live(ctx, f.vm).visible = false;
  if (!f.kv || (!live(ctx, f.kv) && now - (f.kvSpawnAt ?? 0) > 1500)) {
    f.kvSpawnAt = now;
    f.kv = ctx.spawn({ audience: "local", visibleInFirstPerson: true, visible: false, castShadow: false, receiveShadow: false, model: { id: vd.model, offset: VM_OFF }, scale: 1,
      mixer: { base: { clip: c.idle, loop: "loop", weight: 1 } }, feetPosition: { attach: "camera", x: 0, y: 0, depth: 0 } });
    f.kPunch = f.punchAt; f.kShown = false;
  }
  const kv = live(ctx, f.kv);
  if (!kv) return;
  if (!f.kShown) { kv.visible = false; kv.anim.base = { clip: c.idle, loop: "loop", weight: 1 }; kv.anim.act = { clip: c.equip, loop: "once", clampWhenFinished: true, weight: 1, blend: "override" }; f.kShown = true; f.kArmed = false; return; } // equip written hidden: shown next tick, never the bind pose
  if (!f.kArmed || kv.visible === false) { kv.visible = true; f.kArmed = true; }
  settleAct(kv);
  if (f.punchAt && f.punchAt !== f.kPunch) { f.kPunch = f.punchAt; kv.anim.act = { clip: f.punchSide === "L" ? c.slashB : c.slashA, loop: "once", weight: 1, blend: "override", speed: 1.3 }; }
  const v = target.velocity ?? { x: 0, z: 0 }, sp = Math.hypot(v.x, v.z), e = f.eye, bob = Math.min(1, sp / 6) * 0.008;
  e.bob += dt * sp * 1.6;
  kv.feetPosition = { attach: "camera", x: Math.sin(e.bob) * bob + e.lean * 0.02, y: -Math.abs(Math.cos(e.bob)) * bob, depth: 0 };
}

// creator, Oct 9: "forget all your work on fps aiming, and guns, and use exactly whats on enari-engine":
// its FPSRenderer, one model per gun (Galil "AK47", USP, M9 knife) baked by art/enari/build.py with its mesh.scale -1 and
// viewmodelOffset inside the file, so the file's origin is the eye. Every number below is FPSRenderer's.
// which viewmodel row serves this gun: its catalog id first, then a row of its own type, then one that fills in for it
function enariRow(cls, weaponId) {
  const rows = Object.entries(VM.enari);
  return (rows.find(([, r]) => weaponId && r.weapons?.includes(weaponId)) ?? rows.find(([, r]) => r.type === cls) ?? rows.find(([, r]) => r.also?.includes(cls)) ?? rows[0])[0];
}
const EN = { vmFov: 56, holster: 0.28, bobbingAmount: 0.0008, restitution: 15, radPerPx: 0.0015, timeScale: 1.5, fade: 0.15, pull: 0.13, stillInspect: 8000 };
// the viewmodel mixer: channels la/lb = the loop (idle / walk / run), crossfaded by weight over EN.fade; act = a once clip
// (draw, fire, reload, reload-empty, inspect, holster) laid over it with blend override. pull: the model sits EN.pull back
// in its offset and the attach depth adds it again, so the eye frame is unchanged and depth never drops under the camera's 0.03.
const lenOf = (row, clip) => Math.max(0.1, row.lens?.[clip] ?? 1); // a one-frame pose (the molotov throw) counts as 0.1 s, never a 0 speed
const hasLoop = (row) => !!(row.clips.idle || row.clips.walk || row.clips.run);
function vmAct(vm, g, row, clip, speed, now) {
  if (!clip) return;
  vm.anim.act = { clip, loop: "once", clampWhenFinished: true, weight: 1, blend: "override", speed };
  g.actUntil = hasLoop(row) ? now + lenOf(row, clip) / speed * 1000 : Infinity; g.actOn = true; g.lastAct = now;
}
function loopFor(row, sp) {
  const c = row.clips;
  // no sprint key: full move speed (~5.4-6 m/s) is the run, slower (ADS, crouch, starting off) the walk; a row with only one gait uses it for both
  if (sp > 4.6 && c.run) return [c.run, 1];
  if (sp > 0.3 && (c.walk || c.run)) return [c.walk ?? c.run, 1];
  if (c.idle) return [c.idle, row.idleSpeed ?? 0.15]; // creator Oct 9: no twitchy idle loops: the idle clip's first frame held still, the bob is code
  return [null, 1];
}
const CANT = { reach: 0.8, roll: 14, pull: 0.04, shift: 0.012, ease: 0.15, every: 150 };
// +1 = a wall on the right (roll the gun's top left, away), -1 = on the left; the barrel's height is 8 cm under the eye
function cantProbe(ctx, target, f, yaw, pitch) {
  const e = ctx.self.feetPosition; if (!e) return 0;
  const y = yaw * D2R, cp = Math.cos(pitch * D2R);
  const fw = { x: -Math.sin(y) * cp, y: Math.sin(pitch * D2R), z: -Math.cos(y) * cp }, rt = { x: Math.cos(y), y: 0, z: -Math.sin(y) };
  const o = { x: e.x, y: e.y - 0.08, z: e.z }, ig = [target.id]; if (f.vm) ig.push(f.vm);
  const opt = { distance: CANT.reach, physicsOnly: true, ignoreEntities: ig, excludeTags: ["player", "raider"] };
  const near = (d, k = 1) => { const h = raycast(ctx, o, d, { ...opt, distance: CANT.reach * k }); return h ? Math.max(0, 1 - h.distance / (CANT.reach * k)) : 0; };
  const dl = (sx) => { const v = { x: fw.x + rt.x * sx, y: fw.y, z: fw.z + rt.z * sx }, n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
  const R = Math.max(near(rt), near(dl(1), 1.2)), L = Math.max(near({ x: -rt.x, y: 0, z: -rt.z }), near(dl(-1), 1.2));
  const F = near(fw, 1.1);
  let side = Math.min(1, R * 1.4) - Math.min(1, L * 1.4);
  if (F > 0.15 && Math.abs(side) < 0.2) side = (R >= L ? 1 : -1) * Math.min(1, F * 1.2); // square to a wall: cant all the same
  return Math.max(-1, Math.min(1, side));
}
function enariView(ctx, f, s, st, target, now, dt, yaw, pitch) {
  // the hands mod's stand-in arms and every older viewmodel stay off this camera
  const armsId = ctx.session.firstPersonArms?.[target.id]?.current ?? null, arms = armsId ? ctx.getObject(armsId) : null;
  if (arms && arms.visible !== false) { arms.visible = false; release(arms); }
  if (now - (f.armSweep ?? 0) > 500) { f.armSweep = now; for (const r of ctx.query({ tags: ["fp-arms-viewmodel"] })) { const o = ctx.getObject(r.id); if (o && o.visible !== false) o.visible = false; } }
  for (const k of ["fv", "kv"]) if (f[k]) { if (live(ctx, f[k])) ctx.destroy(f[k]); f[k] = null; }
  let key = enariRow(!st || s.slot === "fists" ? "combatknife" : st.cls, !st || s.slot === "fists" ? "combatknife" : s.kit?.[s.slot]?.id);
  // the syringe (healUntil) and a throw (throwAt, 0.6 s prime + throw) take the hands, then the gun comes back with its draw
  const byType = (t) => Object.keys(VM.enari).find((k) => VM.enari[k].type === t);
  if ((s.slot === "syringe" || s.healUntil > now) && byType("syringe")) key = byType("syringe");
  else if (now - (s.throwAt ?? 0) < 600 && byType("throwable")) key = byType("throwable");
  const g = (f.en ??= { acc: { x: 0, y: 0 }, move: 0, recoil: 0, shot: 0, reload: 0, draw: 0, yaw, pitch, shake: 0 });
  g.hurt ??= s.hurtAt ?? 0;
  // switch-out: the old gun plays its holster clip before the new one is drawn
  const oldKey = f.vmKey?.startsWith("en|") ? f.vmKey.slice(3) : null, oldVm = f.vm ? live(ctx, f.vm) : null;
  const utility = ["syringe", "throwable"].includes(VM.enari[key]?.type);
  if (oldKey && oldKey !== key && oldVm && VM.enari[oldKey]?.clips.holster && !utility) {
    const orow = VM.enari[oldKey];
    if (!g.swapAt) { g.swapAt = now + EN.holster * 1000; vmAct(oldVm, g, orow, orow.clips.holster, lenOf(orow, orow.clips.holster) / EN.holster, now); }
    if (now < g.swapAt) key = oldKey;
  }
  const row = VM.enari[key];
  if (f.vmKey !== "en|" + key || !f.vm || (!live(ctx, f.vm) && now - (f.vmSpawnAt ?? 0) > 1500)) {
    f.vmSpawnAt = now;
    if (f.vm && live(ctx, f.vm)) ctx.destroy(f.vm);
    const d = row.clips.draw;
    f.vm = ctx.spawn({ audience: "local", visibleInFirstPerson: true, castShadow: false, receiveShadow: true, scale: 1,
      model: { id: row.model, offset: [0, VM.standard?.floor ?? -100, EN.pull] },
      mixer: d ? { act: { clip: d, loop: "once", clampWhenFinished: true, weight: 1, blend: "override", speed: EN.timeScale } } : {},
      feetPosition: { attach: "camera", x: 0, y: 0, depth: EN.pull, fov: row.fov ?? EN.vmFov }, rotation: { pitch: row.rot?.[0] ?? 0, yaw: row.rot?.[1] ?? 0, roll: row.rot?.[2] ?? 0 }, pivot: "feet", // row.rot: a per-gun hold correction (degrees), turned about the eye
      children: [{ feetPosition: { x: 3.565, y: -5, z: 1 }, light: { kind: "point", color: "#e12121", intensity: 2, distance: 100 } },
        ...(row.type === "throwable" ? [{ id: "nade", feetPosition: { x: NADES.throw.palm[0], y: NADES.throw.palm[1], z: NADES.throw.palm[2] + EN.pull }, rotation: { pitch: -20, roll: 15 }, visibleInFirstPerson: true, castShadow: false, ...nadeModel(s.throwKind ?? s.nadeKind ?? "frag") }] : [])] }); // the player light FPSRenderer hangs on the mesh; a throw holds the picked grenade in the right palm
    f.vmKey = "en|" + key; f.vd = null; g.shot = f.kickAt; g.reload = s.reloadUntil; g.draw = f.drawAt; g.swapAt = 0;
    g.lc = { a: null, b: null }; g.lw = { a: 0, b: 0 }; g.lq = { a: -1, b: -1 }; g.cur = "a";
    g.actOn = !!d; g.actUntil = d ? (hasLoop(row) ? now + lenOf(row, d) / EN.timeScale * 1000 : Infinity) : 0; g.lastAct = now;
    g.raise = d ? 0 : 1; // no draw clip (the FN): the pistol comes up from below instead
  }
  const vm = live(ctx, f.vm);
  if (!vm) return;
  vm.visible = !s.dead && !(st?.scoped && (f.adsT ?? 0) > 0.85);
  if (row.type === "throwable") { const held = (vm.children ?? []).find((c) => String(c.id ?? c).endsWith("nade")); const show = ctx.now() - (s.throwAt ?? 0) < NADES.throw.hide * 1000; if (held && held.visible !== show) held.visible = show; }
  const c = row.clips, v = target.velocity ?? { x: 0, z: 0 }, sp = Math.hypot(v.x, v.z);
  if (!g.swapAt) {
    if (c.use && s.healUntil > now && g.heal !== s.healUntil) { g.heal = s.healUntil; vmAct(vm, g, row, c.use, lenOf(row, c.use) / Math.max(0.3, (s.healUntil - now) / 1000), now); }
    if (row.type === "throwable" && g.thr !== s.throwAt && now - (s.throwAt ?? 0) < 600) { g.thr0 = s.throwAt; }
    if (c.throw && g.thr !== s.throwAt && now - (s.throwAt ?? 0) < 600) { g.thr = s.throwAt; vmAct(vm, g, row, c.throw, lenOf(row, c.throw) / 0.6, now); }
    if (f.inspectAt && f.inspectAt !== g.insp) { g.insp = f.inspectAt; if (c.inspect && !g.actOn) vmAct(vm, g, row, c.inspect, 1, now); }
    if (f.kickAt && f.kickAt !== g.shot) { g.shot = f.kickAt; g.recoil = 0.1; vmAct(vm, g, row, ((f.adsT ?? 0) > 0.5 && c.fireAds) || c.fire, Math.min(4, Math.max(EN.timeScale, lenOf(row, c.fire) * (st?.rpm ?? 600) / 60)), now); }
    if (s.reloadUntil > now && g.reload !== s.reloadUntil) {
      g.reload = s.reloadUntil; g.rFrom = now; g.rSynth = !(c.reload || c.empty);
      const clip = (s.ammo?.[s.slot] ?? 1) <= 0 && c.empty ? c.empty : c.reload;
      vmAct(vm, g, row, clip, lenOf(row, clip) / Math.max(0.3, (s.reloadUntil - now) / 1000), now); // ends when the reload does
    }
    if (f.drawAt && f.drawAt !== g.draw) { g.draw = f.drawAt; if (c.draw) vmAct(vm, g, row, c.draw, EN.timeScale, now); else g.raise = 1; }
    if (f.punchAt && f.punchAt !== g.punch) { g.punch = f.punchAt; const mc = (f.punchSide === "L" && c.melee_b) || c.melee || ((key === "knife" || row.type === "knife") ? c.fire : null); if (mc) vmAct(vm, g, row, mc, EN.timeScale, now); else g.bash = 1; }
    if ((s.hurtAt ?? 0) !== g.hurt) { g.hurt = s.hurtAt ?? 0; g.flinch = 1; }
    if (sp > 0.3) g.lastAct = Math.max(g.lastAct ?? 0, now);
    // no auto-inspect: an action plays only when its trigger happened (creator Oct 9)
  }
  if (g.actOn && now >= g.actUntil) { g.actOn = false; vm.anim.act = null; }
  // the loop: a new clip takes the other channel and both weights walk over EN.fade, written in quarter steps
  const [lc, ls] = loopFor(row, sp), lk = lc ? lc + "@" + ls : null;
  if (lk && g.lc[g.cur] !== lk) { g.cur = g.cur === "a" ? "b" : "a"; g.lc[g.cur] = lk; g.lq[g.cur] = -1; g.lw[g.cur] = 0; }
  for (const ch of ["a", "b"]) {
    if (!g.lc[ch]) continue;
    const on = ch === g.cur, w = on ? Math.min(1, g.lw[ch] + dt / EN.fade) : Math.max(0, g.lw[ch] - dt / EN.fade), q = Math.round(w * 4) / 4;
    g.lw[ch] = w;
    if (q !== g.lq[ch]) {
      g.lq[ch] = q; const [clip, spd] = g.lc[ch].split("@");
      vm.anim["l" + ch] = q > 0 ? { clip, loop: "loop", weight: q, speed: Number(spd) } : null;
      if (q === 0 && !on) g.lc[ch] = null;
    }
  }
  // rotation bobbing: the mouse delta (px) times bobbingAmount, eased back at restitution speed
  const dyaw = ((yaw - g.yaw + 540) % 360) - 180, dpitch = pitch - g.pitch; g.yaw = yaw; g.pitch = pitch;
  const pxX = -dyaw * D2R / EN.radPerPx, pxY = -dpitch * D2R / EN.radPerPx;
  g.acc.x += pxY * EN.bobbingAmount; g.acc.y += pxX * EN.bobbingAmount;
  const kl = Math.min(1, EN.restitution * dt);
  g.acc.x = lerp(g.acc.x, 0, kl); g.acc.y = lerp(g.acc.y, 0, kl);
  g.acc.x += Math.max(-Math.PI / 128, (target.velocity?.y ?? 0) / 2500); // jump bobbing
  // handleMove: moveEffect.y climbs 16/s while a move key is held
  if (sp > 0.3) g.move += 16 * dt;
  const by = Math.sin(g.move) * EN.bobbingAmount + Math.sin(g.move) / 50;
  if (g.recoil > 0) g.recoil = Math.max(0, g.recoil - dt / 2);
  // additive moves: raise (pistol up, no draw clip), flinch (a hit), bash (melee on a gun with no bash clip)
  g.raise = Math.max(0, (g.raise ?? 0) - dt / 0.35); g.flinch = Math.max(0, (g.flinch ?? 0) - dt * 5); g.bash = Math.max(0, (g.bash ?? 0) - dt * 3.5);
  const rz = g.raise * g.raise, fl = g.flinch, th = g.bash > 0 ? Math.sin(Math.PI * (1 - g.bash)) * 0.14 : 0;
  // synth: a roll-dip reload where the row has no reload clip, a lowered sprint where it has no run clip; ADS slides the
  // row's sight line onto the eye axis and damps bob/sway 85%, leaving a tiny breath
  const aT = f.adsT ?? 0, damp = 1 - 0.85 * aT;
  const rk = g.rSynth && s.reloadUntil > now ? Math.sin(Math.PI * Math.min(1, (now - g.rFrom) / Math.max(1, s.reloadUntil - g.rFrom))) : 0;
  g.sprint = lerp(g.sprint ?? 0, !c.run && sp > 7.5 && aT < 0.1 ? 1 : 0, Math.min(1, dt * 8)); const sk = g.sprint; // lowered only in a slide or dodge burst
  // the throw arc: 0-0.35 the arm draws back and down, 0.35-0.6 it snaps forward past rest and settles
  const tt = row.type === "throwable" && g.thr0 ? (now - g.thr0) / 600 : 2;
  const twY = tt < 0.58 ? -0.07 * Math.sin(Math.PI * Math.min(1, tt / 0.58)) : tt < 1 ? 0.03 * Math.sin(Math.PI * (tt - 0.58) / 0.42) : 0;
  const twZ = tt < 0.58 ? 0.09 * Math.sin(Math.PI / 2 * Math.min(1, tt / 0.58)) : tt < 1 ? 0.09 - 0.2 * Math.sin(Math.PI / 2 * Math.min(1, (tt - 0.58) / 0.25)) * (tt < 0.83 ? 1 : 1 - (tt - 0.83) / 0.17) : 0;
  const sg = row.sight ?? [0, 0], breath = Math.sin(now / 900) * 0.0006 * aT;
  // wall cant (the Level 2 pen's tilt): aiming with a wall within CANT.reach on one side of the barrel rolls the gun
  // away from it and pulls it in; probed a few times a second, eased 0.15 a 60 Hz frame, zero when clear
  if (now - (g.cantAt ?? 0) > CANT.every) { g.cantAt = now; g.cantGoal = aT > 0.2 ? cantProbe(ctx, target, f, yaw, pitch) : 0; }
  g.cant = lerp(g.cant ?? 0, g.cantGoal ?? 0, 1 - Math.pow(1 - CANT.ease, dt * 60));
  const cant = g.cant, cantK = Math.abs(cant);
  const xx = -sg[0] * aT - cant * CANT.shift, yy = by * damp + breath - sg[1] * aT - 0.22 * rz - 0.03 * fl - 0.06 * rk - 0.04 * sk + twY, dd = twZ + EN.pull - g.recoil * (1 - 0.5 * aT) + th + (row.adsDepth ?? 0) * aT - cantK * CANT.pull;
  vm.feetPosition = { attach: "camera", x: xx, y: yy, depth: Math.max(0.03, dd), fov: row.fov ?? EN.vmFov };
  vm.rotation = { pitch: -g.acc.x * R2D * damp - 30 * rz - 5 * fl - 18 * rk - 12 * sk, yaw: -g.acc.y * R2D * damp + 43 * th + 25 * sk, roll: 3 * fl + 25 * rk + 8 * sk + cant * CANT.roll };
  const m = row.muzzle ?? [0.15, -0.15, -0.8];
  f.muzzleCam = { x: m[0] + xx, y: m[1] + yy, depth: -m[2] - g.recoil + th }; f.muzzleAt = now;
}
