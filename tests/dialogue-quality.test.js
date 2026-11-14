import { expect, test } from "bun:test";
import fs from "fs";
import path from "path";

import dlgHub from "../scripts/lib/data/dlg-thehub.yml";
import dlgGeneric from "../scripts/lib/data/dlg-generic.yml";
import dlgQuestMain from "../scripts/lib/data/dlg-quest-main.yml";
import dlgLevelRun from "../scripts/lib/data/dlg-levelrun.yml";
import dlg13 from "../scripts/lib/data/dlg-levels-1-3.yml";
import dlg4 from "../scripts/lib/data/dlg-level4.yml";
import dlg5 from "../scripts/lib/data/dlg-level5.yml";
import dlg78 from "../scripts/lib/data/dlg-levels-7-8.yml";
import dlgLv13 from "../scripts/lib/data/dlg-level13.yml";
import dlg31 from "../scripts/lib/data/dlg-level31.yml";
import dlg70 from "../scripts/lib/data/dlg-level70.yml";
import samantha from "../scripts/lib/data/samantha.yml";
import chatter from "../scripts/lib/data/chatter.yml";
import canned from "../scripts/lib/data/canned-talk.yml";
import errands from "../scripts/lib/data/errands.yml";

const DLG_FILES = {
  "dlg-thehub.yml": dlgHub,
  "dlg-generic.yml": dlgGeneric,
  "dlg-quest-main.yml": dlgQuestMain,
  "dlg-levelrun.yml": dlgLevelRun,
  "dlg-levels-1-3.yml": dlg13,
  "dlg-level4.yml": dlg4,
  "dlg-level5.yml": dlg5,
  "dlg-levels-7-8.yml": dlg78,
  "dlg-level13.yml": dlgLv13,
  "dlg-level31.yml": dlg31,
  "dlg-level70.yml": dlg70,
};

const SLOP_RX = /\b(perhaps|chosen one|destiny|nothing is ever|more than just|not ready for the truth|you'll understand eventually|some things are better left|answers have always been|things aren't what they seem|what you become|tapestry of)\b/i;

function collectStrings(val, out = []) {
  if (typeof val === "string") out.push(val);
  else if (Array.isArray(val)) val.forEach((v) => collectStrings(v, out));
  else if (val && typeof val === "object") Object.values(val).forEach((v) => collectStrings(v, out));
  return out;
}

function walkAskNodes(nodes, cb) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    cb(node);
    if (Array.isArray(node?.then)) walkAskNodes(node.then, cb);
  }
}

test("all YAML dialogue, chatter, Samantha, and errand data avoid em-dashes and banned AI-slop clichés", () => {
  const datasets = {
    ...DLG_FILES,
    "samantha.yml": samantha,
    "chatter.yml": chatter,
    "canned-talk.yml": canned,
    "errands.yml": errands,
  };
  const violations = [];
  for (const [name, data] of Object.entries(datasets)) {
    for (const s of collectStrings(data)) {
      if (s.includes("\u2014")) violations.push(`${name}: em-dash in "${s.slice(0, 80)}"`);
      if (SLOP_RX.test(s)) violations.push(`${name}: AI slop match in "${s.slice(0, 80)}"`);
    }
  }
  expect(violations).toEqual([]);
});

test("all NPC ask trees have non-empty prompts/replies, valid skill checks, and distinct questions per file", () => {
  const CORE_QS = new Set(["Where am I?", "How do I get out?", "Ever hear the name Dina?"]);
  const badNodes = [];
  const dupQuestions = [];

  for (const [file, tree] of Object.entries(DLG_FILES)) {
    const counts = new Map();
    for (const [npcId, npc] of Object.entries(tree)) {
      if (!npc || typeof npc !== "object" || !Array.isArray(npc.ask)) continue;
      walkAskNodes(npc.ask, (node) => {
        if (typeof node.q !== "string" || !node.q.trim()) badNodes.push(`${file}/${npcId}: empty q`);
        const hasA =
          (typeof node.a === "string" && node.a.trim().length > 0) ||
          (Array.isArray(node.a) && node.a.length > 0 && node.a.every((x) => typeof x === "string" && x.trim().length > 0));
        if (!hasA) badNodes.push(`${file}/${npcId}/${node.q}: empty a`);
        if (node.sk !== undefined && !/^[a-z]+ \d+$/.test(String(node.sk))) {
          badNodes.push(`${file}/${npcId}/${node.q}: invalid sk "${node.sk}"`);
        }
      });
      if (file !== "dlg-generic.yml" && file !== "dlg-quest-main.yml") {
        for (const node of npc.ask) {
          if (CORE_QS.has(node.q)) continue;
          counts.set(node.q, (counts.get(node.q) ?? 0) + 1);
        }
      }
    }
    for (const [q, n] of counts.entries()) {
      if (n >= 3) dupQuestions.push(`${file}: "${q}" repeated ${n} times`);
    }
  }

  expect(badNodes).toEqual([]);
  expect(dupQuestions).toEqual([]);
});

test("quest dialogue modules avoid em-dashes and AI-slop phrasing in player-facing strings", () => {
  const ROOT = path.resolve(import.meta.dir, "..");
  const files = [
    "scripts/lib/ch2-quest.js",
    "scripts/lib/level61-quests.js",
    "scripts/lib/level11-quests.js",
    "scripts/lib/quest-dialogue.js",
    "scripts/lib/l5-beast.js",
    "scripts/lib/hub-quest.js",
    "scripts/lib/dina-quest.js",
  ];
  const issues = [];
  for (const rel of files) {
    const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/);
    lines.forEach((line, idx) => {
      const code = line.replace(/\/\/.*$/, "");
      if (code.includes("\u2014")) issues.push(`${rel}:${idx + 1}: em-dash`);
      if (SLOP_RX.test(code)) issues.push(`${rel}:${idx + 1}: AI slop`);
    });
  }
  expect(issues).toEqual([]);
});

test("errands with faction gating have unique in-character refusal lines", () => {
  const gated = errands.filter((e) => e?.needs?.text);
  expect(gated.length).toBeGreaterThan(0);
  const texts = gated.map((e) => e.needs.text.trim());
  expect(new Set(texts).size).toBe(texts.length);
});
