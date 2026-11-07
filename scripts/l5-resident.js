// A Level 5 resident's own card buttons (state.offers ring ears.talkopt): the concierge rents suites, the guide walks you
// to the Boiler Room, the clerk posts the rat job, staff gossip, the Originals turn moderns away and tell old stories.
import { PEOPLE5 as P, speak } from "./lib/l5-people.js";
import { skillsOf } from "./lib/stats.js";
const KEY_SPEECH = 25; // Savi's pick: Speech to talk Harlan out of the boiler key (lockpick on the door is the other way, scripts/interact.js)
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const GOSSIP = {
  odette: ["Four-twelve hasn't been slept in for sixty years and the sheets are warm every morning. I just change them.", "The salon crowd tips in coins nobody's minted since the Kaiser. Mr. Ambrose makes me hand them in.", "Don't use the ballroom mirror. It's a nice mirror. Just don't."],
  pip: ["The lift stops on floors that aren't on the panel. I don't push those buttons.", "The captain from the salon tried to give me a shilling. What am I gonna do with a shilling?", "Housekeeping's alright. They brought the rat count down. Mostly."],
  imani: ["Rats came up the boiler stairs twice tonight. Big ones. Harlan's paying.", "Corridors are quiet. Quiet's not the same as safe here.", "If the polonaise stops, find a lit room and stay there."],
};
const LORE = [
  "The cat? Samantha. One feeds her or one hears things one would rather not. I bring her the ham. Mostly.",
  "This house has had guests since before the Black Death, darling. We are merely the ones who stayed for supper.",
  "The staff think the hotel belongs to them. The hotel, I assure you, has opinions of its own.",
  "There is a room past the Boiler with a door that knocks back. Do not answer it.",
];
const REFUSE = ["Membership is for the properly misplaced. You have a telephone in your pocket, I can smell it.", "Heavens, no. You're far too... recent.", "The salon is full, dear. It has been full since 1926.", "Thou art strangely garbed. The brothers would not have thee."];
function say(ctx, p, t) { speak(ctx, ctx.self, t); p.state.sub = { who: ctx.self.state.name, t, at: ctx.now(), d: 1400 + t.length * 60 }; }
function rent(ctx, p) {
  const R = P.rent, now = ctx.now(), uid = p.userId ?? p.id, book = { ...(ctx.place.state.l5rent ?? {}) };
  const mine = Object.keys(book).find((k) => book[k].uid === uid && book[k].until > now);
  if (mine) { book[mine] = { uid, until: now + R.hours * 3600e3 }; ctx.place.state.l5rent = book; p.state.l5until = book[mine].until; return say(ctx, p, `You already hold the ${mine.slice(6).toUpperCase()} suite. I have extended your stay, with the hotel's compliments.`); }
  if ((p.state.cash ?? 0) < R.price * 100) return say(ctx, p, `A suite is ${R.price} backdollars a night. Do come back when your purse agrees with you.`);
  const sid = Object.keys(P.suites).find((k) => !book[k] || book[k].until < now);
  if (!sid) return say(ctx, p, "Every suite is occupied tonight. How unusual. How very unusual.");
  p.state.cash = (p.state.cash ?? 0) - R.price * 100; p.state.notice2 = { text: `-$${R.price}.00`, at: now }; book[sid] = { uid, until: now + R.hours * 3600e3 }; ctx.place.state.l5rent = book;
  p.state.l5room = sid; p.state.l5until = book[sid].until; p.state.l5key = sid; p.state.notice = { text: `Key: Suite ${sid.slice(6).toUpperCase()}`, at: now };
  const tr = ctx.getObject(`l5-people-trunk-${sid}`);
  if (tr && tr.state.renter !== uid) { const st = { ...(tr.state.stash ?? {}) }; if (tr.state.renter) st[tr.state.renter] = tr.state.items ?? ""; tr.state.items = st[uid] ?? ""; delete st[uid]; tr.state.stash = st; tr.state.renter = uid; }
  say(ctx, p, `Suite ${sid.slice(6).toUpperCase()}, down the gallery. The trunk is yours alone. We do hope you'll stay. Everyone does.`);
}
// a plain guest room (n5 or s4) for less: same key, same trunk rules as a suite
function book(ctx, p) {
  const R = P.room, now = ctx.now(), uid = p.userId ?? p.id, bk = { ...(ctx.place.state.l5rent ?? {}) };
  const mine = Object.keys(bk).find((k) => bk[k].uid === uid && bk[k].until > now);
  if (mine) return say(ctx, p, `You already hold ${mine.startsWith("suite") ? "the " + mine.slice(6).toUpperCase() + " suite" : "Room " + mine.slice(5).toUpperCase()}. One key per guest.`);
  if ((p.state.cash ?? 0) < R.price * 100) return say(ctx, p, `A room is ${R.price} backdollars. Modest, but the walls mostly stay put.`);
  const rid = Object.keys(P.rooms).find((k) => !bk[k] || bk[k].until < now);
  if (!rid) return say(ctx, p, "No rooms free. Perhaps a suite? They are... roomier.");
  p.state.cash = (p.state.cash ?? 0) - R.price * 100; p.state.notice2 = { text: `-$${R.price}.00`, at: now }; bk[rid] = { uid, until: now + R.hours * 3600e3 }; ctx.place.state.l5rent = bk;
  p.state.l5room = rid; p.state.l5until = bk[rid].until; p.state.l5key = rid; p.state.notice = { text: `Key: Room ${rid.slice(5).toUpperCase()}`, at: now };
  const tr = ctx.getObject(`l5-people-trunk-${rid}`);
  if (tr && tr.state.renter !== uid) { const st = { ...(tr.state.stash ?? {}) }; if (tr.state.renter) st[tr.state.renter] = tr.state.items ?? ""; tr.state.items = st[uid] ?? ""; delete st[uid]; tr.state.stash = st; tr.state.renter = uid; }
  say(ctx, p, `Room ${rid.slice(5).toUpperCase()}. Nobody else has a key. Nobody living, anyway.`);
}
export const ears = {
  talkopt: (ctx, d) => {
    const p = ctx.getObject(d?.by); if (!p?.state) return;
    const s = ctx.self.state, k = d.k, now = ctx.now();
    if (k === "rent") return rent(ctx, p);
    if (k === "room") return book(ctx, p);
    if (k === "checkout") { if (!p.state.l5room) return say(ctx, p, "You hold no key of ours. Yet."); const b = { ...(ctx.place.state.l5rent ?? {}) }; if (b[p.state.l5room]?.uid === (p.userId ?? p.id)) b[p.state.l5room].until = 0; ctx.place.state.l5rent = b; p.state.l5room = null; p.state.l5key = null; return say(ctx, p, "Thank you for staying at the Homely Hotel. Your trunk will wait for you. It is very patient."); }
    if (k === "escort") { s.rounds = [{ x: 16.2, y: 0, z: 18, dwell: 30, act: null, look: { x: 19, z: 18 } }]; s.ri = 0; s.escortUntil = now + 45000; return say(ctx, p, "Stay on my shoulder. Boiler door's at the east end. Once you're through it's hot and it's loud and I'm not coming in."); }
    if (k === "job") {
      const RJ = P.ratJob, j = p.state.l5job, got = (p.state.l5rats ?? 0) - (j?.base ?? 0);
      if (!j) { p.state.l5job = { base: p.state.l5rats ?? 0, at: now }; return say(ctx, p, `Death Rats, boiler side. Bring the count down by ${RJ.need} and I'll pay ${RJ.almonds} water and a mag. Don't let them bite.`); }
      if (got < RJ.need) return say(ctx, p, `${Math.max(0, got)} of ${RJ.need}. They're not gonna kill themselves.`);
      p.state.almonds = (p.state.almonds ?? 0) + RJ.almonds; p.state.ammo = (p.state.ammo ?? 0) + RJ.ammo * 12; p.state.l5job = null; p.state.l5jobsDone = (p.state.l5jobsDone ?? 0) + 1;
      p.state.notice = { text: `+${RJ.almonds} almond water, +${RJ.ammo * 12} rounds`, at: now };
      return say(ctx, p, "That's five. Good work. Board'll have more by tomorrow, it always does.");
    }
    if (k === "boilerkey") {
      if (p.state.l5boilerKey) return say(ctx, p, "You've got one already. Don't lose it in there, I'm not cutting another.");
      if ((skillsOf(p.state).speech ?? 0) < KEY_SPEECH) { p.state.notice = { text: `[Speech ${KEY_SPEECH}] Failed`, at: now }; return say(ctx, p, pick(ctx, ["Staff only. Nice try.", "And why would I hand a stranger the keys to the hottest room in the house?", "No. Go pick a lock or something. Actually, don't."])); }
      p.state.l5boilerKey = true; p.state.notice = { text: `[Speech ${KEY_SPEECH}] Got the Boiler Room key`, at: now };
      return say(ctx, p, "...Fine. You talk like someone who'd go in anyway. Take it. Kill a rat for me while you're down there.");
    }
    if (k === "gossip") return say(ctx, p, pick(ctx, GOSSIP[s.voice] ?? GOSSIP.imani));
    if (k === "member") return say(ctx, p, pick(ctx, REFUSE));
    if (k === "lore") return say(ctx, p, pick(ctx, LORE));
  },
};
