import { hostileReason } from "./forgive.js";
// Companions, Fallout: New Vegas style. A person who walks with you (state.follow = your id; scripts/meg-agent.js does the walking and fighting) now also has:
//   a perk      what they are good at, always the same for the same person (medic, mule, gunhand, mechanic, tough), stronger as loyalty grows
//   loyalty     0..100, grows while they walk with you and when you treat their people well, falls when you are cruel; at 0 they leave
//   orders      wait here / follow me, hold fire / free fire, a weapon from you (and back), dismiss (the talk menu: scripts/talk-ui.js, scripts/talk.js)
//   the doors   when you cross a threshold they come with you (scripts/level-door.js), unless told to wait
// Perks run from here, from the player's side (scripts/stats.js update calls tick), so the agent script stays about walking and fighting.
import T from "./data/talk.yml";
import W from "./weapons.js";
import { groupOf, isHated, repOf } from "./rep.js";
import { cndOf } from "./condition.js";
import { skillsOf } from "./stats.js";

export const PERKS = {
  medic: { name: "Field medic", info: "patches you up when you are hurt" },
  mule: { name: "Pack mule", info: "carries 12 kg for you" },
  gunhand: { name: "Gunhand", info: "their shots hit 40% harder" },
  mechanic: { name: "Mechanic", info: "keeps your weapon from wearing out" },
  tough: { name: "Tough", info: "60% more hit points" },
};
const ORDER = ["medic", "mule", "gunhand", "mechanic", "tough"];
const NOT = ["trader", "quarter", "smith"]; // shopkeepers stay at their stalls
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const idOf = (it) => String(it.id).split("/").pop();
export const perkOf = (it) => it.state?.cperk ?? (it.state?.role === "medic" ? "medic" : ORDER[hash(idOf(it)) % ORDER.length]);
export const isMine = (it, pl) => it?.state?.follow === pl.id && !it.state.dead;
export const followersOf = (ctx, pl) => ctx.query({ tags: ["npc"] }).filter((o) => isMine(o, pl));
export const loyaltyScale = (it) => 1 + (it.state?.loyal ?? 50) / 200; // 1.25 to 1.5 at the top

// can this person be asked? (the reason if not)
export function whyNot(ctx, pl, it) {
  const s = it.state ?? {};
  if (s.dead || (s.hp ?? 1) <= 0) return "They are in no shape to go anywhere.";
  if (NOT.includes(s.role)) return "They have a stall to keep. They are not leaving it.";
  if (s.mjguest || it.tags?.includes?.("faceling") || it.tags?.includes?.("l5staff")) return "They are not the walking kind.";
  if (hostileReason(ctx, it, pl) || isHated(pl.state, it)) return "They want nothing to do with you.";
  const r = s.rapport?.[pl.userId ?? pl.id] ?? 0;
  if (r < T.join.rapport) return `They do not know you well enough yet (${Math.round(r)}/${T.join.rapport} rapport).`;
  if (followersOf(ctx, pl).length >= T.join.max) return `You already have ${T.join.max} people with you.`;
  return "";
}
export function recruit(ctx, pl, it) {
  const bad = whyNot(ctx, pl, it); if (bad) return bad;
  adopt(pl, it); return "";
}
// the setup, without the checks (a person the chat has talked into coming along is adopted the same way)
export function adopt(pl, it) {
  const s = it.state, perk = perkOf(it);
  s.follow = pl.id; pl.state.crew = [...new Set([...(pl.state.crew ?? []), it.id])]; s.cperk = perk; s.loyal ??= 50; s.cmd = "follow"; s.cstance = "free"; s.waitAt = undefined; s.rounds = undefined;
  if (perk === "tough" && !s.toughed) { s.toughed = true; s.maxHp = Math.round((s.maxHp ?? 100) * 1.6); s.hp = Math.min(s.maxHp, Math.round((s.hp ?? 100) * 1.6)); }
}
export function dismiss(ctx, pl, it) {
  const s = it.state; if (!isMine(it, pl)) return;
  s.follow = null; s.cmd = undefined; s.waitAt = undefined; s.home = { x: it.feetPosition.x, y: it.feetPosition.y, z: it.feetPosition.z }; s.rounds = undefined;
  takeWeapon(ctx, pl, it, true);
  if (s.toughed) { s.toughed = false; s.maxHp = Math.round((s.maxHp ?? 160) / 1.6); s.hp = Math.min(s.hp ?? 1, s.maxHp); }
}
export function order(ctx, pl, it, k) {
  const s = it.state; if (!isMine(it, pl)) return "";
  if (k === "wait") { s.cmd = "wait"; s.waitAt = { x: it.feetPosition.x, y: it.feetPosition.y, z: it.feetPosition.z }; return "They will wait here."; }
  if (k === "follow") { s.cmd = "follow"; s.waitAt = undefined; return "They will follow you."; }
  if (k === "hold") { s.cstance = "hold"; return "They will hold fire."; }
  if (k === "free") { s.cstance = "free"; return "They will fight what threatens you."; }
  return "";
}
// arm them from your spare weapons (the best one that is not in your hands), and take it back
export function giveWeapon(ctx, pl, it) {
  const s = it.state, ps = pl.state; if (!isMine(it, pl)) return "";
  const list = String(ps.weapons ?? "").split(",").filter(Boolean).slice(1), spare = list.filter((k, i) => W[k] && !(k === ps.equipped && list.indexOf(k) === i));
  const best = spare.sort((a, b) => (W[b].damage / W[b].cooldown) - (W[a].damage / W[a].cooldown))[0];
  if (!best) return "You have no spare weapon to give.";
  list.splice(list.indexOf(best), 1); ps.weapons = ["fists", ...list].join(",");
  if (s.gaveArm) takeWeapon(ctx, pl, it, true);
  s.gaveArm = best; s.armWas = s.arm; s.arm = best;
  return `Gave them your ${W[best].name.toLowerCase()}.`;
}
export function takeWeapon(ctx, pl, it, quiet = false) {
  const s = it.state, ps = pl.state; if (!s.gaveArm) return quiet ? "" : "You gave them nothing to take back.";
  const k = s.gaveArm; ps.weapons = [...String(ps.weapons ?? "fists").split(",").filter(Boolean), k].join(","); s.arm = s.armWas ?? "fists"; s.gaveArm = undefined; s.armWas = undefined;
  return quiet ? "" : `Took your ${W[k]?.name?.toLowerCase() ?? "weapon"} back.`;
}

