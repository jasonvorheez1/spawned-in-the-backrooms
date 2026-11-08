// Level 6.1 "The Snackrooms" - Food Court & Vending Interactions
// Pure show-don't-tell: physical registers, flip menus, steaming trays, sound cues, and animated staff.
import { heard } from "./lib/hear.js";
import { animate } from "builtin/tween";
import { itemSpec } from "./lib/vend-item.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const POOL = { snack: ["doritos", "doritos", "coolranch"], soda: ["coke", "coke", "pepsi", "dew", "sprite", "drpepper", "cherrycoke", "vault", "redbull", "snapple", "gatorade", "sobe"] };
const COOL = 20000;

// Menus at each food court venue: [name, items given, original crossed-out price]
export const MENUS = {
  clip: [["Budweiser, ice cold", ["budweiser"], "3.00"], ["Jack and Coke", ["jackcoke"], "4.50"], ["Smirnoff Ice", ["smirnoffice"], "3.75"], ["Coca-Cola float", ["coke"], "2.25"], ["Chips and a Coke", ["doritos", "coke"], "2.75"]],
  liq: [["Almond water", ["almond"], "3.00"], ["Corona with lime", ["corona"], "4.00"], ["Jose Cuervo margarita", ["margarita"], "5.50"], ["Miller Lite", ["millerlite"], "3.00"], ["Jim Beam, neat", ["whiskey"], "5.00"], ["Bar snacks", ["doritos", "coolranch"], "2.50"]],
  slice: [["Pepperoni slice", ["pizza"], "3.25"], ["Two cheese slices and a Coke", ["pizza", "coke"], "6.25"], ["Supreme slice", ["pizza", "pizza"], "5.00"]],
  burger: [["Cheeseburger", ["burger"], "4.50"], ["Bop meal: burger, chips, shake", ["burger", "doritos", "dew"], "7.95"], ["Fries and a Coke", ["doritos", "coke"], "3.25"]],
};

const KEYS = ["clip", "liq", "slice", "burger"];
const keyOf = (id) => KEYS.find((k) => String(id).includes(`-${k}-`) || String(id).endsWith(`-${k}`));
const PICKUP = { clip: [-19.2, 1.12, -29.65], liq: [-11.75, 1.1, -25.2], slice: [5.4, 1.02, -28.9], burger: [19.4, 1.02, -28.2] };
const NAME = { clip: "Clippers", liq: "Liquorette", slice: "Slice Palace", burger: "Burger Bop" };

const board = (key, n) => `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;background:#101418;color:#7affb0;text-align:center"><div style="font-size:54px;color:#ffd84a">NOW SERVING</div><div style="font-size:150px;font-weight:700;letter-spacing:6px;text-shadow:0 0 18px #3f9">${String(n).padStart(3, "0")}</div><div style="font-size:34px;color:#9fb8c8">${NAME[key].toUpperCase()}</div></div>`;

