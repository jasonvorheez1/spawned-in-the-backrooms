// Level 178 "Kyoto Dreams": the house's seven-quest chain (Shelly #406259, voiced #414031). Nobody here is hostile, ever, and
// the Hub door stays the only way out: the route quests talk about the loop and the door, they never open an exit.
// 1 A Place to Rest (places/level178/sim.js, auto) · 2 The Kitchens (cook, sector-1) · 3 An Unfamiliar Ingredient (cook, sector-2)
// 4 An Arrangement (order-1) · 5 The Long Way Around (runner, sector-3) · 6 A Better Route (host, sector-4) · 7 The Travel Station (Irawan)
// Steps advance three ways, the same ones players hit: a talk choice (handleDialogueQuest178, scripts/talk.js), a press on a
// house prop (touch178, scripts/l178-prop.js), or standing somewhere (questTick178, places/level178/sim.js). Paid once, at 99.
// Every reply below sits on one line under its npcId so art/vo/act.py records it in that resident's voice.
import { advanceQuest, finishLevelQuest } from "./quests.js";

const MARK = (id, label, x, z) => ({ place: "level178", id, x, y: 0, z, label });
const done = (s, k) => (s?.[k] ?? 0) === 99;

// house props a player can press for a quest beat (spawned by the sim as quiet "Look" spots on the story props)
export const SPOTS = {
  ricesack: { x: 9.75, y: 0.75, z: -5.45, name: "Rice sack", why: "A rice sack slumped open in the corner. There's always a little more in it than yesterday." },
  ricecooker: { x: 12.05, y: 1.35, z: -4.55, name: "Rice cooker", why: "Rice on before sunrise. The light says WARM. It has said WARM for a long time." },
  donabe: { x: 12.02, y: 1.4, z: 1.38, name: "Donabe", why: "A clay pot on the stove, lid rattling softly." },
  catdish: { x: 6.4, y: 0.55, z: 7.55, name: "Cat dish", why: "A cat dish, licked clean. Nobody here has seen the cat." },
  goboard: { x: 15.6, y: 0.75, z: 3.6, name: "Go board", why: "A game nobody finished. Black is winning, slowly." },
  callidesk: { x: 2.6, y: 0.75, z: 14.7, name: "Calligraphy desk", why: "Practice sheets, the same character over and over: 道. Road." },
  kamidana: { x: -2.3, y: 2.3, z: 16.95, name: "Kamidana", why: "The household shrine, high over the sword cabinet. A cup of water, a sprig of green." },
};

