// Level ! Intro ("door slam -> siren -> chained door horde breach") & Collapse/Phoebe Spatial Ward Rescue cutscenes.
// Includes clean skip handling, Safe Alcove reload recovery, and non-repeatability guarantees.
import { CORRIDOR } from "./levelrun-mechanics.js";
import { setCh2Step } from "./ch2-quest.js";
import { spawnPhoebe, dropPhoebe } from "./phoebe.js";

export const LRUN_INTRO_LEN = 8.4;
export const LRUN_RESCUE_LEN = 9.0;

const CLIP_SLAM = "/cdn/moodboard-realistic-gritty/sfx-heavy-metal-fire-door-slam-echo.mp3";
const CLIP_CHAIN = "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-latch-clunk-and-rattle.mp3";
const CLIP_ROAR = "/cdn/moodboard-gothic-horror/sfx-hound-bark-howl-call.mp3";
const CLIP_WARD = "/cdn/moodboard-scifi-neon/sfx-soft-retro-mall-chime-two-tone.mp3";
export const PHO_RESCUE_LINE = "Not yet. I'm not done watching you.";
const CLIP_PHO_LINE = `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(PHO_RESCUE_LINE)}.mp3`;
const CLIP_FALL = "/cdn/moodboard-realistic-gritty/sfx-body-falls-hard-onto-tile-floor-thud.mp3";
const CLIP_FOLD = "/cdn/moodboard-gothic-horror/sfx-air-sucked-inward-reverse-whoosh-glass-hum.mp3";

const WARD_FX = `fx
pop ward rate=?mobile:14|24 on=disc(1.3) life=0.6..1.1 v=up(0.8..1.6)+sdir()*0.3 size=0.1..0.24 acc=drag(1.1) col=<0.68,0.52,1.0> a=0.9>0 sz=$size r=sprite(soft-disc,alpha)`;

// the barrier: a sheet of violet light across the hall, hums where it stands
const BARRIER_FX = `fx
pop sheet rate=?mobile:30|60 on=box(<1.7,1.4,0.04>).c(1.4) life=.5..0.9 v=sdir()*.15 size=.12..0.28 acc=curl(.6)*.4+drag(2) col=hdr(1.4,1.0,2.6)>hdr(.6,.4,1.4) a=0>.2:.85>.7:.5>0 sz=$size r=sprite(soft-disc,add)
pop glow n=1 at=point().c(1.3) r=light(<.72,.55,1>,14,9)`;
const horde = (ctx) => ctx.query({ tags: ["lrun-horde"] });
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u });
const ss = (a, b, t) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const snd = (ctx, pid, clip, volume = 0.85, pos = null) =>
  ctx.emit("playSound", { clip, volume, ...(pos ? { position: pos, spatial: true, maxDistance: 45 } : {}) }, pid ? { audience: { player: pid } } : undefined);

export function startIntroCut(_ctx, player) {
  const s = player?.state;
  if (!s || s.lrunIntroDone || s.lrunRescued || s.lrunCut) return false;
  s.lrunCut = { phase: "intro", at: _ctx.now() };
  if (player.feetPosition) {
    player.feetPosition = { x: 0, y: 0.1, z: 1.5 };
    player.velocity = { x: 0, y: 0, z: 0 };
  }
  return true;
}

export function startRescueCut(ctx, player) {
  const s = player?.state;
  if (!s || s.lrunRescued || s.lrunCut?.phase === "rescue") return false;
  s.lrunCut = { phase: "rescue", at: ctx.now() };
  s.hp = Math.max(4, Math.min(8, Math.round(s.hp ?? 6)));
  ctx.emit("screenFlash", { color: "#9c0000", duration: 0.65, intensity: 0.85 }, { audience: { player: player.id } });
  snd(ctx, player.id, CLIP_SLAM, 0.95);
  return true;
}

