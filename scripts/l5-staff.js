// Level 5's Staff (the article's Humanoids): tall pitch-black faceless figures in old hotel uniforms. They stand facing
// the corridor walls. Turn your back on one while you're alone and it creeps after you, whispering politely; look at it
// and it stops dead. If it reaches you it strikes hard. Slow enough to outwalk. Never onto safe ground.

import { heard } from "./lib/hear.js";
import { E, SND, isSafe, flat, yawTo, prey, aloneOf, hit, claimRemains } from "./lib/l5-hostile.js";
import { npcState } from "./lib/stats.js";
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import { zoneId, becomeCorpse, killerOf } from "./lib/l5-hostile.js";
import { critterSpec } from "./lib/critter-model.js";
import { npcLook } from "./lib/clothes.js";

const clearLine = (ctx, meId, a, b) => {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) return true;
  const h = raycast(
    ctx,
    { x: a.x, y: (a.y ?? 0) + 0.8, z: a.z },
    { x: dx / d, y: 0, z: dz / d },
    { distance: d, radius: 0.25, ignoreEntities: [meId], bodies: "static", physicsOnly: true }
  );
  return !h;
};

// Staff are critters: faceless, fur pitch black, in old hotel livery
// Critical pupil rule: pupils remain solid matte black (#060606 / #000000, roughness 1)
const INK = { color: "#060606", roughness: 1, metalness: 0 };

export function faceless(spec) {
  const h = spec.children?.[0];
  if (h?.model) {
    if (typeof h.model === "string") h.model = { id: h.model };
    h.model.materials = {
      fur: INK,
      ...h.model.materials,
      pupil: INK,
      eyewhite: INK,
      eyeink: INK,
      mouth: INK,
      blush: INK,
      tongue: INK,
      nose: INK,
      tip: INK,
      mark: INK,
    };
    h.morph = undefined;
  }
  return spec;
}

export const staffLook = (f, i) => ({
  ...npcLook("l5staff" + i, { species: ["wolf", "cat", "fox", "bear"][i % 4], sex: i % 3 ? "m" : "f" }, "wanderer", 12),
  fur: "#060606",
  vary: false,
  eye: "#000000",
});

// In disguise: an ordinary hotel critter, own fur, own face
export const maskLook = (f, i) =>
  npcLook("l5staff" + i, { species: ["wolf", "cat", "fox", "bear"][i % 4], sex: i % 3 ? "m" : "f" }, "wanderer", 12);

const REVEAL = { near: 3.2, stareRange: 9, stareMs: 2500 };

function reveal(ctx, f, o) {
  const at = o.feetPosition;
  const st = { ...o.state, disguised: false, verb: "Look", info: f.info };
  const rot = o.rotation;
  ctx.destroy(f.id);
  ctx.spawn(f.id, {
    tags: ["moths", "l5staff", "l5-hostile", "usable", "faceling"],
    feetPosition: at,
    rotation: rot,
    ...faceless(critterSpec(staffLook(f, T.figures.indexOf(f)))),
    scale: (f.height ?? 2.2) / 1.8,
    physics: { body: "character" },
    state: st,
  });
  heard(ctx, { clip: SND("wet-skin-peeling-face-slipping-off-low-drone"), position: { ...at, y: at.y + 2 }, volume: 1, maxDistance: 16 });
  ctx.emit("screenFlash", { color: "#000000", duration: 0.35, intensity: 0.6 }, { audience: { nearby: at, radius: 10 } });
  ctx.emit("screenShake", { intensity: 0.3, duration: 0.4 }, { audience: { nearby: at, radius: 10 } });
}

const T = E.staff;
const AVOID = new Set(T.avoid ?? []);
const COS = Math.cos((T.lookCone * Math.PI) / 180);
const WALK = { clip: "cdn/clip-walk-loop.glb", loop: true, speed: 0.55 };
const IDLE = { clip: "cdn/clip-idle-loop.glb", loop: true, speed: 0.25 };

function place(ctx, f) {
  return ctx.spawn(f.id, {
    tags: ["moths", "l5staff", "l5-hostile", "usable", "faceling"],
    feetPosition: { x: f.post.x, y: 0.02, z: f.post.z },
    rotation: f.yaw,
    ...critterSpec(maskLook(f, T.figures.indexOf(f))),
    scale: (f.height ?? 2.2) / 1.8,
    physics: { body: "character" },
    state: {
      ...npcState(ctx, "staff", T.hp, { xp: 80 }),
      kind: "staff",
      name: f.name,
      verb: "Look",
      info: "One of the hotel staff. Polite. Very still.",
      mode: "post",
      disguised: true,
    },
  });
}

