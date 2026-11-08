// Level 6.1 "The Snackrooms": what you press. Vending machines hand out free food; the restaurants work like real ones, only nothing costs a thing:
//   the MENU board (kind "menu"): press to flip through what they serve; the COUNTER (kind "counter"): press to order what is showing, you get a numbered ticket,
//   the kitchen gets busy, the "now serving" board counts up, a bell dings and your tray appears on the pickup counter; the TRAY (kind "tray") is yours to take (nobody else's),
//   and when you are done you carry the dirty tray to the TRAY RETURN (kind "return"). Food tokens: scripts/lib/data/snacks.yml.
import { heard } from "./lib/hear.js";
import { animate } from "builtin/tween";
import { itemSpec } from "./lib/vend-item.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const POOL = { snack: ["doritos", "doritos", "coolranch"], soda: ["coke", "coke", "pepsi", "dew", "sprite", "drpepper", "cherrycoke", "vault", "redbull", "snapple", "gatorade", "sobe"] };
const LINE = { coke: "A glass Coca-Cola clunks down, sweating cold.", pepsi: "A Pepsi rolls into the tray. Blue globe can.", dew: "Mountain Dew. Neon green. You can feel your heart already.", doritos: "Doritos Nacho Cheese drop off the coil.", coolranch: "Cool Ranch. The blue bag.", pizza: "A faceling slides you a hot slice on a paper plate.", burger: "A faceling wraps a cheeseburger and pushes it across. It waves.", almond: "Almond water, poured over ice. On the house.", sprite: "A green Sprite bottle thunks into the tray.", drpepper: "Dr Pepper. Maroon can, cold.", cherrycoke: "Cherry Coke rolls out.", vault: "Vault. The can is sweating.", redbull: "A skinny Red Bull can clatters down.", snapple: "Snapple peach tea. The cap pops.", gatorade: "Fruit punch Gatorade.", sobe: "SoBe Lizard Fuel. The lizard stares at you.", budweiser: "The faceling pops a Budweiser longneck and slides it down the bar.", corona: "A Corona, lime pushed in with one finger.", millerlite: "Miller Lite, cracked open.", smirnoffice: "Smirnoff Ice. It does not ask how old you are.", jackcoke: "Jack and Coke over ice. Heavy on the Jack.", whiskey: "Jim Beam, neat. The faceling waits for you to drink it.", margarita: "A margarita with a salt rim, far too strong." };
LINE.almond ??= "A cold bottle of almond water, sweating."; LINE.pizza ??= "A slice of pepperoni pizza."; LINE.burger ??= "A cheeseburger in waxed paper.";
const COOL = 20000;
// what each restaurant serves: [name, what you get, the price the board crosses out]
export const MENUS = {
  clip: [["Budweiser, ice cold", ["budweiser"], "3.00"], ["Jack and Coke", ["jackcoke"], "4.50"], ["Smirnoff Ice", ["smirnoffice"], "3.75"], ["Coca-Cola float", ["coke"], "2.25"], ["Chips and a Coke", ["doritos", "coke"], "2.75"]],
  liq: [["Almond water", ["almond"], "3.00"], ["Corona with lime", ["corona"], "4.00"], ["Margarita", ["margarita"], "5.50"], ["Miller Lite", ["millerlite"], "3.00"], ["Whiskey, neat", ["whiskey"], "5.00"], ["Bar snacks", ["doritos", "coolranch"], "2.50"]],
  slice: [["Pepperoni slice", ["pizza"], "3.25"], ["Two cheese slices and a Coke", ["pizza", "coke"], "6.25"], ["Supreme slice", ["pizza", "pizza"], "5.00"]],
  burger: [["Cheeseburger", ["burger"], "4.50"], ["Bop meal: burger, chips, shake", ["burger", "doritos", "dew"], "7.95"], ["Fries and a Coke", ["doritos", "coke"], "3.25"]],
};
const KEYS = ["clip", "liq", "slice", "burger"], keyOf = (id) => KEYS.find((k) => String(id).includes(`-${k}-`) || String(id).endsWith(`-${k}`));
const PICKUP = { clip: [-19.2, 1.12, -29.65], liq: [-11.75, 1.1, -25.2], slice: [5.4, 1.02, -28.9], burger: [19.4, 1.02, -28.2] };
const NAME = { clip: "Clippers", liq: "Liquorette", slice: "Slice Palace", burger: "Burger Bop" };
const board = (key, n) => `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;background:#101418;color:#7affb0;text-align:center"><div style="font-size:54px;color:#ffd84a">NOW SERVING</div><div style="font-size:150px;font-weight:700;letter-spacing:6px;text-shadow:0 0 18px #3f9">${String(n).padStart(3, "0")}</div><div style="font-size:34px;color:#9fb8c8">${NAME[key]}</div></div>`;

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, w = who.state;
    const tell = (text, color = "#ffe9a8") => ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, text, color, size: 0.9 }, { audience: { player: who.id } });
    const say = (text) => { w.notice = { text, at: now }; };
    const snd = (n, v = 0.7, d = 14) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: d });

    if (s.kind === "menu") { // flip through the board
      const key = s.key, M = MENUS[key], sel = (((s.sel ?? {})[uid] ?? -1) + 1) % M.length, [nm, , price] = M[sel]; s.sel = { ...(s.sel ?? {}), [uid]: sel };
      snd("paper-flip-card-stand", 0.4, 6);
      say(`${NAME[key]} · MENU ${sel + 1}/${M.length}: ${nm}   ~~$${price}~~  FREE.   Press the menu again for the next one; order what is showing at the counter.`);
      tell(`${nm} · FREE`, "#ffd84a"); return;
    }
    if (s.kind === "counter") { // order what the board shows
      const key = s.key ?? keyOf(ctx.self.id) ?? "burger", M = MENUS[key], menuObj = ctx.getObject(`l61-menu-${key}`), sel = menuObj?.state?.sel?.[uid] ?? 0, [nm, gives] = M[sel % M.length];
      const mine = (s.ord ?? {})[uid];
      if (mine && !mine.done) { say(`Order #${mine.n} (${mine.nm}) is still in the kitchen. They are working on it. Wait for the bell.`); return; }
      const st = ctx.place.state, n = ((st.l61Ticket ?? 40) + 1 + Math.floor(ctx.random() * 3)); st.l61Ticket = n;
      s.ord = { ...(s.ord ?? {}), [uid]: { n, nm, gives, done: false } };
      const wait = 6 + ctx.random() * 7;
      snd("cash-register-ka-ching-drawer-open", 0.6, 10);
      const fc = ctx.getObject(`l61-fc-${key}`); if (fc?.state) fc.state.orderAt = now;
      say(`"Order for one: ${nm}." A faceling tears off ticket #${n} and puts it on the rail. It costs nothing, and they still ring it up. Wait for the bell (about ${Math.round(wait)} s).`);
      tell(`TICKET #${n}`, "#ffe08a");
      ctx.after(wait, "ready", { uid, who: who.id, key, n });
      return;
    }
    if (s.kind === "tray") { // your tray
      if (s.owner !== uid) { say(`That tray is for order #${s.n}. It is somebody else's. Yours will have your number on it.`); tell("NOT YOURS", "#ff9a8a"); return; }
      snd("paper-plate-slid-across-counter", 0.8, 10);
      w.l61Tray = now; w.payout = { xp: 2, items: s.items, text: `Order #${s.n}: ${s.items.map((t) => LINE[t] ?? t).join(" ")} Enjoy. When you are done, the tray goes in the tray return.` };
      tell(s.items.map((t) => "+" + t.toUpperCase()).join(" "), "#9fffb0"); ctx.destroy(ctx.self.id); return;
    }
    if (s.kind === "return") { // the tray return
      if (!w.l61Tray) { say("Nothing to put back. The rack is for trays, and you came empty-handed."); return; }
      w.l61Tray = 0; snd("plastic-tray-slid-into-rack-clatter", 0.7, 10);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 3); w.payout = { xp: 3, items: [], text: "You slide the tray into the rack, the way you would in a real food court. A faceling nods at you across the room. Sanity +3." };
      tell("TIDY! +3 SANITY", "#9fe8ff"); return;
    }
    if (s.kind === "condiment") { snd("squeeze-bottle-ketchup-squirt", 0.5, 6); tell(s.line ?? "SQUEEZE", "#ff9a7a"); return; }

    // vending machines and everything else: free, with a short wait before the coil restocks
    const tray = s.tray?.[uid];
    if (s.kind === "vend" && tray) { // it is down in the flap: your hand goes in and takes it
      if (!tray.down) { tell("IT'S STILL FALLING"); return; }
      const t = { ...s.tray }; delete t[uid]; s.tray = t;
      w.grab = { at: now, tok: tray.tok }; // scripts/player.js plays the reach, in first person and on the body
      ctx.after(0.45, "takeItem", { id: tray.item });
      snd("plastic-bottle-pickup-rattle", 0.5, 8);
      w.payout = { xp: 1, items: [tray.tok], text: LINE[tray.tok] ?? "Free, like everything here." };
      tell("+" + tray.tok.toUpperCase(), "#9fffb0"); return;
    }
    if (now - (cool[uid] ?? -1e9) < (s.cooldown ?? COOL)) { tell(s.kind === "vend" ? "THE COIL IS RESTOCKING" : "COME BACK IN A BIT"); return; }
    cool[uid] = now;
    const list = s.gives ? s.gives.split(",") : POOL[s.sells ?? "snack"], tok = list[Math.floor(ctx.random() * list.length)];
    if (s.kind === "vend") { // the coil turns, the item creeps off the end, falls to the flap and waits there for you
      const cx = [-0.16, 0.1, 0.34][Math.floor(ctx.random() * 3)], cy = [0.62, 0.92, 1.22, 1.5][Math.floor(ctx.random() * 4)];
      const item = ctx.spawn({ parent: ctx.self.id, feetPosition: { x: cx, y: cy, z: -0.22 }, castShadow: false, lifetime: 90, ...itemSpec(tok) });
      animate(ctx, item, { "feetPosition.z": -0.36 }, { duration: 0.9, easing: "linear" });
      animate(ctx, item, { "feetPosition.y": 0.17, "feetPosition.x": 0.08 }, { duration: 0.42, delay: 0.9, easing: "easeInQuad" });
      animate(ctx, item, { "feetPosition.z": -0.5, "rotation.roll": 90 }, { duration: 0.2, delay: 1.3, easing: "easeOutQuad" });
      s.tray = { ...(s.tray ?? {}), [uid]: { tok, item, down: false } };
      ctx.after(1.32, "landed", { uid, item });
      snd("vending-machine-spiral-coil-motor-turning-whir", 0.6, 10);
      tell("PRESS AGAIN TO TAKE IT", "#ffe9a8"); return;
    }
    snd(s.kind === "vend" ? "vending-machine-clunk-item-drop" : "paper-plate-slid-across-counter", 0.75);
    who.state.payout = { xp: 1, items: [tok], text: LINE[tok] ?? "Free, like everything here." };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};

