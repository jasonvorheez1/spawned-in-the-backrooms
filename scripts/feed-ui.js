// The message feed (scripts/lib/feed.js), drawn at the top left like Fallout: New Vegas: lines stack, each fades out on its own clock.
// Animations start with a negative delay (the age already passed) so a re-render never restarts a fading line.
import { LIFE } from "./lib/feed.js";
const COL = { info: "#ffd9a0", warn: "#ff8a6a", good: "#b8e08a", xp: "#ffe27a" };
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
export function feedUi(ctx, player) {
  const s = player.state ?? {}; if (s.level == null || !s.feed?.length) return "";
  const now = ctx.now(), live = s.feed.filter((e) => now - e.at < LIFE); if (!live.length) return "";
  const rows = live.map((e) => { const age = (now - e.at) / 1000;
    return `<div style="margin:0 0 3px;padding:2px 8px 2px 7px;border-left:3px solid ${COL[e.k] ?? COL.info};background:linear-gradient(90deg,rgba(14,9,2,.62),rgba(14,9,2,0));color:${COL[e.k] ?? COL.info};font-size:13px;letter-spacing:.04em;text-shadow:0 1px 2px #000;animation:fdl ${LIFE / 1000}s linear both;animation-delay:-${age.toFixed(2)}s">${esc(e.t)}</div>` }).join("");
  return `<style>@keyframes fdl{0%{opacity:0;transform:translateX(-14px)}4%{opacity:1;transform:none}78%{opacity:1}100%{opacity:0}}</style><div style="position:fixed;left:22px;top:18px;width:min(440px,60vw);pointer-events:none;z-index:40;font-family:inherit">${rows}</div>`;
}
