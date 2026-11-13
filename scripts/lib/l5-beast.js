// Entity 18, "The Beast of Level 5" (Shelly Nov 13: "add The Beast of Level 5 and add dialogue and references to it").
// He calls himself the Gentleman of Level 5 and keeps the proprietor's office off the lobby's north wall (zone "office",
// scripts/lib/level5.js). Talk to him: his deal is the quest "The Gentleman's Terms":
//   shake on it (sanity full, $100) → bring him Mr. Ambrose's guest register (front desk) → slip his calling card under
//   Room 1408 (Tobias's room) → paid ($250) and Level 5 stops eating your sanity (s.l5favor).
//   Alt: the last signatory's tape (library, holo:beast18) opens "I heard what the last one said", a speech check voids it.
// Doubt him or raise a hand to him and he stops letting you see him (player.hidden) for WRATH_MS; while that lasts he
// shows himself at the corner of your eye in Level 5's halls and your sanity pays (never hp: sanity never hurts).
// Player keys: l5b (0 none, 1 register, 2 card, 99 paid, -2 voided), l5bOffer, l5bReg, l5bCard, l5bWrath (ctx.now ms), l5favor.
import { setQuest, endQuest, claimReward, tellQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { notify } from "./notify.js";
import { heard } from "./hear.js";
import { ZONES } from "./level5.js";

export const BEAST = "l5-beast";
export const QID = "the-gentleman-s-terms", QNAME = "The Gentleman's Terms";
const WRATH_MS = 5 * 60 * 1000; // my pick: five minutes of being watched (was 15)
const G = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const STEP = {
  1: { step: "Bring the Gentleman the guest register from the front desk", mark: { place: "level5", id: "l5-beast-register" } },
  2: { step: "Slip his calling card under the door of Room 1408", mark: { place: "level5", id: "l5-beast-slot" } },
};
const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const heardTape = (s) => String(s?.holotapes ?? "").split(",").includes("beast18");
export const wrathOn = (ctx, s) => (s?.l5bWrath ?? 0) > ctx.now();

// the choices his card adds to the talk (no node: handleDialogueQuestBeast answers them by their words)
export function beastChoices(ctx, it, s) {
  if (short(it) !== BEAST || !s) return [];
  if (wrathOn(ctx, s)) return [];
  const st = s.l5b ?? 0, out = [];
  if (!st) {
    if (!s.l5bOffer) out.push({ text: "You mentioned a deal.", tag: "Quest Start" });
    else { out.push({ text: "[Shake his hand] It's a deal.", tag: "Quest Start" }); out.push({ text: "Why should I trust you?", tag: "Doubt" }); }
    if (heardTape(s)) out.push({ text: "I heard what the last one said about you.", tag: "Quest" });
  }
  if (st === 1) out.push(s.l5bReg ? { text: "Here's your guest register.", tag: "Quest" } : { text: "Where do I find the register?", tag: "Ask" });
  if (st === 2) { out.push(s.l5bCard ? { text: "The card's under the door of 1408.", tag: "Quest" } : { text: "Who's in Room 1408?", tag: "Ask" }); }
  if (st === 1 || st === 2) out.push(heardTape(s) ? { text: "[Speech 55] I heard the last one's tape. The contract's void.", tag: "speech" } : { text: "I want out of this deal.", tag: "Doubt" });
  return out;
}

function wrath(ctx, p, why) {
  const s = p.state; s.l5bWrath = ctx.now() + WRATH_MS;
  if (s.l5b === 1 || s.l5b === 2) { endQuest(s, QID, "He stopped answering. You doubted him.", "failed"); s.l5b = 0; }
  if ((s.l5b ?? 0) <= 0) { delete s.l5bOffer; delete s.l5bReg; delete s.l5bCard; } // a deal offered again starts from the top
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: G("low-wet-whisper-close-behind-ear"), position: pos, volume: 0.8, maxDistance: 8 }, { audience: { player: p.id } });
  ctx.emit("screenFlash", { color: "#05080a", duration: 1.2, intensity: 0.85 }, { audience: { player: p.id } });
  notify(ctx, p, (why ?? "The lamp gutters. When it steadies, the chair behind the desk is empty.") + " He won't let you see him for a while.");
}