function renderMenuUI(key, selectedIdx) {
  const items = MENUS[key] ?? [];
  return `<div face="front" width="0.5m" style="width:100%;height:100%;box-sizing:border-box;padding:14px 12px;background:#161a1e;color:#f4f1ea;font-family:Georgia,serif;text-align:center">
    <div style="font-size:30px;letter-spacing:3px;color:#ffd84a;border-bottom:2px solid #ffd84a;padding-bottom:4px">${NAME[key].toUpperCase()}</div>
    ${items.map(([n, , p], idx) => `
      <div style="font-size:20px;margin-top:9px;padding:3px 6px;display:flex;justify-content:space-between;border-radius:3px;${idx === selectedIdx ? "background:#223828;border:1px solid #7affb0;color:#ffffff;font-weight:bold" : ""}">
        <span style="${idx === selectedIdx ? "color:#7affb0" : ""}">${idx === selectedIdx ? "▶ " : ""}${n}</span>
        <span><s style="color:#777">$${p}</s> <b style="color:#7affb0">FREE</b></span>
      </div>
    `).join("")}
    <div style="font-size:14px;margin-top:12px;color:#ffd84a;letter-spacing:1px">ORDER AT COUNTER</div>
  </div>`;
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, w = who.state;
    const tell = (text, color = "#ffe9a8") => ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, text, color, size: 0.95 }, { audience: { player: who.id } });
    const snd = (n, v = 0.7, d = 14) => heard(ctx, { clip: G(n), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: v, maxDistance: d });

    if (s.kind === "menu") { // Physical menu board flip: highlight active selection
      const key = s.key ?? keyOf(ctx.self.id) ?? "burger", M = MENUS[key], sel = (((s.sel ?? {})[uid] ?? -1) + 1) % M.length, [nm] = M[sel];
      s.sel = { ...(s.sel ?? {}), [uid]: sel };
      snd("paper-flip-card-stand", 0.6, 8);
      ctx.self.ui = renderMenuUI(key, sel);
      tell(`${nm.toUpperCase()} · FREE`, "#ffd84a");
      return;
    }

    if (s.kind === "counter") { // Order the chosen menu item at the counter
      const key = s.key ?? keyOf(ctx.self.id) ?? "burger", M = MENUS[key], menuObj = ctx.getObject(`l61-menu-${key}`), sel = menuObj?.state?.sel?.[uid] ?? 0, [nm, gives] = M[sel % M.length];
      const mine = (s.ord ?? {})[uid];
      if (mine && !mine.done) {
        snd("cooking-meat-sizzle-in-pan", 0.5, 8);
        tell(`ORDER #${mine.n} (${mine.nm.toUpperCase()}) STILL COOKING...`, "#ffaa40");
        return;
      }
      const st = ctx.place.state, n = ((st.l61Ticket ?? 40) + 1 + Math.floor(ctx.random() * 3));
      st.l61Ticket = n;
      s.ord = { ...(s.ord ?? {}), [uid]: { n, nm, gives, done: false } };
      const wait = 6 + ctx.random() * 6;
      snd("cash-register-ka-ching-drawer-open", 0.75, 12);

      const fc = ctx.getObject(`l61-fc-${key}`);
      if (fc?.state) {
        fc.state.orderAt = now;
        if (fc.anim) {
          fc.anim.gest = { clip: "cdn/clip-nod-yes.glb", loop: "once", weight: 0.85, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
        }
      }

      // Update cash register display in 3D
      const reg = ctx.getObject(`l61-reg-${key}`);
      if (reg && reg.children?.[0]) {
        reg.children[0].ui = `<div face="front" width="0.28m" style="width:100%;height:100%;background:#031;color:#7affb0;font:700 36px 'Courier New',monospace;padding:6px;box-sizing:border-box;text-align:center;line-height:1.05">ORDER #${n}<br>$0.00<br><span style="font-size:20px">${nm.toUpperCase().slice(0, 14)}</span></div>`;
      }

      tell(`ORDER #${n}: ${nm.toUpperCase()} ($0.00)`, "#7affb0");
      ctx.after(wait, "ready", { uid, who: who.id, key, n });
      return;
    }

    if (s.kind === "tray") { // Pick up ready tray
      if (s.owner !== uid) {
        snd("plastic-bottle-pickup-rattle", 0.35, 6);
        tell(`ORDER #${s.n} · NOT YOURS`, "#ff6060");
        return;
      }
      snd("paper-plate-slid-across-counter", 0.85, 12);
      w.l61Tray = now;
      w.payout = { xp: 2, items: s.items };
      tell(s.items.map((t) => "+" + t.toUpperCase()).join(" "), "#9fffb0");
      ctx.destroy(ctx.self.id);
      return;
    }

    if (s.kind === "return") { // Slide dirty tray into return rack
      if (!w.l61Tray) {
        snd("paper-flip-card-stand", 0.3, 6);
        tell("NO TRAY TO RETURN", "#aaaaaa");
        return;
      }
      w.l61Tray = 0;
      snd("plastic-tray-slid-into-rack-clatter", 0.8, 12);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 3);
      w.payout = { xp: 3, items: [] };
      tell("+3 SANITY (TRAY RETURNED)", "#9fe8ff");

      // Nearest faceling acknowledges with a nod
      for (const fid of ["a", "b", "c", "d", "e", "f"]) {
        const f = ctx.getObject(`l61-fc-${fid}`);
        if (f?.anim && Math.hypot(f.feetPosition.x - pos.x, f.feetPosition.z - pos.z) < 16) {
          f.anim.gest = { clip: "cdn/clip-nod-yes.glb", loop: "once", weight: 0.85, blendIn: 0.2, blendOut: 0.35, mask: { from: "Spine" } };
          break;
        }
      }
      return;
    }

    if (s.kind === "condiment") {
      snd("squeeze-bottle-ketchup-squirt", 0.5, 6);
      tell(s.line ?? "SQUEEZE", "#ff9a7a");
      return;
    }

    // Vending machines: spiral coil motor turns, item drops into flap
    const tray = s.tray?.[uid];
    if (s.kind === "vend" && tray) {
      if (!tray.down) { tell("DISPENSING..."); return; }
      const t = { ...s.tray }; delete t[uid]; s.tray = t;
      w.grab = { at: now, tok: tray.tok };
      ctx.after(0.45, "takeItem", { id: tray.item });
      snd("plastic-bottle-pickup-rattle", 0.6, 8);
      w.payout = { xp: 1, items: [tray.tok] };
      tell("+" + tray.tok.toUpperCase(), "#9fffb0");
      return;
    }

    if (now - (cool[uid] ?? -1e9) < (s.cooldown ?? COOL)) {
      tell(s.kind === "vend" ? "RESTOCKING..." : "PLEASE WAIT");
      return;
    }
    cool[uid] = now;
    const list = s.gives ? s.gives.split(",") : POOL[s.sells ?? "snack"], tok = list[Math.floor(ctx.random() * list.length)];

    if (s.kind === "vend") {
      const cx = [-0.16, 0.1, 0.34][Math.floor(ctx.random() * 3)], cy = [0.62, 0.92, 1.22, 1.5][Math.floor(ctx.random() * 4)];
      const item = ctx.spawn({ parent: ctx.self.id, feetPosition: { x: cx, y: cy, z: -0.22 }, castShadow: false, lifetime: 90, ...itemSpec(tok) });
      animate(ctx, item, { "feetPosition.z": -0.36 }, { duration: 0.9, easing: "linear" });
      animate(ctx, item, { "feetPosition.y": 0.17, "feetPosition.x": 0.08 }, { duration: 0.42, delay: 0.9, easing: "easeInQuad" });
      animate(ctx, item, { "feetPosition.z": -0.5, "rotation.roll": 90 }, { duration: 0.2, delay: 1.3, easing: "easeOutQuad" });
      s.tray = { ...(s.tray ?? {}), [uid]: { tok, item, down: false } };
      ctx.after(1.32, "landed", { uid, item });
      snd("vending-machine-spiral-coil-motor-turning-whir", 0.65, 10);
      tell("DISPENSING... PRESS FLAP TO TAKE", "#ffe9a8");
      return;
    }

    snd("paper-plate-slid-across-counter", 0.75);
    who.state.payout = { xp: 1, items: [tok] };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};