export const QUESTS178 = {
  kitchens: { key: "l178k", id: "l178-kitchens", name: "The Kitchens", giver: "l178-sector-1",
    tips: { 1: "Scoop rice from the open sack in the kitchen corner", 2: "Wash it under the kitchen tap", 3: "Set the donabe going on the stove", 4: "Tell the cook the rice is on" },
    marks: { 1: MARK("l178-qs-ricesack", "Rice sack", 9.75, -5.45), 2: MARK("l178-tap", "Kitchen tap", 12.05, -0.46), 3: MARK("l178-qs-donabe", "Stove", 12, 1.4), 4: MARK("l178-sector-1", "Cook", 10.8, -3) } },
  ingredient: { key: "l178u", id: "l178-ingredient", name: "An Unfamiliar Ingredient", giver: "l178-sector-2",
    tips: { 1: "Look behind the rice cooker for the jar the cook found", 2: "Ask Irawan what the jar is", 3: "Tell the cook what Irawan said" },
    marks: { 1: MARK("l178-qs-ricecooker", "Rice cooker", 12, -4.5), 2: MARK("l178-irawan", "Irawan", 14.5, 1), 3: MARK("l178-sector-2", "Cook", 10.8, 3) } },
  arrangement: { key: "l178a", id: "l178-arrangement", name: "An Arrangement", giver: "l178-order-1",
    tips: { 1: "Read the guestbook by the Hub door and find who signed for the Order", 2: "Take the Order's offer to Irawan", 3: "Set the low table in the dining room for both houses", 4: "Tell the Order the table is set" },
    marks: { 1: MARK("l178-story-guestbook", "Guestbook", -1.3, 16.8), 2: MARK("l178-irawan", "Irawan", 14.5, 1), 3: MARK("l178-table-dining", "Dining room", 13, -13), 4: MARK("l178-order-1", "The Order", -4, 13) } },
  longway: { key: "l178l", id: "l178-longway", name: "The Long Way Around", giver: "l178-sector-3",
    tips: { 1: "Walk the porch west to the baths", 2: "Keep going round to the north bedrooms", 3: "Come back east past the cat dish on the porch", 4: "Tell the runner whether the house folded" },
    marks: { 1: MARK("l178-baths", "Baths", -13, 0), 2: MARK("l178-bedrooms", "Bedrooms", 0, -13), 3: MARK("l178-qs-catdish", "Cat dish", 6.4, 7.55), 4: MARK("l178-sector-3", "Runner", 14.8, -3.5) } },
  route: { key: "l178b", id: "l178-route", name: "A Better Route", giver: "l178-sector-4",
    tips: { 1: "Study the go board in the studio. The stones are the rooms", 2: "Copy the map at the calligraphy desk in the front hall", 3: "Pin it up by the Hub door where newcomers come in", 4: "Tell the host the map is up" },
    marks: { 1: MARK("l178-qs-goboard", "Go board", 15.6, 3.6), 2: MARK("l178-qs-callidesk", "Calligraphy desk", 2.6, 14.7), 3: MARK("l178-to-hub", "Hub door", 0, 16.4), 4: MARK("l178-sector-4", "Host", 13, -12) } },
  station: { key: "l178t", id: "l178-station", name: "The Travel Station", giver: "l178-irawan",
    tips: { 1: "Ask the Order woman by the north rooms about leaving through the spring", 2: "Sit in the courtyard spring and see what happens", 3: "Leave the traveller's offering at the kamidana by the Hub door", 4: "Tell Irawan what you found" },
    marks: { 1: MARK("l178-order-3", "The Order", 3, -8), 2: MARK("l178-spring", "Hot spring", 0, 0), 3: MARK("l178-qs-kamidana", "Kamidana", -2.3, 16.9), 4: MARK("l178-irawan", "Irawan", 14.5, 1) } },
};
const Q = QUESTS178;
const step = (ctx, p, k, n) => { const q = Q[k]; advanceQuest(ctx, p, { ...q, mark: q.marks[n] }, n, `${q.name} · ${q.tips[n]}`); };
export const REWARDS = {
  kitchens: { xp: 150, cents: 2500, items: ["l178_bento", "l178_miso"], text: "Quest Completed: The Kitchens · +150 XP, +$25.00, Bento, Miso soup" },
  ingredient: { xp: 150, cents: 2500, items: ["l178_onigiri", "l178_onigiri"], text: "Quest Completed: An Unfamiliar Ingredient · +150 XP, +$25.00, two onigiri" },
  arrangement: { xp: 250, cents: 0, items: ["weapon:l178_katana"], text: "Quest Completed: An Arrangement · +250 XP, the Order's katana" },
  longway: { xp: 200, cents: 0, items: ["cloth:hat:l178_kitsune_mask:f4f1ea"], text: "Quest Completed: The Long Way Around · +200 XP, Kitsune mask" },
  route: { xp: 200, cents: 5000, items: ["l178_bento"], text: "Quest Completed: A Better Route · +200 XP, +$50.00, Bento" },
  station: { xp: 300, cents: 0, items: ["weapon:l178_naginata"], text: "Quest Completed: The Travel Station · +300 XP, Irawan's naginata" },
};
const finish = (ctx, p, k) => finishLevelQuest(ctx, p, Q[k].key, Q[k], { ...REWARDS[k], by: "survivors", rep: [["survivors", 4]] });

