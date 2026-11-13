// The Hub's people and its three optional quests (my designs, off Shelly's brief #320257). Nothing starts by talking alone:
// each quest is a line the player chooses. Stages live on the player: hubMK (The Missing Key), hubLR (Lost Expedition Records),
// hubUP (Uncharted Passage): 0 none, 1.. stages, 99 done. Keys: scripts/lib/hubkeys.js.
import { setQuest, endQuest, tellQuest } from "./quests.js";
import { addRep } from "./rep.js";
import { giveKey, hasKey, keysOf, keyDoor } from "./hubkeys.js";
import { runOf, KEYED } from "./thehub.js";
const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const M = (id) => ({ place: "thehub", id });
export const MK = "hub-missing-key", LR = "hub-lost-records", UP = "hub-uncharted";
const N = { [MK]: "The Missing Key", [LR]: "Lost Expedition Records", [UP]: "Uncharted Passage" };
const DRAW = { level2: 150, level3: 200, level4: 250, level5: 300 }; // what Lin will sign out, in Backdollars (my picks). One an hour.
const DRAW_MS = 3600000;
const pay = (s, d) => { s.cents = (s.cents ?? 0) + d * 100; };
// where a door is, in words a person would use: tunnel count and side, never a number on the door
export function whereIs(place) {
  const d = keyDoor(place); if (!d) return null; const r = runOf(d.run);
  if (r.n) return `the ${["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"][r.n]} tunnel from the blind end, ${["first", "second", "third", "fourth"][Math.min(3, Math.floor(d.u / 16))]} door in, on your ${d.side === (r.dir < 0 ? "a" : "b") ? "left" : "right"}`;
  return r.id === "ringn" ? "the back road behind the odd tunnels, far wall" : "the back road behind the even tunnels, far wall";
}
export function hubChoices(ctx, it, s) {
  const id = short(it); if (!s || !id.startsWith("hub-")) return [];
  const out = [], mk = s.hubMK ?? 0, lr = s.hubLR ?? 0, up = s.hubUP ?? 0;
  if (id === "hub-meg-lin") {
    if (!mk) out.push(s.hubMKask ? { text: "I'll find your key.", tag: "Quest Start" } : { text: "Something wrong with the cabinet?", tag: "Ask" });
    if (mk === 1) out.push({ text: "Who was on watch that night?", tag: "Ask" });
    if (mk === 3) { out.push({ text: "Found it. Here's your key.", tag: "Quest" }); out.push({ text: "[Speech 45] It's gone. Someone used it.", tag: "speech" }); }
    if (mk === 99) for (const [pl, c] of Object.entries(DRAW)) out.push({ text: `Sign me out the key with ${MARKS[pl]}. [$${c}]`, tag: "Key" });
    if (mk === 99 || keysOf(s).length) out.push({ text: "Where's the door for the key I'm holding?", tag: "Ask" });
  }
  if (id === "hub-meg-dace") {
    if (mk === 1) out.push({ text: "Lin says a key went missing on your watch.", tag: "Quest" });
    if (lr === 1) out.push({ text: "Sato sent me for the 2019 team's recorders.", tag: "Quest" });
  }
  if (id === "hub-meg-sato") {
    if (!lr) out.push(s.hubLRask ? { text: "I'll bring the recorders back.", tag: "Quest Start" } : { text: "What happened in 2019?", tag: "Ask" });
    if (lr === 2) out.push({ text: "Three recorders. All yours.", tag: "Quest" });
    if (lr === 99 && !up) out.push(s.hubUPask ? { text: "I'll go and look at it.", tag: "Quest Start" } : { text: "What was on the recorders?", tag: "Ask" });
    if (up === 2) out.push({ text: "I found the door with no mark.", tag: "Quest" });
  }
  if (id === "hub-amber-pip" && lr === 2) out.push({ text: "Want to buy some M.E.G. recorders?", tag: "Barter" });
  if (id === "hub-meg-okafor") {
    if (up === 2) out.push({ text: "There's an unmarked door past your barrier.", tag: "Quest" });
    if (s.hubLedger && !s.hubDinaAsk) out.push({ text: "Your ledger has a Dina A. in it.", tag: "Ask" });
    else if (s.hubDinaLead && !s.hubLedger && !s.hubDinaAsk) out.push({ text: "Did a Dina come through here? Somebody said you wrote her down.", tag: "Ask" }); // Phoebe's lead (scripts/lib/hub-cut.js)
  }
  if (id === "hub-keymaster") {
    if (!s.hubKmKey) out.push({ text: "Would you spare a key? Please.", tag: "Ask" }, { text: "Hand over a key.", tag: "Demand" });
    if (keysOf(s).length) out.push({ text: "Which door does my key want?", tag: "Ask" });
  }
  return out;
}
// what a key's bow looks like, so a player never asks for "the Level 4 key" (they may not know the word)
const MARKS = { level2: "three rings and a tail", level3: "the split circle", level4: "two moons", level5: "the long spiral" };
export function handleDialogueQuestHub(ctx, p, npc, text) {
  const id = short(npc), s = p?.state, t = String(text ?? "").toLowerCase(); if (!s || !id.startsWith("hub-")) return null;
  const mk = s.hubMK ?? 0, lr = s.hubLR ?? 0, up = s.hubUP ?? 0;
  if (id === "hub-meg-lin") {
    if (t.includes("wrong with the cabinet") && !mk) { s.hubMKask = 1; return { reply: "Thirty-two hooks. Thirty-one keys. I counted at lights-down and I counted again and one walked. Nobody signed for it. If you want to be useful, that's how.", mood: "annoyed" }; }
    if (t.includes("find your key") && !mk && s.hubMKask) { s.hubMK = 1; setQuest(s, MK, { name: N[MK], step: "A Level Key left Lin's cabinet unsigned. Ask Dace at the barrier who came through on his watch.", mark: M("hub-meg-dace") }); tellQuest(ctx, p, `Quest Started: ${N[MK]}`); return { reply: "Fine. Dace had the late watch. Start there. And visitor, if you find it, it comes back to this desk. Not to your pocket.", mood: "calm" }; }
    if (t.includes("who was on watch") && mk === 1) return { reply: "Dace. Down at the barrier, where the lamps stop. He'll say he saw nothing. Ask him what he heard.", mood: "calm" };
    if (t.includes("here's your key") && mk === 3) { s.hubMK = 99; delete s.hubTag; pay(s, 120); addRep(s, "meg", 8); endQuest(s, MK, "You brought the key back to Lin's cabinet. She will sign keys out to you now."); tellQuest(ctx, p, `Quest Completed: ${N[MK]} · +$120`); return { reply: "Thirty-two. Thirty-two! Oh, that's lovely. Right. You're on the sheet now, visitor. One key an hour, you pay the deposit, you sign. Don't make it weird.", mood: "happy" }; }
    if (t.includes("it's gone. someone used it") && mk === 3) {
      s.hubMK = 99; delete s.hubTag; giveKey(ctx, p, "level5"); addRep(s, "meg", 2); endQuest(s, MK, "You told Lin the key was spent, and kept it. She signs keys out to you anyway."); tellQuest(ctx, p, `Quest Completed: ${N[MK]} · Level Key kept`);
      return { reply: "Used. Of course it was. Thirty-one, then. I'll change the sheet. Thank you for looking, that's more than my own people did. You can draw from me, one an hour.", mood: "sad" }; }
    for (const [pl, c] of Object.entries(DRAW)) if (mk === 99 && t.includes(MARKS[pl])) {
      if (ctx.now() - (s.hubDrawAt ?? -1e12) < DRAW_MS) return { reply: "You drew one this hour. The sheet says so and the sheet doesn't lie. Come back later.", mood: "annoyed" };
      if (hasKey(s, pl)) return { reply: "You're holding that one already. I can see it glowing through your pocket.", mood: "calm" };
      if ((s.cents ?? 0) < c * 100) return { reply: `Deposit's ${c}. You're short. I don't do tabs, I do hooks.`, mood: "calm" };
      s.cents -= c * 100; s.hubDrawAt = ctx.now(); giveKey(ctx, p, pl);
      return { reply: `Signed. It fits one door and you get one trip. It's in ${whereIs(pl)}. Match the mark on the bow to the mark over the door.`, mood: "calm" }; }
    if (t.includes("door for the key i'm holding")) { const k = keysOf(s)[0]; return { reply: k ? `Let me see the bow. Right. That's ${whereIs(k[0])}. It'll get warm when you're close.` : "You're not holding one.", mood: "calm" }; }
  }
  if (id === "hub-meg-dace") {
    if (t.includes("missing on your watch") && mk === 1) { s.hubMK = 2; setQuest(s, MK, { name: N[MK], step: "Dace heard something metal dropped up the ninth tunnel on his watch. Search the far end of it.", mark: M("hub-keytag") }); tellQuest(ctx, p, `${N[MK]} · Search the ninth tunnel`); return { reply: "Didn't see a thing. Heard one, though. Something small and metal hit the road, up the ninth tunnel, blind end. Then feet, quick ones. Bare feet. I didn't go and look. I'm the line, citizen, I don't leave the line.", mood: "calm" }; }
    if (t.includes("2019 team's recorders") && lr === 1) return { reply: "Three of them carried one. They dropped kit as they ran, so follow the road. First one's not far past me. The last one's a long way in. Take a light.", mood: "calm" };
  }
  if (id === "hub-meg-sato") {
    if (t.includes("what happened in 2019") && !lr) { s.hubLRask = 1; return { reply: "We found more road. Past the barrier, where the lamps stop. A team of three went in with survey recorders and came out without them, running. The reports say 'equipment abandoned'. I'd give a great deal to hear those tapes.", mood: "calm" }; }
    if (t.includes("bring the recorders back") && !lr && s.hubLRask) { s.hubLR = 1; s.hubRec = {}; setQuest(s, LR, { name: N[LR], step: "Find the 2019 survey team's three recorders on the dark road past the M.E.G. barrier: 0 / 3.", mark: M("hub-rec-0") }); tellQuest(ctx, p, `Quest Started: ${N[LR]}`); return { reply: "Would you? Oh, wonderful. Three recorders, orange cases, somewhere on the dark road. Don't play them in there. I mean it, walker. Bring them to me first.", mood: "happy" }; }
    if (t.includes("three recorders") && lr === 2) { s.hubLR = 99; delete s.hubRec; pay(s, 180); addRep(s, "meg", 10); endQuest(s, LR, "Sato has the 2019 team's tapes."); tellQuest(ctx, p, `Quest Completed: ${N[LR]} · +$180`); return { reply: "All three. Look at them. They're warm, why are they warm. Never mind. Thank you, walker. Give me a minute with these and then ask me what's on them.", mood: "happy" }; }
    if (t.includes("what was on the recorders") && lr === 99 && !up) { s.hubUPask = 1; return { reply: "Counting, mostly. Then on the third tape somebody says 'this one's blank'. A door with no mark over it. Every door here has a mark. Every single one. If there's a blank one, it's the most interesting thing on this road.", mood: "happy" }; }
    if (t.includes("go and look at it") && lr === 99 && !up && s.hubUPask) { s.hubUP = 1; setQuest(s, UP, { name: N[UP], step: "The third tape mentions a door with no mark. Follow the dark road to its end and find it.", mark: M("hub-uncharted") }); tellQuest(ctx, p, `Quest Started: ${N[UP]}`); return { reply: "The tape puts it right at the end, where the road just stops. Don't try to open it. Put your hand on it and tell me if it's warm. That's all I want to know.", mood: "calm" }; }
    if (t.includes("door with no mark") && up === 2) return finishUP(ctx, p, "sato");
  }
  if (id === "hub-meg-okafor") {
    if (t.includes("unmarked door past your barrier") && up === 2) return finishUP(ctx, p, "okafor");
    if ((t.includes("dina a.") && s.hubLedger) || (t.includes("did a dina come through") && s.hubDinaLead)) { s.hubDinaAsk = 1; return { reply: "I remember her. Didn't want a key. Wanted the tenth tunnel and a radio, in that order. I told her the city past that door is quiet and she said quiet was fine. She walked. Nobody walks the tenth alone. She did.", mood: "calm" }; }
  }
  if (id === "hub-amber-pip" && t.includes("buy some m.e.g. recorders") && lr === 2) { s.hubLR = 99; delete s.hubRec; pay(s, 260); addRep(s, "meg", -6); endQuest(s, LR, "You sold the 2019 team's tapes to Camp Amber. Sato never heard them."); tellQuest(ctx, p, `Quest Completed: ${N[LR]} · +$260`); return { reply: "Uniform tapes? Yes! Jo trades those back to the uniforms for stove gas. Everybody wins! Except whoever asked you to get them. Sorry, them.", mood: "happy" }; }
  if (id === "hub-keymaster") {
    if (t.includes("spare a key") && !s.hubKmKey) {
      const pool = Object.values(KEYED).filter((pl) => !hasKey(s, pl) && ctx.world.places?.[pl] !== undefined), pl = pool[Math.floor(ctx.random() * pool.length)];
      if (!pl) return { reply: "Nothing for you.", mood: "calm" };
      s.hubKmKey = pl; giveKey(ctx, p, pl); npc.state.leaveAt = ctx.now() + 20000;
      return { reply: "You asked. Most take. One. It knows its door. Don't follow me.", mood: "calm" }; }
    if (t.includes("hand over a key") && !s.hubKmKey) { s.hubKmKey = "refused"; npc.state.leaveAt = ctx.now() + 4000; return { reply: "No.", mood: "annoyed" }; }
    if (t.includes("which door does my key want")) { const k = keysOf(s)[0]; npc.state.leaveAt = ctx.now() + 15000; return { reply: k ? `${whereIs(k[0])[0].toUpperCase()}${whereIs(k[0]).slice(1)}. It's warm already.` : "You hold nothing.", mood: "calm" }; }
  }
  return null;
}
function finishUP(ctx, p, who) {
  const s = p.state; s.hubUP = 99; s.hubUPto = who;
  if (who === "sato") { giveKey(ctx, p, "level70"); addRep(s, "meg", 6); endQuest(s, UP, "You told Sato about the blank door. He gave you a key he'd been keeping."); tellQuest(ctx, p, `Quest Completed: ${N[UP]} · Level Key`); return { reply: "Warm. It's warm. Oh, I knew it. Here. I've had this in my boot for a year and I'm never going to use it, I'd miss the chalk. It's yours, walker.", mood: "happy" }; }
  pay(s, 300); addRep(s, "meg", 12); endQuest(s, UP, "You reported the blank door to Okafor. The barrier moved thirty metres further in."); tellQuest(ctx, p, `Quest Completed: ${N[UP]} · +$300`);
  return { reply: "No mark. Right. That goes up the line tonight and Sato doesn't hear it from you, he'll be down there with a pillow. Good work, traveller. Take this.", mood: "calm" };
}
