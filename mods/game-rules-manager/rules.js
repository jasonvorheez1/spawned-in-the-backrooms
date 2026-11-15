// Edge: reads the rules files into world.state.grm for every HUD, writes them back on an editor's save.
import { FILES, SKIP, parse, serialize, settle, parseSkip, serializeSkip } from "./lib/rules-format.js";

// A mod cannot put a button on the host game's HUD by itself: the HUD is the host's ui.js. So the FIRST
// ping on install hands this world's Savi the exact wiring, then the seed. Removing the mod needs the
// same wiring taken out first (a dangling import breaks the HUD); the skill says so.
const HUD_STEPS = (ui) => `STEP 1, HUD BUTTON (do this first). Wire the 📜 Game Rules button into this game's HUD file ${ui}:
(a) at the top of ${ui}, add exactly these three lines (the path is relative to ${ui}; from scripts/ui.js it is "../mods/game-rules-manager/lib/panel.js"):
  import { rulesHtml, grm as grmPress, grmType as grmTyped } from "../mods/game-rules-manager/lib/panel.js";
  export function grm(a, i, s) { grmPress(a, i, s); }
  export function grmType(i, v) { grmTyped(i, v); }
(b) in its default export, append \${rulesHtml(ctx, player)} to the returned HTML, AFTER the game's own root element closes (a sibling, never inside a clipped/overflow:hidden box). It draws a dock button bottom-left (#grm-dock) and the panel as a full-screen modal; editors only, players see nothing.
(c) in world.config.yaml under inputs.actions add:  rulesSave: {}  and  rulesLoad: {}
(d) check: look target "ui", selector "#grm-btn" must answer one button "📜 Game Rules"; press it and the panel opens on the All games tab. If the dock overlaps the game's own bottom-left UI, move #grm-dock with a style rule in the host HUD, not in the mod.
On REMOVE of the mod: undo (a)(b)(c) first, then remove, or the HUD fails to compile.`;
const SEED_STEPS = `STEP 2, SEED THE RULES. The rule files were empty, so I created them. Seed them from your notes on this creator: every standing rule that applies to all their games goes in rules/ALL_GAMES_RULES.md, rules for this game alone go in rules/GAME_RULES.md (one \`N. [applied] text\` line each, priority order), and any all-games rule that does not fit this game goes in rules/NOT_IN_THIS_GAME.md as \`- exact text\`. Then set world.state.grm.seeding = false and send rulesLoad (or rewrite world.state.grm) so the panel shows them.`;
// the host HUD file, and whether it already carries the panel
const hudFile = (ctx) => ctx.world.ui?.render ?? "scripts/ui.js";
const hudWired = (ctx) => (ctx.files.read(hudFile(ctx)) ?? "").includes("game-rules-manager");
// A fresh install has no rule files. Make them (empty, with headers) so the panel and Savi have one shape to work in.
const ensure = (ctx) => {
  const missing = [...Object.values(FILES), SKIP].filter((f) => ctx.files.read(f.path) == null);
  for (const f of missing) ctx.files.write(f.path, f === SKIP ? serializeSkip([]) : serialize(Object.keys(FILES).find((k) => FILES[k] === f), []));
  return missing.length > 0;
};
// the install ping: HUD wiring first (when the HUD lacks it), seed second (when the lists are empty)
const installPing = (ctx, needSeed) => {
  const steps = [hudWired(ctx) ? null : HUD_STEPS(hudFile(ctx)), needSeed ? SEED_STEPS : null].filter(Boolean);
  if (steps.length) ctx.notifyDmOnce("grm-install", `Game Rules Manager was just installed in this world. ${steps.join("\n\n")}`, { wake: true });
};
const load = (ctx) => {
  const made = ensure(ctx);
  const out = { savedAt: ctx.now(), world: ctx.world.name ?? "" };
  for (const scope of Object.keys(FILES)) out[scope] = { path: FILES[scope].path, rows: parse(ctx.files.read(FILES[scope].path)) };
  out.skip = parseSkip(ctx.files.read(SKIP.path));
  const empty = !out.all.rows.length && !out.game.rows.length;
  out.seeding = empty && (made || !!ctx.world.state.grm?.seeding);
  installPing(ctx, made && empty);
  ctx.world.state.grm = out;
};

export function onSpawn(ctx) { if (!ctx.world.state.grm) load(ctx); else installPing(ctx, false); }

const act = (input, name) => input.pressed?.[name] || input.pressed?.[`game-rules-manager:${name}`];
const data = (input, name) => input.actionData?.[name] ?? input.actionData?.[`game-rules-manager:${name}`];

export function onInput(ctx, input) {
  if (act(input, "rulesLoad")) load(ctx);
  if (!act(input, "rulesSave")) return;
  const d = data(input, "rulesSave") ?? {};
  if (ctx.self.isEditor === false) return;
  const scopes = Object.keys(FILES).filter((s) => Array.isArray(d[s]));
  const skip = Array.isArray(d.skip) ? d.skip.map((t) => String(t).replace(/\s+/g, " ").trim()).filter(Boolean) : null;
  if (!scopes.length && !skip) return;
  const cur = ctx.world.state.grm ?? {};
  const next = { ...cur, savedAt: ctx.now() };
  const lines = [];
  for (const s of scopes) {
    const rows = settle(cur[s]?.rows ?? [], d[s]);
    ctx.files.write(FILES[s].path, serialize(s, rows));
    next[s] = { path: FILES[s].path, rows };
    const pend = rows.filter((r) => r.status === "pending");
    lines.push(`${FILES[s].label} (${FILES[s].path}): ${rows.length} rules, ${pend.length} pending${pend.length ? ": " + pend.map((r) => `#${rows.indexOf(r) + 1} ${r.text}`).join(" | ") : ""}`);
  }
  if (skip) {
    ctx.files.write(SKIP.path, serializeSkip(skip));
    next.skip = skip;
    lines.push(`Not in this game (${SKIP.path}): ${skip.length} all-games rules`);
  }
  ctx.world.state.grm = next;
  ctx.emit("playSound", { clip: "/cdn/moodboard-painterly-fantasy/sfx-page-turn-soft.mp3", volume: 0.5 }, { audience: { player: ctx.self.id } });
  ctx.notifyDm(`Game Rules Manager: ${(ctx.self.displayName ?? "the creator")} saved rules. ${lines.join(" · ")}. Sync my notes to this order and text, then mark the pending rows [applied] in the file.`, { wake: true });
}