// Compute forward aim vector for player
function lookOf(p) {
  const ax = p.state?.aimX;
  const az = p.state?.aimZ;
  if (typeof ax === "number" && typeof az === "number" && (ax || az)) {
    const l = Math.hypot(ax, az);
    return [ax / l, az / l];
  }
  const r = p.camera?.rotation;
  if (r && typeof r.yaw === "number") {
    const y = (r.yaw * Math.PI) / 180;
    return [-Math.sin(y), -Math.cos(y)];
  }
  if (r && typeof r.w === "number") {
    const fx = -2 * (r.x * r.z + r.w * r.y);
    const fz = -(1 - 2 * (r.x * r.x + r.y * r.y));
    const l = Math.hypot(fx, fz) || 1;
    return [fx / l, fz / l];
  }
  const y = ((p.rotation?.yaw ?? 0) * Math.PI) / 180;
  return [-Math.sin(y), -Math.cos(y)];
}

function watched(ctx, me, players) {
  for (const p of players) {
    const dx = p.feetPosition.x - me.x;
    const dz = p.feetPosition.z - me.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > 30 * 30) continue;

    const d = Math.sqrt(d2);
    const [fx, fz] = lookOf(p);
    if ((fx * (me.x - p.feetPosition.x) + fz * (me.z - p.feetPosition.z)) / (d || 1) > COS) {
      return p;
    }
  }
  return null;
}