// Vending item hits flap
export function landed(ctx, p) {
  const s = ctx.self.state, t = s.tray?.[p.uid]; const pos = ctx.self.feetPosition;
  heard(ctx, { clip: G("vending-machine-clunk-item-drop"), position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, volume: 0.85, maxDistance: 14 });
  if (t && t.item === p.item) s.tray = { ...s.tray, [p.uid]: { ...t, down: true } };
  ctx.after(80, "vendExpire", p);
}
export function takeItem(ctx, p) { if (ctx.getObject(p.id)) ctx.destroy(p.id); }
export function vendExpire(ctx, p) { const t = ctx.self.state.tray?.[p.uid]; if (t && t.item === p.item) { const n = { ...ctx.self.state.tray }; delete n[p.uid]; ctx.self.state.tray = n; } }

// Kitchen is ready: service bell dings, electronic LED board updates, steaming tray spawns
export function ready(ctx, p) {
  const s = ctx.self.state, o = s.ord?.[p.uid]; if (!o || o.n !== p.n) return;
  s.ord = { ...s.ord, [p.uid]: { ...o, done: true } };
  const pk = PICKUP[p.key] ?? PICKUP.burger;
  const serving = ctx.getObject(`l61-serve-${p.key}`);
  if (serving) serving.ui = board(p.key, p.n);
  heard(ctx, { clip: G("restaurant-service-bell-ding"), position: { x: pk[0], y: pk[1], z: pk[2] }, volume: 0.95, maxDistance: 25 });

  ctx.emit("damageNumber", {
    position: { x: pk[0], y: pk[1] + 0.6, z: pk[2] },
    text: `ORDER #${p.n} READY!`,
    color: "#7affb0",
    size: 1.15,
  });

  const id = `l61-tray-${p.key}-${p.n}`;
  ctx.spawn(id, {
    tags: ["usable"],
    feetPosition: { x: pk[0], y: pk[1], z: pk[2] },
    behavior: "scripts/l61-use.js",
    primitive: { kind: "box", width: 0.46, height: 0.03, depth: 0.32 },
    material: { color: "oklch(0.62 0.17 30)", roughness: 0.5 },
    state: { kind: "tray", owner: p.uid, n: p.n, items: o.gives, name: `Tray · order #${p.n}`, verb: "Take your tray", info: `Order #${p.n}: ${o.nm}`, tint: "#ffd84a" },
    fx: { script: `fx\npop steam rate=6 on=disc(.12) life=1..1.6 v=up(.3) size=.06..0.12 col=<.9,.9,.88> a=0>.35:.4>.35:.8>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` },
    children: [
      { feetPosition: { x: -0.1, y: 0.03, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.11, radiusBottom: 0.1, height: 0.02 }, material: { color: "oklch(0.97 0.005 90)" } },
      { feetPosition: { x: -0.1, y: 0.05, z: 0 }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: "oklch(0.58 0.12 55)", roughness: 0.8 } },
      { feetPosition: { x: 0.14, y: 0.03, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.035, height: 0.13 }, material: { color: "oklch(0.35 0.15 25)" } },
      { feetPosition: { x: 0.12, y: 0.03, z: -0.09 }, primitive: { kind: "box", width: 0.1, height: 0.005, depth: 0.07 }, material: { color: "oklch(0.95 0.01 90)" } },
    ],
  });

  // Table service: the nearest faceling waiter walks the tray over
  const me = ctx.getObject(p.who); let best = null, bd = 45;
  if (me) for (const fid of ["a", "b", "c", "d", "e", "f"]) {
    const f = ctx.getObject(`l61-fc-${fid}`);
    if (!f?.state || f.state.deliver) continue;
    const d = Math.hypot(f.feetPosition.x - me.feetPosition.x, f.feetPosition.z - me.feetPosition.z);
    if (d < bd) { bd = d; best = f; }
  }
  if (best) {
    best.state.deliver = { uid: p.uid, who: p.who, n: p.n, tray: id, items: o.gives, until: ctx.now() + 45000 };
  }
  ctx.after(150, "expire", { id });
}
export function expire(ctx, p) { if (ctx.getObject(p.id)) ctx.destroy(p.id); }
