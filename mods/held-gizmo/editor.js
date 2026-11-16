// ⚡ FeelsGoodRig ⚡ (Oct 25 creator: "can we give it a 1980's style rock n roll ui and call it \"FeelsGoodRig\"")
// Oct 25 creator: "can i adjust the mount point of guitar when duke is selected" / "could you make one??"
// Select a character in god mode. Chips: [children ▾] what to move: anything attached, or the left / right hand · [clip ▾] (hands) which of
// their animations this hand pose belongs to · [knob ▾] · [slider] · [freeze ▾] stop the body in any of their animations · [reset] · [keep].
// Held things also wear red/green/blue drag arrows. Hand poses live in the character's state.handPoses[clip][left|right]; routine.js lays them while that clip plays.
import { eulerFromRotation } from "builtin/vec3";
import { axisDragPress, axisDragSigned, rayToPlane } from "builtin/authoring";
import { rotate, rotationFromEuler } from "builtin/vec3";
// a held thing rides a bone: a world write is ignored there, so a world move becomes a local feetPosition move in its body's frame
// Oct 30 creator "maybe it would be better if the pinned hands to guns drag with the item again" / "that change altered the captain's holding position":
// on the grab, the pinned hand's grip is read off the hand where it is drawn now, so the hold never jumps; enemy.js rides it at rest from then on (pinGun.restHand)
function grabPinnedHands(ctx, obj, t) { return; /* Oct 30: enemy.js now catches the rest grip itself */ try { if (!/\/gun(\/mesh)?$/.test(String(t?.id ?? "")) || !obj?.state?.pinGun || obj.state?.pins?.right === false) return;
  const g = gunGripNow(ctx, obj, "mixamorig:RightHand", null); if (!g?.hin) { S.grabNote = "hand not caught (" + (BONES[obj.id]?.list ?? []).length + " bones read)"; return; } S.grabNote = "hand rides the gun";
  const gid = obj.id + "/gun", reach = { to: { object: gid, offset: g.hin.pos, rotation: g.hin.rot }, pole: { object: obj.id, offset: { x: 0.5, y: 0.45, z: -0.25 } }, weight: 1, blendIn: 0.05, blendOut: 0.1 };
  ctx.commit("grab " + obj.id + "'s gun with the hand on it", () => { obj.state.pinGun = { ...obj.state.pinGun, restHand: { right: g.hin } }; obj.bones = { ...(obj.bones ?? {}), "mixamorig:RightHand": { ...(obj.bones?.["mixamorig:RightHand"] ?? {}), reach } }; }); } catch (e) { S.grabNote = "grab failed: " + String(e?.message ?? e).slice(0, 60); } }
function moveHeld(t, w0, l0, d) {
  if (!t.attachment) { t.worldFeetPosition = { x: w0.x + d.x, y: w0.y + d.y, z: w0.z + d.z }; return; }
  const q = t.parent?.rotation ?? { x: 0, y: 0, z: 0, w: 1 }, qi = { x: -q.x, y: -q.y, z: -q.z, w: q.w ?? 1 };
  const v = rotate(qi, d); t.feetPosition = { x: l0.x + v.x, y: l0.y + v.y, z: l0.z + v.z };
}

// Oct 25 creator: "messy not showing buttons dead all of em": the panel's picks lived in module variables, which a re-run of the
// editor forgets, so every press reverted on the next frame. They live in this machine's session scratch now (module copy as fallback).
const MOD = { pick: null, knob: "x", hclip: null, open: true, snaps: {} };
function ui(ctx) { try { if (ctx.session) { ctx.session.feelsRig ??= { ...MOD, snaps: {} }; return ctx.session.feelsRig; } } catch (e) {} const g = globalThis; return (g.__feelsRig ??= MOD); }
let S = MOD;
const R2 = (v) => Math.round(v * 1000) / 1000;
// Oct 26 creator (release prep): any rigged character, either hand pinned, and a plain word when a rig has no fingers.
// The rig's bone list is read once per body (getObjectBones answers when the model is in) and kept in this machine's scratch.
function rigOf(ctx, S, id) { S.rigs ??= {}; const r = S.rigs[id]; if (r && r !== "wait") return r; if (r === "wait") return null; S.rigs[id] = "wait";
  try { Promise.resolve(ctx.getObjectBones(id)).then((b) => { const list = Array.isArray(b) ? b : []; const names = list.map((x) => x.name);
    const hand = (side) => names.find((n) => new RegExp("(^|[:_|])" + side + "Hand$", "i").test(n)) ?? null;
    S.rigs[id] = { names, list, left: hand("Left"), right: hand("Right"), fingers: names.some((n) => /Hand(Index|Middle|Ring|Pinky)1$/i.test(n)), thumbs: names.some((n) => /HandThumb1$/i.test(n)) }; }, () => { S.rigs[id] = { names: [], list: [], fingers: false, thumbs: false }; }); } catch (e) { S.rigs[id] = { names: [], list: [], fingers: false, thumbs: false }; }
  return null; }
const qi4 = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w ?? 1 });
const qm4 = (a, b) => ({ x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z });
// Oct 27 creator "make it so when you unpin a hand it holds its position": the hand's spot and turn now, in the body's own frame
const R4 = (v) => Math.round(v * 10000) / 10000;
// Oct 27 creator "still no unpin button?": the hold is worked out from bones read a moment ago (BONES), so the press writes it in its own commit
const BONES = {};
const watchBones = (ctx, id) => { const B = BONES[id], t = ctx.now?.() ?? 0; if (B?.busy || (B && t - B.at < 150)) return; BONES[id] = { ...(B ?? {}), busy: true, at: t };
  try { Promise.resolve(ctx.getObjectBones(id)).then((b) => { BONES[id] = { list: Array.isArray(b) ? b : Object.values(b ?? {}), at: ctx.now?.() ?? 0, busy: false }; }, () => { BONES[id] = { ...(BONES[id] ?? {}), busy: false }; }); } catch (e) { BONES[id] = { ...(BONES[id] ?? {}), busy: false }; } };
const handHoldNow = (obj, bn) => { const list = BONES[obj.id]?.list ?? []; const hb = list.find((x) => x.name === bn) ?? list.find((x) => x.name?.endsWith(bn.split(":").pop())); return hb ? holdFrom(obj, hb) : null; };
const holdFrom = (obj, hb) => { if (!hb?.currentWorldPosition) return null;
  const bp = obj.worldFeetPosition ?? obj.feetPosition, bq = (obj.worldRotation ?? obj.rotation)?.w != null ? (obj.worldRotation ?? obj.rotation) : { x: 0, y: 0, z: 0, w: 1 }, hp = hb.currentWorldPosition, sc = typeof obj.scale === "number" ? obj.scale : (obj.scale?.x ?? 1);
  const off = rotate(qi4(bq), { x: hp.x - bp.x, y: hp.y - bp.y, z: hp.z - bp.z }), hq = hb.currentWorldRotation, r = hq ? qm4(qi4(bq), hq) : null;
  if (![off.x, off.y, off.z].every(Number.isFinite)) return null;
  return { pos: { x: R4(off.x / sc), y: R4(off.y / sc), z: R4(off.z / sc) }, ...(r && [r.x, r.y, r.z, r.w].every(Number.isFinite) ? { rot: { x: R4(r.x), y: R4(r.y), z: R4(r.z), w: R4(r.w) } } : {}) }; };
const HKN = ["ax", "ay", "az", "fold", "elbow", "yaw", "pitch", "roll", "curl", "index", "middle", "ring", "pinky", "thumb", "thumbSide", "thumbIn"], HKL = { ax: "arm out/in", ay: "arm up/down", az: "arm fwd/back", fold: "elbow fold", elbow: "elbow in/out", efwd: "elbow fwd/back", yaw: "wrist turn", pitch: "wrist bend", roll: "wrist roll", curl: "finger curl", index: "index curl", middle: "middle curl", ring: "ring curl", pinky: "pinky curl", thumb: "thumb curl", thumbSide: "thumb left/right", thumbIn: "thumb in/out" }, KN = ["reach", "reachSide", "reachUp", "x", "y", "z", "yaw", "pitch", "roll", "size"];
// Oct 25 creator: "make as user friendly for someone who has no idea what they are doing": every knob says what it does in plain words
const KNL = { reach: "reach out/in (along barrel)", reachSide: "reach side to side (gun's left/right)", reachUp: "reach up/down (gun's top/bottom)", x: "slide left/right", y: "slide up/down", z: "slide fwd/back", yaw: "spin left/right (yaw)", pitch: "tilt up/down (pitch)", roll: "barrel roll (roll)", size: "size" };
const MIRROR_FLIP = ["yaw", "roll"]; // a wrist's turn and roll run the other way on the other hand; reach, fold, elbow and fingers already mirror in handBones
// Oct 25 creator: "custom icons for each button to indicate what they are for too pls": one painted set, chrome + hot pink + cyan neon
// Oct 25 creator: "cool posterized metallic graphic ui with shorthand text of what comes up when u hover": chrome poster badges, pink/cyan rim
const TIP_ICON = "/cdn/value.fdec9a2ee6dd935948aa429bd889b58dc13a42febd13ecc21575cc2b006de50d.png";
export const ICON = { copy: "/cdn/value.c129e6009c453a86ea50e87469dd570789fb3f289ee01081e7c815538dea9bf4.png", paste: "/cdn/value.fb2d0ae58c5b2fefc63514f160daf65716787998740afaa8793c0bbdc5262b28.png", mirror: "/cdn/value.728cb96356fb1256c97d5897358d42df4c1c15560359a3022aad6488fae5e414.png", arm: "/cdn/value.1cb4bb1aed5cee1ac0348d0aafc99beba74ad7217612341826fcd9cfceb4061a.png", pick: "/cdn/value.08cf19db81038132d71260da4462007f9922f97fa5e80e8d26801d39f4b7e7e9.png", clip: "/cdn/value.94f8f5924d8a007f8016984927713a89b81ff577d1f2758fc1c397037e2aebbd.png", knob: "/cdn/value.937eb808f9ceb0c0462267784ef6e3129f6d9f52300b7babd07c7ab29dbbdfca.png", slider: "/cdn/value.dcc9e07532bd7ead6bddc3ffe049d91d64cb32bbb7cb30ab6d7330add9c63f07.png", freeze: "/cdn/value.f55f2ffd092a72993df18fd0e05fe92d12db7ecd4784a050841094a0c2530278.png", reset: "/cdn/value.b60249d650bdbd7acdd636648a701b04471645e02502cf71e8245c1dfabc0325.png", redo: "/cdn/value.588d95324cfeba894435a91f8aa0430e5032faf5853b351512dabcb8abafb6d7.png", keep: "/cdn/value.8d26f89c5e8885291ad400fdb7247ca3b514b9582af5ba03b35a2d4d24d49cc6.png", fold: "/cdn/value.a32633fa24d3b101871d10f47af7e584d1c0e00a022b350e94c7b824aa92d48b.png" };
const FING = ["Index", "Middle", "Ring", "Pinky"];
const clipRef = (c) => typeof c === "string" ? c : (c?.clip && typeof c.clip === "string" ? c.clip : null);
const clipName = (c) => (c ?? "none").split("/").pop().replace(/^clip-/, "").replace(/\.glb.*$/, "").replace(/-[0-9a-f]{8}$/, "").slice(0, 26);
// a hand pose → bone offsets, written under both rig namings (mixamorig: and bare)
// Oct 27 creator "when i hit pin hand it resets hand position?": the gun's spot in the body's frame and the right hand's grip in the gun's frame, read off the bones now
// (the hand's arm out/up/fwd sliders slide the grip, so they're taken back out here and still work after)
// Oct 27 creator "why did pinning his arm in a good position move it?": a held (unpinned) right hand is pinned from the spot its hold aims at,
// not a bone read, and the elbow pole carries over, so the pinned hand and arm land exactly where the held ones stood
const gunGripFromHold = (ctx, obj, h, hb) => { const g = ctx.getObject(obj.id + "/gun"), gf = g?.feetPosition, gq = g?.localRotation; if (!h?.pos || !gf || gq?.w == null) return null;
  const k = 0.003, b0 = h.base ?? {}, d = {}; for (const q of ["ax", "ay", "az", "elbow", "efwd", "yaw", "pitch", "roll"]) d[q] = (hb?.[q] ?? 0) - (b0[q] ?? 0);
  const pos = { x: h.pos.x - d.ax * k, y: h.pos.y + d.ay * k, z: h.pos.z - d.az * k };
  d.fold = (hb?.fold ?? -55) - (b0.fold ?? -55); if (d.fold) { const sh = { x: 0.18, y: 1.42, z: 0 }, v = { x: pos.x - sh.x, y: pos.y - sh.y, z: pos.z - sh.z }, L = Math.hypot(v.x, v.y, v.z) || 1, L2 = Math.min(0.62, Math.max(0.12, L + d.fold * 0.004)); pos.x = sh.x + v.x / L * L2; pos.y = sh.y + v.y / L * L2; pos.z = sh.z + v.z / L * L2; } // the same bend the held hand shows (m4-capt foldIn)
  const turn = (d.yaw || d.pitch || d.roll) ? rotationFromEuler({ yaw: d.yaw, pitch: d.pitch, roll: d.roll }) : null, rot = h.rot ? (turn ? qm4(h.rot, turn) : h.rot) : null; if (!rot) return null;
  const rel = rotate(qi4(gq), { x: pos.x - gf.x, y: pos.y - gf.y, z: pos.z - gf.z }), hr = qm4(qi4(gq), rot);
  const hp = { x: R4(rel.x + (hb?.ax ?? 0) * k), y: R4(rel.y - (hb?.ay ?? 0) * k), z: R4(rel.z + (hb?.az ?? 0) * k) };
  const all = [gf.x, gf.y, gf.z, gq.x, gq.y, gq.z, gq.w, hp.x, hp.y, hp.z, hr.x, hr.y, hr.z, hr.w]; if (!all.every(Number.isFinite)) return null;
  return { pg: { fp: { x: R4(gf.x), y: R4(gf.y), z: R4(gf.z) }, rot: { x: R4(gq.x), y: R4(gq.y), z: R4(gq.z), w: R4(gq.w) }, hin: { pos: hp, rot: { x: R4(hr.x), y: R4(hr.y), z: R4(hr.z), w: R4(hr.w) } } }, elbow: -d.elbow, efwd: d.efwd || 0, fold: -55 }; };