export function finishRescueToAlcove(ctx, player, ses) {
  const s = player.state;
  if (ctx.view) ctx.view.camera = null;
  dropPhoebe(ctx, "lrun-phoebe-cut");
  s.lrunCut = null;
  if (ses) ses.lruncut = null;
  s.lrunRescued = 1;
  s.hp = Math.max(26, s.hp ?? 26);
  player.feetPosition = { ...CORRIDOR.safePos };
  player.rotation = { yaw: CORRIDOR.safeYaw };
  player.velocity = { x: 0, y: 0, z: 0 };
  setCh2Step(ctx, s, 6, "Phoebe pulled you into a quiet alcove. Speak with her before leaving.");
}

export function lrunCutTick(ctx, ses, st, place = ctx.self?.place) {
  if (place !== "levelrun") {
    if (st.lrunCut) {
      st.lrunCut = null;
      ctx.view.camera = null;
      ses.lruncut = null;
      ses.lrunskip = null;
    }
    return false;
  }

  const me = ctx.self;
  // Reload recovery guard: once rescued, never stray back into intake or chase
  if (st.lrunRescued && !st.lrunCut) {
    if ((me.feetPosition?.x ?? 0) < 40) {
      me.feetPosition = { ...CORRIDOR.safePos };
      me.rotation = { yaw: CORRIDOR.safeYaw };
      me.velocity = { x: 0, y: 0, z: 0 };
    }
    return false;
  }

  const cut = st.lrunCut;
  if (!cut) return false;

  const t = (ctx.now() - cut.at) / 1000;
  const c = (ses.lruncut ??= { did: {} });
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn(); } };
  const skip = cut.phase === "intro" && ses.lrunskip && ctx.now() - ses.lrunskip > 1100;

  me.velocity = { x: 0, y: 0, z: 0 };

  if (cut.phase === "intro") {
    me.feetPosition = { x: 0, y: 0.1, z: 1.5 };
    const entryDoor = ctx.place.objects?.["lrun-entry-door"];
    const chainDoor = ctx.place.objects?.["lrun-chain-door"];

    if (t >= LRUN_INTRO_LEN || skip) {
      if (entryDoor) entryDoor.rotation = { yaw: 0 };
      if (chainDoor) chainDoor.rotation = { yaw: 0 };
      ctx.view.camera = null;
      st.lrunCut = null;
      st.lrunIntroDone = 1;
      ses.lruncut = null;
      ses.lrunskip = null;
      if (ctx.place.state?.chase) {
        ctx.place.state.chase.gateOpen = true;
        ctx.place.state.chase.active = true;
        ctx.place.state.chase.hordeZ = 10.5;
      }
      setCh2Step(ctx, st, 5, "RUN FOR YOUR LIFE!");
      return false;
    }

    if (t < 2.2) {
      if (t > 0.55) {
        once("slam", () => {
          snd(ctx, me.id, CLIP_SLAM, 1.0);
          ctx.emit("screenFlash", { color: "#450000", duration: 0.4, intensity: 0.55 }, { audience: { player: me.id } });
          if (entryDoor) entryDoor.rotation = { yaw: 0 };
        });
      }
      const u = ss(0, 2.2, t);
      ctx.view.camera = { eye: L({ x: -1.1, y: 1.45, z: 1.75 }, { x: -2.0, y: 1.5, z: 1.55 }, u), aim: { x: -3.95, y: 1.35, z: 1.5 }, fov: 50 };
      return true;
    }
    if (t < 4.8) {
      once("siren", () => {
        snd(ctx, me.id, "/cdn/moodboard-realistic-gritty/sfx-distant-industrial-siren-drone-loop.mp3", 0.65);
      });
      const u = ss(2.2, 4.8, t);
      ctx.view.camera = { eye: L({ x: -0.9, y: 1.35, z: 0.5 }, { x: 0.0, y: 1.85, z: -1.2 }, u), aim: { x: 0, y: 2.75, z: -5.2 }, fov: 46 };
      return true;
    }
    if (t < 7.2) {
      once("rattle", () => snd(ctx, me.id, CLIP_CHAIN, 1.0, { x: 0, y: 1.3, z: 4.5 }));
      if (t > 5.4) once("roar", () => snd(ctx, me.id, CLIP_ROAR, 0.55, { x: 0, y: 1.3, z: 6.5 }));
      if (t > 6.2) once("roar2", () => snd(ctx, me.id, CLIP_ROAR, 0.8, { x: 0, y: 1.3, z: 5.4 }));
      if (t > 6.8) once("roar3", () => { snd(ctx, me.id, CLIP_CHAIN, 1.0, { x: 0, y: 1.3, z: 4.5 }); ctx.emit("screenShake", { intensity: 0.25, duration: 0.35 }, { audience: { player: me.id } }); });
      if (chainDoor) {
        const jiggle = Math.sin(t * 42) * (1.5 + 4.5 * ss(4.8, 7.2, t)); // the shaking grows with the noise
        chainDoor.rotation = { yaw: jiggle };
      }
      const u = ss(4.8, 7.2, t);
      ctx.view.camera = { eye: L({ x: 0.5, y: 1.45, z: 0.8 }, { x: 0.0, y: 1.4, z: 1.8 }, u), aim: { x: 0, y: 1.35, z: 4.65 }, fov: 48 };
      return true;
    }
    once("gate", () => {
      if (chainDoor) chainDoor.rotation = { yaw: 104 }; // the breach: chains give, the door is thrown wide
      snd(ctx, me.id, CLIP_ROAR, 1.0, { x: 0, y: 1.3, z: 5.0 });
      ctx.emit("screenShake", { intensity: 0.6, duration: 0.6 }, { audience: { player: me.id } });
      ctx.emit("screenFlash", { color: "#7a0000", duration: 0.3, intensity: 0.6 }, { audience: { player: me.id } });
      if (ctx.place.state?.chase) ctx.place.state.chase.gateOpen = true;
      snd(ctx, me.id, CLIP_CHAIN, 0.85, { x: 0, y: 1.5, z: -5.2 });
    });
    const u = ss(7.2, LRUN_INTRO_LEN, t);
    ctx.view.camera = { eye: L({ x: 0.1, y: 1.55, z: 1.8 }, { x: 0, y: 1.65, z: 2.5 }, u), aim: { x: 0, y: 1.5, z: -18 }, fov: 56 };
    return true;
  }

  if (cut.phase === "rescue") {
    const cz = CORRIDOR.collapseZ;
    me.feetPosition = { x: 0, y: 0.1, z: cz };
    if (t >= LRUN_RESCUE_LEN) {
      finishRescueToAlcove(ctx, me, ses);
      return false;
    }
    const placeHorde = (z) => horde(ctx).forEach((h, i) => { h.feetPosition = { x: [-0.9, 0.9, 0, -0.4, 0.5][i % 5], y: 0.1, z: z + Math.floor(i / 2) * 1.1 }; h.rotation = { yaw: 0 }; });

    // 1. collapse: the ceiling beam drops, legs go, the floor comes up
    if (t < 1.6) {
      once("fall", () => {
        snd(ctx, me.id, CLIP_FALL, 0.9);
        ctx.emit("screenShake", { intensity: 0.7, duration: 0.5 }, { audience: { player: me.id } });
      });
      const u = ss(0, 1.6, t);
      ctx.view.camera = {
        eye: L({ x: 0, y: 1.6, z: cz }, { x: 0.15, y: 0.32, z: cz - 0.3 }, u),
        aim: L({ x: 0, y: 1.4, z: cz - 8 }, { x: 0.4, y: 0.15, z: cz - 3 }, u),
        fov: 60,
      };
      return true;
    }

    // 2. they close in: on the floor, looking back, the noise on top of you
    if (t < 4.2) {
      const u = ss(1.6, 4.2, t);
      placeHorde(cz + 9 - 7.2 * u);
      if (t > 1.7) once("r1", () => snd(ctx, me.id, CLIP_ROAR, 0.6, { x: 0, y: 1.2, z: cz + 7 }));
      if (t > 2.7) once("r2", () => snd(ctx, me.id, CLIP_ROAR, 0.8, { x: 0, y: 1.2, z: cz + 4 }));
      if (t > 3.6) once("r3", () => { snd(ctx, me.id, CLIP_ROAR, 1.0, { x: 0, y: 1.2, z: cz + 2 }); ctx.emit("screenFlash", { color: "#9c0000", duration: 0.3, intensity: 0.5 }, { audience: { player: me.id } }); });
      ctx.view.camera = {
        eye: L({ x: 0.15, y: 0.4, z: cz - 0.6 }, { x: -0.1, y: 0.35, z: cz - 0.9 }, u),
        aim: { x: 0, y: 1.0, z: cz + 4.5 },
        fov: L({ x: 58, y: 0, z: 0 }, { x: 44, y: 0, z: 0 }, u).x,
      };
      return true;
    }

    // 3. Phoebe: a barrier drops across the hall and the hallway folds them away. Nobody dies; the distance changes.
    if (t < 6.8) {
      once("ward", () => {
        snd(ctx, me.id, CLIP_WARD, 0.9, { x: 0, y: 1.2, z: cz + 1 });
        snd(ctx, me.id, CLIP_PHO_LINE, 0.95);
        ctx.emit("screenFlash", { color: "#b694ff", duration: 0.55, intensity: 0.65 }, { audience: { player: me.id } });
        ctx.emit("shockwave", { position: { x: 0, y: 1, z: cz + 1.1 }, speed: 8, thickness: 0.6, intensity: 0.6 }, { audience: { player: me.id } });
        ctx.spawn("lrun-ward-burst", { audience: "local", feetPosition: { x: 0.4, y: 0.15, z: cz - 1.6 }, lifetime: 3000, fx: { script: WARD_FX } });
        ctx.spawn("lrun-ward-wall", { audience: "local", feetPosition: { x: 0, y: 0, z: cz + 1.1 }, lifetime: 4500, fx: { script: BARRIER_FX } });
        spawnPhoebe(ctx, "lrun-phoebe-cut", { x: 0.85, y: 0.1, z: cz - 1.9 }, 15, 4.8);
      });
      if (t > 5.0) once("displace", () => { snd(ctx, me.id, CLIP_FOLD, 0.85, { x: 0, y: 1.2, z: cz + 3 }); placeHorde(cz + 18); });
      if (t < 5.0) placeHorde(cz + 1.8 + Math.sin(t * 30) * 0.08); // pressed against the barrier
      const u = ss(4.2, 6.8, t);
      ctx.view.camera = {
        eye: L({ x: -0.2, y: 0.5, z: cz - 0.8 }, { x: 0.35, y: 1.0, z: cz + 0.3 }, u),
        aim: L({ x: 0, y: 1.1, z: cz + 2.5 }, { x: 0.8, y: 1.25, z: cz - 1.9 }, u),
        fov: 48,
      };
      return true;
    }

    // 4. fold to safety
    once("fold", () => {
      ctx.emit("screenFlash", { color: "#d8c4ff", duration: 1.2, intensity: 0.95 }, { audience: { player: me.id } });
    });
    const u = ss(6.8, LRUN_RESCUE_LEN, t);
    ctx.view.camera = {
      eye: L({ x: 0.35, y: 1.0, z: cz + 0.3 }, { x: 0.65, y: 1.35, z: cz - 1.0 }, u),
      aim: { x: 0.85, y: 1.45, z: cz - 1.9 },
      fov: 40,
    };
    return true;
  }

  return false;
}