// a press on a house prop (scripts/l178-prop.js): returns what the player notices, or null
export function touch178(ctx, p, id) {
  const s = p?.state; if (!s) return null;
  const n = String(id ?? "").split("/").pop();
  if (n === "l178-qs-ricesack" && s.l178k === 1) { step(ctx, p, "kitchens", 2); return "Two cups of rice into the bowl. It smells like straw and sun."; }
  if (n === "l178-tap" && s.l178k === 2) { step(ctx, p, "kitchens", 3); return "You swirl the rice under the tap until the water runs clear."; }
  if (n === "l178-qs-donabe" && s.l178k === 3) { step(ctx, p, "kitchens", 4); return "Rice in, lid on. The donabe starts to tick as it warms."; }
  if (n === "l178-qs-ricecooker" && s.l178u === 1) { step(ctx, p, "ingredient", 2); s.l178jar = 1; return "Wedged behind the cooker: a jar of something pale yellow. It smells like almond water and cut grass."; }
  if (n === "l178-story-guestbook" && s.l178a === 1) { step(ctx, p, "arrangement", 2); return "Halfway down, in neat brush: 'For the Order, Sister Hinata. We would like to eat with them.'"; }
  if (n === "l178-table-dining" && s.l178a === 3) { step(ctx, p, "arrangement", 4); return "You lay ten bowls, ten pairs of chopsticks. Two houses' worth."; }
  if (n === "l178-qs-catdish" && s.l178l === 3) { step(ctx, p, "longway", 4); return "The cat dish again. Same one. You walked the whole loop and it's where you left it."; }
  if (n === "l178-qs-goboard" && s.l178b === 1) { step(ctx, p, "route", 2); return "Black stones for rooms, white for halls. Someone mapped the house on a go board."; }
  if (n === "l178-qs-callidesk" && s.l178b === 2) { step(ctx, p, "route", 3); return "You copy the board onto a clean sheet: the courtyard, the porch, the door to the Hub."; }
  if (n === "l178-qs-kamidana" && s.l178t === 3) { step(ctx, p, "station", 4); return "You set a grain of rice and a drop of spring water on the shelf. For whoever leaves next."; }
  if (SPOTS[n.replace("l178-qs-", "")]) return SPOTS[n.replace("l178-qs-", "")].why;
  return null;
}

// standing somewhere (places/level178/sim.js, every second per player)
export function questTick178(ctx, p) {
  const s = p?.state, at = p?.worldFeetPosition ?? p?.feetPosition; if (!s || !at) return;
  const near = (x, z, r) => Math.hypot(at.x - x, at.z - z) < r;
  if (s.l178l === 1 && near(-13, 0, 3.5)) step(ctx, p, "longway", 2);
  else if (s.l178l === 2 && near(0, -13, 4)) step(ctx, p, "longway", 3);
  if (s.l178b === 3 && near(0, 16.2, 2.5)) step(ctx, p, "route", 4);
  if (s.l178t === 2 && near(0, 0, 3)) step(ctx, p, "station", 3);
}

