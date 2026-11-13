// Favi's pocket Forge: Idea Forge's file shape (categories → fields), its plain-data format both ways, and the finalize writers.
export const STARTER = [
  ["Overview", ["Title", "Genre", "Premise", "Tone & Mood", "Target Audience", "Design Pillars"]],
  ["Core Loop", ["Moment-to-Moment", "Session Loop", "Win Condition", "Lose Condition", "Progression"]],
  ["Controls & Platform", ["Perspective / Camera", "Controls", "Platforms", "Multiplayer"]],
  ["Features & Systems", ["Core Systems", "Secondary Systems", "Economy / Rewards"]],
  ["World & Lore", ["Setting", "History", "Factions"]],
  ["Characters", ["Player Character", "Allies", "Villains / Bosses"]],
  ["Enemies & NPCs", ["Enemy Types", "NPC Roles", "AI Behavior"]],
  ["Levels & Places", ["Areas", "Layout & Flow", "Encounters", "Landmarks"]],
  ["UI & HUD", ["HUD", "Menus", "Feedback"]],
  ["Art Direction", ["Visual Style", "Palette", "References"]],
  ["Audio", ["Music", "Sound Effects", "Voice"]],
  ["Feel & VFX", ["Game Feel / Juice", "Effects", "Weather & Atmosphere"]],
  ["Scope & Build Plan", ["MVP", "Stretch Goals", "Risks"]],
];
export const PRESETS = [
  ["full", "Full", "Every field, sectioned, with build priorities.", "Write the complete build prompt: every category as a markdown section (## NAME), every decision kept, undecided fields marked for the builder to choose, then build priorities."],
  ["short", "Short", "Under 250 words. The decisions that matter.", "Under 250 words: the pitch, the core loop, win/lose, controls, the look, and the 3 must-haves. Nothing else."],
  ["spawn", "Savi build", "A build brief for Savi on Spawn.", "The builder is Savi on Spawn building a 3D multiplayer browser game. Structure: the game in two lines and a style family; the place (terrain, hour, weather, the landmark seen first); the loop step by step from spawn; win, lose, HUD; every object a press touches and what it does; sound; then a phase-by-phase build order where each phase plays. Include every piece of information in the file."],
  ["code", "Code agent", "Stack, architecture, data, milestones.", "The reader is an AI coding agent. Structure: summary, recommended stack, architecture (modules and what each owns), data model, the core loop as code responsibilities, content lists, milestones. Include every piece of information in the file."],
];
export const RATE_AXES = ["hook", "clarity", "depth", "originality", "ready"];

export function slug(s) { return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }
export function count(p) {
  let filled = 0, total = 0;
  for (const c of p?.cats ?? []) for (const f of c.fields ?? []) { total++; if (String(f.value ?? "").trim()) filled++; }
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
}
// a new file is named off its pitch until the creator (or a round) gives it a real Title
export function nameFrom(pitch) { const w = String(pitch ?? "").trim().replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean); const t = w.slice(0, 6).map((x, i) => i && /^(a|an|the|of|in|on|and|or|to|for|with)$/i.test(x) ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1)).join(" "); return t ? t.slice(0, 60) : "Untitled"; }
export function blank(id, pitch, now) {
  return { id, title: nameFrom(pitch), pitch: String(pitch ?? "").trim(), created: now,
    cats: STARTER.map(([name, labels], ci) => ({ id: "c" + ci, name, fields: labels.map((label, fi) => ({ id: `f${ci}_${fi}`, label, value: "" })) })), history: [] };
}
// Idea Forge's Plain Data, read back in: "GAME IDEA: …", "[Category]", "Label: value" (values may run over lines), "[Question Log]" Q:/A:
export function parsePlain(id, text, now) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const p = { id, title: "", pitch: "", created: now, cats: [], history: [] };
  let cat = null, field = null, inLog = false, q = null, ci = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = line.match(/^\s*([A-Z ]{2,20}) IDEA:\s*(.*)$/);
    if (head && !p.cats.length && !p.pitch) { p.pitch = head[2].trim(); field = null; continue; }
    const sec = line.match(/^\s*\[(.+)\]\s*$/);
    if (sec) {
      field = null;
      if (/^question log$/i.test(sec[1].trim())) { inLog = true; cat = null; continue; }
      inLog = false; cat = { id: "c" + ci++, name: sec[1].trim(), fields: [] }; p.cats.push(cat); continue;
    }
    if (inLog) {
      const m = line.match(/^\s*([QA]):\s*(.*)$/);
      if (m && m[1] === "Q") q = { q: m[2], a: "" }; else if (m && q) { q.a = m[2]; p.history.push(q); q = null; }
      continue;
    }
    if (!cat) { if (line.trim() && !p.pitch) p.pitch = line.trim(); else if (line.trim() && p.pitch && !p.cats.length) p.pitch += " " + line.trim(); continue; }
    const kv = line.match(/^\s*([^:]{1,60}):\s?(.*)$/);
    if (kv && !/^\s/.test(raw)) { field = { id: `${cat.id}_${cat.fields.length}`, label: kv[1].trim(), value: kv[2] }; cat.fields.push(field); continue; }
    if (field) field.value += "\n" + line;
  }
  for (const c of p.cats) for (const f of c.fields) f.value = f.value.trim();
  p.title = (p.cats[0]?.fields.find((f) => /^title$/i.test(f.label))?.value || "").split("\n")[0].trim() || p.pitch.split(/[.!?]/)[0].slice(0, 50) || "Imported file";
  return p.cats.length ? p : null;
}
export function plainData(p) {
  const out = [`GAME IDEA: ${p.pitch}`, ""];
  for (const c of p.cats) { out.push(`[${c.name}]`); for (const f of c.fields) out.push(`${f.label}: ${f.value ?? ""}`); out.push(""); }
  if ((p.history ?? []).length) { out.push("[Question Log]"); for (const h of p.history) out.push(`Q: ${h.q}`, `A: ${h.a}`); }
  return out.join("\n").trim();
}
export function compactFile(p) {
  return p.cats.map((c) => `[${c.name}]\n` + c.fields.map((f) => `${f.label}: ${String(f.value ?? "").trim() || "(empty)"}`).join("\n")).join("\n\n");
}
export function fallbackPrompt(p) {
  const out = ["You are making the following video game. Treat every section below as the spec. Where a field is marked (undecided), make a choice that fits the rest and state it.", "", "## ONE-LINE IDEA", p.pitch, ""];
  for (const c of p.cats) { out.push(`## ${c.name.toUpperCase()}`); for (const f of c.fields) out.push(`- **${f.label}:** ${String(f.value ?? "").trim() || "(undecided)"}`); out.push(""); }
  out.push("## DELIVERABLE", "Build a complete, playable game that honors every section above: its loop, win and lose, controls, content, UI, art, audio and feel.");
  return out.join("\n");
}