export function lrunUi(ctx, player) {
  const cut = player?.state?.lrunCut;
  if (!cut) return "";
  const el = Math.max(0, ctx.now() - cut.at);
  const d = (s) => `${Math.max(0, s * 1000 - el)}ms`;

  if (cut.phase === "intro") {
    return `<style>
@keyframes lrb{from{height:0}to{height:10vh}} @keyframes lrbo{from{height:10vh}to{height:0}}
@keyframes lrt{0%{opacity:0;letter-spacing:.6em}22%{opacity:1;letter-spacing:.26em}80%{opacity:1}100%{opacity:0}}
@keyframes lrc{0%{opacity:0}12%{opacity:.94}86%{opacity:.94}100%{opacity:0}}
.lrb{position:fixed;left:0;right:0;height:10vh;background:#070001;z-index:50;animation:lrb .45s ease-out both,lrbo .7s ease-in both;animation-delay:0ms,${d(LRUN_INTRO_LEN - 0.7)}}
.lrv{position:fixed;inset:0;pointer-events:none;z-index:48;box-shadow:inset 0 0 120px rgba(200,15,20,.65)}
.lrt{position:fixed;left:0;right:0;top:36%;text-align:center;z-index:54;color:#ff3535;font:700 50px/1.1 Georgia,serif;text-shadow:0 0 28px rgba(255,30,30,.75);opacity:0;animation:lrt 3.2s ease both;animation-delay:${d(2.0)}}
.lrs{position:fixed;left:0;right:0;top:46%;text-align:center;z-index:54;color:#ffdada;font:400 18px/1.2 Georgia,serif;letter-spacing:.28em;opacity:0;animation:lrt 3.0s ease both;animation-delay:${d(2.3)}}
.lrc{position:fixed;left:6vw;right:6vw;bottom:13vh;text-align:center;z-index:53;color:#ffe6e6;font:400 17px/1.4 Georgia,serif;text-shadow:1px 1px 4px #000;opacity:0;animation:lrc 2.5s ease both;animation-delay:${d(4.8)}}
@keyframes lrx{0%{opacity:0;transform:scale(2.4)}8%{opacity:1;transform:scale(1)}70%{opacity:1}100%{opacity:0}}
.lrx{position:fixed;left:0;right:0;top:12%;text-align:center;z-index:54;color:#ff1a1a;font:900 260px/1 Georgia,serif;text-shadow:0 0 60px rgba(255,0,0,.9),0 0 12px #600;opacity:0;animation:lrx 1.5s ease-out both;animation-delay:${d(0.6)}}
.lrk{position:fixed;right:28px;bottom:3vh;z-index:55;color:#b88a8a;font:400 11px/1 Georgia,serif;letter-spacing:.2em}
</style><div class="lrv"></div><div class="lrb" style="top:0"></div><div class="lrb" style="bottom:0"></div><div class="lrx">!</div><div class="lrt">LEVEL !</div><div class="lrs">RUN FOR YOUR LIFE</div><div class="lrc">Steel chains groan at your back. Don't look back once the gate lifts.</div><div class="lrk">HOLD JUMP TO SKIP</div>`;
  }

  return `<style>
@keyframes lrb{from{height:0}to{height:12vh}} @keyframes lrbo{from{height:12vh}to{height:0}}
@keyframes lrp{0%{opacity:0}12%{opacity:.95}88%{opacity:.95}100%{opacity:0}}
.lrb{position:fixed;left:0;right:0;height:12vh;background:#040107;z-index:50;animation:lrb .5s ease-out both,lrbo .8s ease-in both;animation-delay:0ms,${d(LRUN_RESCUE_LEN - 0.8)}}
.lrv{position:fixed;inset:0;pointer-events:none;z-index:48;box-shadow:inset 0 0 140px rgba(170,10,20,.8)}
.lrp{position:fixed;left:6vw;right:6vw;bottom:14vh;text-align:center;z-index:54;color:#efe6ff;font:400 18px/1.4 Georgia,serif;text-shadow:1px 1px 5px #000;opacity:0;animation:lrp 2.6s ease both;animation-delay:${d(4.3)}}
</style><div class="lrv"></div><div class="lrb" style="top:0"></div><div class="lrb" style="bottom:0"></div><div class="lrp">Phoebe: "${PHO_RESCUE_LINE}"</div>`;
}
