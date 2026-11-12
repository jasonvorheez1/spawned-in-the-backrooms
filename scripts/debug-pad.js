// A debug room pad: step on it and it acts on you. state.act: exit | lv10 | lv1 | heal
import { heard } from "./lib/hear.js";
import L from "./lib/data/level0.yml";
const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp, maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity;
export function onTriggerEnter(ctx, other) {
  const s = other.state;
  if (!s || s.level == null) return;
  const act = ctx.self.state.act;
  heard(ctx, { maxDistance: 18, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3", position: other.feetPosition, volume: 0.6 }, { audience: { player: other.id } });
  if (act === "smiler" || act === "lurker") { ctx.place.state["want_" + act] = true; return; }
  if (act === "exit") { ctx.cross(other, "main"); return; }
  if (act === "lv10" || act === "lv1") { s.level = act === "lv10" ? 10 : 1; s.xp = 0; s.leveledAt = ctx.now(); }
  s.hp = maxHp(s.level); s.sanity = maxSan(s.level); s.stamina = L.stamina; s.battery = L.battery;
  if (act === "heal") s.almonds = Math.max(s.almonds ?? 0, L.almondRefill);
}