export function handleDialogueQuestBeast(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || short(npc) !== BEAST) return null;
  if (wrathOn(ctx, s)) return { reply: "...", mood: "calm" };
  const st = s.l5b ?? 0;
  if (t.includes("you mentioned a deal") && !st) { s.l5bOffer = 1;
    return { reply: "You're scared, aren't you? That's alright. I can't imagine what you went through to get here. So let's strike a deal, you and I. Our little secret. A few small errands, nothing too difficult, and I promise you'll never have to feel that fear again. I promise.", mood: "happy" }; }
  if (t.includes("it's a deal") && !st && s.l5bOffer) {
    s.l5b = 1; s.sanity = 100; s.cents = (s.cents ?? 0) + 10000;
    setQuest(s, QID, { name: QNAME, ...STEP[1] });
    tellQuest(ctx, p, `Quest Started: ${QNAME} · +$100 · Sanity restored`);
    return { reply: "Don't be afraid to shake my hand now. A deal is a deal. There, isn't that better? Your first errand: Mr. Ambrose keeps a guest register at the front desk. I'd like it on my desk. He won't miss it. He never does.", mood: "happy" }; }
  if (t.includes("why should i trust you") && !st) { wrath(ctx, p);
    return { reply: "Why are you doubting me? ...Oh. Hm? I thought I made it clear not to doubt me.", mood: "annoyed" }; }
  if (t.includes("what the last one said") && !st) { s.l5bOffer = 1;
    return { reply: "Ah. Them. They wrote a great deal and finished very little. They didn't finish their end, you see. You will. You have a much kinder face.", mood: "calm" }; }
  if (t.includes("where do i find the register") && st === 1) return { reply: "The front desk, friend. The big book by the bell. Every name ever written in it is still checked in.", mood: "calm" };
  if (t.includes("guest register") && st === 1 && s.l5bReg) {
    s.l5b = 2; setQuest(s, QID, { name: QNAME, ...STEP[2] }); tellQuest(ctx, p, "The Gentleman's Terms · Slip the card under Room 1408");
    return { reply: "Lovely. Look at all these names. Now, one small courtesy: this card goes under the door of Room 1408. Don't knock. Don't read it. Just slide it under and walk away.", mood: "happy" }; }
  if (t.includes("who's in room 1408") && st === 2) return { reply: "Tobias. The clerk. He's late on something he owes me. Nothing for you to worry about.", mood: "calm" };
  if (t.includes("under the door of 1408") && st === 2 && s.l5bCard) {
    s.l5b = 99; s.l5favor = true; s.l5bWrath = 0;
    if (claimReward(s, QID)) s.cents = (s.cents ?? 0) + 25000;
    endQuest(s, QID, "You kept your end. The hotel stopped pressing on you. Something in the portraits keeps watching.");
    tellQuest(ctx, p, `Quest Complete: ${QNAME} · +$250 · Level 5 no longer drains your sanity`);
    return { reply: "There. I'm a man of my word. The hotel won't trouble you anymore, not the halls, not the hum. Come and go as you please. I'll be watching. Fondly.", mood: "happy" }; }
  if (t.includes("i want out of this deal") && (st === 1 || st === 2)) { wrath(ctx, p);
    return { reply: "Out? We shook on it. Why are you doubting me? ...I thought I made it clear.", mood: "annoyed" }; }
  if (t.includes("contract's void") && (st === 1 || st === 2)) {
    const c = rollCheck(ctx, s, { skill: "speech", difficulty: 55 });
    if (!c.ok) return { reply: "A tape. Recorded by someone who was scared. You're not scared anymore, are you? I saw to that. Let's say no more about it.", mood: "calm" };
    s.l5b = -2; endQuest(s, QID, "You held up the last signatory's tape and walked away from the deal. He let you.", "voided");
    tellQuest(ctx, p, `${QNAME} · Contract voided`);
    return { reply: "Clever. Someone kept notes. Very well, consider it void. You keep what I gave you. I'll keep the rest. I'll be seeing you. I always am.", mood: "calm" }; }
  return null;
}

// a hand raised to him: no damage, he simply stops letting you see him (scripts/player.js hitTarget)
export function beastStruck(ctx, m) {
  if (wrathOn(ctx, ctx.self.state)) return;
  wrath(ctx, ctx.self, "Your blow meets the chair. Nobody was ever sitting in it.");
}

