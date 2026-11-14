// Test Range floor pads: step on one and it acts. state.act: smiler | lurker | heal | lv10 | resetphys | exit
import { heard } from "./lib/hear.js";
import L from "./lib/data/level0.yml";
import { toHub } from "./lib/hub.js";
const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp, maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity;
export function onTriggerEnter(ctx, other) {
  const s = other?.state; if (!s || s.level == null) return;
  const act = ctx.self.state.act, now = ctx.now();
  if ((ctx.self.session.at ?? 0) > now - 800) return; ctx.self.session.at = now;
  heard(ctx, { maxDistance: 18, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3", position: other.feetPosition, volume: 0.5 }, { audience: { player: other.id } });
  if (act === "exit") { toHub(ctx, other); return; }
  if (act.startsWith("bay:")) { const k = act.slice(4); ctx.place.state.want_bay = { kind: k, at: now }; s.notice = { text: k === "clear" ? "Enemy bay cleared" : "Something is coming out of the pen", at: now }; return; } // the Enemy Bay (scripts/lib/foe-bay.js)
  if (act === "smiler" || act === "lurker" || act === "resetphys") { ctx.place.state["want_" + act] = now; s.notice = { text: act === "resetphys" ? "Physics bay resetting" : `A ${act} is coming out of the pen`, at: now }; return; }
  if (["pool", "roll", "crate", "corpse"].includes(act)) { ctx.place.state["want_" + act] = s.level ?? 1; s.notice = { text: { pool: "Loot pool switched", roll: `Rolling the list at level ${s.level}`, crate: "Test crate dropped", corpse: "Three fresh bodies to search" }[act], at: now }; return; } // the Loot Lab (scripts/lib/loot-lab.js)
  if (act === "squad") { ctx.place.state.want_squad = { by: other.id, at: now }; s.notice = { text: "Hit squad incoming down the firing lane", at: now }; return; } // a hit squad on demand (scripts/lib/hit-squad.js)
  if (act === "lv10") { s.level = Math.max(10, s.level); s.leveledAt = now; }
  else if (/^lv\d+$/.test(act) && ctx.self.id.includes("-lab-")) { s.level = +act.slice(2); s.xp = 0; s.leveledAt = now; } // the lab's level pads set it exactly, down too
  s.hp = maxHp(s.level); s.sanity = maxSan(s.level); s.stamina = L.stamina; s.battery = L.battery; s.hunger = 100; s.thirst = 100;
  s.notice = { text: /^lv/.test(act) ? `Level ${s.level} and topped up` : "Health, sanity, food and water topped up", at: now };
}
