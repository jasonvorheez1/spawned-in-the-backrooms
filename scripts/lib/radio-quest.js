// Radio Backrooms (Wikidot): Ralph, his talk card, song requests, "Milk for Ralph" (milk for juicy secrets) and the guest spot.
// keepRadio(ctx) is called from places/radio/sim.js tick; radioChoices / handleDialogueQuestRadio ride npc-starters / talk.js.
import { advanceQuest, finishLevelQuest, tellQuest, queuePayout, errandDone } from "./quests.js";
import { removeOne } from "./npc-talk.js";
import { keepPeople } from "./level-kit.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { STATION } from "./radio.js";
import DLG from "./data/dlg-radio.yml";

export const RALPH = "radio-ralph";
const P = "radio", DESK = { x: 0, z: -3.6, yaw: 180 }; // behind the console, facing +Z
const T = DLG[RALPH].quest, SECRETS = DLG[RALPH].secrets;
export const SONGS = [...new Set(STATION.segments.filter((x) => x.kind === "song").map((x) => x.title))];
export const QM = { key: "radiomq", name: "Milk for Ralph",
  tips: { 1: "Find a carton of milk (kitchens, fridges, diners) and bring it to Ralph at Radio Backrooms." },
  marks: { 1: { place: P, id: RALPH } } };
const PAY = { xp: 90, more: 45, air: 60 }; // tier 1 errand, no danger in the studio
const rec = (s) => (s.radioq ??= {});
const hasMilk = (s) => (s.snacks?.milk ?? 0) > 0;

function person(ctx, id = RALPH) {
  if (ctx.place.objects[id]) return;
  const look = { species: "human", sex: "m", age: "middle", topw: "sweater", top: "#c9b99a", botw: "pants", bottom: "#4a3a2c", shoes: "shoes", hair: "#7a6e62", expr: "calm" };
  ctx.spawn(id, { tags: ["npc", "radio-npc"], feetPosition: { x: DESK.x, y: 0.1, z: DESK.z }, rotation: { yaw: DESK.yaw }, physics: "character",
    ...critterSpec(npcLook(id, look, "wanderer", 20, "trader")), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Ralph", role: "trader", faction: "wanderer", nerve: "brave", faceYaw: DESK.yaw, home: { x: DESK.x, z: DESK.z }, stay: true } });
}
export function keepRadio(ctx) {
  const st = ctx.place.state;
  if (!st.radioDesk) { person(ctx); st.radioDesk = 1; return; }
  keepPeople(ctx, [RALPH], person);
}

export function radioChoices(id, s) {
  if (!s || String(id ?? "").split("/").pop() !== RALPH) return [];
  const m = s[QM.key] ?? 0, r = s.radioq ?? {}, q = T.q, out = [];
  if (r.picking) return SONGS.map((title) => ({ text: q.pick.replace("{title}", title), tag: "Request" }));
  out.push({ text: q.request, tag: "Request" });
  if (!m) out.push({ text: q.milk, tag: "Quest Start" });
  if (m === 1) out.push(hasMilk(s) ? { text: q.give, tag: "Quest Turn-In" } : { text: q.remind, tag: "Quest" });
  if (m === 99) {
    if (hasMilk(s)) out.push({ text: q.more, tag: "Trade" });
    if (!s.radioGuest) out.push({ text: q.air, tag: "Choice" });
  }
  return out;
}

const say = (reply, mood = "calm") => ({ reply, mood });
function secret(s, n) { const t = SECRETS[n]; (s.radioSecrets ??= []).push(t); return t; }
export function handleDialogueQuestRadio(ctx, p, npc, text) {
  const s = p?.state; if (!s || !npc) return null;
  if (String(npc.id ?? "").split("/").pop() !== RALPH) return null;
  const t = String(text ?? ""), is = (line) => t === line || t.toLowerCase() === String(line).toLowerCase();
  const m = s[QM.key] ?? 0, r = rec(s), q = T.q;
  if (r.picking) {
    const title = SONGS.find((x) => is(q.pick.replace("{title}", x)));
    r.picking = false;
    if (title) { s.radioReq = { title, at: ctx.now() }; tellQuest(ctx, p, `Song request: "${title}" is next on Radio Backrooms`); return say(T.picked.replace("{title}", title)); }
  }
  if (is(q.request)) { r.picking = true; return say(T.request); }
  if (is(q.milk) && !m) { advanceQuest(ctx, p, QM, 1, `Quest Started: ${QM.name} · ${QM.tips[1]}`); return say(T.milk); }
  if (is(q.remind) && m === 1) return say(T.remind);
  if (is(q.give) && m === 1) {
    if (!removeOne(s, "milk")) return say(T.nomilk);
    const tip = secret(s, 0); r.told = 1;
    finishLevelQuest(ctx, p, QM.key, QM, { xp: PAY.xp, cents: 0, rep: [["karma", 1]], text: `Quest Completed: ${QM.name}! +${PAY.xp} XP · Ralph's secret: ${tip}`, payKey: "radio-milk" });
    return say(`${T.give} ${tip}`);
  }
  if (is(q.more) && m === 99) {
    if ((r.told ?? 1) >= SECRETS.length) { if (removeOne(s, "milk")) queuePayout(s, { xp: 10 }); return say(T.thanks); }
    if (!removeOne(s, "milk")) return say(T.nomilk);
    const n = r.told ?? 1, tip = secret(s, n); r.told = n + 1;
    errandDone(s, `radio-secret-${n + 1}`, `Ralph's secret #${n + 1}`, tip);
    queuePayout(s, { xp: PAY.more, text: `Ralph's secret: ${tip} · +${PAY.more} XP` });
    tellQuest(ctx, p, `Ralph's secret: ${tip}`);
    return say(`${T.more} ${tip}`);
  }
  if (is(q.air) && m === 99 && !s.radioGuest) {
    s.radioGuest = true; s.radioGuestAt = ctx.now();
    queuePayout(s, { xp: PAY.air, text: `On the air: Talkin' with Ralph · +${PAY.air} XP` });
    tellQuest(ctx, p, "You were a guest on Talkin' with Ralph");
    return say(`${T.air} ${T.aired}`);
  }
  return null;
}
