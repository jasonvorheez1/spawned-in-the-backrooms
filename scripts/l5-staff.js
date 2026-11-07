// Level 5's Staff (the article's Humanoids): tall pitch-black faceless figures in old hotel uniforms. They stand facing
// the corridor walls. Turn your back on one while you're alone and it creeps after you, whispering politely; look at it
// and it stops dead. If it reaches you it strikes hard. Slow enough to outwalk. Never onto safe ground.
import { E, SND, isSafe, flat, yawTo, prey, aloneOf, hit, claimRemains } from "./lib/l5-hostile.js";
import { npcState } from "./lib/stats.js";
import { findPath } from "builtin/nav";
import { zoneId } from "./lib/l5-hostile.js";

import { critterSpec } from "./lib/critter-model.js";
import { npcLook } from "./lib/clothes.js";
// the staff are critters too (the creator's rule: a world full of critters): faceless, fur pitch black, in old hotel livery
// facelings: every face part on the head goes the fur's black, so nothing looks back
const INK = { color: "#060606", roughness: 1, metalness: 0 };
export function faceless(spec) { const h = spec.children?.[0]; if (h?.model) { h.model.materials = { ...h.model.materials, pupil: INK, eyewhite: INK, eyeink: INK, mouth: INK, blush: INK, tongue: INK, nose: INK, tip: INK, mark: INK }; h.morph = undefined; } return spec; }
export const staffLook = (f, i) => ({ ...npcLook("l5staff" + i, { species: ["wolf", "cat", "fox", "bear"][i % 4], sex: i % 3 ? "m" : "f" }, "wanderer", 12), fur: "#060606", vary: false, eye: "#000000" });
const T = E.staff, AVOID = new Set(T.avoid ?? []), COS = Math.cos((T.lookCone * Math.PI) / 180);
const WALK = { clip: "cdn/clip-walk-loop.glb", loop: true, speed: 0.55 }, IDLE = { clip: "cdn/clip-idle-loop.glb", loop: true, speed: 0.25 };
function place(ctx, f) {
  return ctx.spawn(f.id, {
    tags: ["moths", "l5staff", "l5-hostile", "usable", "faceling"], feetPosition: { x: f.post.x, y: 0.02, z: f.post.z }, rotation: f.yaw,
    ...faceless(critterSpec(staffLook(f, T.figures.indexOf(f)))), scale: (f.height ?? 2.2) / 1.8,
    physics: { body: "character" },
    state: { ...npcState(ctx, "staff", T.hp, { xp: 80 }), kind: "staff", name: f.name, verb: "Look", info: f.info, mode: "post" },
  });
}
// a player looks at it: the camera's forward within the cone toward it
function watched(ctx, me, players) {
  for (const p of players) {
    const d = flat(p.feetPosition, me); if (d > 30) continue;
    const yaw = ((p.camera?.rotation?.yaw ?? p.rotation?.yaw ?? 0) * Math.PI) / 180, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    if ((fx * (me.x - p.feetPosition.x) + fz * (me.z - p.feetPosition.z)) / (d || 1) > COS) return p;
  }
  return null;
}
export function update(ctx, dt) {
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), hunt = prey(ctx, now), everyone = ctx.place.players;
  for (const f of T.figures) {
    const o = ctx.getObject(f.id);
    if (!o) { if (now >= (mem["re" + f.id] ?? 0)) { mem["re" + f.id] = now + 240000; if (mem["re" + f.id + "x"]) place(ctx, f); mem["re" + f.id + "x"] = true; } continue; }
    const m = (mem[f.id] ??= {}), pos = o.feetPosition, st = o.state, vy = (o.velocity?.y ?? 0) - 18 * dt;
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) { m.deadAt = now; o.anim.move = { clip: "cdn/clip-die.glb", clampWhenFinished: true }; o.velocity = { x: 0, y: vy, z: 0 }; ctx.emit("playSound", { clip: SND("hollow-sigh-fading-whisper-thank-you-for-staying"), position: pos, volume: 0.9 }); }
      if (!m.claimed) m.claimed = claimRemains(ctx, pos, `${f.name}'s uniform`, ["bobbypin", "battery", ctx.random() < 0.5 ? "kit" : "tape"], m.deadAt, now);
      if (m.claimed && now - m.deadAt > 4000) { ctx.destroy(f.id); delete mem[f.id]; mem["re" + f.id] = now + 240000; }
      continue;
    }
    let mode = "post", goal = null, sp = 0;
    const seer = watched(ctx, pos, everyone);
    let target = null, best = T.sense;
    for (const p of hunt) { const d = flat(p.feetPosition, pos); if (d < best && aloneOf(ctx, p, T.alone) && flat(p.feetPosition, f.post) < (T.leash ?? 16) && !AVOID.has(zoneId(p.feetPosition.x, p.feetPosition.z))) { best = d; target = p; } }
    if (seer) mode = "frozen";
    // stared at up close, it speaks: polite, hollow, never moving its blank face
    if (seer && flat(seer.feetPosition, pos) < 4 && now >= (m.spoke ?? 0)) { m.spoke = now + 20000; st.line = f.line; st.lineAt = now; ctx.emit("playSound", { clip: `/cdn/voice-faceling-${f.id.slice(9)}-saying-${f.line.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/ +/g, "-")}.mp3`, position: { ...pos, y: pos.y + 2 }, volume: 0.7, maxDistance: 10 }); }
    else if (target) { mode = "creep"; goal = target.feetPosition; sp = T.creep; }
    else if (flat(pos, f.post) > 0.3) { mode = "return"; goal = f.post; sp = T.home; }
    if (mode === "creep" && best < T.reach && now >= (m.strike ?? 0)) {
      m.strike = now + T.strikeEvery; mode = "strike";
      const at = hit(ctx, target, T.strike, "#ff2a2a");
      o.anim.move = { clip: "cdn/clip-attack.glb" }; m.anim = "strike";
      ctx.emit("playSound", { clip: SND("heavy-blunt-body-blow-thud"), position: at, volume: 1 });
      ctx.emit("screenShake", { intensity: 0.55, duration: 0.3 }, { audience: { player: target.id } });
      ctx.emit("cameraPunch", { direction: { x: target.feetPosition.x - pos.x, y: 0, z: target.feetPosition.z - pos.z }, intensity: 0.7 }, { audience: { player: target.id } });
      ctx.emit("screenFlash", { color: "#300000", duration: 0.25, intensity: 0.5 }, { audience: { player: target.id } });
    }
    if (mode === "strike" || now < (m.strike ?? 0) - T.strikeEvery + 900) { sp = 0; }
    let dx = 0, dz = 0;
    if (goal && sp) {
      // walk the hotel's halls, not through its walls: a path re-asked each second, its next corner the heading
      if (!m.path || now - (m.pathAt ?? 0) > 1000 || flat(m.pathGoal ?? goal, goal) > 1.5) { const r = findPath(ctx, { x: pos.x, y: pos.y ?? 0, z: pos.z }, { x: goal.x, y: goal.y ?? pos.y ?? 0, z: goal.z }); if (!r.partial) { m.path = r.points?.length ? r.points : null; m.pathAt = now; m.pathGoal = { ...goal }; } }
      let aim = goal; if (m.path) { while (m.path.length > 1 && flat(pos, m.path[0]) < 0.6) m.path.shift(); aim = m.path[0] ?? goal; }
      dx = aim.x - pos.x; dz = aim.z - pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      const nx = pos.x + dx * 0.6, nz = pos.z + dz * 0.6; if (isSafe(nx, nz) || (mode === "creep" && AVOID.has(zoneId(nx, nz)))) sp = 0;
    } else m.path = null;
    // never two in one spot: each steps off the others
    for (const g of T.figures) { if (g.id === f.id) continue; const q = ctx.getObject(g.id)?.feetPosition; if (!q) continue; const ex = pos.x - q.x, ez = pos.z - q.z, e = Math.hypot(ex, ez); if (e < (T.spread ?? 1.6) && e > 0.001) { const k = ((T.spread ?? 1.6) - e) / (T.spread ?? 1.6); dx += (ex / e) * k; dz += (ez / e) * k; if (!sp) sp = 0.8; } }
    o.velocity = { x: dx * sp, y: vy, z: dz * sp };
    if (mode === "creep" && sp) o.rotation = yawTo(dx, dz);
    else if (mode === "return" && sp) o.rotation = yawTo(dx, dz);
    else if (mode === "post") o.rotation = f.yaw;
    const want = sp ? "walk" : m.anim === "strike" && now < (m.strike ?? 0) - T.strikeEvery + 900 ? "strike" : mode === "frozen" ? "frozen" : "idle";
    if (want !== m.anim || (want !== "frozen" && !o.anim?.move)) { m.anim = want; o.anim.move = want === "walk" ? WALK : want === "idle" ? IDLE : want === "frozen" ? { ...IDLE, speed: 0 } : o.anim.move ?? null; }
    if (st.mode !== mode) st.mode = mode;
    if (mode === "creep" && now >= (m.whisper ?? 0)) { m.whisper = now + 6000 + ctx.random() * 6000; ctx.emit("playSound", { clip: SND(f.whisper), position: { ...pos, y: pos.y + 2 }, volume: 0.55, maxDistance: 14 }); }
  }
}
