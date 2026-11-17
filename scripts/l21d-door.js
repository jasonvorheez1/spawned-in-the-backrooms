// Level 21: one numbered door (the leaf is the thing you press). state: { kind, label, to?, name, verb, info, opened, yaw0, at: {x,z} hall-side point, h, k, rich?, back? }
// exit: crosses to a level. dark: the EXIT door, into the dark wing. back: the dark wing's way out. warp: throws you elsewhere
// in the level. closet / dead / nest: the leaf swings and what is behind it is there (the sim laid it in the niche).
import { animate } from "builtin/tween";
import { SHIFT_MS, warpTo, DW_ARRIVE, EXIT, C, SEG, at, yawOut } from "./lib/l21d-layout.js";
import { foeBody } from "./lib/l21d-body.js";
import D from "./lib/data/l21d.yml";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`, H = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
function swing(ctx, open) { const s = ctx.self.state; s.opened = open; s.verb = open ? "Close" : "Open"; animate(ctx, ctx.self, { "rotation.yaw": s.yaw0 + (open ? 104 : 0) }, { duration: open ? 0.55 : 0.4, easing: "easeOutCubic" });
  ctx.emit("playSound", { clip: G(open ? "old-apartment-door-latch-click-and-hinge-creak-open" : "wooden-door-close-thud-in-hallway"), position: ctx.self.feetPosition, volume: 0.7, maxDistance: 30 }); }
function note(ps, ctx, text) { ps.notice = { text, at: ctx.now() }; }
function count(ps, id, kind) { const L = (ps.l21d ??= { doors: 0, kinds: {}, ids: [] }); if ((L.ids ??= []).includes(id)) return; L.ids = [...L.ids.slice(-79), id]; L.doors = (L.doors ?? 0) + 1; L.kinds = { ...(L.kinds ?? {}), [kind]: ((L.kinds ?? {})[kind] ?? 0) + 1 }; }
function move(ctx, p, to, yaw) { p.velocity = { x: 0, y: 0, z: 0 }; p.feetPosition = { x: to.x, y: (to.y ?? 0) + 0.1, z: to.z }; if (yaw != null) p.rotation = { yaw }; ctx.emit("screenFlash", { color: "#000000", duration: 0.5, intensity: 1 }, { audience: { player: p.id } }); }
export const ears = {
  press: (ctx, m) => {
    const p = m?.by && ctx.getObject(m.by), ps = p?.state; if (!ps || ps.dead) return;
    const s = ctx.self.state, id = ctx.self.id, now = ctx.now();
    if (s.opened && (s.kind === "closet" || s.kind === "dead" || s.kind === "nest")) return swing(ctx, false);
    if (/^\d+$/.test(String(s.label ?? ""))) count(ps, id, s.kind);
    if (s.kind === "exit") { note(ps, ctx, s.label === "=)" ? "Music, somewhere behind it. You go through." : `Door ${s.label}. It opens on ${s.name}.`); ctx.emit("playSound", { clip: G("old-apartment-door-latch-click-and-hinge-creak-open"), volume: 0.7 }, { audience: { player: p.id } }); ps.l21dFrom = null; return void ctx.cross(p, s.to); }
    if (s.kind === "dark") { (ps.l21d ??= {}).dark = true; note(ps, ctx, "Three halls. No lights. Nothing in here moves the way the rest of it does."); ctx.emit("playSound", { clip: G("heavy-fire-door-push-bar-clunk-and-slow-close"), volume: 0.8 }, { audience: { player: p.id } }); return move(ctx, p, DW_ARRIVE, -90); }
    if (s.kind === "back") { const q = at(EXIT.h, C + EXIT.k * SEG + SEG / 2, 0); note(ps, ctx, "The hall again. The sign buzzes over your head."); return move(ctx, p, q, yawOut(EXIT.h) + 180); }
    if (s.kind === "warp") { const w = warpTo(s.h, s.k, Math.floor(now / SHIFT_MS)); ps.sanity = Math.max(0, (ps.sanity ?? 100) - 3);
      note(ps, ctx, s.label ? `Door ${s.label} opens on the same hall. A different stretch of it.` : "No number. You step through and the hall is behind you again, somewhere else.");
      ctx.emit("playSound", { clip: H("reality-tear-whoosh-and-ear-pressure-pop"), volume: 0.7 }, { audience: { player: p.id } }); return move(ctx, p, w, w.yaw); }
    swing(ctx, true);
    if (s.kind === "dead") return note(ps, ctx, "Bricked up from the inside.");
    if (s.kind === "closet") return note(ps, ctx, s.rich ? "Shelves. Somebody stocked these and never came back." : "A linen closet. Something left on the shelves.");
    if (s.kind === "nest") {
      if (now - (s.spentAt ?? -1e12) < D.nest.cooldownMin * 60000) return note(ps, ctx, "Empty. Scratches on the inside of the door.");
      s.spentAt = now; const K = D.kinds[s.rich ? "warden" : D.nest.kind], kind = s.rich ? "warden" : D.nest.kind, fid = "l21d-nest-" + id.replace(/[^a-z0-9]/gi, "");
      if (!ctx.getObject(fid)) ctx.spawn(fid, { tags: ["l21d", "l21d-foe", "l8-hostile", "l21d-" + kind], feetPosition: { x: s.at.x, y: 0.05, z: s.at.z }, physics: { body: "kinematic", collider: "capsule" }, castShadow: false, visibleRange: { max: 90 }, ...foeBody(kind),
        state: { hp: K.hp, maxHp: K.hp, name: K.name, kind, xp: K.xp, home: { x: s.at.x, z: s.at.z }, brain: K, hall: s.h, lane: s.lane, hunt: p.id, heardAt: { x: p.feetPosition.x, z: p.feetPosition.z, at: now } } });
      ctx.emit("playSound", { clip: H("creature-shriek-bursting-out-of-closet"), position: ctx.self.feetPosition, volume: 1, maxDistance: 60 }); ctx.emit("screenShake", { intensity: 0.4, duration: 0.3 }, { audience: { player: p.id } });
      return note(ps, ctx, "It was standing right behind the door.");
    }
  },
};