// presses on his errand props (scripts/l5-beast-prop.js)
export function pressProp(ctx, kind, who) {
  const s = who?.state; if (!s) return;
  const pos = ctx.self.worldFeetPosition;
  if (kind === "register") {
    if (s.l5b === 1 && !s.l5bReg) { s.l5bReg = 1; notify(ctx, who, "You tuck the guest register under your arm. The newest entry is your own name, in handwriting that isn't yours.");
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-gun-raise-cloth-rustle.mp3", position: pos, volume: 0.6, maxDistance: 8 }); return; }
    notify(ctx, who, "Mr. Ambrose's guest register. Thousands of names, every one still checked in. None checked out."); return;
  }
  if (kind === "slot") {
    if (s.l5b === 2 && !s.l5bCard) { s.l5bCard = 1; notify(ctx, who, "The card slides under the door. On the other side, someone stops breathing for a moment.");
      heard(ctx, { clip: G("paper-card-slide-under-wooden-door"), position: pos, volume: 0.7, maxDistance: 8 }); return; }
    notify(ctx, who, "A brass card slot. Engraved: MESSAGES FOR 1408. There's a draught coming out of it."); return;
  }
  if (kind === "portrait") {
    if (s.l5favor) notify(ctx, who, "The proprietor's portrait. Its eyes have followed you since you shook his hand. It looks pleased.");
    else notify(ctx, who, "The proprietor's portrait. The eyes are painted a little too wide. You look away first.");
    if (!s.l5favor && (s.sanity ?? 100) > 5) s.sanity -= 3; return;
  }
  if (kind === "window") { notify(ctx, who, "Daylight. Real, warm daylight, coming through glass that faces a wall. You can't see what's outside. It can see in."); return; }
}

// Level 5's sim (1 s cadence): those he is angry with lose sight of him, and catch him at the edge of their eye
export function wrathTick(ctx) {
  const now = ctx.now();
  for (const p of ctx.place.players ?? []) {
    const s = p.state ?? {}, on = wrathOn(ctx, s), hid = p.hidden ?? [];
    const want = on ? (hid.includes(BEAST) ? hid : [...hid, BEAST]) : hid.filter((x) => x !== BEAST);
    if (want !== hid && want.length !== hid.length) p.hidden = want;
    const reg = "l5-beast-register", hid2 = p.hidden ?? []; // the register stays gone from the front desk for whoever carried it off
    if (s.l5bReg && !hid2.includes(reg)) p.hidden = [...hid2, reg]; else if (!s.l5bReg && hid2.includes(reg)) p.hidden = hid2.filter((x) => x !== reg);
    if (!on) continue;
    const ses = (ctx.session.l5bGlimpse ??= {});
    if (now < (ses[p.id] ?? 0)) continue;
    ses[p.id] = now + 28000 + ctx.random() * 22000; // my pick: once every 28-50 s
    const f = p.feetPosition, yaw = ((p.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, side = ctx.random() < 0.5 ? -1 : 1;
    const a = yaw + side * (1.0 + ctx.random() * 0.35), d = 7 + ctx.random() * 4; // 57-77° off the look: the corner of the eye
    const at = { x: f.x - Math.sin(a) * d, z: f.z - Math.cos(a) * d };
    if (!ZONES.some((r) => at.x > r.x0 + 0.6 && at.x < r.x1 - 0.6 && at.z > r.z0 + 0.6 && at.z < r.z1 - 0.6)) continue;
    ctx.spawn({ tags: ["l5-beast-glimpse"], lifetime: 1.8, feetPosition: { x: at.x, y: 0, z: at.z }, rotation: { lookAt: { x: f.x, y: 0, z: f.z } },
      model: { id: BEAST_MODEL }, layout: { box: { min: { x: -0.45, y: 0, z: -0.3 }, max: { x: 0.45, y: 2.15, z: 0.3 } } }, castShadow: false });
    heard(ctx, { clip: G("low-wet-whisper-close-behind-ear"), position: { x: at.x, y: 1.7, z: at.z }, volume: 0.7, maxDistance: 14 }, { audience: { player: p.id } });
    s.sanity = Math.max(0, (s.sanity ?? 100) - 6);
  }
}

export const BEAST_MODEL = "cdn/value.fb4cf0aa8f83feb0dbe3d94397c89349b38f92c5459e80bc326f7f55afe432a9.png.glb";
const M = {
  desk: "/cdn/value.ba35b0596a9cc184b50ffd48a9dfb6259471774a45d6fea212e3c04fe5aa4e18.glb",
  chair: "/cdn/value.07a9798f6eec6c10157142da7130514ee8c8301290fe16d553f43818e8103796.glb",
  globe: "/cdn/value.124f6aa5f3ba5a6410841ce11ccba5bf863ede86e0c27a59f2afc41368299e7d.glb",
  cabinet: "/cdn/value.3c8f64f304503e74a1893815ebafc5a3345ec466f701d46a602010f4a75683bc.glb",
  portrait: "/cdn/value.9ad60bda4c117e23cb0b077d89ede8cd399646054150bea3ee4973a5500685f6.png",
};
export const OFFICE_V = 5;
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const fit = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const WOOD = { color: "oklch(0.3 0.06 40)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.5 };
const prop = (kind, name, verb) => ({ tags: ["usable", "l5-beast-prop"], behavior: "scripts/l5-beast-prop.js", state: { kind, name, verb } });

// the office, its errand props and the Gentleman himself: laid once per OFFICE_V (places/level5/sim.js)
export function layOffice(ctx) {
  for (const o of ctx.query({ tags: ["l5-office"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  const put = (id, spec) => { if (ctx.getObject(id)) ctx.destroy(id); ctx.spawn(id, { ...spec, tags: ["l5-office", ...(spec.tags ?? [])] }); };
  put("l5-office-rug", { feetPosition: { x: -38, y: 0.003, z: -17.6 }, primitive: box(5.2, 0.012, 3.8), material: { texture: "cdn/texture-faded-red-persian-rug-worn-fringe.png", roughness: 0.95 }, castShadow: false });
  put("l5-office-desk", { feetPosition: { x: -38, y: 0, z: -19 }, rotation: { yaw: 180 }, physics: { body: "static", collider: "box" }, model: { id: M.desk, forward: "+x" }, layout: fit(2.1, 1.3, 1.1) });
  put("l5-office-chair", { tags: ["seat", "usable"], state: { name: "Leather armchair", verb: "Sit", seat: { d: 0.04, w: 1, gap: 0.62 } }, feetPosition: { x: -38.5, y: 0, z: -17.2 }, rotation: { yaw: 10 }, physics: { body: "static", collider: "box" }, model: { id: M.chair, forward: "+x" }, layout: fit(0.85, 1.0, 0.85) });
  // his own chair, behind the desk, turned to the door (no collider: he is seated in it)
  put("l5-office-seat", { feetPosition: { x: -38, y: 0, z: -20.55 }, rotation: { yaw: 190 }, model: { id: M.chair, forward: "+x" }, layout: fit(0.9, 1.05, 0.9) });
  put("l5-office-globe", { feetPosition: { x: -43.7, y: 0, z: -20.7 }, rotation: { yaw: 150 }, physics: { body: "static", collider: "box" }, model: { id: M.globe, forward: "+x" }, layout: fit(0.75, 1.1, 0.75) });
  for (const [i, x] of [[0, -42.6], [1, -33.4]]) put(`l5-office-cabinet-${i}`, { feetPosition: { x, y: 0, z: -21.5 }, rotation: { yaw: 180 }, physics: { body: "static", collider: "box" }, model: { id: M.cabinet, forward: "+x" }, layout: fit(1.15, 2.3, 0.5) });
  // two tall windows full of a daylight that has nowhere to come from
  for (const [i, x] of [[0, -39.9], [1, -36.1]]) put(`l5-office-window-${i}`, { feetPosition: { x, y: 0.75, z: -21.82 }, ...prop("window", "A window", "Look out"), children: [
    { feetPosition: { x: 0, y: 0, z: 0 }, primitive: box(1.15, 2.0, 0.03), material: { color: "oklch(0.97 0.04 85)", emissive: "oklch(0.95 0.06 80)", emissiveIntensity: 2.2 } },
    { feetPosition: { x: 0, y: -0.06, z: 0.03 }, primitive: box(1.35, 0.1, 0.12), material: WOOD }, { feetPosition: { x: 0, y: 2.0, z: 0.03 }, primitive: box(1.35, 0.12, 0.12), material: WOOD },
    { feetPosition: { x: -0.62, y: 0, z: 0.03 }, primitive: box(0.1, 2.0, 0.12), material: WOOD }, { feetPosition: { x: 0.62, y: 0, z: 0.03 }, primitive: box(0.1, 2.0, 0.12), material: WOOD },
    { feetPosition: { x: 0, y: 0, z: 0.03 }, primitive: box(0.05, 2.0, 0.06), material: WOOD }, { feetPosition: { x: 0, y: 0.98, z: 0.03 }, primitive: box(1.2, 0.05, 0.06), material: WOOD },
    { feetPosition: { x: 0, y: 1.0, z: 0.6 }, light: { kind: "point", color: "oklch(0.93 0.07 85)", intensity: 3.2, distance: 7, shadow: { enabled: false } } },
  ] });
  // the proprietor's portraits: one over the globe, one by the door, one facing the desk
  for (const [i, x, z, yaw] of [[0, -45.82, -18.2, -90], [1, -30.18, -16.6, 90], [2, -45.82, -15.2, -90]]) put(`l5-office-portrait-${i}`, { feetPosition: { x, y: 1.35, z }, rotation: { yaw }, ...prop("portrait", "A portrait", "Look closer"),
    primitive: box(0.86, 1.3, 0.05), material: { texture: M.portrait, roughness: 0.6 } });
  put("l5-office-lamp", { feetPosition: { x: -38.7, y: 1.25, z: -19.2 }, light: { kind: "point", color: "oklch(0.82 0.12 75)", intensity: 2.4, distance: 6, shadow: { enabled: true } } });
  put("l5-office-ceiling", { feetPosition: { x: -38, y: 3.3, z: -17 }, light: { kind: "point", color: "oklch(0.78 0.09 70)", intensity: 3, distance: 11, shadow: { enabled: false } } });
  // the door, left ajar: "Come in, come in! I implore you."
  put("l5-office-door", { feetPosition: { x: -33.96, y: 0, z: -13.2 }, rotation: { yaw: 90 }, children: [ // swung flat to the wall; only the leaf itself is solid, never the doorway
    { feetPosition: { x: 0.56, y: 0, z: 0 }, primitive: box(1.1, 2.36, 0.05), material: WOOD, physics: { body: "static", collider: "box" } },
    { feetPosition: { x: 0.98, y: 1.0, z: 0.04 }, primitive: { kind: "sphere", radius: 0.035 }, material: { color: "oklch(0.7 0.11 80)", metalness: 0.9, roughness: 0.3 } },
    { feetPosition: { x: 0.56, y: 1.62, z: 0.035 }, vector: "<svg viewBox='0 0 300 80' width='0.6m'><rect x='2' y='2' width='296' height='76' rx='6' fill='#2a1c12' stroke='#b8923a' stroke-width='4'/><text x='150' y='50' text-anchor='middle' font-family='serif' font-size='30' fill='#e8c983'>PROPRIETOR</text></svg>" },
  ] });
  // his errand props: the register on the front desk, the card slot by 1408
  put("l5-beast-register", { feetPosition: { x: -42.6, y: 0.95, z: 1.75 }, rotation: { yaw: -80 }, ...prop("register", "Guest register", "Take"), primitive: box(0.42, 0.07, 0.3), material: { color: "oklch(0.32 0.1 25)", texture: "cdn/texture-worn-red-leather-book-cover.png", roughness: 0.7 } });
  put("l5-beast-slot", { feetPosition: { x: -16.85, y: 1.1, z: -12.83 }, ...prop("slot", "Card slot · Room 1408", "Use"), primitive: box(0.2, 0.08, 0.025), material: { color: "oklch(0.7 0.11 80)", metalness: 0.9, roughness: 0.35 } });
  // the last signatory's dictaphone, dropped in the library's far corner
  put("l5-beast-tape", { tags: ["container"], feetPosition: { x: -22.7, y: 0, z: -20.3 }, rotation: { yaw: 35 }, state: { items: "holo:beast18", name: "A dictaphone under a torn page", verb: "Take tape" },
    primitive: box(0.09, 0.03, 0.16), material: { color: "oklch(0.22 0.01 250)", roughness: 0.5 }, children: [
      { feetPosition: { x: 0.12, y: 0, z: 0.05 }, rotation: { yaw: 20 }, vector: "<svg viewBox='0 0 200 260' width='0.2m'><rect width='200' height='260' fill='#e9e2cf'/><text x='16' y='60' font-family='serif' font-size='22' fill='#3a2a20'>DON'T LOOK AT</text><text x='16' y='96' font-family='serif' font-size='22' fill='#3a2a20'>THE PORTRAITS</text><text x='16' y='150' font-family='serif' font-size='18' fill='#6a2018'>get out get out</text></svg>", rotation: { pitch: -90 } } ] });
  // the Gentleman of Level 5
  put(BEAST, { tags: ["npc", "l5-beast"], feetPosition: { x: -38, y: 0, z: -20.35 }, rotation: { yaw: 180 }, physics: "kinematic", model: BEAST_MODEL, layout: fit(0.9, 2.15, 0.6),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l5-beast-npc.js"],
    state: { name: "The Gentleman · Proprietor", title: "Entity 18", role: "proprietor", faction5: "hotel", hp: 9999, maxHp: 9999, voice: "beast", essential: true, home: { x: -38, z: -20.35 }, seated: true } });
}
