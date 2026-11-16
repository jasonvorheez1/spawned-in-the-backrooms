// Small things in the Hub you press: the key ledger, the dropped key, the 2019 recorders, the blank door, Camp Amber's box, tapes.
import { setQuest, tellQuest } from "./lib/quests.js";
import { notify } from "./lib/notify.js";
import { noStory, noNpcs } from "./lib/run-opts.js";
import { KEYED, sealed } from "./lib/thehub.js";
import { hasKey, giveKey } from "./lib/hubkeys.js";
import { kick, snd, puff, ready } from "./lib/use-kick.js";
// each kind answers in its own body first: [motion, size, sound, puff]
const FEEL = { ledger: ["flutter", 0.8], loosekey: ["spin", 0.5, "sfx-small-metal-key-skitters-on-concrete.mp3", "dust"], keytag: ["spin", 0.5, "sfx-small-metal-key-skitters-on-concrete.mp3", "dust"],
  rec: ["rattle", 1.2, "sfx-cassette-recorder-play-button-clunk.mp3"], blank: ["sink", 0.6, "sfx-warm-concrete-wall-ticking-as-it-cools.mp3", "dust"], amberbox: ["hop", 1.2, "sfx-cardboard-box-flaps-opened.mp3", "dust"], note: ["flutter", 1, "sfx-paper-note-unfolded.mp3"] };
const M = (id) => ({ place: "thehub", id });
// A run with no story or no people has nobody to hand out Level Keys: the ones lying on the road are yours to take, one per spot per hour.
const LOOSE_MS = 3600000;
function looseKey(ctx, p, s) {
  const id = ctx.self.id, now = ctx.now(), last = s.hubLoose?.[id];
  if (last != null && last <= now && now - last < LOOSE_MS) return notify(ctx, p, "A clean ring in the dust where a key lay. Someone will drop another. They always do.");
  const pool = [...new Set(Object.values(KEYED))].filter((pl) => !sealed(ctx, pl) && !hasKey(s, pl));
  if (!pool.length) return notify(ctx, p, "A Level Key. You already carry one for every door that opens.");
  s.hubLoose = { ...(s.hubLoose ?? {}), [id]: now };
  ctx.emit("playSound", { clip: "cdn/sfx-large-iron-key-turning-in-heavy-old-lock-clunk.mp3", position: ctx.self.worldFeetPosition, volume: 0.45, pitch: 1.5 });
  giveKey(ctx, p, s.quests?.["the-tenth-tunnel"] && pool.includes("level11") ? "level11" : pool[Math.floor(ctx.random() * pool.length) % pool.length]); // on the tenth tunnel's trail the road gives its key first
  return notify(ctx, p, "A Level Key, nobody's. The mark on its bow matches a door somewhere down these tunnels.");
}
export const ears = {
  press(ctx, { by }) {
    const p = ctx.getObject(by), k = ctx.self.state.kind, s = p?.state; if (!s) return;
    const fe = FEEL[k], at = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    if (fe) { kick(ctx, ctx.self, fe[0], { d: fe[1], yaw: ctx.self.rotation?.yaw ?? 0 }); if (fe[2]) snd(ctx, fe[2], at, 0.45, 10); if (fe[3]) puff(ctx, fe[3], { x: at.x, y: at.y + 0.2, z: at.z }); }
    if (k === "ledger") { s.hubLedger = 1; s.hubLead = 1; ctx.emit("playSound", { clip: "cdn/sfx-heavy-paper-ledger-page-turn-dry.mp3", position: ctx.self.worldFeetPosition, volume: 0.6 });
      s.ledgerOpen = 1; s.invOpen = false; return; } // the book opens on screen (scripts/ui.js ledgerUi); you find her row yourself
    const plain = noStory(s) || noNpcs(s);
    if (k === "loosekey") return plain ? looseKey(ctx, p, s) : notify(ctx, p, "A Level Key in the dust, no tag on it. Lin at the Key Cabinet counts every one of these. Leave it for her.");
    if (k === "keytag") { if (plain && (s.hubMK ?? 0) !== 2) return looseKey(ctx, p, s);
      if ((s.hubMK ?? 0) !== 2) return notify(ctx, p, "A Level Key, lying on the road with a brass tag wired to it. It isn't yours and nobody has asked you about it."); s.hubMK = 3; s.hubTag = 1;
      setQuest(s, "hub-missing-key", { name: "The Missing Key", step: "You have the key. Its tag reads CABINET 14. Take it back to Lin, or tell her it's gone.", mark: M("hub-meg-lin") }); tellQuest(ctx, p, "The Missing Key · Return to Lin");
      return notify(ctx, p, "A key with a brass tag: CABINET 14. Beside it, long bare footprints in the dust that stop at the wall."); }
    if (k === "rec") { if ((s.hubLR ?? 0) !== 1) return notify(ctx, p, "An orange survey recorder, M.E.G. stencil, dust thick on it. The tape is still inside."); const i = ctx.self.state.i; if (s.hubRec?.[i]) return notify(ctx, p, "You already took the tape out of this one.");
      s.hubRec = { ...(s.hubRec ?? {}), [i]: 1 }; const n = Object.keys(s.hubRec).length; ctx.emit("playSound", { clip: "cdn/sfx-cassette-tape-eject-plastic-clack.mp3", position: ctx.self.worldFeetPosition, volume: 0.7 });
      if (n >= 3) { s.hubLR = 2; setQuest(s, "hub-lost-records", { name: "Lost Expedition Records", step: "You have all three tapes. Bring them to Sato at Doorstep Carpet. Camp Amber might pay for them too.", mark: M("hub-meg-sato") }); tellQuest(ctx, p, "Lost Expedition Records · 3 / 3"); }
      else { const next = [0, 1, 2].find((j) => !s.hubRec[j]); setQuest(s, "hub-lost-records", { name: "Lost Expedition Records", step: `Find the 2019 survey team's three recorders on the dark road past the M.E.G. barrier: ${n} / 3.`, mark: M("hub-rec-" + next) }); tellQuest(ctx, p, `Lost Expedition Records · ${n} / 3`); }
      return; }
    if (k === "blank") { if ((s.hubUP ?? 0) === 1) { s.hubUP = 2; s.hubBlank = 1; setQuest(s, "hub-uncharted", { name: "Uncharted Passage", step: "The blank door is warm. Tell Sato, Okafor, or Pip at Camp Amber.", mark: M("hub-meg-sato") }); tellQuest(ctx, p, "Uncharted Passage · Report back"); }
      s.hubBlank = 1; return notify(ctx, p, "No mark over it. No keyhole. The concrete is warm, like something on the other side has been leaning on it for a long time."); }
    if (k === "amberbox") { if (s.hubAmberKit) { if (!ready(s, "amber-water", 7200000, ctx.now())) return notify(ctx, p, "One box per face. Pip wrote your face down."); const b = { ...(s.snacks ?? {}) }; b.purified_water = (b.purified_water ?? 0) + 1; s.snacks = b; return notify(ctx, p, "Somebody topped it up with one bottle of water. GO SLOW is underlined twice now."); } s.hubAmberKit = 1; const bag = { ...(s.snacks ?? {}) }; for (const t of ["purified_water", "bandage", "stew"]) bag[t] = (bag[t] ?? 0) + 1; s.snacks = bag;
      return notify(ctx, p, "Camp Amber's newcomer box: water, a tin, a bandage. Someone has written GO SLOW on the lid."); }
    if (k === "note") return notify(ctx, p, ctx.self.state.text);
  },
};
