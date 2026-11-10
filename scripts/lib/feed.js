// The message feed, Fallout: New Vegas style: short lines stacking at the top left of the screen ("You are overencumbered and cannot run",
// "Location discovered: Level 1", "You are hungry", "Low on ammo"), each fading after a few seconds. Lines live on player.state.feed
// = [{ t, at, k }]; scripts/feed-ui.js draws them. Every s.notice the game writes lands here too (scripts/stats.js copies each new one),
// so all the old one-line messages become part of the feed; the status watcher below adds the FNV ones that were never messages.
export const LIFE = 7000, MAX = 6;
export const PLACE_NAMES = { main: "Level 0 · The Lobby", level01: "Level 0.1 · Zenith Station", level1: "Level 1 · Habitable Zone", level2: "Level 2 · Pipe Dreams", level3: "Level 3 · Electrical Station", level4: "Level 4 · Abandoned Office", level5: "Level 5 · Terror Hotel", level6: "Level 6 · Lights Out", level61: "Level 6.1 · The Snackrooms", level11: "Level 11 · The Infinite City", level10: "Level 10 · Bumper Crop", level7: "Level 7 · Thalassophobia", level8: "Level 8 · Cave System", level21: "Level 2.1 · Locked", gamma: "Base Gamma", level12: "Level 12 · Matrix", level26: "Level 26 · SS Fun =)", level184: "Level 184 · Field of Forgotten Forts" };
const kindOf = (t) => (/\b(broken|jam|ruined|cannot|can'?t|not enough|too heavy|starv|dehydrat|badly hurt|vilified|hated|evil|out of ammo|low on ammo|walks away|overencumbered|losing your grip|poor condition)\b/i.test(t) ? "warn"
  : /\b(level up|xp|discovered|skill)\b/i.test(t) ? "xp"
  : /\b(repaired|patches|taped|mended|stitched|bought|sold|gave|liked|idolized|good|coming with you|added|picked up|took)\b/i.test(t) ? "good" : "info");
export function pushFeed(s, text, now, k) {
  const t = String(text ?? "").replace(/<[^>]*>/g, "").trim(); if (!t) return;
  const live = (s.feed ?? []).filter((e) => now - e.at < LIFE);
  if (live.length && live[live.length - 1].t === t && now - live[live.length - 1].at < 1500) return; // the same line twice in a beat is one line
  s.feed = [...live, { t, at: now, k: k ?? kindOf(t) }].slice(-MAX);
}
// the status watcher: crossing a threshold says it once, and says it again only after you recover. Called a few times a second from scripts/stats.js.
export function watch(s, m, now, ctx) {
  const f = (m.flags ??= {}), say = (key, on, off, text, k) => { if (on) { if (!f[key]) { f[key] = 1; pushFeed(s, text, now, k) } } else if (off) f[key] = 0 };
  const hu = s.hunger ?? 100, th = s.thirst ?? 100;
  say("starving", hu < 15, hu > 30, "You are starving.", "warn"); say("hungry", hu < 40 && hu >= 15, hu > 55, "You are hungry.", "warn");
  say("dehydrated", th < 15, th > 30, "You are dehydrated.", "warn"); say("thirsty", th < 40 && th >= 15, th > 55, "You are thirsty.", "warn");
  const mh = s.maxHp ?? 100, hp = s.hp ?? mh; say("hurt", hp > 0 && hp < 0.25 * mh, hp > 0.5 * mh, "You are badly hurt.", "warn");
  const sn = s.sanity ?? 100; say("grip", sn < 25, sn > 40, "You are losing your grip.", "warn"); say("edge", sn < 50 && sn >= 25, sn > 65, "Your mind is fraying.", "warn");
  { const seen = String(s.disc ?? "").split(",").filter(Boolean); if (ctx?.place && !seen.includes(ctx.place)) { s.disc = [...seen, ctx.place].join(","); pushFeed(s, `Location discovered: ${PLACE_NAMES[ctx.place] ?? ctx.place}`, now, "xp"); return { discovered: ctx.place } } }
  return null;
}
