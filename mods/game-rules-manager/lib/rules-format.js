// Pure: the rules file <-> rows. A file is a title, a note, then "N. [status] text" lines.
export const FILES = {
  all: { path: "rules/ALL_GAMES_RULES.md", title: "Game Rules — All Games", label: "All games" },
  game: { path: "rules/GAME_RULES.md", title: "Game Rules — This Game", label: "This game" },
};
// this world's own list of all-games rules it does not use, one "- text" line each (matched by rule text)
export const SKIP = { path: "rules/NOT_IN_THIS_GAME.md", title: "All-games rules not used in this game" };
const SKIP_NOTE = "<!-- Managed by the Game Rules Manager mod. Each line is the exact text of a rule in ALL_GAMES_RULES.md that this game does not use. -->";
export const parseSkip = (text) => String(text ?? "").split("\n").map((l) => /^\s*-\s+(.+?)\s*$/.exec(l)?.[1]).filter(Boolean);
export const serializeSkip = (texts) => [`# ${SKIP.title}`, "", SKIP_NOTE, "", ...texts.map((t) => `- ${String(t).replace(/\s+/g, " ").trim()}`), ""].join("\n");
export const STATUSES = ["applied", "pending"];
const NOTE = "<!-- Managed by the Game Rules Manager mod. One rule per numbered line, in priority order. [applied] = in force: Savi follows it. [pending] = saved, waiting for Savi to take it in. -->";

export const parse = (text) =>
  String(text ?? "").split("\n")
    .map((l) => /^\s*\d+\.\s*(?:\[(applied|pending)\]\s*)?(.+?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m, i) => ({ id: `r${i + 1}`, status: m[1] ?? "pending", text: m[2] }));

export const serialize = (scope, rows) =>
  [`# ${FILES[scope].title}`, "", NOTE, "", ...rows.map((r, i) => `${i + 1}. [${r.status}] ${r.text.replace(/\s*\n\s*/g, " ").trim()}`), ""].join("\n");

// a saved row keeps its status when its text is untouched; new or changed text waits for Savi
export const settle = (prev, rows) => {
  const was = new Map(prev.map((r) => [r.text, r.status]));
  return rows
    .map((r) => ({ text: String(r.text ?? "").replace(/\s+/g, " ").trim() }))
    .filter((r) => r.text)
    .map((r, i) => ({ id: `r${i + 1}`, text: r.text, status: was.get(r.text) ?? "pending" }));
};
