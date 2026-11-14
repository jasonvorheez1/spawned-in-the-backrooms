// New Vegas hit squads: a faction that hates you (infamy >= 35 with fame under 35) sends armed people after you.
// Runs on the player's own machine from scripts/main-menu.js. They spawn where you stood about half a minute ago (ground you walked, never inside a wall),
// head for where you are, and fight on sight (hostileReason reads attackOnSight). Numbers are her picks.
import { infamyOf, fameOf, GROUPS } from "./rep.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { weaponBody } from "./weapon-look.js";

const SAFE = new Set(["intake", "tutorial0", "bonus", "home11", "level5", "spamton", "testlab", "levelrun"]);
const CHECK_MS = 60000, CHANCE = 0.3, COOLDOWN_MS = 20 * 60000, LIFE_S = 600, TRAIL_MS = 4000;
const SQUADS = {
  meg: { look: "agent", role: "guard", guns: ["carbine", "pistol", "shotgun"], name: "M.E.G. retrieval team", top: "#b6e04a" },
  bntg: { look: "trader", role: "scout", guns: ["shotgun", "pistol", "knife"], name: "B.N.T.G. collector" },
  surrender: { look: "guard", role: "guard", guns: ["carbine", "pistol"], name: "Fort Surrender warden" },
  froid: { look: "guard", role: "guard", guns: ["carbine", "pistol"], name: "River Guard" },
  gelu: { look: "pilgrim", role: "pilgrim", guns: ["knife", "crowbar", "pistol"], name: "Carnifex" },
};
const hates = (st, g) => infamyOf(st, g) >= 35 && fameOf(st, g) < 35;

export function squadTick(ctx, ses, st, place) {
  if (SAFE.has(place) || st.menuOpen || st.cut || st.hubcut || st.lrunCut) return;
  const now = ctx.now(), p = ctx.self.feetPosition;
  if (ses.sqPlace !== place) { ses.sqPlace = place; ses.trail = []; ses.sqAt = now; }
  if (now - (ses.trailAt ?? 0) > TRAIL_MS) { ses.trailAt = now; (ses.trail ??= []).push({ x: p.x, y: p.y, z: p.z, at: now }); if (ses.trail.length > 12) ses.trail.shift(); }
  if (now - (ses.sqAt ?? 0) < CHECK_MS) return; ses.sqAt = now;
  const due = Object.keys(SQUADS).filter((g) => hates(st, g) && now - (st.squadAt?.[g] ?? -1e12) > COOLDOWN_MS);
  if (!due.length || ctx.random() > CHANCE) return;
  const g = due[Math.floor(ctx.random() * due.length)], S = SQUADS[g];
  const from = (ses.trail ?? []).find((t) => now - t.at > 25000 && Math.hypot(t.x - p.x, t.z - p.z) > 14 && Math.hypot(t.x - p.x, t.z - p.z) < 70);
  if (!from) return;
  st.squadAt = { ...(st.squadAt ?? {}), [g]: now };
  sendSquad(ctx, g, from, ctx.self.id, p, infamyOf(st, g) >= 60 ? 4 : 3);
  st.notice = { text: `${GROUPS[g]?.name ?? g} sent people after you.`, at: now };
  ctx.emit("playSound", { clip: "cdn/sfx-walkie-talkie-radio-squelch-burst-then-static.mp3", volume: 0.6 });
}
// spawns one squad at `from`, hunting `hunter`: used by the timer above and the Test Range pad (places/testlab/sim.js)
export const SQUAD_KEYS = Object.keys(SQUADS);
export function sendSquad(ctx, g, from, hunter, home, n = 3) {
  const S = SQUADS[g], now = ctx.now();
  for (let i = 0; i < n; i++) {
    const id = `squad-${g}-${Math.round(now)}-${i}`, gun = S.guns[i % S.guns.length], x = from.x + (i - n / 2) * 0.9, z = from.z + (i % 2) * 0.9;
    const look = npcLook(id, S.top ? { topw: "jacket", top: S.top } : {}, S.look, 8, S.role);
    ctx.spawn(id, { tags: ["npc", "hit-squad"], feetPosition: { x, y: from.y + 0.25, z }, physics: "character", lifetime: LIFE_S,
      ...critterSpec(look), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name: S.name, role: S.role, faction: g, attackOnSight: true, hunting: hunter, home: { x: home.x, y: home.y, z: home.z }, hp: 140, maxHp: 140 } });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: gun }, ...weaponBody(gun) });
  }
  return S.name;
}
// keep each squad's home on the player it hunts, so the leash pulls them along; called from the same tick
export function squadFollow(ctx) {
  const p = ctx.self.feetPosition;
  for (const r of ctx.query({ tags: ["hit-squad"], radius: 120 })) {
    if (r.state?.hunting !== ctx.self.id || r.state?.dead) continue;
    const h = r.state.home; if (!h || Math.hypot(h.x - p.x, h.z - p.z) > 6) r.state.home = { x: p.x, y: p.y, z: p.z };
  }
}