// what the talk card offers (scripts/lib/npc-starters.js); answered by handleDialogueQuest178
export function l178Choices(id, s) {
  const out = [], rest = done(s, "l178q");
  const T = (text, tag) => out.push({ text, tag });
  if (id === "l178-sector-1") {
    if (rest && !s?.l178k) T("Anything I can do in the kitchen?", "Quest Start");
    if (s?.l178k === 4) T("Rice is washed and on the stove.", "Quest Turn-In");
    if (done(s, "l178k")) T("How was the rice?", "Talk");
  } else if (id === "l178-sector-2") {
    if (done(s, "l178k") && !s?.l178u) T("You look puzzled. What's wrong?", "Quest Start");
    if (s?.l178u === 3) T("Irawan says the jar is from the Hub. It's safe to cook with.", "Quest Turn-In");
    if (done(s, "l178u")) T("What did you make with the jar?", "Talk");
  } else if (id === "l178-irawan") {
    if (s?.l178u === 2) T("The cook found this jar behind the rice cooker. Know what it is?", "Quest");
    if (s?.l178a === 2) T("The Order wants to share a meal with the Sector.", "Quest");
    if (done(s, "l178u") && done(s, "l178a") && done(s, "l178l") && done(s, "l178b") && !s?.l178t) T("Everyone keeps talking about leaving. How do people actually travel from here?", "Quest Start");
    if (s?.l178t === 4) T("I sat in the spring. Woke up right where I was. The Hub door's the way out.", "Quest Turn-In");
    if (done(s, "l178t")) T("Still no other way out?", "Talk");
  } else if (id === "l178-order-1") {
    if (done(s, "l178k") && !s?.l178a) T("Is the Order in need of anything?", "Quest Start");
    if (s?.l178a === 4) T("The table is set for both houses.", "Quest Turn-In");
    if (done(s, "l178a")) T("How was the meal?", "Talk");
  } else if (id === "l178-sector-3") {
    if (done(s, "l178k") && !s?.l178l) T("You keep looking down the porch. Something wrong?", "Quest Start");
    if (s?.l178l === 4) T("I went the whole way round. Same porch, same cat dish. It didn't fold.", "Quest Turn-In");
    if (done(s, "l178l")) T("Still running the loop?", "Talk");
  } else if (id === "l178-sector-4") {
    if (done(s, "l178l") && !s?.l178b) T("You seem worried about the new arrivals.", "Quest Start");
    if (s?.l178b === 4) T("The map's pinned by the Hub door.", "Quest Turn-In");
    if (done(s, "l178b")) T("Has the map helped?", "Talk");
  } else if (id === "l178-order-3") {
    if (s?.l178t === 1) T("Irawan says some people try to leave through the spring.", "Quest");
  }
  return out;
}

