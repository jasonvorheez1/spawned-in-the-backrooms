// Level ! cutscenes (Shelly Nov 17: "always solo, longer, more cinematic with cutscenes", "scarier, more interesting").
// No Phoebe and no story gate. Phases on player.state.lrunCut = { phase, at }:
//   intro  - the door slams, the lamp stutters, the chained doors take blows, silence, the breach, the gate lifts: RUN
//   again  - after a death you're back at the line: one blow and the chains give
//   mid    - halfway: the lights die in a wave toward you, the pack in the dark behind, the red comes back one lamp at a time
//   rescue - the end: the ceiling comes down between you and them; claws under the beam; a side door; the alcove
// Played on the runner's own machine from scripts/main-menu.js; places/levelrun/sim.js starts and backstops them.
import { CORRIDOR } from "./levelrun-mechanics.js";
import { setCh2Step } from "./ch2-quest.js";
import { noStory } from "./run-opts.js";
import { animate } from "builtin/tween";

export const LRUN_INTRO_LEN = 12;
export const LRUN_AGAIN_LEN = 3.6;
export const LRUN_MID_LEN = 5.6;
export const LRUN_RESCUE_LEN = 10;
export const PHO_RESCUE_LINE = "";

const G = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`, R = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const CLIP_SLAM = R("heavy-metal-fire-door-slam-echo");
const CLIP_ROAR = G("hound-bark-howl-call");
const CLIP_BLOW = G("something-huge-slamming-into-a-chained-steel-door-from-behind");
const CLIP_BREATH = G("ragged-terrified-breathing-close-to-the-mic");
const CLIP_BREACH = G("chains-snapping-and-steel-doors-bursting-open-with-a-roar");
const CLIP_POWER = R("whole-building-power-dying-deep-electrical-thunk-and-hum-falling");
const CLIP_LAMP = R("single-emergency-lamp-clunking-back-on");
const CLIP_BEAM = R("steel-beam-crashes-onto-concrete-floor-clang");
const CLIP_RUMBLE = R("concrete-ceiling-collapse-deep-rumble-debris");
const CLIP_CLAW = G("claws-scraping-and-hammering-on-steel-under-rubble-muffled");
const CLIP_FALL = R("body-falls-hard-onto-tile-floor-thud");
const CLIP_DOOR = R("old-hospital-side-door-creaking-open-into-silence");
const DUST = `fx
pop dust burst=60 on=box(<2.6,.2,.6>) life=1.4..2.6 v=sdir()*(1..2.5)+up(.4..1) size=.25..0.6 acc=drag(1.4)+buoy(.15) col=<.35,.12,.1> a=0>.5:.6>.6:.3>0 sz=$size*(.6>2.2) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop grit burst=40 on=box(<2.6,.1,.4>).c(3) life=.8..1.4 v=sdir()*.5 size=.02..0.05 acc=grav() col=<.3,.25,.22> a=1 floor=die r=sprite(soft-disc,alpha)`;

const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, t) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const snd = (ctx, pid, clip, volume = 0.85, pos = null) => ctx.emit("playSound", { clip, volume, ...(pos ? { position: pos, maxDistance: 45 } : {}) }, { audience: { player: pid } });
const fx1 = (ctx, pid, name, p) => ctx.emit(name, p, { audience: { player: pid } });
const horde = (ctx) => ctx.query({ tags: ["lrun-horde"] });
const strobes = (ctx, a, b) => { const out = []; for (let i = 0; i < CORRIDOR.doors; i++) { const z = -11 - i * 14; if (z <= a && z >= b) { const o = ctx.getObject(`lrun-strobe-${i}`); if (o?.light) out.push(o); } } return out; };

export function startIntroCut(ctx, player) {
  const s = player?.state;
  if (!s || s.lrunIntroDone || s.lrunRescued || s.lrunCut) return false;
  s.lrunCut = { phase: s.lrunRetry ? "again" : "intro", at: ctx.now() };
  s.lrunRetry = 0;
  if (player.feetPosition) { player.feetPosition = { x: 0, y: 0.1, z: 1.5 }; player.velocity = { x: 0, y: 0, z: 0 }; }
  return true;
}

export function startRescueCut(ctx, player) {
  const s = player?.state;
  if (!s || s.lrunRescued || s.lrunCut?.phase === "rescue") return false;
  s.lrunCut = { phase: "rescue", at: ctx.now() };
  s.hp = Math.max(4, Math.min(30, Math.round(s.hp ?? 20)));
  return true;
}

export function finishRescueToAlcove(ctx, player, ses) {
  const s = player.state;
  if (ctx.view && ses) ctx.view.camera = null;
  s.lrunCut = null;
  if (ses) ses.lruncut = null;
  s.lrunRescued = 1;
  s.hp = Math.max(26, s.hp ?? 26);
  player.feetPosition = { ...CORRIDOR.safePos };
  player.rotation = { yaw: CORRIDOR.safeYaw };
  player.velocity = { x: 0, y: 0, z: 0 };
  if (player.anim) player.anim.cut = null;
  s.notice = { text: "The door shuts behind you. Quiet. Two ways out.", at: ctx.now() };
  if (!noStory(s)) setCh2Step(ctx, s, 6, "You made it through Level !. Find the way on.");
}

function startChase(ctx, st, hordeZ) {
  const ch = ctx.place.state?.chase;
  if (ch) { ch.gateOpen = true; ch.active = false; ch.hordeZ = hordeZ; } // the sim lights the chase, and the music from the top, on its next tick
  st.lrunIntroDone = 1;
}

export function lrunCutTick(ctx, ses, st, place = ctx.self?.place) {
  if (!String(place ?? "").startsWith("levelrun")) {
    if (st.lrunCut) { st.lrunCut = null; ctx.view.camera = null; ses.lruncut = null; ses.lrunskip = null; }
    return false;
  }
  const me = ctx.self;
  if (st.lrunRescued && !st.lrunCut) {
    if ((me.feetPosition?.x ?? 0) < 40) { me.feetPosition = { ...CORRIDOR.safePos }; me.rotation = { yaw: CORRIDOR.safeYaw }; me.velocity = { x: 0, y: 0, z: 0 }; }
    return false;
  }
  const cut = st.lrunCut;
  if (!cut) return false;
  const t = (ctx.now() - cut.at) / 1000;
  if (ses.lruncut && ses.lruncut.phase !== cut.phase) ses.lruncut = null;
  const c = (ses.lruncut ??= { did: {}, phase: cut.phase, pz: me.feetPosition?.z ?? 0 });
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn(); } };
  const skip = (cut.phase === "intro" || cut.phase === "again") && ses.lrunskip && ctx.now() - ses.lrunskip > 1100;
  const id = me.id;
  me.velocity = { x: 0, y: 0, z: 0 };
  const shot = (k, cam) => { cam.cut = c.shot !== k; c.shot = k; ctx.view.camera = cam; };
  const end = () => { ctx.view.camera = null; st.lrunCut = null; ses.lruncut = null; ses.lrunskip = null; if (me.anim) me.anim.cut = null; };

  if (cut.phase === "intro" || cut.phase === "again") {
    me.feetPosition = { x: 0, y: 0.1, z: 1.5 };
    const entry = ctx.getObject("lrun-entry-door"), chain = ctx.getObject("lrun-chain-door"), lamp = ctx.getObject("lrun-intake-light");
    const LEN = cut.phase === "again" ? LRUN_AGAIN_LEN : LRUN_INTRO_LEN;
    if (t >= LEN || skip) {
      if (entry) entry.rotation = { yaw: 0 };
      if (chain) chain.rotation = { yaw: 104 };
      if (lamp?.light) lamp.light = { ...lamp.light, intensity: 4.2 };
      me.rotation = { yaw: 0 };
      end(); startChase(ctx, st, 8.5);
      return false;
    }
    if (cut.phase === "again") {
      me.rotation = { yaw: 0 };
      once("idle", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }; snd(ctx, id, CLIP_BREATH, 0.7); });
      if (t > 0.6) once("blow", () => { snd(ctx, id, CLIP_BLOW, 1, { x: 0, y: 1.3, z: 4.6 }); fx1(ctx, id, "screenShake", { intensity: 0.3, duration: 0.3 }); });
      if (chain && t < 1.9) chain.rotation = { yaw: Math.sin(t * 40) * 3 * ss(0.6, 1.0, t) };
      if (t > 1.9) once("breach", () => { if (chain) chain.rotation = { yaw: 104 }; snd(ctx, id, CLIP_BREACH, 1, { x: 0, y: 1.3, z: 4.6 }); fx1(ctx, id, "screenShake", { intensity: 0.6, duration: 0.5 }); fx1(ctx, id, "screenFlash", { color: "#7a0000", duration: 0.3, intensity: 0.6 }); if (ctx.place.state?.chase) ctx.place.state.chase.gateOpen = true; });
      if (t < 1.9) shot(0, { eye: { x: 0.35, y: 1.4, z: 0.4 }, aim: { x: 0, y: 1.3, z: 1.6 }, fov: lerp(42, 34, ss(0, 1.9, t)) });
      else shot(1, { eye: { x: 0.2, y: 1.6, z: 2.6 }, aim: { x: 0, y: 1.4, z: -18 }, fov: 58 });
      return true;
    }
    if (t < 2.2) { // the way you came in slams behind you
      me.rotation = { yaw: 0 };
      once("idle", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }; });
      if (t > 0.55) once("slam", () => { snd(ctx, id, CLIP_SLAM, 1.0); fx1(ctx, id, "screenFlash", { color: "#450000", duration: 0.4, intensity: 0.55 }); if (entry) entry.rotation = { yaw: 0 }; });
      shot(0, { eye: L({ x: -1.1, y: 1.45, z: 1.75 }, { x: -2.0, y: 1.5, z: 1.55 }, ss(0, 2.2, t)), aim: { x: -3.95, y: 1.35, z: 1.5 }, fov: 50 });
      return true;
    }
    if (t < 4.6) { // the lamp stutters; a siren far off
      once("siren", () => snd(ctx, id, R("distant-industrial-siren-drone-loop"), 0.5));
      if (lamp?.light) lamp.light = { ...lamp.light, intensity: Math.sin(t * 31) > 0.3 ? 0.2 : 4.2 };
      shot(1, { eye: L({ x: -0.9, y: 1.35, z: 0.5 }, { x: 0.0, y: 1.85, z: -1.2 }, ss(2.2, 4.6, t)), aim: { x: 0, y: 2.75, z: -5.2 }, fov: 46 });
      return true;
    }
    if (t < 8.0) { // behind you: the chained doors take blows, harder each time
      if (lamp?.light) lamp.light = { ...lamp.light, intensity: 4.2 };
      me.rotation = { yaw: 180 };
      for (const [k, at] of [[1, 4.8], [2, 5.9], [3, 6.8], [4, 7.5]]) if (t > at) once("blow" + k, () => { snd(ctx, id, CLIP_BLOW, 0.6 + k * 0.1, { x: 0, y: 1.3, z: 4.6 }); fx1(ctx, id, "screenShake", { intensity: 0.08 * k, duration: 0.3 }); if (k === 2) snd(ctx, id, CLIP_ROAR, 0.6, { x: 0, y: 1.3, z: 6.5 }); });
      if (chain) { const since = Math.min(...[4.8, 5.9, 6.8, 7.5].map((a) => (t > a ? t - a : 9))); chain.rotation = { yaw: Math.sin(t * 50) * Math.max(0, 5 - since * 14) }; }
      shot(2, { eye: L({ x: 0.5, y: 1.45, z: 0.8 }, { x: 0.0, y: 1.4, z: 2.0 }, ss(4.6, 8.0, t)), aim: { x: 0, y: 1.35, z: 4.65 }, fov: lerp(48, 38, ss(4.6, 8, t)) });
      return true;
    }
    if (t < 9.8) { // it stops. nothing but your breathing
      if (chain) chain.rotation = { yaw: 0 };
      once("hush", () => snd(ctx, id, CLIP_BREATH, 0.9));
      shot(3, { eye: { x: 0.3, y: 1.45, z: 2.6 }, aim: { x: 0, y: 1.35, z: 1.5 }, fov: lerp(36, 30, ss(8, 9.8, t)) });
      return true;
    }
    once("breach", () => { // the breach; you turn and run
      if (chain) chain.rotation = { yaw: 104 };
      snd(ctx, id, CLIP_BREACH, 1.0, { x: 0, y: 1.3, z: 4.6 }); snd(ctx, id, CLIP_ROAR, 1.0, { x: 0, y: 1.3, z: 5.5 });
      fx1(ctx, id, "screenShake", { intensity: 0.7, duration: 0.6 }); fx1(ctx, id, "screenFlash", { color: "#7a0000", duration: 0.3, intensity: 0.6 });
      if (ctx.place.state?.chase) ctx.place.state.chase.gateOpen = true;
      me.rotation = { yaw: 0 };
    });
    shot(4, { eye: L({ x: 0.1, y: 1.55, z: 2.2 }, { x: 0, y: 1.65, z: 3.0 }, ss(9.8, 12, t)), aim: { x: 0, y: 1.5, z: -18 }, fov: lerp(50, 62, ss(9.8, 12, t)) });
    return true;
  }

  if (cut.phase === "mid") { // halfway: the lights go
    const pz = c.pz;
    me.feetPosition = { x: me.feetPosition.x, y: me.feetPosition.y, z: pz };
    if (t >= LRUN_MID_LEN) {
      for (const o of strobes(ctx, pz + 30, pz - 80)) o.light = { ...o.light, intensity: 1.8 };
      end();
      const ch = ctx.place.state?.chase; if (ch) ch.hordeZ = pz + 9;
      return false;
    }
    once("stop", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }; snd(ctx, id, CLIP_POWER, 1); });
    strobes(ctx, pz + 30, pz - 80).forEach((o) => { const d = Math.abs(o.feetPosition.z - pz); if (t > 0.2 + (80 - Math.min(80, d)) * 0.012 && t < 3.4) o.light = { ...o.light, intensity: 0 }; });
    if (t > 1.3) once("pack", () => { snd(ctx, id, CLIP_ROAR, 1, { x: 0, y: 1.2, z: pz + 12 }); snd(ctx, id, CLIP_BREATH, 0.8); });
    if (t > 1.3 && t < 3.4) horde(ctx).forEach((h, i) => { h.feetPosition = { x: [-1, 1, 0, -0.5, 0.6][i % 5], y: 0.1, z: pz + 12 - 2.5 * ss(1.3, 3.4, t) + i * 0.9 }; h.rotation = { yaw: 0 }; });
    strobes(ctx, pz, pz - 80).forEach((o, i) => { if (t > 3.4 + i * 0.28) once("lamp" + i, () => { o.light = { ...o.light, intensity: 1.8 }; if (i < 4) snd(ctx, id, CLIP_LAMP, 0.6, o.feetPosition); }); });
    if (t < 1.3) shot(0, { eye: { x: 0.4, y: 1.5, z: pz - 2.6 }, aim: { x: 0, y: 1.3, z: pz }, fov: 44 });
    else if (t < 3.4) shot(1, { eye: { x: -0.6, y: 1.55, z: pz - 1.2 }, aim: { x: 0, y: 1.1, z: pz + 12 }, fov: lerp(55, 40, ss(1.3, 3.4, t)) });
    else shot(2, { eye: { x: 0.3, y: 0.5, z: pz + 1.6 }, aim: { x: 0, y: 1.4, z: pz - 30 }, fov: 60 });
    return true;
  }

  if (cut.phase === "rescue") { // the end: the ceiling comes down between you and them
    const cz = CORRIDOR.collapseZ, door = { x: 2.55, y: 0, z: cz - 4.2 };
    if (t >= LRUN_RESCUE_LEN) { finishRescueToAlcove(ctx, me, ses); return false; }
    const beam = ctx.getObject("lrun-collapse-beam");
    if (t < 1.2) {
      once("go", () => { me.anim.cut = { clip: "cdn/clip-sprint-loop.glb", weight: 4, loop: "loop" }; fx1(ctx, id, "slowMo", { scale: 0.45, duration: 1.0 }); snd(ctx, id, CLIP_RUMBLE, 1, { x: 0, y: 2.5, z: cz }); });
      me.feetPosition = L({ x: 0, y: 0.1, z: cz + 2.5 }, { x: 0, y: 0.1, z: cz - 1.6 }, ss(0, 1.2, t)); me.rotation = { yaw: 0 };
      if (t > 0.5) once("drop", () => { if (beam) animate(ctx, "lrun-collapse-beam", { "feetPosition.y": [2.9, 0.72] }, { duration: 0.5, easing: "easeInQuad" }); });
      shot(0, { eye: { x: 0.6, y: 0.6, z: cz - 4.5 }, aim: { x: 0, y: 1.4, z: cz + 1 }, fov: 48 });
      return true;
    }
    if (t < 2.4) {
      once("slam", () => {
        if (beam) beam.feetPosition = { x: 0, y: 0.72, z: cz - 0.5 };
        snd(ctx, id, CLIP_BEAM, 1, { x: 0, y: 1, z: cz }); snd(ctx, id, CLIP_FALL, 0.9);
        fx1(ctx, id, "screenShake", { intensity: 0.8, duration: 0.8 }); fx1(ctx, id, "screenFlash", { color: "#2a0000", duration: 0.25, intensity: 0.6 });
        ctx.emit("fx", { position: { x: 0, y: 0.3, z: cz - 0.4 }, script: DUST }, { audience: { player: id } });
        me.anim.cut = { clip: "cdn/clip-fall-loop.glb", weight: 4, loop: "loop" };
      });
      me.feetPosition = L({ x: 0, y: 0.1, z: cz - 1.6 }, { x: 0.2, y: 0.1, z: cz - 2.6 }, ss(1.2, 2.0, t));
      shot(1, { eye: { x: 2.2, y: 0.8, z: cz - 2.2 }, aim: { x: 0, y: 0.6, z: cz - 1.4 }, fov: 50 });
      return true;
    }
    if (t < 5.8) {
      me.feetPosition = { x: 0.2, y: 0.1, z: cz - 2.6 }; me.rotation = { yaw: 180 };
      once("down", () => { me.anim.cut = { clip: "cdn/clip-sit-floor-loop.glb", weight: 4, loop: "loop" }; snd(ctx, id, CLIP_CLAW, 1, { x: 0, y: 0.5, z: cz }); snd(ctx, id, CLIP_BREATH, 0.9); });
      if (t > 3.1) once("roar", () => snd(ctx, id, CLIP_ROAR, 0.9, { x: 0, y: 1, z: cz + 1.5 }));
      horde(ctx).forEach((h, i) => { h.feetPosition = { x: [-1.2, 1.1, 0, -0.5, 0.6][i % 5], y: 0.1, z: cz + 0.9 + Math.floor(i / 2) * 0.8 + Math.sin(t * 25 + i) * 0.06 }; h.rotation = { yaw: 0 }; });
      shot(2, { eye: L({ x: 0.3, y: 0.45, z: cz - 3.6 }, { x: 0.15, y: 0.4, z: cz - 3.0 }, ss(2.4, 5.8, t)), aim: { x: 0, y: 0.5, z: cz }, fov: lerp(52, 38, ss(2.4, 5.8, t)) });
      return true;
    }
    if (t < 8.4) {
      once("up", () => {
        me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop", speed: 0.8 };
        c.glow = ctx.spawn({ audience: "local", scope: "session", lifetime: 8, feetPosition: { x: door.x - 0.3, y: 1.6, z: door.z }, light: { kind: "point", color: "#fff1d0", intensity: 0, distance: 6, shadow: { enabled: false } } });
        animate(ctx, c.glow, { "light.intensity": 3 }, { duration: 1.5 });
      });
      if (t > 7.2) once("door", () => snd(ctx, id, CLIP_DOOR, 0.9, door));
      const p = L({ x: 0.2, y: 0.1, z: cz - 2.6 }, { x: door.x - 0.6, y: 0.1, z: door.z }, ss(5.8, 8.2, t)); me.feetPosition = p;
      me.rotation = { yaw: Math.atan2(-(door.x - p.x), -(door.z - p.z)) * 180 / Math.PI };
      shot(3, { eye: { x: -1.6, y: 1.5, z: cz - 9 }, aim: { x: p.x, y: 1.1, z: p.z }, fov: 42 });
      return true;
    }
    once("in", () => fx1(ctx, id, "screenFlash", { color: "#fff6e0", duration: 1.6, intensity: 0.95 }));
    shot(4, { eye: { x: door.x - 1.6, y: 1.5, z: door.z + 0.4 }, aim: { x: door.x, y: 1.3, z: door.z }, fov: 40 });
    return true;
  }
  return false;
}

export function lrunUi(ctx, player) {
  const cut = player?.state?.lrunCut;
  if (!cut) return "";
  const el = Math.max(0, ctx.now() - cut.at), d = (s) => `${(s * 1000 - el).toFixed(0)}ms`;
  const LEN = { intro: LRUN_INTRO_LEN, again: LRUN_AGAIN_LEN, mid: LRUN_MID_LEN, rescue: LRUN_RESCUE_LEN }[cut.phase] ?? 6;
  const title = cut.phase === "intro" ? `<div class="lrt">LEVEL !</div><div class="lrs">RUN FOR YOUR LIFE</div>` : "";
  const tint = cut.phase === "rescue" ? "rgba(120,10,15,.75)" : "rgba(200,15,20,.6)";
  return `<style>