const gunGripNow = (ctx, obj, bn, hb) => { const list = BONES[obj.id]?.list ?? [], b = list.find((x) => x.name === bn) ?? list.find((x) => x.name?.endsWith(bn.split(":").pop()));
  const g = ctx.getObject(obj.id + "/gun"); if (!b?.currentWorldPosition || !b.currentWorldRotation || !g) return null;
  const bp = obj.worldFeetPosition ?? obj.feetPosition, bq = (obj.worldRotation ?? obj.rotation)?.w != null ? (obj.worldRotation ?? obj.rotation) : { x: 0, y: 0, z: 0, w: 1 }, sc = typeof obj.scale === "number" ? obj.scale : (obj.scale?.x ?? 1);
  const gw = g.worldFeetPosition, r0 = (g.worldRotation ?? g.rotation), gq = r0?.w != null ? r0 : r0 && Number.isFinite(r0.yaw ?? r0.pitch ?? r0.roll) ? rotationFromEuler({ yaw: r0.yaw ?? 0, pitch: r0.pitch ?? 0, roll: r0.roll ?? 0 }) : null; if (!gw || !gq) return null; // Oct 30: a gun whose turn reads as angles still gives its grip
  const lf = rotate(qi4(bq), { x: gw.x - bp.x, y: gw.y - bp.y, z: gw.z - bp.z }), lr = qm4(qi4(bq), gq);
  const hp = b.currentWorldPosition, ho = rotate(qi4(gq), { x: hp.x - gw.x, y: hp.y - gw.y, z: hp.z - gw.z }), hr = qm4(qi4(gq), b.currentWorldRotation), k = 0.003;
  const pos = { x: R4(ho.x / sc + (hb?.ax ?? 0) * k), y: R4(ho.y / sc - (hb?.ay ?? 0) * k), z: R4(ho.z / sc + (hb?.az ?? 0) * k) };
  const all = [lf.x, lf.y, lf.z, lr.x, lr.y, lr.z, lr.w, pos.x, pos.y, pos.z, hr.x, hr.y, hr.z, hr.w]; if (!all.every(Number.isFinite)) return null;
  return { fp: { x: R4(lf.x / sc), y: R4(lf.y / sc), z: R4(lf.z / sc) }, rot: { x: R4(lr.x), y: R4(lr.y), z: R4(lr.z), w: R4(lr.w) }, hin: { pos, rot: { x: R4(hr.x), y: R4(hr.y), z: R4(hr.z), w: R4(hr.w) } } }; };
// Oct 27 creator "trying to adjust tommy now, it resets pose when i move pinned hands": a slider rebuilt bones from gripBones + hand sliders alone, wiping a frozen double's
// body pose and every pinned hand's reach. A row with state.baseBones keeps that pose and the sliders add onto it; a hand already riding a reach keeps it
// Nov 11 creator "pls make it so poses don't get reset when a slider is touched" + "and whole body resets": a row posed by the gizmo or its own script (no baseBones yet) lost that whole pose to the first slider.
// Before a slider writes, what the body wears now (minus the sliders' own part, minus reaches) becomes its base, so every slider adds onto the pose it is in
export function keepBase(o, prev) { if (!o || o.state?.gripBones) return; const cur = o.bones ?? {}, hb = prev ? handBones(prev) : {}, base = {};
  for (const [k, v] of Object.entries(cur)) { if (!v || v.reach || !k.includes(":")) continue; const h = hb[k], m = {};
    for (const [f, n] of Object.entries(v)) m[f] = typeof n === "number" && typeof h?.[f] === "number" ? Math.round((n - h[f]) * 1e4) / 1e4 : n;
    if (Object.values(m).some((n) => typeof n !== "number" || Math.abs(n) > 1e-4)) base[k] = m; }
  const had = o.state?.baseBones; if (!Object.keys(base).length) { if (!had) return; } if (JSON.stringify(had ?? null) === JSON.stringify(base)) return;
  o.state.baseBones = Object.keys(base).length ? base : undefined; if (!Object.keys(base).length) delete o.state.baseBones; }
export function composeBones(o, p) { const gb = o.state?.gripBones, bb = o.state?.baseBones, add = !gb && !!bb, out = { ...(gb ?? bb ?? {}) };
  for (const [k, v] of Object.entries(p ? handBones(p) : {})) { if (add && !k.includes(":")) continue; if (add && out[k] && !out[k].reach) { const m = { ...out[k] }; for (const [f, n] of Object.entries(v)) m[f] = (typeof m[f] === "number" ? m[f] : 0) + n; out[k] = m; } else if (!out[k]?.reach) out[k] = v; }
  for (const [k, v] of Object.entries(o.bones ?? {})) if (v?.reach) out[k] = v;
  // Nov 9 creator "why isnt wrist bend slider working": a hand let go (held in place on the body) kept its frozen turn; the wrist sliders now turn it from where it was let go
  for (const [side, S] of [["left", "Left"], ["right", "Right"]]) { const h = o.state?.holds?.[side], c = p?.[side], bn = "mixamorig:" + S + "Hand", v = out[bn];
    if (!h?.rot || !c || !v?.reach || v.reach.to?.object !== o.id) continue; const b0 = h.base ?? {}, dy = (c.yaw ?? 0) - (b0.yaw ?? 0), dp = (c.pitch ?? 0) - (b0.pitch ?? 0), dr = (c.roll ?? 0) - (b0.roll ?? 0);
    const rot = dy || dp || dr ? qm4(h.rot, rotationFromEuler({ yaw: dy, pitch: dp, roll: dr })) : h.rot;
    out[bn] = { ...v, reach: { ...v.reach, to: { ...v.reach.to, rotation: { x: R4(rot.x), y: R4(rot.y), z: R4(rot.z), w: R4(rot.w) } } } }; }
  return Object.keys(out).length ? out : null; }
export function handBones(poses) {
  const out = {};
  for (const side of ["left", "right"]) { const h = poses?.[side]; if (!h) continue; const S = side === "left" ? "Left" : "Right";
    const put = (b, v) => { out["mixamorig:" + b] = v; out[b] = v; };
    // Oct 25 creator: "moving hands around on xyz axis to move arms ... outward or inward around objects": the hand's reach swings shoulder + upper arm, bends the elbow
    const m = side === "left" ? 1 : -1, ax = h.ax ?? 0, ay = h.ay ?? 0, az = h.az ?? 0, el = h.elbow ?? 0, fo = h.fold ?? 0, ef = h.efwd ?? 0;
    if (ax || ay || az || fo || el || ef) { put(S + "Shoulder", { roll: m * ax * 0.2 }); put(S + "Arm", { roll: m * (ax * 0.8 + el), pitch: -ay - ef, yaw: m * (az - el * 0.6) }); put(S + "ForeArm", { pitch: -fo + ef * 0.8, yaw: m * el * 0.4 }); } // el (Oct 25 "add elbow in/out"): the elbow swings out from the ribs while the twist turns the forearm back so the hand holds near its spot // fold: the forearm swings up toward the shoulder, the other hinge from bend
    put(S + "Hand", { yaw: h.yaw ?? 0, pitch: h.pitch ?? 0, roll: h.roll ?? 0 });
    for (const f of FING) [1, 1.2, 0.8].forEach((k, i) => put(S + "Hand" + f + (i + 1), { roll: -((h.curl ?? 0) + (h[f.toLowerCase()] ?? 0)) * k })); // index: Oct 27 creator "index finger curl slider", on top of curl
    [1, 1, 0.8].forEach((k, i) => put(S + "HandThumb" + (i + 1), i === 0 && (h.thumbSide || h.thumbIn) ? { roll: -(h.thumb ?? 0) * k, yaw: (side === "left" ? 1 : -1) * (h.thumbSide ?? 0), pitch: h.thumbIn ?? 0 /* Oct 27 creator: "add thumb in/out" */ } : { roll: -(h.thumb ?? 0) * k })); } // thumbSide (Oct 26 "add thumb left/right"): the thumb's root swings across the palm or out, mirrored per hand
  return out;
}
function kids(ctx, obj) {
  // the body's own children list, a level down (query no longer returns child rows)
  const out = [], walk = (o, d) => { for (const k of (o?.children ?? [])) { const id = k?.id ?? k; if (typeof id !== "string" || /(^|\/)__/.test(id)) continue; out.push(id); if (d < 2) walk(ctx.getObject(id), d + 1); } };
  walk(obj, 0); return out.filter((id) => id !== obj.id);
}
function activeClip(o) { // the channel that shows: an override freeze, else the heaviest
  const a = o.anim ?? {}; let best = null, w = -1;
  for (const ch of Object.keys(a)) { const c = a[ch]; const r = clipRef(c?.clip ?? c); if (!r || ch === "toes") continue; const ww = ch === "giz" ? 1e9 : (c.weight ?? 1); if (ww > w) { w = ww; best = r; } }
  return best;
}
function clipsOf(o) { const s = new Set(); const a = o.anim ?? {};
  for (const ch of Object.keys(a)) { const r = clipRef(a[ch]?.clip); if (r && ch !== "toes" && ch !== "giz") s.add(r); }
  if (o.state?.clip) s.add(o.state.clip); for (const c of o.state?.giz?.seen ?? []) s.add(c);
  for (const c of Object.keys(o.state?.handPoses ?? {})) s.add(c);
  return [...s];
}
function items(ctx, obj) { return kids(ctx, obj).filter((id) => !/(^|\/)(player|c_actor:|pa_|__)/.test(id) && ctx.getObject(id)?.attachment); }
const itemKey = (id) => (id.split("/").pop().split(/[-_]/).pop() || id).toLowerCase(); // duke-guitar / jimmy-guitar → "guitar"
function dirty(ctx, obj, snaps) { const s = snaps[obj.id]; if (!s) return false;
  if (JSON.stringify(s.poses) !== JSON.stringify(obj.state?.handPoses ?? {})) return true;
  for (const id in s.k) { const t = ctx.getObject(id), b = s.k[id]; if (!t) continue; const f = t.feetPosition ?? {};
    if (Math.abs((f.x ?? 0) - (b.fp.x ?? 0)) + Math.abs((f.y ?? 0) - (b.fp.y ?? 0)) + Math.abs((f.z ?? 0) - (b.fp.z ?? 0)) > 0.002) return true;
    const e = t.localRotation ? eulerFromRotation(t.localRotation) : null; if (e && b.rot && Math.abs(e.yaw - b.rot.yaw) + Math.abs(e.pitch - b.rot.pitch) + Math.abs(e.roll - b.rot.roll) > 0.5) return true; }
  return false; }