export function update(ctx, dt) {
  const now = ctx.now();
  const mem = (ctx.self.session.m ??= {});
  const hunt = prey(ctx, now);
  const everyone = ctx.place.players;

  for (const f of T.figures) {
    const o = ctx.getObject(f.id);
    if (!o) {
      if (now >= (mem["re" + f.id] ?? 0)) {
        mem["re" + f.id] = now + 240000;
        if (mem["re" + f.id + "x"]) place(ctx, f);
        mem["re" + f.id + "x"] = true;
      }
      continue;
    }

    const m = (mem[f.id] ??= {});
    const pos = o.feetPosition;
    const st = o.state;
    const vy = (o.velocity?.y ?? 0) - 18 * dt;

    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) {
        m.deadAt = now;
        becomeCorpse(
          ctx,
          o,
          `${f.name}'s body`,
          ["bobbypin", "battery", ctx.random() < 0.5 ? "kit" : "tape"],
          killerOf(ctx, pos)?.feetPosition
        );
        heard(ctx, { maxDistance: 22, refDistance: 3, clip: SND("hollow-sigh-fading-whisper-thank-you-for-staying"), position: pos, volume: 0.9 });
      }
      if (now - m.deadAt > 3600000 || (now - m.deadAt > 3000 && !(o.state.items ?? "").length)) {
        ctx.destroy(f.id);
        delete mem[f.id];
        mem["re" + f.id] = now + 240000;
      }
      continue;
    }

    if (st.disguised) {
      // Passing as staff: keeps its post
      o.velocity = { x: 0, y: vy, z: 0 };
      if (flat(pos, f.post) < 0.5) o.rotation = f.yaw;
      if (!o.anim?.move) o.anim.move = IDLE;

      const close = everyone.some((p) => flat(p.feetPosition, pos) < REVEAL.near);
      const seer = watched(ctx, pos, everyone);

      if (seer && flat(seer.feetPosition, pos) < REVEAL.stareRange) {
        m.stare ??= now;
      } else {
        m.stare = null;
      }

      if (close || (m.stare && now - m.stare > REVEAL.stareMs)) {
        reveal(ctx, f, o);
        mem[f.id] = {};
      }
      continue;
    }

    let mode = "post";
    let goal = null;
    let sp = 0;
    const seer = watched(ctx, pos, everyone);
    let target = null;
    let best = T.sense;

    for (const p of hunt) {
      const d = flat(p.feetPosition, pos);
      if (
        d < best &&
        aloneOf(ctx, p, T.alone) &&
        flat(p.feetPosition, f.post) < (T.leash ?? 16) &&
        !AVOID.has(zoneId(p.feetPosition.x, p.feetPosition.z))
      ) {
        best = d;
        target = p;
      }
    }

    if (seer) mode = "frozen";

    // Stared at up close, speaks politely
    if (seer) {
      if (flat(seer.feetPosition, pos) < 4 && now >= (m.spoke ?? 0)) {
        m.spoke = now + 20000;
        st.line = f.line;
        st.lineAt = now;
        heard(ctx, {
          clip: `/cdn/voice-faceling-${f.id.slice(9)}-saying-${f.line.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/ +/g, "-")}.mp3`,
          position: { ...pos, y: pos.y + 2 },
          volume: 0.7,
          maxDistance: 10,
        });
      }
    } else if (target) {
      mode = "creep";
      goal = target.feetPosition;
      sp = T.creep;
    } else if (flat(pos, f.post) > 0.3) {
      mode = "return";
      goal = f.post;
      sp = T.home;
    }

    if (mode === "creep" && best < T.reach && now >= (m.strike ?? 0)) {
      m.strike = now + T.strikeEvery;
      mode = "strike";
      const at = hit(ctx, target, T.strike, "#ff2a2a");
      o.anim.move = { clip: "cdn/clip-attack.glb" };
      m.anim = "strike";
      heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("heavy-blunt-body-blow-thud"), position: at, volume: 1 });
      ctx.emit("screenShake", { intensity: 0.55, duration: 0.3 }, { audience: { player: target.id } });
      ctx.emit("cameraPunch", { direction: { x: target.feetPosition.x - pos.x, y: 0, z: target.feetPosition.z - pos.z }, intensity: 0.7 }, { audience: { player: target.id } });
      ctx.emit("screenFlash", { color: "#300000", duration: 0.25, intensity: 0.5 }, { audience: { player: target.id } });
    }

    if (mode === "strike" || now < (m.strike ?? 0) - T.strikeEvery + 900) {
      sp = 0;
    }

    let dx = 0;
    let dz = 0;

    if (goal && sp) {
      // Pathfinding along hotel corridors
      if (!m.path || now - (m.pathAt ?? 0) > (m.repathMs ?? 1000) || flat(m.pathGoal ?? goal, goal) > 1.5) {
        const r = findPath(ctx, { x: pos.x, y: pos.y ?? 0, z: pos.z }, { x: goal.x, y: goal.y ?? pos.y ?? 0, z: goal.z });
        if (r?.points?.length) {
          m.path = r.points;
          m.pathAt = now;
          m.pathGoal = { ...goal };
          m.repathMs = r.partial ? 350 : 1200;
        } else {
          m.path = null;
          m.repathMs = 500;
        }
      }

      let aim = goal;
      if (m.path) {
        while (m.path.length > 1 && flat(pos, m.path[0]) < 0.7) m.path.shift();
        if (m.path.length > 1 && clearLine(ctx, o.id, pos, m.path[1])) m.path.shift();
        aim = m.path[0] ?? goal;
      }

      dx = aim.x - pos.x;
      dz = aim.z - pos.z;
      const d = Math.hypot(dx, dz) || 1;
      dx /= d;
      dz /= d;

      // Stuck detection: sidestep if blocked
      m.sk ??= { x: pos.x, z: pos.z, at: now };
      if (now - m.sk.at > 800) {
        const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
        if (sp > 0.3 && moved < 0.2) {
          m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
          m.path = null;
        }
        m.sk = { x: pos.x, z: pos.z, at: now };
      }

      if (m.side && now < m.side.until) {
        const s = m.side.s;
        const curDx = dx;
        const curDz = dz;
        dx = curDx * 0.4 - curDz * s * 0.9;
        dz = curDz * 0.4 + curDx * s * 0.9;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl;
        dz /= dl;
      }

      const nx = pos.x + dx * 0.6;
      const nz = pos.z + dz * 0.6;
      if (isSafe(nx, nz) || (mode === "creep" && AVOID.has(zoneId(nx, nz)))) {
        sp = 0;
      }
    } else {
      m.path = null;
    }

    // Separation: push apart from other staff members
    const spread = T.spread ?? 1.6;
    const spreadSq = spread * spread;
    for (const g of T.figures) {
      if (g.id === f.id) continue;
      const q = ctx.getObject(g.id)?.feetPosition;
      if (!q) continue;

      const ex = pos.x - q.x;
      const ez = pos.z - q.z;
      const e2 = ex * ex + ez * ez;

      if (e2 < spreadSq && e2 > 0.0001) {
        const e = Math.sqrt(e2);
        const k = (spread - e) / spread;
        dx += (ex / e) * k;
        dz += (ez / e) * k;
        if (!sp && mode !== "frozen") sp = 0.8;
      }
    }

    o.velocity = { x: dx * sp, y: vy, z: dz * sp };

    if ((mode === "creep" || mode === "return") && sp) {
      o.rotation = yawTo(dx, dz);
    } else if (mode === "post") {
      o.rotation = f.yaw;
    }

    const want = sp
      ? "walk"
      : m.anim === "strike" && now < (m.strike ?? 0) - T.strikeEvery + 900
      ? "strike"
      : mode === "frozen"
      ? "frozen"
      : "idle";

    if (want !== m.anim || (want !== "frozen" && !o.anim?.move)) {
      m.anim = want;
      o.anim.move = want === "walk" ? WALK : want === "idle" ? IDLE : want === "frozen" ? { ...IDLE, speed: 0 } : o.anim.move ?? null;
    }

    if (st.mode !== mode) st.mode = mode;

    if (mode === "creep" && now >= (m.whisper ?? 0)) {
      m.whisper = now + 6000 + ctx.random() * 6000;
      heard(ctx, { clip: SND(f.whisper), position: { ...pos, y: pos.y + 2 }, volume: 0.55, maxDistance: 14 });
    }
  }
}