export function handleDialogueQuest178(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();
  if (!npcId.startsWith("l178-")) return null;
  if (npcId === "l178-sector-1") {
    if (t.includes("anything i can do in the kitchen") && !s.l178k && done(s, "l178q")) {
      step(ctx, p, "kitchens", 1);
      return { reply: "Oh, you want to help? Ha, okay! Rice from the sack in the corner, wash it at the tap till the water's clear, then into the clay pot on the stove. Easy. Mostly.", mood: "happy" };
    }
    if (t.includes("rice is washed and on the stove") && s.l178k === 4) {
      finish(ctx, p, "kitchens");
      return { reply: "Mm, listen to it tick. That's a good pot. Here, take a bento and a soup for later. You cook like you've done it before.", mood: "happy" };
    }
    if (t.includes("how was the rice") && done(s, "l178k")) return { reply: "Perfect. A little crunchy at the bottom, which is the best part. Don't tell the others I said so.", mood: "happy" };
  }
  if (npcId === "l178-sector-2") {
    if (t.includes("you look puzzled") && !s.l178u && done(s, "l178k")) {
      step(ctx, p, "ingredient", 1);
      return { reply: "Hm? Ah. Something's behind the rice cooker. A jar. I didn't put it there, and I put everything in this kitchen. Could you... take a look? I'd rather not open it myself.", mood: "calm" };
    }
    if (t.includes("safe to cook with") && s.l178u === 3) {
      finish(ctx, p, "ingredient");
      return { reply: "From the Hub. Huh. So the house borrows from the neighbours now. Well. If it's safe, I'll try it in the onigiri. Here, these two are plain, for you.", mood: "calm" };
    }
    if (t.includes("what did you make with the jar") && done(s, "l178u")) return { reply: "Onigiri with a yellow centre. It tastes like... water that remembers being lemonade. People keep coming back for seconds. I don't understand it either.", mood: "calm" };
  }
  if (npcId === "l178-irawan") {
    if (t.includes("found this jar behind the rice cooker") && s.l178u === 2) {
      step(ctx, p, "ingredient", 3);
      return { reply: "Heh. That's almond water, gone thick. Somebody brought it through the Hub door and forgot it. It's fine. It's more than fine. Tell her she can cook with it.", mood: "happy" };
    }
    if (t.includes("share a meal with the sector") && s.l178a === 2) {
      step(ctx, p, "arrangement", 3);
      return { reply: "The Order wants dinner? Huh. Took them long enough. Sure. Set the low table in the dining room for both of us, we'll bring the food.", mood: "happy" };
    }
    if (t.includes("how do people actually travel from here") && !s.l178t) {
      step(ctx, p, "station", 1);
      return { reply: "Ugh, the spring story again. Okay. Go ask the Order lady by the north rooms, she's got the whole theory. Then sit in the spring yourself. Then come tell me where you woke up.", mood: "calm" };
    }
    if (t.includes("the hub door's the way out") && s.l178t === 4) {
      finish(ctx, p, "station");
      return { reply: "Ha! Told you. The door at the back of the hall is the station, that's the only one. Here. My naginata. I never use it, and you actually walk around.", mood: "happy" };
    }
    if (t.includes("still no other way out") && done(s, "l178t")) return { reply: "Just the paper door to the Hub. If the house ever grows another one, you'll be the first person I tell.", mood: "calm" };
  }
  if (npcId === "l178-order-1") {
    if (t.includes("is the order in need of anything") && !s.l178a && done(s, "l178k")) {
      step(ctx, p, "arrangement", 1);
      return { reply: "We need very little. But... one of us wrote something in the guestbook, by the door. An offer to the Sector. Would you read it, and carry it to Irawan for us?", mood: "calm" };
    }
    if (t.includes("the table is set for both houses") && s.l178a === 4) {
      finish(ctx, p, "arrangement");
      return { reply: "Then we will eat together. Thank you. This blade sat above the shrine for years. It should travel with someone kind.", mood: "happy" };
    }
    if (t.includes("how was the meal") && done(s, "l178a")) return { reply: "Irawan talked through all of it. We did not mind. It was good to hear.", mood: "happy" };
  }
  if (npcId === "l178-sector-3") {
    if (t.includes("you keep looking down the porch") && !s.l178l && done(s, "l178k")) {
      step(ctx, p, "longway", 1);
      return { reply: "I-it's nothing. Okay, it's something. The porch felt longer this morning. Could you walk it? West to the baths, round to the bedrooms, back by the cat dish. If it folds, I want to know.", mood: "worried" };
    }
    if (t.includes("it didn't fold") && s.l178l === 4) {
      finish(ctx, p, "longway");
      return { reply: "Oh thank goodness. Haah. Okay. Here, take my festival mask. It's for luck, and you clearly have some.", mood: "happy" };
    }
    if (t.includes("still running the loop") && done(s, "l178l")) return { reply: "Every morning. Same length, every time. I count the posts now.", mood: "happy" };
  }
  if (npcId === "l178-sector-4") {
    if (t.includes("worried about the new arrivals") && !s.l178b && done(s, "l178l")) {
      step(ctx, p, "route", 1);
      return { reply: "They wander in and get lost between the baths and the kitchen. Someone mapped the house on the go board in the studio. Copy it at the calligraphy desk and pin it by the Hub door?", mood: "calm" };
    }
    if (t.includes("the map's pinned by the hub door") && s.l178b === 4) {
      finish(ctx, p, "route");
      return { reply: "Good. Now they'll find the kitchen before they find the bottom of the spring. Here, for your trouble. And a bento, because I'm the host.", mood: "happy" };
    }
    if (t.includes("has the map helped") && done(s, "l178b")) return { reply: "Two newcomers found dinner on their own yesterday. One of them cried. Good tears.", mood: "happy" };
  }
  if (npcId === "l178-order-3") {
    if (t.includes("leave through the spring") && s.l178t === 1) {
      step(ctx, p, "station", 2);
      return { reply: "Some say they doze in the water and wake somewhere else. I have tried it many times. I always wake here, warm. Sit in it yourself, if you like. Then decide.", mood: "calm" };
    }
  }
  return null;
}