// every few seconds, from the player's side: perks, loyalty, and the mule's weight
export function tick(ctx, pl) {
  const s = pl.state, now = ctx.now(), m = (pl.session.comp ??= { at: 0, heal: 0, fix: 0, loy: 0 });
  if (now - m.at < 1000) return; m.at = now;
  const fs = followersOf(ctx, pl).filter((o) => flat(o.feetPosition, pl.feetPosition) < 40);
  s.carryBonus = fs.some((o) => perkOf(o) === "mule") ? 12 : 0;
  for (const o of fs) {
    const k = perkOf(o), sc = loyaltyScale(o);
    if (k === "medic" && now - m.heal > 25000 && (s.hp ?? 100) < 0.6 * (100 + ((s.level ?? 1) - 1) * 10) && flat(o.feetPosition, pl.feetPosition) < 6) {
      m.heal = now; s.hp = (s.hp ?? 0) + 14 * sc * (1 + (skillsOf(o.state).medicine ?? 0) / 200); s.notice = { text: `${o.state.name ?? "Your companion"} patches you up`, at: now };
    }
    if (k === "mechanic" && now - m.fix > 6000 && s.equipped && s.equipped !== "fists" && cndOf(s, s.equipped) < 94) { m.fix = now; s["cnd_" + s.equipped] = Math.min(100, cndOf(s, s.equipped) + 0.9 * sc); }
  }
  if (now - m.loy > 30000) { m.loy = now; for (const o of fs) { // time together, and how you are: a cruel leader loses them
    const cruel = (s.karma ?? 0) <= -40 && groupOf(o) !== "lightless", d = cruel ? -3 : 1;
    o.state.loyal = Math.max(0, Math.min(100, (o.state.loyal ?? 50) + d));
    if (o.state.loyal <= 0) { dismiss(ctx, pl, o); s.notice = { text: `${o.state.name ?? "Your companion"} walks away from you`, at: now }; }
  } }
}
// when the player crosses a threshold, the companions near them cross with them
export function bring(ctx, pl, link) {
  if (!pl?.feetPosition) return;
  for (const o of followersOf(ctx, pl)) {
    if (!o.feetPosition || o.state.cmd === "wait" || flat(o.feetPosition, pl.feetPosition) > 16) continue;
    o.state.home = undefined; o.state.rounds = undefined; o.state.waitAt = undefined;
    try { ctx.cross(o, link); } catch (e) { ctx.log("bring", o.id, String(e?.message ?? e)); }
  }
}