@keyframes lrb{from{height:0}to{height:10vh}} @keyframes lrbo{from{height:10vh}to{height:0}}
@keyframes lrt{0%{opacity:0;letter-spacing:.5em}18%{opacity:1;letter-spacing:.3em}80%{opacity:1}100%{opacity:0}}
@keyframes lrpulse{0%,100%{opacity:.55}50%{opacity:1}}
.lrb{position:fixed;left:0;right:0;height:10vh;background:#050001;z-index:50;animation:lrb .45s ease-out both,lrbo .6s ease-in both;animation-delay:0ms,${d(LEN - 0.6)}}
.lrv{position:fixed;inset:0;pointer-events:none;z-index:48;box-shadow:inset 0 0 140px ${tint};animation:lrpulse 1.1s ease-in-out infinite}
.lrt{position:fixed;left:7vw;bottom:18vh;z-index:54;color:#ff3a30;font:600 40px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.3em;text-shadow:0 0 18px rgba(255,30,30,.6);opacity:0;animation:lrt 2.2s ease both;animation-delay:${d(9.9)}}
.lrs{position:fixed;left:7vw;bottom:calc(18vh - 30px);z-index:54;color:#f0c8c4;font:400 13px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.42em;opacity:0;animation:lrt 2.1s ease both;animation-delay:${d(10.2)}}
.lrk{position:fixed;right:28px;bottom:3vh;z-index:55;color:#b88a8a;font:400 11px/1 monospace;letter-spacing:.2em}
</style><div class="lrv"></div><div class="lrb" style="top:0"></div><div class="lrb" style="bottom:0"></div>${title}${cut.phase === "intro" || cut.phase === "again" ? `<div class="lrk">HOLD JUMP TO SKIP</div>` : ""}`;
}