// the vending item hits the flap
export function landed(ctx, p) {
  const s = ctx.self.state, t = s.tray?.[p.uid]; const pos = ctx.self.feetPosition;
  heard(ctx, { clip: G("vending-machine-clunk-item-drop"), position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, volume: 0.85, maxDistance: 14 });
  if (t && t.item === p.item) s.tray = { ...s.tray, [p.uid]: { ...t, down: true } };
  ctx.after(80, "expire", p);
}
export function takeItem(ctx, p) { if (ctx.getObject(p.id)) ctx.destroy(p.id); }
export function expire(ctx, p) { const t = ctx.self.state.tray?.[p.uid]; if (t && t.item === p.item) { const n = { ...ctx.self.state.tray }; delete n[p.uid]; ctx.self.state.tray = n; } }

// the kitchen is done: the bell dings, the board counts up, the tray is on the pickup counter
export function ready(ctx, p) {
  const s = ctx.self.state, o = s.ord?.[p.uid]; if (!o || o.n !== p.n) return;
  s.ord = { ...s.ord, [p.uid]: { ...o, done: true } }; const pk = PICKUP[p.key] ?? PICKUP.burger;
  const serving = ctx.getObject(`l61-serve-${p.key}`); if (serving) serving.ui = board(p.key, p.n);
  heard(ctx, { clip: G("restaurant-service-bell-ding"), position: { x: pk[0], y: pk[1], z: pk[2] }, volume: 0.9, maxDistance: 22 });
  const who = ctx.getObject(p.who); if (who?.state) who.state.notice = { text: `DING. "Order number ${p.n}!" Your tray is up on the pickup counter at ${NAME[p.key]}.`, at: ctx.now() };
  const id = `l61-tray-${p.key}-${p.n}`;
  ctx.spawn(id, { tags: ["usable"], feetPosition: { x: pk[0], y: pk[1], z: pk[2] }, behavior: "scripts/l61-use.js", primitive: { kind: "box", width: 0.46, height: 0.03, depth: 0.32 }, material: { color: "oklch(0.62 0.17 30)", roughness: 0.5 },
    state: { kind: "tray", owner: p.uid, n: p.n, items: o.gives, name: `Tray · order #${p.n}`, verb: "Take your tray", info: `${o.nm}. Your number is on the ticket: ${p.n}.`, tint: "#ffd84a" },
    fx: { script: `fx\npop steam rate=6 on=disc(.12) life=1..1.6 v=up(.3) size=.06..0.12 col=<.9,.9,.88> a=0>.35:.4>.35:.8>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` },
    children: [
      { feetPosition: { x: -0.1, y: 0.03, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.11, radiusBottom: 0.1, height: 0.02 }, material: { color: "oklch(0.97 0.005 90)" } },
      { feetPosition: { x: -0.1, y: 0.05, z: 0 }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: "oklch(0.58 0.12 55)", roughness: 0.8 } },
      { feetPosition: { x: 0.14, y: 0.03, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.035, height: 0.13 }, material: { color: "oklch(0.35 0.15 25)" } },
      { feetPosition: { x: 0.12, y: 0.03, z: -0.09 }, primitive: { kind: "box", width: 0.1, height: 0.005, depth: 0.07 }, material: { color: "oklch(0.95 0.01 90)" } },
    ] });
  // table service: the nearest faceling on the floor takes the tray and walks it over to you (scripts/l61-staff.js); if it cannot reach you in 45 s, the tray on the counter is yours
  const me = ctx.getObject(p.who); let best = null, bd = 45;
  if (me) for (const fid of ["a", "b", "c", "d", "e", "f"]) { const f = ctx.getObject(`l61-fc-${fid}`); if (!f?.state || f.state.deliver) continue; const d = Math.hypot(f.feetPosition.x - me.feetPosition.x, f.feetPosition.z - me.feetPosition.z); if (d < bd) { bd = d; best = f; } }
  if (best) { best.state.deliver = { uid: p.uid, who: p.who, n: p.n, tray: id, items: o.gives, until: ctx.now() + 45000 }; if (me?.state) me.state.notice = { text: `DING. "Order number ${p.n}!" A faceling picks up your tray and is bringing it over to you. Stay where you are.`, at: ctx.now() }; }
  ctx.after(150, "expire", { id });
}
export function expire(ctx, p) { if (ctx.getObject(p.id)) ctx.destroy(p.id); }
