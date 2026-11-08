// Level 4's things you press (state.kind): an office's door plate (claim it: it's your home), your office's water cooler
// (the bottling game: E starts the fill, E again stops it; stop in the band and you keep a bottle), the open floor's
// fountains, the break room's vending machines, the chained stairwell to Level 5.
import { heard } from "./lib/hear.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const BAND = [82, 96], JUGS = 3, REFILL = 120000; // her pick: a jug back every 2 minutes, three on the shelf
const say = (who, text, ctx) => { if (who) who.state.notice = { text, at: ctx.now() }; };
const snd = (ctx, clip, v = 0.6) => heard(ctx, { clip: G(clip), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: v, maxDistance: 12 });
function jugs(ctx) { const s = ctx.self.state, now = ctx.now(); const add = Math.floor((now - (s.jugAt ?? 0)) / REFILL);
  if ((s.jugs ?? JUGS) < JUGS && add > 0) { s.jugs = Math.min(JUGS, (s.jugs ?? JUGS) + add); s.jugAt = now; } return s.jugs ?? JUGS; }
function homeKit(ctx, room, on) {
  for (const o of ctx.query({ tags: [`home-${room.id}`], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  if (!on) return;
  const k = room.kit, tag = ["homekit", `home-${room.id}`];
  ctx.spawn({ tags: tag, feetPosition: k.cot, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 0.8, height: 0.42, depth: 1.9 }, material: { color: "oklch(0.45 0.05 140)", roughness: 0.95 },
    children: [{ feetPosition: { x: 0, y: 0.42, z: -0.7 }, primitive: { kind: "box", width: 0.6, height: 0.12, depth: 0.35 }, material: { color: "oklch(0.9 0.01 90)" } },
      { feetPosition: { x: 0, y: 0.42, z: 0.25 }, primitive: { kind: "box", width: 0.78, height: 0.05, depth: 1.2 }, material: { color: "oklch(0.55 0.1 30)", roughness: 1 } }] });
  ctx.spawn({ tags: tag, feetPosition: k.desk, rotation: { yaw: k.yaw }, physics: "static", primitive: { kind: "box", width: 1.4, height: 0.74, depth: 0.7 }, material: { color: "oklch(0.55 0.05 60)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.6 },
    children: [{ feetPosition: { x: 0.45, y: 0.74, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.09, height: 0.38 }, material: { color: "oklch(0.3 0.02 60)", metalness: 0.4 } },
      { feetPosition: { x: 0.45, y: 1.08, z: 0 }, primitive: { kind: "cone", radius: 0.14, height: 0.14 }, material: { color: "oklch(0.85 0.08 85)", emissive: "oklch(0.85 0.1 80)", emissiveIntensity: 1.5 },
        light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 2.2, distance: 6 } }] });
}
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now(), uid = who?.userId ?? by;
    if (s.kind === "claim") {
      if (s.owner === uid) { say(who, `Office ${s.label}. Home. The cooler's yours, the cot's yours.`, ctx); return; }
      if (s.owner) { say(who, `Office ${s.label} · ${s.ownerName}'s place. Knock.`, ctx); return; }
      for (const p of ctx.query({ tags: ["l4-plate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (p.state.owner === uid) { // one home each: the old one goes vacant
        p.state.owner = null; p.state.ownerName = null; p.state.label2 = "vacant"; p.state.verb = "Claim"; p.state.info = "Vacant office"; homeKit(ctx, p.state.room, false); }
      s.owner = uid; s.ownerName = who?.displayName ?? "someone"; s.label2 = s.ownerName; s.verb = "Visit"; s.info = `${s.ownerName}'s home`;
      if (who) who.state.home = s.room.id;
      homeKit(ctx, s.room, true); snd(ctx, "keys-jingle-door-unlock-click", 0.7);
      say(who, `You claim office ${s.label}. Sleep here, fill bottles at the cooler, build it up with your scrap.`, ctx); return;
    }
    if (s.kind === "cooler") {
      const plate = ctx.getObject(s.plate), owner = plate?.state.owner;
      if (!owner) { say(who, "Claim this office first: the plate by its door.", ctx); return; }
      if (owner !== uid) { say(who, `${plate.state.ownerName}'s cooler. Hands off.`, ctx); return; }
      if (s.fillBy === by) { // the stop: judge where the line sits
        const f = s.fill ?? 0; s.fillBy = null; s.jugs = jugs(ctx) - 1; if (s.jugs < JUGS && !(s.jugAt > now - REFILL)) s.jugAt = now;
        if (f >= BAND[0] && f <= BAND[1]) { s.streak = (s.streak ?? 0) + 1; const bonus = s.streak % 3 === 0 ? 1 : 0; who.state.almonds = (who.state.almonds ?? 0) + 1 + bonus;
          snd(ctx, "glass-bottle-cap-screw-tight", 0.7); say(who, bonus ? `Perfect fill, three in a row. +2 almond water.` : `Clean fill at ${Math.round(f)}%. +1 almond water.`, ctx); }
        else { s.streak = 0; snd(ctx, "water-pour-splash-short", 0.6); say(who, `${Math.round(f)}%: half a bottle. You pour it back. Stop between ${BAND[0]} and ${BAND[1]}.`, ctx); }
        s.fill = 0; return;
      }
      if (jugs(ctx) <= 0) { say(who, "The jug's dry. A fresh one gurgles up in a couple of minutes.", ctx); return; }
      s.fillBy = by; s.fill = 0; s.rate = 38 + ctx.random() * 26; s.fillAt = now; snd(ctx, "water-cooler-glug-bubbles", 0.7);
      say(who, `Filling… press E between ${BAND[0]} and ${BAND[1]}%.`, ctx); return;
    }
    if (s.kind === "fountain") {
      if (now < (s.next ?? 0)) { say(who, "It coughs. Nothing yet.", ctx); return; }
      s.next = now + 45000; snd(ctx, "drinking-fountain-water-run", 0.6);
      if (who) { who.state.thirst = Math.min(100, (who.state.thirst ?? 100) + 30); who.state.sanity = (who.state.sanity ?? 0) + 6; }
      say(who, "Cold, sweet, faintly almond. Thirst +30.", ctx); return;
    }
    if (s.kind === "vend") {
      if (now < (s.next ?? 0)) { say(who, "The coil's empty. It hums, restocking from nowhere.", ctx); return; }
      s.next = now + 150000; snd(ctx, "vending-machine-clunk-item-drop", 0.8); const r = ctx.random();
      if (r < 0.2) { say(who, "You press B4. The glass gives like water and pulls you in. You smell fries.", ctx); ctx.cross(who, "level61#l61-from-l4"); return; } // Level 6.1's way in (wiki: any button on a Level 4 vending machine)
      if (r < 0.45) { who.state.almonds = (who.state.almonds ?? 0) + 1; say(who, "A bottle of almond water thunks down. +1", ctx); }
      else if (r < 0.85) { who.state.hunger = Math.min(100, (who.state.hunger ?? 100) + 30); say(who, "A granola bar from a brand that never existed. Hunger +30.", ctx); }
      else say(who, "The coil turns. Nothing falls. Something behind the glass waves.", ctx);
      return;
    }
    if (s.kind === "stairs") { snd(ctx, "heavy-chain-rattle-on-metal-door", 0.7); say(who, "LEVEL 5 · The chain lies on the landing, cut. Walk on down.", ctx); }
  },
};
export const updateSchedule = { every: 3 };
export function update(ctx, dt) {
  const s = ctx.self.state;
  if (s.kind !== "cooler") return ctx.sleep();
  if (!s.fillBy) { jugs(ctx); return ctx.sleep(10); }
  s.fill = Math.min(100, (s.fill ?? 0) + s.rate * dt * (0.75 + 0.5 * Math.sin((ctx.now() - s.fillAt) / 180))); // the flow surges and sags
  if (s.fill >= 100) { const who = ctx.getObject(s.fillBy); s.fillBy = null; s.fill = 0; s.streak = 0; s.jugs = jugs(ctx) - 1; s.jugAt = ctx.now();
    heard(ctx, { clip: G("water-splash-spill-on-carpet"), position: { ...ctx.self.worldFeetPosition, y: 0.5 }, volume: 0.7, maxDistance: 12 });
    say(who, "It overflows onto the carpet. The jug's wasted.", ctx); }
}