// the next step in plain words, on the RIG chip
function hint(ctx, obj) { const p = S.pick;
  if (S.clip && S.clip.from !== obj.id) return "PASTE puts " + S.clip.name + "'s pose here";
  if (p === "@left" || p === "@right") return "pick a knob, slide it, then SAVE";
  if (p) return "drag the arrows or the pad, then SAVE";
  return "pick a hand or an item"; }
// Nov 8: what a body holds in its right hand, keyed by the item's name (a child riding the RightHand bone; a /mesh child counts as its parent)
function heldOf(ctx, obj) { for (const o of kids(ctx, obj).map((id) => ctx.getObject(id)).filter(Boolean)) { /* Nov 9: own children only, never the whole city census (it held the pin commit) */ if (o?.parent?.id !== obj.id || !/RightHand$/.test(String(o.attachment?.bone ?? ""))) continue; const key = o.id.split("/").pop(); return { obj: o, key }; } return null; }
const qmul = (a, c) => ({ w: a.w * c.w - a.x * c.x - a.y * c.y - a.z * c.z, x: a.w * c.x + a.x * c.w + a.y * c.z - a.z * c.y, y: a.w * c.y - a.x * c.z + a.y * c.w + a.z * c.x, z: a.w * c.z + a.x * c.y - a.y * c.x + a.z * c.w });
const qinv = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w }), qrot = (q, v) => { const r = qmul(qmul(q, { x: v.x, y: v.y, z: v.z, w: 0 }), qinv(q)); return { x: r.x, y: r.y, z: r.z }; };
const Q = (r) => r?.w != null ? r : { x: 0, y: 0, z: 0, w: 1 }, R3 = (n) => Math.round(n * 1000) / 1000;
// Nov 8 creator "does it copy pinning too?": both hands' finger bones as they stand now (the finger sliders), by side + finger + joint
function fingersOf(obj) { const b = obj.bones ?? {}, out = {}; for (const [k, v] of Object.entries(b)) { const m = /(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([1-3])$/.exec(k); if (m && v && !v.reach) out[m[1] + m[2] + m[3]] = v; } return Object.keys(out).length ? out : null; }
// the left hand's reach target, turned into the held item's own frame: { grip, rot }
function gripOf(obj, held) { const b = obj.bones ?? {}, L = b["mixamorig:LeftHand"] ?? b.LeftHand, to = L?.reach?.to; if (!to?.offset) return null;
  const tgt = to.object === obj.id ? obj : to.object === held.id ? held : null; if (!tgt) return null;
  const tp = tgt.worldFeetPosition ?? tgt.feetPosition, tq = Q(tgt.worldRotation), hp = held.worldFeetPosition ?? held.feetPosition, hq = Q(held.worldRotation);
  const o = qrot(tq, to.offset), w = { x: tp.x + o.x - hp.x, y: tp.y + o.y - hp.y, z: tp.z + o.z - hp.z }, g = qrot(qinv(hq), w);
  const rot = to.rotation?.w != null ? qmul(qinv(hq), qmul(tq, to.rotation)) : null;
  return { grip: { x: R3(g.x), y: R3(g.y), z: R3(g.z) }, ...(rot ? { rot: { x: R3(rot.x), y: R3(rot.y), z: R3(rot.z), w: R3(rot.w) } } : {}) }; }

export function editor(ctx, obj) {
  if (!obj) return;
  S = ui(ctx); const snaps = S.snaps;
  // Oct 26 creator: "an undo button would help": every hand tweak, mirror, reset, pin and pinned-gun save leaves a step; STEP BACK walks them back, 30 deep
  const CL = (v) => v == null ? null : JSON.parse(JSON.stringify(v));
  const snapNow = (o) => { const g = ctx.getObject(o.id + "/gun"), q = g?.localRotation; /* Oct 28 creator "slide up/down breaks my m4 positioning and undo doesnt set it back": every held piece (gun and its mesh too) is in the step, in its parent's frame */
    const kk = {}; for (const id of kids(ctx, o)) { const t = ctx.getObject(id); if (!t) continue; const r = t.localRotation; kk[id] = { fp: { ...(t.feetPosition ?? {}) }, rot: r ? { x: r.x, y: r.y, z: r.z, w: r.w } : null, sc: t.scale ?? null }; }
    return { wholds: CL(ctx.world.state?.heldGizmo?.holds ?? null), poses: CL(o.state?.handPoses ?? {}), pins: CL(o.state?.pins ?? null), pinGun: CL(o.state?.pinGun ?? null), gun: g ? { fp: { ...(g.feetPosition ?? {}) }, rot: q ? { x: q.x, y: q.y, z: q.z, w: q.w } : null } : null, k: kk }; };
  const remember = (o, throttle) => { const st = (S.steps ??= {})[o.id] ??= [], at = (S.stepAt ??= {}), now = ctx.now(); const quick = throttle && now - (at[o.id] ?? 0) < 1500; at[o.id] = now; if (quick) return; st.push(snapNow(o)); if (st.length > 30) st.shift(); if (S.redo) delete S.redo[o.id]; };
  // Oct 26 creator "pls add a redo button to mod too lol": STEP BACK and UNDO changes each leave a redo; REDO lays it back. A new edit clears the redo trail
  const fullNow = (o) => ({ fp: { ...(o.worldFeetPosition ?? o.feetPosition) }, rot: CL((o.worldRotation ?? o.rotation)), bones: CL(o.bones ?? null), poses: CL(o.state?.handPoses ?? {}), pins: CL(o.state?.pins ?? null), pinGun: CL(o.state?.pinGun ?? null), k: Object.fromEntries(kids(ctx, o).map((id) => ctx.getObject(id)).filter(Boolean).map((t) => [t.id, { fp: { ...(t.feetPosition ?? {}) }, rot: CL(t.rotation), sc: t.scale ?? null }])) });
  const pushRedo = (o, r) => { const q = (S.redo ??= {})[o.id] ??= []; q.push(r); if (q.length > 30) q.shift(); };
  const redo = (o) => { const q = S.redo?.[o.id]; if (!q?.length) return; const r = q.pop();
    if (r.kind === "step") { ((S.steps ??= {})[o.id] ??= []).push(snapNow(o)); applyStep(o, r.snap, "redo"); return; }
    const f = r.full; ctx.commit("redo " + (o.state?.name ?? o.id) + "'s rig", () => { o.state.handPoses = f.poses; if (f.pins) o.state.pins = f.pins; else delete o.state.pins; if (f.pinGun) o.state.pinGun = f.pinGun; else delete o.state.pinGun; });
    o.worldFeetPosition = f.fp; if (f.rot != null) o.rotation = f.rot; o.bones = f.bones;
    for (const id in f.k) { const t = ctx.getObject(id), b = f.k[id]; if (!t) continue; t.feetPosition = b.fp; if (b.rot) t.rotation = b.rot; if (b.sc != null) t.scale = b.sc; }
    if (r.snap) snaps[o.id] = r.snap; };
  const stepBack = (o) => { const st = S.steps?.[o.id]; if (!st?.length) return; const b = st.pop(); pushRedo(o, { kind: "step", snap: snapNow(o) }); applyStep(o, b, "step back"); };
  const applyStep = (o, b, verb) => {
    ctx.commit(verb + " " + (o.state?.name ?? o.id) + "'s rig", () => { if ("wholds" in b) { const g = { ...(ctx.world.state.heldGizmo ?? {}) }; if (b.wholds) g.holds = b.wholds; else delete g.holds; ctx.world.state.heldGizmo = g; } /* Nov 8 creator: step back undoes a copy to all players too */ o.state.handPoses = b.poses; if (b.pins) o.state.pins = b.pins; else delete o.state.pins; if (b.pinGun) o.state.pinGun = b.pinGun; else delete o.state.pinGun; });
    const g = ctx.getObject(o.id + "/gun"); if (g && b.gun) { g.feetPosition = b.gun.fp; if (b.gun.rot) g.rotation = b.gun.rot; } for (const id in (b.k ?? {})) { const t = ctx.getObject(id), v = b.k[id]; if (!t) continue; t.feetPosition = v.fp; if (v.rot) t.rotation = v.rot; if (v.sc != null) t.scale = v.sc; }
    const c = activeClip(o), pp = b.poses?.[c]; o.bones = composeBones(o, pp); };
  const list = kids(ctx, obj);
  const beh = [].concat(obj.behavior ?? []).join(" ");
  const isBody = !obj.parent?.id && !!(obj.model || obj.state?.gripBones || obj.state?.handPoses || obj.state?.clip || /routine|enemy|feels|player|jev|npc|crowd/.test(beh) || (obj.tags ?? []).some((t) => /npc|cast|crowd|enemy|player/.test(t))); // a character, never a stage
  const opts = [...list, ...(isBody ? ["@left", "@right", "@body"] : [])]; // Nov 1 creator "add a selector for feels himself in the spot where you pick l r hand and item": @body slides and turns the whole character
  if (!opts.length && obj.parent?.id) opts.push(obj.id); // the held thing itself selected
  if (!opts.length) return;
  if (!S.pick || !opts.includes(S.pick)) S.pick = opts[0];
  const bodyName = String(obj.state?.name ?? (/zip-dummy|feels/i.test(obj.id) ? "Feels" : "body"));
  const name = (id) => id === "@left" ? "left hand" : id === "@right" ? "right hand" : id === "@body" ? bodyName : id.split("/").pop();
  if (isBody && !snaps[obj.id]) { // remember how it stood, for reset
    const k = {}; for (const id of list) { const t = ctx.getObject(id); if (t) k[id] = { fp: { ...(t.feetPosition ?? {}) }, rot: t.localRotation ? eulerFromRotation(t.localRotation) : null, sc: t.scale }; }
    snaps[obj.id] = { fp: { ...(obj.worldFeetPosition ?? obj.feetPosition) }, rot: obj.rotation, bones: obj.bones ?? null, poses: JSON.parse(JSON.stringify(obj.state?.handPoses ?? {})), k };
  }
  const now = activeClip(obj);
  // Oct 25 creator: "a button to minimize the hud again too": one chip folds the whole rig away and back
  ctx.authoring.handle({ id: "held-fold", at: "action", compact: true, iconUrl: ICON.fold, icon: "chevron", label: S.open ? "RIG ▾" : "RIG ▸", stateText: S.open ? hint(ctx, obj) : "open the rig", active: S.open, click: () => { S.open = !S.open; } });
  if (!S.open) return;
  // remember every clip seen on the body, so the menus list them all as the routine cycles
  if (isBody && now && !(obj.state?.giz?.seen ?? []).includes(now)) { const g = obj.state.giz ?? {}; obj.state.giz = { ...g, seen: [...(g.seen ?? []), now].slice(-12) }; }
  // Oct 25 creator: "a button to open up a list of all attached children ... and then whatever is selected is what the sliders apply to" (+ left and right hand)
  // Oct 25 creator: "pls simplify the ui for the selecting hands and children button": no dropdown, one plain button per thing,
  // the picked one lit: L hand · R hand · each held thing by its short name
  const short = (id) => !id ? "pick" : id === "@left" ? "L hand" : id === "@right" ? "R hand" : id === "@body" ? bodyName.toUpperCase().slice(0, 12) : id.split("/").pop().replace(/[-_]+/g, " ").replace(/\b(held|prop|child)\b/g, "").trim().slice(0, 12) || "item";
  // one chip: tap it, pick from a short plain list (hands first)
  const real = opts.filter((o) => o[0] === "@" || !/(^|\/)(player|c_actor:|pa_|__)/.test(o)); // a player body riding along is no held thing
  const order = [...real.filter((o) => o[0] === "@"), ...real.filter((o) => o[0] !== "@")];
  if (!order.includes(S.pick)) S.pick = order[0];
  ctx.authoring.handle({ id: "held-pick", at: "action", compact: true, iconUrl: ICON.pick, icon: S.pick?.[0] === "@" ? "hand" : "box", label: short(S.pick),
    menu: { items: order, active: S.pick, render: (_a, id) => short(id), apply: (id) => { S.pick = id; } } });
  const hand = S.pick === "@left" ? "left" : S.pick === "@right" ? "right" : null;
  // Oct 26 creator: "when i adjust captains hand it took m4 out of it i want to adjust while he holds to set a good position for all characters holding m4":
  // a rifle carrier's hands save under "@<gun>" in its own handPoses, which enemy.js lays over its two-handed hold
  const RG = obj.state?.heldGun, RK = RG ? "@" + RG : null;
  const HP = () => obj.state?.handPoses ?? {}; // Oct 26 creator: "dont make it always set for every holder jsut when i ask you to": this body's own; a copy to every holder is Savi's, on ask (world.state.gunRig.hands)
  const HPset = (a) => { obj.state.handPoses = a; };
  let sl;
  if (hand) { S.view = { who: String(obj.state?.name ?? obj.id), pick: hand + " hand", knob: HKL[S.knob] ?? S.knob, clip: clipName(S.hclip ?? "any"), hand, at: ctx.now?.() ?? 0 };
    const clips = RK ? [RK] : clipsOf(obj); if (!S.hclip || !clips.includes(S.hclip)) S.hclip = RK ?? now ?? clips[0] ?? "any";
    const RIG = rigOf(ctx, S, obj.id), noF = RIG && !RIG.fingers, noT = RIG && !RIG.thumbs;
    // Oct 27 creator "pls make the pin button more obvious": the pin is the first, full-size chip of a picked hand
    // Oct 26 creator: "pin a hand position to a gun so the hand and arm move automatically with a gun pinned to it when repositioned"
    // Oct 26 creator: "pin a hand position to a gun so the hand and arm move automatically with a gun pinned to it when repositioned"; release: either hand, any held thing
    const HN = hand === "left" ? "L" : "R";
    watchBones(ctx, obj.id);
    if (RK) { const on = !!(obj.state?.pins?.[hand] ?? (hand === "left")); // a rifle's left hand rides the foregrip unless unpinned
      // Oct 27 creator "relabel pin hand to gun, make it pin only": PIN only ever pins (greyed once pinned); UNPIN is its own button, shown only on a pinned hand
      const rkFlip = (on) => { remember(obj); const bn = "mixamorig:" + (hand === "left" ? "Left" : "Right") + "Hand";
          // Oct 27 creator "still no unpin button?": the hand's spot is caught on the press and lands in the same commit as the unpin
          const h = on ? handHoldNow(obj, RIG?.[hand] ?? bn) : null;
          // Oct 27 creator "when i hit pin hand it resets hand position?": pinning the right hand catches the gun where it stands and the hand's spot on it, so nothing jumps
          const hbR = (obj.state?.handPoses ?? {})[RK]?.right, fh = !on && hand === "right" && obj.state?.holds?.right?.pos ? gunGripFromHold(ctx, obj, obj.state.holds.right, hbR) : null;
          const pg = fh?.pg ?? (!on && hand === "right" ? gunGripNow(ctx, obj, RIG?.[hand] ?? bn, hbR) : null);
          ctx.commit((on ? "unpin " : "pin ") + obj.id + "'s " + hand + " hand to the gun", () => { obj.state.pins = { ...(obj.state?.pins ?? {}), [hand]: !on }; if (on && hand === "right") delete obj.state.pinGun; if (pg) obj.state.pinGun = pg;
            if (fh) { const P = { ...(obj.state?.handPoses ?? {}) }; P[RK] = { ...(P[RK] ?? {}), right: { ...(P[RK]?.right ?? {}), elbow: fh.elbow, efwd: fh.efwd, fold: fh.fold } }; obj.state.handPoses = P; } // the elbow pole stays where it was
            if (on && h) { const c = (obj.state?.handPoses ?? {})[RK]?.[hand] ?? {}, base = {}; for (const q of ["ax", "ay", "az", "elbow", "efwd", "yaw", "pitch", "roll", "fold"]) if (c[q]) base[q] = c[q]; obj.state.holds = { ...(obj.state?.holds ?? {}), [hand]: { ...h, ...(Object.keys(base).length ? { base } : {}) } }; }
            if (!on) { const H = { ...(obj.state?.holds ?? {}) }; delete H[hand]; if (Object.keys(H).length) obj.state.holds = H; else delete obj.state.holds; } }); };
      ctx.authoring.handle({ id: "held-pin", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: on ? "📌 " + HN + " HAND PINNED" : "📌 PIN " + HN + " HAND", tooltip: on ? "this hand is already pinned to the gun" : "pin this hand to the gun: the hand and arm follow the gun when you move it", active: on, disabled: on, persistProperties: ["state"], click: () => { if (!on) rkFlip(false); } });
      if (on) ctx.authoring.handle({ id: "held-unpin", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: "UNPIN " + HN + " HAND (holds its spot)", tooltip: "let this hand go from the gun: it stays where it is, then pose it with the sliders", persistProperties: ["state"], click: () => rkFlip(true) }); }
    else { const item = order.find((o) => o[0] !== "@"), cur = obj.state?.pins?.[hand], on = !!cur && typeof cur === "object";
      const itFlip = (on) => { remember(obj); const bn = RIG?.[hand]; if (!bn) return;
          if (on) { const h = handHoldNow(obj, bn); /* Nov 9 creator "pinning hands to the nice gun still does nothing": a commit queued after the press (a .then) lands after the one-shot closes and writes nothing; the press reads the bones cached a moment ago and commits at once */ ctx.commit("unpin " + obj.id + "'s " + hand + " hand", () => { const p = { ...(obj.state.pins ?? {}) }; delete p[hand]; obj.state.pins = p; const b = { ...(obj.bones ?? {}) };
            if (h) { b[bn] = { reach: { to: { object: obj.id, offset: h.pos, ...(h.rot ? { rotation: h.rot } : {}) }, weight: 1, blendIn: 0.1, blendOut: 0.1 } }; const cw = (obj.state?.handPoses ?? {})[S.hclip]?.[hand] ?? {}; obj.state.holds = { ...(obj.state?.holds ?? {}), [hand]: { ...h, base: { yaw: cw.yaw ?? 0, pitch: cw.pitch ?? 0, roll: cw.roll ?? 0 } } }; } else delete b[bn];
            obj.bones = Object.keys(b).length ? b : null; }); return; }
          { const list = BONES[obj.id]?.list ?? [], hb = list.find((x) => x.name === bn) ?? list.find((x) => x.name?.endsWith(bn.split(":").pop())), t = ctx.getObject(item); if (!hb || !t) { watchBones(ctx, obj.id); return; }
            /* Nov 9: the item's WORLD turn (a gun riding a chest bone has a local rotation that is not its turn in the world), and the hand's own turn rides the pin too */
            const tp = t.worldFeetPosition ?? t.feetPosition, tq = t.worldRotation ?? t.rotation ?? { x: 0, y: 0, z: 0, w: 1 }, hp = hb.currentWorldPosition, hq = hb.currentWorldRotation;
            const off = rotate(qi4(tq), { x: hp.x - tp.x, y: hp.y - tp.y, z: hp.z - tp.z }), hr = hq ? qmul(qi4(tq), hq) : null, pin = { to: item, offset: { x: R2(off.x), y: R2(off.y), z: R2(off.z) }, ...(hr ? { rotation: { x: R3(hr.x), y: R3(hr.y), z: R3(hr.z), w: R3(hr.w) } } : {}) };
            /* Nov 11 creator "why is arm moving on its own while posing" + "make it so mod works that way": an item that already rides this same hand bone can't be a pin target: the hand would chase a spot that moves with it, a loop that drifts the arm by itself. The item already follows the hand, so nothing is written */
            { const tail = String(bn).split(":").pop(); let c = t, loop = false; for (let i = 0; c && i < 8; i++) { if (String(c.attachment?.bone ?? "").split(":").pop() === tail) { loop = true; break; } c = c.parent?.id ? ctx.getObject(c.parent.id) : null; }
              if (loop) { S.grabNote = short(item) + " already rides the " + hand + " hand: no pin needed"; ctx.authoring.dragReadout?.(S.grabNote); return; } }
            ctx.commit("pin " + obj.id + "'s " + hand + " hand to " + short(item), () => { obj.state.pins = { ...(obj.state?.pins ?? {}), [hand]: pin }; /* Nov 8 creator "we want pinning copied by default": a left hand pinned on the held gun is that gun's hold for every player */ { const hi = heldOf(ctx, obj); if (hand === "left" && hi && (item === hi.obj.id || String(item).startsWith(hi.obj.id + "/"))) { const g = { ...(ctx.world.state.heldGizmo ?? {}) }; g.holds = { ...(g.holds ?? {}), [hi.key]: { grip: pin.offset, sub: String(item).slice(hi.obj.id.length), fingers: fingersOf(obj), cradle: !!(RIG && !RIG.fingers), from: obj.id } }; ctx.world.state.heldGizmo = g; } }
              obj.bones = { ...(obj.bones ?? {}), [bn]: { reach: { to: { object: item, offset: pin.offset, ...(pin.rotation ? { rotation: pin.rotation } : {}) }, weight: 1, blendIn: 0.1, blendOut: 0.1 } } }; }); } };
      if (item) ctx.authoring.handle({ id: "held-pin", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: on ? "📌 " + HN + " HAND PINNED to " + short(cur.to).toUpperCase() : "📌 PIN " + HN + " HAND TO " + short(item).toUpperCase(), disabled: on || !RIG?.[hand],
        tooltip: RIG && !RIG[hand] ? "this rig has no " + hand + " hand bone to pin" : on ? "this hand is already pinned" : "pin this hand where it is now to " + short(item) + ": move the item and the hand and arm follow", active: on, persistProperties: ["state", "bones"], click: () => { if (!on) itFlip(false); } });
      if (!on && obj.state?.holds?.[hand]) ctx.authoring.handle({ id: "held-held", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: "UNPIN " + HN + " HAND (held in place)", tooltip: "this hand is held where it was let go: press to release it back to its animation. arm and wrist sliders move it while held", persistProperties: ["state", "bones"],
        click: () => { remember(obj); const bn = RIG?.[hand] ?? ("mixamorig:" + (hand === "left" ? "Left" : "Right") + "Hand"); /* Nov 9 creator "make it so unpin also undoes these kinds of holds" */
          ctx.commit("release " + obj.id + "'s held " + hand + " hand", () => { const H = { ...(obj.state?.holds ?? {}) }; delete H[hand]; if (Object.keys(H).length) obj.state.holds = H; else delete obj.state.holds;
            const b = { ...(obj.bones ?? {}) }; for (const k of [bn, bn.split(":").pop()]) if (b[k]?.reach?.to?.object === obj.id) delete b[k]; obj.bones = Object.keys(b).length ? b : null; }); } }); /* Nov 9 creator "it doesnt indicate being pinned in mod hud" */
      if (item && on) ctx.authoring.handle({ id: "held-unpin", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: "UNPIN " + HN + " HAND (holds its spot)", tooltip: "let this hand go: it stays where it is", persistProperties: ["state", "bones"], click: () => itFlip(true) }); /* Nov 9 creator "unpin button on mod is not working": the press wrote ops that never landed with no persisted properties named */ }
    // Oct 25 creator: "a sub selection for posing for each attached animation"
    ctx.authoring.handle({ id: "held-hclip", at: "action", compact: true, iconUrl: ICON.clip, icon: "film", label: clipName(S.hclip),
      menu: { items: clips.length ? clips : ["any"], active: S.hclip, render: (_a, c) => c === RK ? "holding " + RG : (c === now ? "▶ " : "") + clipName(c), apply: (c) => { S.hclip = c; } } });
    const KN = HKN.filter((k) => !(noF && ["curl", "index", "middle", "ring", "pinky"].includes(k)) && !(noT && (k === "thumb" || k === "thumbSide" || k === "thumbIn")));
    if (noF || noT) ctx.authoring.handle({ id: "held-nofingers", at: "action", compact: true, iconUrl: ICON.knob, icon: "info", label: noF && noT ? "NO FINGER BONES" : noF ? "NO FINGER BONES (thumb only)" : "NO THUMB BONES", disabled: true,
      tooltip: "this character's model has no " + (noF ? "finger" : "thumb") + " bones, so curl can't bend anything. arms and wrists still pose. rig fingers into the model (Mixamo-style names: LeftHandIndex1…) to curl them" });
    if (!KN.includes(S.knob)) S.knob = KN.includes("curl") ? "curl" : "yaw";
    ctx.authoring.handle({ id: "held-knob", at: "action", compact: true, iconUrl: ICON.knob, icon: "rotate", label: HKL[S.knob] ?? S.knob,
      menu: { items: KN, active: S.knob, render: (_a, k) => HKL[k] ?? k, apply: (k) => { S.knob = k; } } });
    const all = HP(), cur = all[S.hclip]?.[hand] ?? {};
    const k = S.knob;
    sl = { min: k === "thumbSide" || k === "thumbIn" ? -60 : k === "thumb" ? -90 : k === "curl" ? -40 : ["index", "middle", "ring", "pinky"].includes(k) ? -140 : k === "elbow" ? -480 : k === "roll" || k === "pitch" ? -240 : -120, max: k === "thumbSide" || k === "thumbIn" ? 60 : k === "thumb" ? 160 /* Oct 27 creator: "can we increase thumb curl range" */ : k === "curl" ? 100 : ["index", "middle", "ring", "pinky"].includes(k) ? 140 /* Oct 27 creator "can we do an index finger curl slider?": added on top of finger curl */ : k === "elbow" ? 480 /* Oct 27 creator: "can we make elbow in out go farther pls" */ : k === "roll" || k === "pitch" ? 240 : 120 /* Oct 27 creator: "make it so wrist roll can go farther"; "wrist bend/fold ... not enough and mostly only in one direction" */, step: 1, value: Math.round(cur[k] ?? 0), format: (v) => Math.round(v) + "°",
      apply: (v) => { if (!RK && S.hclip === activeClip(obj)) keepBase(obj, HP()[S.hclip]); const a = JSON.parse(JSON.stringify(HP())); a[S.hclip] = { ...(a[S.hclip] ?? {}), [hand]: { ...(a[S.hclip]?.[hand] ?? {}), [k]: v } };
        HPset(a); if (!RK && S.hclip === activeClip(obj)) obj.bones = composeBones(obj, a[S.hclip]); } };
    ctx.authoring.handle({ id: "held-val", at: "action", compact: true, iconUrl: ICON.slider, icon: "sliders", label: (hand === "left" ? "L " : "R ") + (HKL[k] ?? k), slider: sl });
    // Oct 25 creator: "extra sliders for these but for hands": arm X / Y / Z each a slider of its own, always out while a hand is picked
    for (const [ak, al] of [["ax", "arm out/in"], ["ay", "arm up/down"], ["az", "arm fwd/back"], ["elbow", "elbow in/out"], ["efwd", "elbow fwd/back"]]) { // Oct 27 creator "pls add one then": elbow forward/back
      ctx.authoring.handle({ id: "held-arm-" + ak, at: "action", compact: true, iconUrl: ICON.arm, icon: "sliders", label: (hand === "left" ? "L " : "R ") + al,
        slider: { min: ak === "elbow" ? -480 : -240, max: ak === "elbow" ? 480 : 240, /* Oct 27 creator "can we make elbow in out go farther pls": elbow ±480; Oct 26 creator: "make it so elbow in out can go farther"; Oct 27 creator: "extend any range sliders you need to": arm out / up / fwd reach 72 cm each way */ step: 1, value: Math.round(cur[ak] ?? 0), format: (v) => Math.round(v) + "°",
          apply: (v) => { remember(obj, true); if (!RK && S.hclip === activeClip(obj)) keepBase(obj, HP()[S.hclip]); const a = JSON.parse(JSON.stringify(HP())); a[S.hclip] = { ...(a[S.hclip] ?? {}), [hand]: { ...(a[S.hclip]?.[hand] ?? {}), [ak]: v } };
            HPset(a); if (!RK && S.hclip === activeClip(obj)) obj.bones = composeBones(obj, a[S.hclip]); } } });
    }
    // Oct 25 creator ("yes to all"): MIRROR copies this hand onto the other one, RESET HAND clears just this hand for this animation
    const other = hand === "left" ? "right" : "left", HS = (h) => h === "left" ? "L" : "R";
    const setPoses = (fn) => { remember(obj); if (!RK && S.hclip === activeClip(obj)) keepBase(obj, HP()[S.hclip]); const a = JSON.parse(JSON.stringify(HP())); a[S.hclip] = a[S.hclip] ?? {}; fn(a[S.hclip]);
      if (!Object.keys(a[S.hclip]).length) delete a[S.hclip]; HPset(a);
      if (!RK && S.hclip === activeClip(obj)) obj.bones = composeBones(obj, a[S.hclip] ?? {}); };
    ctx.authoring.handle({ id: "held-mirror", at: "action", compact: true, iconUrl: ICON.mirror, icon: "copy", label: "MIRROR " + HS(hand) + "→" + HS(other), disabled: !Object.keys(cur).length,
      click: () => setPoses((c) => { const m = {}; for (const [k, v] of Object.entries(c[hand] ?? {})) m[k] = MIRROR_FLIP.includes(k) ? -v : v; c[other] = m; }) });
    ctx.authoring.handle({ id: "held-reset-hand", at: "action", compact: true, iconUrl: ICON.reset, icon: "undo", label: "RESET " + HS(hand) + " hand", disabled: !Object.keys(cur).length,
      click: () => setPoses((c) => { delete c[hand]; }) });
    // Oct 27 creator "pls add a reset limb button to mod": RESET ARM puts this arm and wrist back on the animation (reach, elbow, fold, wrist turn/tilt/roll) and keeps the fingers and thumb as posed
    { const LIMB = ["ax", "ay", "az", "elbow", "efwd", "fold", "yaw", "pitch", "roll"];
      ctx.authoring.handle({ id: "held-reset-limb", at: "action", compact: true, iconUrl: ICON.reset, icon: "undo", label: "RESET " + HS(hand) + " arm", tooltip: "put this arm and wrist back where the animation has them; fingers stay as posed", disabled: !LIMB.some((k) => k in cur),
        click: () => setPoses((c) => { const h = { ...(c[hand] ?? {}) }; for (const k of LIMB) delete h[k]; if (Object.keys(h).length) c[hand] = h; else delete c[hand]; }) }); }
  } else {
    watchBones(ctx, obj.id); // Oct 30: a picked gun keeps the body's bones fresh, so a grab catches the pinned hand where it is drawn
    const isB = S.pick === "@body", t = isB ? obj : ctx.getObject(S.pick); if (!t) return;
    const fp = (isB ? t.worldFeetPosition ?? t.feetPosition : t.feetPosition) ?? { x: 0, y: 0, z: 0 };
    // Nov 1 creator "when feels is selected he moves separate from the zipline handle, glasses should move with him ... items with selectors like the zipline handle should not":
    // a body move holds each pickable child where it stands in the world; worn things (glasses, shades, hats, hair) ride along
    const WORN = /glass|shade|spectacle|goggle|hat|cap|hair|wig|outfit/i;
    const free = isB ? (obj.children ?? []).map((k) => k?.id ?? k).filter((id) => typeof id === "string" && !/(^|\/)__/.test(id) && !WORN.test(id.split("/").pop())).map((id) => ctx.getObject(id)).filter((k) => k && !/Spine2$/.test(String(k.attachment?.bone ?? ""))) : []; // Nov 2: a chest-pinned item rides the body
    const bodyMove = (fn) => { if (!free.length) return fn();
      // Nov 2 creator "when i slide feels up/down the handle spins": a child's rotation reads in the body's frame, so it is turned into the world's before the move
      // and back after; before, the body's yaw was taken off it once per step and a slide spun it 90° at a time
      const q0 = obj.rotation?.w != null ? { ...obj.rotation } : { x: 0, y: 0, z: 0, w: 1 };
      const kept = free.map((k) => { const w = k.worldFeetPosition, r = k.rotation; return { k, w: w ? { x: w.x, y: w.y, z: w.z } : null, r: r?.w != null ? qm4(q0, { x: r.x, y: r.y, z: r.z, w: r.w }) : null }; });
      fn();
      const bq = obj.rotation?.w != null ? obj.rotation : { x: 0, y: 0, z: 0, w: 1 };
      for (const { k, w, r } of kept) { if (w) k.worldFeetPosition = w; if (r) k.rotation = qm4(qi4(bq), r); } };
    const mv = (...a) => bodyMove(() => moveHeld(...a));
    const e = isB ? (t.rotation ? eulerFromRotation(t.rotation) : { yaw: 0, pitch: 0, roll: 0 }) : t.localRotation ? eulerFromRotation(t.localRotation) : { yaw: 0, pitch: 0, roll: 0 };
    const sc = typeof t.scale === "number" ? t.scale : (t.scale?.x ?? 1);
    S.view = { who: String(obj.state?.name ?? obj.id), pick: short(S.pick), knob: KNL[S.knob] ?? S.knob, fp: { x: R2(fp.x), y: R2(fp.y), z: R2(fp.z) }, rot: { yaw: Math.round(e.yaw ?? 0), pitch: Math.round(e.pitch ?? 0), roll: Math.round(e.roll ?? 0) }, sc: R2(sc), hand: null, at: ctx.now?.() ?? 0 }; // Oct 26 creator: "chrome rig pls": the rail panel (scripts/rig-tab.js) reads this
    // Nov 2 creator "a pin to chest for items ... pins item to chest in whatever location it is in": the picked item rides the chest bone (Spine2) from the spot it stands now,
    // so posing the body, its spine or the whole character carries it, and hands pinned to it follow. UNPIN puts it back on what it rode before, at its old spot
    if (!isB && isBody) { const CRIG = rigOf(ctx, S, obj.id), CB = (CRIG?.names ?? []).find((n) => /Spine2$/.test(n)), CP = obj.state?.chestPins?.[t.id], onC = /Spine2$/.test(String(t.attachment?.bone ?? "")), extC = onC && !CP; /* Nov 9 creator "make mod recognize if any non mod related pinning is active": a chest ride the rig did not make still reads as pinned */
      watchBones(ctx, obj.id); /* Nov 9 creator "pin nice gun to chest button is not working": the press commits in its own click from bones read a moment ago, never after an await (an awaited commit left the click with nothing written) */
      const chestPin = () => { if (!CB) return; remember(obj); { const bl = BONES[obj.id]?.list ?? []; const hb = bl.find((x) => x.name === CB), tw = t.worldFeetPosition, tq = t.worldRotation ?? t.rotation;
          if (!hb?.currentWorldPosition || !hb?.currentWorldRotation || !tw || tq?.w == null) { S.grabNote = "chest pin: bones not read yet, press again"; return; }
          const bp = hb.currentWorldPosition, bq = hb.currentWorldRotation, bs = hb.currentWorldScale?.x ?? 1, iq = qi4(bq), lp = rotate(iq, { x: tw.x - bp.x, y: tw.y - bp.y, z: tw.z - bp.z }), lq = qm4(iq, tq), k = bs > 0 ? 1 / bs : 1;
          const prev = { att: t.attachment ? JSON.parse(JSON.stringify(t.attachment)) : null, fp: { ...(t.feetPosition ?? {}) }, rot: t.localRotation ? { x: t.localRotation.x, y: t.localRotation.y, z: t.localRotation.z, w: t.localRotation.w } : null };
          ctx.commit("pin " + short(t.id) + " to " + bodyName + "'s chest", () => { t.attachment = { bone: CB }; t.feetPosition = { x: R4(lp.x * k), y: R4(lp.y * k), z: R4(lp.z * k) }; t.rotation = { x: R4(lq.x), y: R4(lq.y), z: R4(lq.z), w: R4(lq.w) };
            obj.state.chestPins = { ...(obj.state?.chestPins ?? {}), [t.id]: prev }; }); } };
      const chestUnpin = () => { remember(obj); let pv = CP ?? {};
        if (!CP) { const tw = t.worldFeetPosition, tq = t.worldRotation, bp = obj.worldFeetPosition ?? obj.feetPosition, bq = (obj.worldRotation ?? obj.rotation)?.w != null ? (obj.worldRotation ?? obj.rotation) : { x: 0, y: 0, z: 0, w: 1 }, sc = typeof obj.scale === "number" ? obj.scale : (obj.scale?.x ?? 1);
          if (tw && tq?.w != null) { const iq = qi4(bq), l = rotate(iq, { x: (tw.x - bp.x) / sc, y: (tw.y - bp.y) / sc, z: (tw.z - bp.z) / sc }), lq = qm4(iq, tq); pv = { att: null, fp: { x: R4(l.x), y: R4(l.y), z: R4(l.z) }, rot: { x: R4(lq.x), y: R4(lq.y), z: R4(lq.z), w: R4(lq.w) } }; } else pv = { att: null }; } /* an outside chest ride: freed where it stands */ ctx.commit("unpin " + short(t.id) + " from " + bodyName + "'s chest", () => { t.attachment = pv.att ?? null; if (pv.fp) t.feetPosition = pv.fp; if (pv.rot) t.rotation = pv.rot;
          const c = { ...(obj.state?.chestPins ?? {}) }; delete c[t.id]; if (Object.keys(c).length) obj.state.chestPins = c; else delete obj.state.chestPins; }); };
      ctx.authoring.handle({ id: "held-chest", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: extC ? "⚠ " + short(t.id).toUpperCase() + " ON CHEST (NOT FROM RIG)" : onC ? "📌 " + short(t.id).toUpperCase() + " ON CHEST" : "📌 PIN " + short(t.id).toUpperCase() + " TO CHEST", disabled: onC || !CB,
        tooltip: !CB ? "no chest bone (Spine2) read on this rig yet" : extC ? "something outside the rig stuck this item to the chest bone: UNPIN FROM CHEST frees it where it stands" : onC ? "this item rides the chest: pose the body and it follows" : "pin this item to the chest where it stands now: posing the body or spine carries it, and hands pinned to it follow", active: onC, persistProperties: ["state", "attachment", "feetPosition", "rotation"], click: () => { if (!onC) chestPin(); } });
      if (onC) ctx.authoring.handle({ id: "held-chest-off", at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: "UNPIN FROM CHEST", tooltip: "put it back on what it rode before, at its old spot", persistProperties: ["state", "attachment", "feetPosition", "rotation"], click: chestUnpin }); }
    /* Nov 9 creator "make mod recognize if any non mod related pinning is active on a model": a hand reach the rig's pins and holds don't claim is named and can be cleared */
    if (isBody) { const own = { ...(obj.state?.pins ?? {}), ...(obj.state?.holds ?? {}) }, ext = Object.entries(obj.bones ?? {}).filter(([bn, v]) => v?.reach && /Hand$/.test(bn) && !own[/Left/.test(bn) ? "left" : "right"] && !(bn === "mixamorig:RightHand" && obj.state?.pinGun));
      for (const [bn] of ext) { const hn = /Left/.test(bn) ? "LEFT" : "RIGHT";
        ctx.authoring.handle({ id: "held-ext-" + hn.toLowerCase(), at: "action", compact: false, iconUrl: ICON.arm, icon: "pin", label: "⚠ " + hn + " HAND REACH (NOT FROM RIG) · CLEAR", tooltip: "a reach set outside the rig pulls this hand: clear it so the hand poses freely", persistProperties: ["bones"],
          click: () => { remember(obj); ctx.commit("clear outside reach on " + obj.id + "'s " + hn.toLowerCase() + " hand", () => { const B = { ...(obj.bones ?? {}) }, v = { ...(B[bn] ?? {}) }; delete v.reach; if (Object.keys(v).length) B[bn] = v; else delete B[bn]; obj.bones = B; }); } }); } }
    const KNx = isB ? ["x", "y", "z", "yaw", "pitch", "roll"] : KN;
    if (!KNx.includes(S.knob)) S.knob = "x";
    ctx.authoring.handle({ id: "held-knob", at: "action", compact: true, iconUrl: ICON.knob, icon: "rotate", label: KNL[S.knob] ?? S.knob,
      menu: { items: KNx, active: S.knob, render: (_a, k) => KNL[k] ?? k, apply: (k) => { S.knob = k; } } });
    // Oct 27 creator: "none of my sliders move the m4 the way i want it to go ... would i want to add a in/out": reach slides the gun along its own barrel (its longest side), so it pushes out from the body or pulls in, whatever bone it rides
    // Oct 27 creator: "can you add reach for the other axis that way too": the gun's own sides ranked by length: barrel (longest), top/bottom (middle), left/right (thinnest)
    if (S.knob === "reach" || S.knob === "reachSide" || S.knob === "reachUp") {
      const ob = t.bounds?.obb, hx = ob?.halfExtents, rk = hx ? ["x", "y", "z"].sort((a, b) => hx[b] - hx[a]) : ["z", "y", "x"], li = rk[S.knob === "reach" ? 0 : S.knob === "reachUp" ? 1 : 2];
      const ax = { x: 0, y: 0, z: 0 }; ax[li] = 1; const d0 = t.localRotation ? rotate(t.localRotation, ax) : ax, dl = Math.hypot(d0.x, d0.y, d0.z) || 1, d = { x: d0.x / dl, y: d0.y / dl, z: d0.z / dl };
      if (!S.reach0 || S.reach0.id !== t.id || S.reach0.k !== S.knob) S.reach0 = { k: S.knob, id: t.id, fp: { x: fp.x || 0, y: fp.y || 0, z: fp.z || 0 }, d };
      const A = S.reach0, cur = ((fp.x - A.fp.x) * A.d.x + (fp.y - A.fp.y) * A.d.y + (fp.z - A.fp.z) * A.d.z) * 100;
      sl = { min: -60, max: 60, step: 0.5, value: Math.round(cur * 2) / 2, format: (v) => (v > 0 ? "+" : "") + v.toFixed(1) + "cm",
        apply: (v) => { if (!Number.isFinite(v)) return; remember(obj, true); t.feetPosition = { x: R2(A.fp.x + A.d.x * v / 100), y: R2(A.fp.y + A.d.y * v / 100), z: R2(A.fp.z + A.d.z * v / 100) }; } };
    } else
    if (isB && ["x", "y", "z"].includes(S.knob)) { /* the whole body slides in its own frame (left/right, up/down, fwd/back) from where it stood when picked, up to 2.5 m */
      const k = S.knob, B = (S.body0 ??= {}); if (!B[obj.id]) B[obj.id] = { ...fp }; const b0 = B[obj.id];
      const q = obj.rotation?.w != null ? obj.rotation : { x: 0, y: 0, z: 0, w: 1 }, loc = rotate(qi4(q), { x: fp.x - b0.x, y: fp.y - b0.y, z: fp.z - b0.z });
      sl = { min: -250, max: 250, step: 0.5, value: Math.round(loc[k] * 200) / 2, format: (v) => (v > 0 ? "+" : "") + v.toFixed(1) + "cm",
        apply: (v) => { if (!Number.isFinite(v)) return; remember(obj, true); const n = { ...loc }; n[k] = v / 100; const w = rotate(q, n); bodyMove(() => { obj.worldFeetPosition = { x: R2(b0.x + w.x), y: R2(b0.y + w.y), z: R2(b0.z + w.z) }; }); } };
    } else
    if (["x", "y", "z"].includes(S.knob)) { const k = S.knob; sl = { min: -250, max: 250, step: 0.5, /* Oct 26 creator: "allow a larger movement area": a pinned gun stands on the body's feet, so its height alone is ~120 cm */ value: Math.round(fp[k] * 200) / 2, format: (v) => v.toFixed(1) + "cm",
      apply: (v) => { if (!Number.isFinite(v)) return; remember(obj, true); const o = t.feetPosition ?? fp, p = { x: Number.isFinite(o.x) ? o.x : 0, y: Number.isFinite(o.y) ? o.y : 0, z: Number.isFinite(o.z) ? o.z : 0 }; p[k] = R2(v / 100); t.feetPosition = p; } }; }
    else if (S.knob === "size") sl = { min: 0.2, max: 3, step: 0.01, value: Math.round(sc * 100) / 100, format: (v) => "×" + v.toFixed(2), apply: (v) => { remember(obj, true); t.scale = v; } };
    else { /* Nov 9 creator "spin left right and barrel roll seem to do the same thing" + "pls add a pitch slider": each turn slider turns the item about ITS OWN axis
      (spin = its up, tilt/pitch = its side, roll = its barrel) from the pose it had when picked, so the three never fold into one (euler angles locked at 90° pitch) */
      const k = S.knob, q0r = isB ? t.rotation : (t.localRotation ?? t.rotation), q0 = q0r?.w != null ? q0r : rotationFromEuler({ yaw: q0r?.yaw ?? 0, pitch: q0r?.pitch ?? 0, roll: q0r?.roll ?? 0 });
      if (!S.rot0 || S.rot0.id !== t.id) S.rot0 = { id: t.id, q: q0, d: { yaw: 0, pitch: 0, roll: 0 } };
      const R0 = S.rot0; sl = { min: -180, max: 180, step: 1, value: Math.round(R0.d[k] ?? 0), format: (v) => (v > 0 ? "+" : "") + Math.round(v) + "°",
      apply: (v) => { if (!Number.isFinite(v)) return; remember(obj, true); R0.d = { ...R0.d, [k]: v };
        const ax = (a, deg) => { const h = deg * Math.PI / 360, sn = Math.sin(h); return { x: a === "x" ? sn : 0, y: a === "y" ? sn : 0, z: a === "z" ? sn : 0, w: Math.cos(h) }; };
        /* Nov 11 creator "yaw and barrel roll slider are doing the same thing" + "wouldnt it be easier to always have no gimbal lock": the hand's up can lie along the barrel, so spin now turns about the WORLD's up as seen in the item's parent frame; it never folds into roll */
        const pr = t.parent?.id ? ctx.getObject(t.parent.id) : null, pq0 = isB ? null : (pr?.worldRotation ?? null), pq = pq0?.w != null ? pq0 : null;
        const up = pq ? (() => { const q = { x: -pq.x, y: -pq.y, z: -pq.z, w: pq.w }, v = { x: 0, y: 1, z: 0 }, tt = { x: 2 * (q.y * v.z - q.z * v.y), y: 2 * (q.z * v.x - q.x * v.z), z: 2 * (q.x * v.y - q.y * v.x) }; return { x: v.x + q.w * tt.x + (q.y * tt.z - q.z * tt.y), y: v.y + q.w * tt.y + (q.z * tt.x - q.x * tt.z), z: v.z + q.w * tt.z + (q.x * tt.y - q.y * tt.x) }; })() : { x: 0, y: 1, z: 0 };
        if (!R0.up) R0.up = up; const sh = (R0.d.yaw ?? 0) * Math.PI / 360, sy = Math.sin(sh), spin = { x: R0.up.x * sy, y: R0.up.y * sy, z: R0.up.z * sy, w: Math.cos(sh) };
        const q = qm4(spin, qm4(qm4(R0.q, ax("x", R0.d.pitch)), ax("z", R0.d.roll))); /* Nov 9 creator "rifle isnt spinning left right": spin turns about the body's up (its parent frame), so a tilted gun still swings left/right; tilt and roll stay on the gun's own axes */ bodyMove(() => { t.rotation = q; }); } }; }
    ctx.authoring.handle({ id: "held-val", at: "action", compact: true, iconUrl: ICON.slider, icon: "sliders", label: KNL[S.knob] ?? S.knob, slider: sl });
    // Oct 25 creator: "can we make it so whatever is selected x y z can be dragged on the model itself"
    const wp = t.worldFeetPosition ?? fp, cen = t.bounds?.center ?? wp, reach = Math.max(0.25, (t.bounds?.size ? Math.max(t.bounds.size.x, t.bounds.size.y, t.bounds.size.z) : 0.6) * 0.6);
    // Oct 25 creator: "add another one of these things under selected children to drag guitar around with mouse": a move pad under it, slides it flat
    const lo = t.bounds?.min?.y ?? wp.y, padAt = { x: cen.x, y: lo - 0.03, z: cen.z };
    ctx.authoring.handle({ id: "held-drag-pad", priority: 0, at: padAt,
      render: (h) => { h.self.primitive = { kind: "gizmo", shape: "pad", scale: 0.7, role: "move" }; h.self.material = { color: "oklch(0.97 0 0)", unlit: true, depthTest: false }; },
      press: (ray) => { remember(obj); grabPinnedHands(ctx, obj, t); const n = { x: 0, y: 1, z: 0 }, a = rayToPlane(ray, padAt, n); return a ? { a, n, o: { ...padAt }, w: { ...(t.worldFeetPosition ?? fp) }, l: { ...(t.feetPosition ?? fp) } } : null; },
      drag: (ray, st) => { if (!st) return; const q = rayToPlane(ray, st.o, st.n); if (!q) return; const dx = q.x - st.a.x, dz = q.z - st.a.z; if (!isFinite(dx) || !isFinite(dz)) return;
        mv(t, st.w, st.l, { x: dx, y: 0, z: dz }); ctx.authoring.dragReadout("move " + (Math.hypot(dx, dz) * 100).toFixed(1) + " cm" + (S.grabNote ? " · " + S.grabNote : "")); } });
    // Oct 25 creator: "oh i guess add upp/down": an up/down grab sits on the pad itself, arrows up and down, pull it to raise or lower
    for (const [hid, dn, off] of [["held-drag-up", "+y", 0.12], ["held-drag-down", "-y", -0.12]]) {
      const at = { x: padAt.x + reach * 0.55, y: padAt.y + 0.03 + off, z: padAt.z };
      ctx.authoring.handle({ id: hid, priority: 0, at,
        render: (h) => { h.self.primitive = { kind: "gizmo", shape: "arrow", dir: dn, scale: 0.45, role: "move" }; h.self.material = { color: "oklch(0.97 0 0)", unlit: true, depthTest: false }; },
        press: (ray) => (remember(obj), grabPinnedHands(ctx, obj, t), { snap: axisDragPress(ray, at, { x: 0, y: 1, z: 0 }), w: { ...(t.worldFeetPosition ?? fp) }, l: { ...(t.feetPosition ?? fp) } }),
        drag: (ray, st) => { const d = axisDragSigned(ray, st.snap); if (d == null || !isFinite(d)) return;
          mv(t, st.w, st.l, { x: 0, y: d, z: 0 }); ctx.authoring.dragReadout((d >= 0 ? "up " : "down ") + Math.abs(d * 100).toFixed(1) + " cm" + (S.grabNote ? " · " + S.grabNote : "")); } });
    }
    // Oct 28 creator "can we get a gun spin left/right ... we have up/down": two spin grabs on the pad's other side; drag around the gun and it turns about its own centre on the world's up axis (left/right as you see it), wherever it rides
    { const qi = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
      const frame = () => { const L = t.localRotation, W = t.rotation; return (L && W && W.w != null) ? qm4(W, qi(L)) : (t.parent?.rotation ?? { x: 0, y: 0, z: 0, w: 1 }); }; // the parent's (or bone's) world turn
      const spinTo = (st, deg) => { const h = deg * Math.PI / 360, dq = { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }, P = st.P;
        const nl = qm4(qi(P), qm4(dq, qm4(P, st.q0))), r = rotate(dq, { x: st.w.x - st.c.x, y: st.w.y - st.c.y, z: st.w.z - st.c.z });
        bodyMove(() => { t.rotation = eulerFromRotation(nl); moveHeld(t, st.w, st.l, { x: st.c.x + r.x - st.w.x, y: st.c.y + r.y - st.w.y, z: st.c.z + r.z - st.w.z }); }); };
      for (const [hid, dn, off] of [["held-spin-left", "-z", 0.1], ["held-spin-right", "+z", -0.1]]) {
        const at = { x: padAt.x - reach * 0.55, y: padAt.y + 0.06, z: padAt.z + off };
        ctx.authoring.handle({ id: hid, priority: 0, at,
          render: (h) => { h.self.primitive = { kind: "gizmo", shape: "arrow", dir: dn, scale: 0.45, role: "rotate" }; h.self.material = { color: "oklch(0.86 0.17 85)", unlit: true, depthTest: false }; },
          press: (ray) => { remember(obj); grabPinnedHands(ctx, obj, t); const n = { x: 0, y: 1, z: 0 }, a = rayToPlane(ray, padAt, n), L = t.localRotation; if (!a || !L) return null;
            return { a, n, o: { ...padAt }, c: { ...cen }, w: { ...(t.worldFeetPosition ?? fp) }, l: { ...(t.feetPosition ?? fp) }, q0: { x: L.x, y: L.y, z: L.z, w: L.w }, P: frame() }; },
          drag: (ray, st) => { if (!st) return; const q = rayToPlane(ray, st.o, st.n); if (!q) return;
            const a0 = Math.atan2(st.a.x - st.c.x, st.a.z - st.c.z), a1 = Math.atan2(q.x - st.c.x, q.z - st.c.z); let d = (a1 - a0) * 180 / Math.PI; d = ((d + 540) % 360) - 180; if (!isFinite(d)) return;
            d = Math.round(d); spinTo(st, d); ctx.authoring.dragReadout("spin " + (d >= 0 ? "left " : "right ") + Math.abs(d) + "°"); } });
      } }
    for (const [ax, dir, tint] of [["x", { x: 1, y: 0, z: 0 }, "oklch(0.68 0.29 350)"], ["y", { x: 0, y: 1, z: 0 }, "oklch(0.9 0.24 130)"], ["z", { x: 0, y: 0, z: 1 }, "oklch(0.8 0.17 210)"]]) {
      ctx.authoring.handle({ id: "held-drag-" + ax, priority: 0, at: { x: cen.x + dir.x * reach, y: cen.y + dir.y * reach, z: cen.z + dir.z * reach },
        render: (h) => { h.self.primitive = { kind: "gizmo", shape: "arrow", dir: "+" + ax, scale: 0.6, role: "move" }; h.self.material = { color: tint, unlit: true, depthTest: false }; },
        press: (ray) => (remember(obj), { snap: axisDragPress(ray, cen, dir), w: { ...(t.worldFeetPosition ?? fp) }, l: { ...(t.feetPosition ?? fp) } }),
        drag: (ray, st) => { const d = axisDragSigned(ray, st.snap); if (d == null || !isFinite(d)) return;
          mv(t, st.w, st.l, { x: dir.x * d, y: dir.y * d, z: dir.z * d }); ctx.authoring.dragReadout(ax + " " + (d * 100).toFixed(1) + " cm"); } });
    }
  }
  if (isBody) {
    // Oct 25 creator: "another button separate from this to force a player into any attached animation ... so they can adjust the posing on a frozen model"
    const frozen = clipRef(obj.anim?.giz?.clip);
    const fclips = clipsOf(obj);
    ctx.authoring.handle({ id: "held-freeze", at: "action", compact: true, iconUrl: ICON.freeze, icon: "pause", label: frozen ? "FROZEN: " + clipName(frozen).slice(0, 10) : "FREEZE pose", active: !!frozen,
      menu: { items: ["(unfreeze)", ...fclips], active: frozen ?? "(unfreeze)", render: (_a, c) => c === "(unfreeze)" ? "unfreeze" : clipName(c),
        apply: (c) => { if (c === "(unfreeze)") { obj.anim.giz = null; return; }
          obj.anim.giz = { clip: c, speed: 0, loop: "loop", weight: 1, blend: "override", blendIn: 0.15 }; S.hclip = c;
          const p = obj.state?.handPoses?.[c]; obj.bones = composeBones(obj, p); } } });
    // Oct 26 creator: "meant to hit save so lets move the save button right two panels": UNDO and STEP BACK sit before COPY and PASTE, so two panels stand between STEP BACK and SAVE
    ctx.authoring.handle({ id: "held-reset", at: "action", compact: true, iconUrl: ICON.reset, icon: "undo", label: "UNDO changes",
      click: () => { const s = snaps[obj.id]; obj.anim.giz = null; if (!s) return; pushRedo(obj, { kind: "undo", full: fullNow(obj), snap: s });
        obj.worldFeetPosition = s.fp; if (s.rot != null) obj.rotation = s.rot; obj.bones = s.bones; obj.state.handPoses = s.poses;
        for (const id in s.k) { const t = ctx.getObject(id), b = s.k[id]; if (!t) continue; t.feetPosition = b.fp; if (b.rot) t.rotation = b.rot; if (b.sc != null) t.scale = b.sc; }
        delete snaps[obj.id]; } });
    { const n = S.steps?.[obj.id]?.length ?? 0; ctx.authoring.handle({ id: "held-step", at: "action", compact: true, iconUrl: ICON.reset, icon: "undo", label: n ? "STEP BACK (" + n + ")" : "STEP BACK", disabled: !n, click: () => stepBack(obj) }); { const m = S.redo?.[obj.id]?.length ?? 0; ctx.authoring.handle({ id: "held-redo", at: "action", compact: true, iconUrl: ICON.redo, icon: "redo", label: m ? "REDO (" + m + ")" : "REDO", disabled: !m, click: () => redo(obj) }); } }
    // Oct 25 creator: "a reset button in here to put the character back to where they were once you're done changing things"
    // Oct 25 creator ("yes to all"): COPY takes this character's whole hold (held things + both hands, every animation); PASTE lays it on another
    // Oct 27 creator: "pls remove the copy option i think we filled the menu space too much": COPY/PASTE pose chips gone
    // Nov 8 creator "update mod to copy over holds to players and take this into account": COPY HOLD → PLAYERS keeps this body's left-hand grip as a point on the held item
    // (world.state.heldGizmo.holds[item]); player-hold.js lays it on any player holding that item. A source rig with no finger bones cradles from below, so it copies as a cradle (palm up, no curl)
    { const it = heldOf(ctx, obj); if (it) { const RIG = rigOf(ctx, S, obj.id), have = !!ctx.world.state?.heldGizmo?.holds?.[it.key];
      ctx.authoring.handle({ id: "held-copy-players", at: "action", compact: true, iconUrl: ICON.copy, icon: "copy", label: (have ? "RECOPY" : "COPY") + " HOLD → PLAYERS", tooltip: "every player holding " + it.key + " grips it where " + String(obj.state?.name ?? obj.id) + "'s left hand is now" + (RIG && !RIG.fingers ? " (no finger bones here, so it copies as a palm cradle)" : ""),
        click: () => { const h = gripOf(obj, it.obj); if (!h) return; remember(obj); ctx.commit("copy " + String(obj.state?.name ?? obj.id) + "'s " + it.key + " hold to players", () => { const g = { ...(ctx.world.state.heldGizmo ?? {}) }; g.holds = { ...(g.holds ?? {}), [it.key]: { ...h, fingers: fingersOf(obj), cradle: !!(RIG && !RIG.fingers), from: obj.id } }; ctx.world.state.heldGizmo = g; }); } }); } }
  }
  if (!isBody) { const n = S.steps?.[obj.id]?.length ?? 0; ctx.authoring.handle({ id: "held-step", at: "action", compact: true, iconUrl: ICON.reset, icon: "undo", label: n ? "STEP BACK (" + n + ")" : "STEP BACK", disabled: !n, click: () => stepBack(obj) }); { const m = S.redo?.[obj.id]?.length ?? 0; ctx.authoring.handle({ id: "held-redo", at: "action", compact: true, iconUrl: ICON.redo, icon: "redo", label: m ? "REDO (" + m + ")" : "REDO", disabled: !m, click: () => redo(obj) }); } }
  ctx.authoring.handle({ id: "held-keep", at: "action", compact: true, iconUrl: ICON.keep, icon: "check", label: dirty(ctx, obj, snaps) ? "SAVE ●" : "SAVED", active: dirty(ctx, obj, snaps), persistProperties: ["state"],
    click: () => { S.saves = (S.saves ?? 0) + 1; S.tipShow = true; /* Oct 30 creator "make something for the feels good rig to encourage spoin donations after": the tip jar chip comes up after a save */
      if (hand || S.pick === null) { const a = JSON.parse(JSON.stringify(obj.state?.handPoses ?? {})); ctx.commit("save " + obj.id + "'s hand poses", () => { obj.state.handPoses = a; }); delete snaps[obj.id]; return; }
      if (S.pick === "@body") { const w = obj.worldFeetPosition ?? obj.feetPosition, r = obj.rotation; const at = { fp: { x: R2(w.x), y: R2(w.y), z: R2(w.z) }, rot: r?.w != null ? { x: R4(r.x), y: R4(r.y), z: R4(r.z), w: R4(r.w) } : r, kids: {} };
        for (const k of (obj.children ?? [])) { const c = ctx.getObject(k?.id ?? k); if (!c) continue; const cf = c.feetPosition, cr = c.localRotation; at.kids[c.id.split("/").pop()] = { fp: { x: R4(cf.x), y: R4(cf.y), z: R4(cf.z) }, ...(cr ? { rot: { x: R4(cr.x), y: R4(cr.y), z: R4(cr.z), w: R4(cr.w) } } : {}) }; }
        ctx.commit("set " + bodyName + "'s spot", () => { obj.feetPosition = at.fp; if (at.rot) obj.rotation = at.rot; obj.state.rigAt = at; }); if (S.body0) delete S.body0[obj.id]; delete snaps[obj.id]; return; }
      const t = ctx.getObject(S.pick); if (!t) return;
      const p = { ...(t.feetPosition ?? {}) }, r = t.localRotation ? eulerFromRotation(t.localRotation) : { yaw: 0, pitch: 0, roll: 0 }, s = typeof t.scale === "number" ? t.scale : (t.scale?.x ?? 1);
      ctx.commit("set " + name(S.pick) + "'s hold", () => { t.feetPosition = { x: R2(p.x), y: R2(p.y), z: R2(p.z) }; t.rotation = { yaw: Math.round(r.yaw ?? 0), pitch: Math.round(r.pitch ?? 0), roll: Math.round(r.roll ?? 0) }; t.scale = R2(s); });
      // Oct 26 creator: "it reset its position to where it was last death even though i saved it in the editor": the Alpha's pole and wounds are respawned by feels.js spearOn each death,
      // so their save also lands in world.state.spearRig, which spearOn reads every time it builds them
      // Oct 26 creator: "repositions with the editor dont seem to be saving properly i try to move gun on captain": an enemy's gun is rebuilt by enemy.js on every draw/respawn,
      // so its save lands in world.state.gunRig by kind, which enemy.js applies each time it builds the gun
      // Oct 26 creator: a pinned gun stands on the body, so its save is this body's own pin (the pinned hand follows it)
      { const g = String(S.pick).match(/\/gun$/), pg = obj.state?.pinGun, gq = t.localRotation ?? t.rotation; const chest = /Spine2$/.test(String(t.attachment?.bone ?? "")); /* Oct 28 creator "pls update the gun hold save": a pinned gun rides the chest bone now, so its save is turned back into the body's frame */
        let sp = p, sq = gq; if (chest && t.worldFeetPosition && t.rotation?.w != null && obj.rotation?.w != null) { const b = obj.rotation, bi = { x: -b.x, y: -b.y, z: -b.z, w: b.w }, mul = (a, c) => ({ w: a.w * c.w - a.x * c.x - a.y * c.y - a.z * c.z, x: a.w * c.x + a.x * c.w + a.y * c.z - a.z * c.y, y: a.w * c.y - a.x * c.z + a.y * c.w + a.z * c.x, z: a.w * c.z + a.x * c.y - a.y * c.x + a.z * c.w }), w = t.worldFeetPosition, f = obj.feetPosition, v = mul(mul(bi, { x: w.x - f.x, y: w.y - f.y, z: w.z - f.z, w: 0 }), b); sp = { x: v.x, y: v.y, z: v.z }; sq = mul(bi, t.rotation); }
        if (g && pg && (!t.attachment || chest) && sq?.w != null) { remember(obj); ctx.commit("keep " + obj.id + "'s pinned gun here", () => { obj.state.pinGun = { ...pg, fp: { x: Math.round(sp.x * 1000) / 1000, y: Math.round(sp.y * 1000) / 1000, z: Math.round(sp.z * 1000) / 1000 }, rot: { x: sq.x, y: sq.y, z: sq.z, w: sq.w } }; }); delete snaps[obj.id]; return; } }
      { const g = String(S.pick).match(/\/gun(\/mesh)?$/), kind = obj.state?.kind; if (g && kind) { const key = kind + (g[1] ? ":mesh" : ""); ctx.commit("keep " + kind + "'s gun where it was saved", () => { const rig = { ...(ctx.world.state.gunRig ?? {}) }; rig[key] = { fp: { x: R2(p.x), y: R2(p.y), z: R2(p.z) }, rot: { yaw: Math.round(r.yaw ?? 0), pitch: Math.round(r.pitch ?? 0), roll: Math.round(r.roll ?? 0) }, sc: R2(s) }; ctx.world.state.gunRig = rig; }); } }
      { const m = String(S.pick).match(/\/spear(?:\/(wound\w+))?$/); if (m) { const key = m[1] ?? "spear"; ctx.commit("keep the Alpha's " + key + " where it was saved", () => { const rig = { ...(ctx.world.state.spearRig ?? {}) }; rig[key] = { fp: { x: R2(p.x), y: R2(p.y), z: R2(p.z) }, rot: { yaw: Math.round(r.yaw ?? 0), pitch: Math.round(r.pitch ?? 0), roll: Math.round(r.roll ?? 0) } }; ctx.world.state.spearRig = rig; /* Oct 27 creator "i keep adjusting the wounds on alpha goon and saving pose but they never save": world.state is outside the editor save envelope, so the rig also rides the Alpha body's state, where feels.js reads it and writes scripts/lib/data/spear-rig.json */ const root = ctx.getObject(String(S.pick).split("/spear")[0]); if (root) root.state.spearRig = { ...(root.state.spearRig ?? {}), [key]: rig[key] }; }); } }
      delete snaps[obj.id]; } });
  // Oct 30 creator: the tip jar: after a save, one chip thanks them and opens a pay-what-you-want spoin checkout for the rig's maker (buyable "tip-feels-good-rig" in MINDCRUISE).
  // Spoins paid in a world go to that world's owner, so outside MINDCRUISE the chip points to the maker's jar there instead of charging
  if (S.tipShow) { const home = !!ctx.world.buyables?.["tip-feels-good-rig"];
    ctx.authoring.handle({ id: "held-tip", at: "action", compact: false, iconUrl: TIP_ICON, icon: "heart", label: S.saves > 1 ? "♥ " + S.saves + " poses saved! TIP THE RIG" : "♥ POSE SAVED! TIP THE RIG",
      tooltip: home ? "the rig is free: if it saved you time, drop a few spoins in the jar for its maker. pay what you want" : "the rig is free: if it saved you time, tip its maker in MINDCRUISE (spawn.co/@feels_goodman/mindcruise), the tip jar sits in the rig there",
      click: () => { if (!home) return; const me = (ctx.world.players ?? []).find((pl) => pl.isLocal) ?? ctx.player; if (me) ctx.proposePurchase(me, "tip-feels-good-rig"); S.tipShow = false; } });
    ctx.authoring.handle({ id: "held-tip-hide", at: "action", compact: true, icon: "close", label: "✕", tooltip: "hide the tip jar until the next save", click: () => { S.tipShow = false; } }); }
}
