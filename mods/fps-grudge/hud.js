// FPS Grudge combat HUD: crosshair and scope glass, hit/miss/kill marks, blood/flash/smoke/ring impairment, the gunsmith
// buy panel, the bottom-right ammo / health / weapon plate, the throwables strip, the money line and the syringe ring.
// fpsHud(ctx, player, opts) draws them all; each part is exported so a game can lay them into its own HUD in its own order.
// Reads only player.state as this mod's player.js writes it. Imports stay inside the mod.
import { ATTACHMENTS, SLOTS, stats, weapon, attachment, fits } from "./lib/guns.js";
import { BUY_CATS, buyRows } from "./lib/buy.js";

export const AMBER = "oklch(0.8 0.13 70)", DIM = "oklch(0.55 0.05 60)", PANEL = "oklch(0.16 0.02 50 / 0.86)", RED = "oklch(0.62 0.2 28)";
// the craftpix Bullet Game UI pack, uploaded whole-file
export const V = (h, e = "png") => `/cdn/value.${h}.${e}`;
export const UI = {
  frame: V("01c966c94f7188972bf2e57e6088a93cfd744310988280623602d4a51f256d78"), ring: V("6b531a8628e48bb9b2e96cf913c4b6b9ed18fe739c0b61fe99e9ce68ba88ee5f"),
  energy: V("6892894a97ca4eb3cc254a42a1ddc5a2a7f869caed1335a04d3e3e7182c16f74"), state: V("e7bbb54d70e78c486bee9f643af9b141dd6de2e049a9351566f04778cd4e7716"),
  auto: V("fa785eccb6eed677e8328e4da0139fb5acba9f9134a974b1e7486ec8021b1306"), burst: V("f33e19ac73805b885be6606f2795364e6e7cd3e5f25acda8b4536462394c43d8"), single: V("d0d08a57143997ebea849a7cc99a6c2e32c89317917ba4d2b19a48fc754e5bea"),
  bulletOn: V("56ba0914d49922d3d2d8db7d73674c65e62b656543e1d8e4e9d3321eb9a91cb1"), bulletOff: V("da2e72357ef642ffe6726a0bc1198336d19245abcd2cdcb8da92f97f2c60c77a"),
  check: V("6ce0dd023fe2d89eba3d0a8e278c28b80a0cace15658c475780468b39879a28f"), winG: V("c85ba82f4acf6152d6b6fe5e438c18e93a45d7e22df8fd289f99299aa7a17a56"), winR: V("71bee6a6b256d5874deaf771dd6b4070a5ee4ebc3b42f7cc23fd149aa49fe448"),
  coin: V("f23fe84f19fbc40e906060a670b9e2c31910aabca92f4e0d9c01d371be1ff80e"), circle: V("7349f81422a1031c7828a348e780856b6779b31122818b3a75171643a8d64ecc"),
  fontBold: V("b47fb2d718f413399c4dc72cd3f10ce95566d74a12476f9820e45a7c5556f3e3", "ttf"), fontSemi: V("554e60e8cef969bed47106b311b551faadb540daaffc7151466afbc189e83c0d", "ttf"),
};
export const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
// the HUD's fonts and keyframes: once per page, before the parts
export const hudStyle = () => `<style>@keyframes pop{from{transform:translateX(-50%) scale(.9);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}@font-face{font-family:Rajdhani;font-weight:700;src:url(${UI.fontBold})}@font-face{font-family:Rajdhani;font-weight:600;src:url(${UI.fontSemi})}</style>`;
// the view in the gun hand: the slot the needle went over still reads while the syringe is out
export const viewSlot = (s) => s.slot === "syringe" ? (s.prevSlot ?? "secondary") : s.slot;
export const viewKit = (s) => s.kit?.[viewSlot(s)] ?? { id: "scrap9", att: {} };

export function crosshair(s, st, now) {
  if (s.dead || s.panel) return "";
  const hit = now - (s.hitAt ?? 0) < 180, gap = 4 + (s.cross ?? 8) * 0.9;
  const hm = hit ? `<div style="position:absolute;left:50%;top:50%;width:0;height:0">${[45, 135, 225, 315].map((a) => `<div style="position:absolute;width:12px;height:2px;background:${s.hitHead ? RED : "#fff"};transform:rotate(${a}deg) translateX(9px);transform-origin:0 50%"></div>`).join("")}</div>` : "";
  if (s.ads && st.zoom > 3 && (s.scopeIn || !st.scoped)) { // scope glass: shown once the scope reaches the eye
    return `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%, transparent 0 34vh, #000 34.3vh)">
      <div style="position:absolute;left:0;right:0;top:50%;height:1px;background:#000"></div><div style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:#000"></div>
      <div style="position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:${RED}"></div>
      <div style="position:absolute;left:50%;bottom:16vh;transform:translateX(-50%);color:${AMBER};font-size:14px">${(s.zoomX ?? st.zoom).toFixed?.(1) ?? st.zoom}x${st.zoomMax > st.zoom ? " · wheel to zoom" : ""}</div>${hm}</div>`;
  }
  if (s.ads && st.scoped && !s.scopeIn) return "";
  const dot = (c, r) => `<div style="position:absolute;left:50%;top:50%;width:${r * 2}px;height:${r * 2}px;margin:-${r}px;border-radius:50%;background:${c};box-shadow:0 0 0 1px #000a,0 0 6px ${c}"></div>`;
  if (s.ads && st.reticle !== "iron") return `<div style="position:absolute;inset:0;pointer-events:none">${dot(RED, 2.5)}<div style="position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px;border:1px solid ${RED}66;border-radius:50%"></div></div>${hm}`;
  if (s.ads) { const g = 3 + (s.cross ?? 8) * 0.35, tk = (x, y, w, h) => `<div style="position:absolute;left:calc(50% + ${x}px);top:calc(50% + ${y}px);width:${w}px;height:${h}px;background:#f1f3f6;box-shadow:0 0 0 1px #0008"></div>`;
    return `<div style="position:absolute;inset:0;pointer-events:none">${dot("#f1f3f6", 1.5)}${tk(-g - 5, -0.5, 5, 1)}${tk(g, -0.5, 5, 1)}${tk(-0.5, g, 1, 5)}</div>${hm}`; }
  const bar = (x, y, w, h) => `<div style="position:absolute;left:calc(50% + ${x}px);top:calc(50% + ${y}px);width:${w}px;height:${h}px;background:oklch(0.95 0.05 90);box-shadow:0 0 2px #000"></div>`;
  return `<div style="position:absolute;inset:0;pointer-events:none">${bar(-gap - 8, -1, 8, 2)}${bar(gap, -1, 8, 2)}${bar(-1, -gap - 8, 2, 8)}${bar(-1, gap, 2, 8)}${bar(-1, -1, 2, 2)}</div>${hm}`;
}

export function gunsmith(s, canBuy) {
  const kit = s.kit?.[s.slot === "fists" ? "secondary" : s.slot] ?? { id: "scrap9", att: {} }, w = weapon(kit.id), st = stats(kit);
  const owned = s.owned ?? [], money = s.money ?? 0;
  const NAVY = "#1b2029", SLATE = "#2a2f37", LINE = "#454c57", TXT = "#e8ecf2", MUTE = "#8a93a0", OR = "#f28c1c";
  const cls = [["pistol", "Sidearms"], ["smg", "SMGs"], ["rifle", "Rifles"], ["shotgun", "Shotguns"], ["sniper", "Snipers"], ["lmg", "LMGs"]];
  const key = (n, on) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-right:8px;background:${on ? OR : "#12151b"};color:${on ? "#1a1410" : OR};border:1px solid ${OR};font:700 14px Rajdhani">${n}</span>`;
  const cat = s.buyCat;
  const catCol = BUY_CATS.map((c, i) => `<button onclick="sendAction('buyCat',{cat:'${c.id}'})" style="display:flex;align-items:center;width:100%;height:40px;padding:0 10px;margin:0 0 4px;background:${cat === c.id ? "linear-gradient(90deg,#3a2a14," + SLATE + ")" : SLATE};border:1px solid ${cat === c.id ? OR : LINE};color:${TXT};font:700 15px Rajdhani;letter-spacing:1px;text-transform:uppercase;text-align:left;cursor:pointer">${key(i + 1, cat === c.id)}${c.label}</button>`).join("");
  const has = (r) => r.kind === "armor" ? (s.armor ?? 0) >= 100 : r.kind === "grenade" ? (s[r.key ?? "grenades"] ?? 0) >= (r.max ?? 1) : r.kind === "molotov" ? (s.molotovs ?? 0) >= r.max : r.kind === "syringe" ? (s.syringes ?? 0) >= r.max : s.kit?.primary?.id === r.id || s.kit?.secondary?.id === r.id;
  const act = (r) => r.kind === "armor" ? "sendAction('buyArmor')" : r.kind === "grenade" ? "sendAction('buyGrenade')" : r.kind === "molotov" ? "sendAction('buyMolotov')" : r.kind === "syringe" ? "sendAction('buySyringe')" : `sendAction('buyWeapon',{id:'${r.id}'})`;
  const rowCol = cat ? buyRows(cat).map((r, i) => { const eq = has(r), poor = money < r.price, off = (poor || !canBuy) && !eq;
    return `<button onclick="${act(r)}" ${off || eq ? "disabled" : ""} style="position:relative;display:flex;align-items:center;width:100%;height:40px;padding:0 10px;margin:0 0 4px;background:${eq ? "linear-gradient(90deg,#3a2a14," + SLATE + ")" : SLATE};border:1px solid ${eq ? OR : LINE};color:${off ? "#5d646e" : TXT};font:700 15px Rajdhani;letter-spacing:.5px;text-transform:uppercase;text-align:left;cursor:${off ? "default" : "pointer"}">${key(i + 1, false)}<span style="flex:1">${esc(r.name)}${r.kind === "grenade" ? ` · ${s[r.key ?? "grenades"] ?? 0}/${r.max ?? 1}` : ""}</span><span style="color:${poor && !eq ? "#7a4040" : "#f1d27a"}">${eq ? `<img src="${UI.check}" style="height:14px">` : r.price ? "$" + r.price : "FREE"}</span></button>`; }).join("")
    : `<div style="padding:18px 10px;color:${MUTE};font:600 14px Rajdhani;letter-spacing:1px">PRESS 1–7 FOR A CATEGORY</div>`;
  const cols = `<div><div style="font:700 12px Rajdhani;letter-spacing:2px;color:${MUTE};margin:0 0 6px;border-bottom:1px solid ${LINE};padding-bottom:3px">CATEGORY</div>${catCol}</div>
    <div><div style="font:700 12px Rajdhani;letter-spacing:2px;color:${MUTE};margin:0 0 6px;border-bottom:1px solid ${LINE};padding-bottom:3px;text-transform:uppercase">${cat ? esc(BUY_CATS.find((c) => c.id === cat)?.label) + " · ESC BACK" : "—"}</div>${rowCol}</div>`;
  const slotRow = (slot) => {
    const cur = kit.att?.[slot], opts = ATTACHMENTS.filter((a) => a.slot === slot && fits(a, w));
    if (!opts.length) return "";
    const chip = (on, own, poor, label, act) => `<button onclick="${act}" ${poor ? "disabled" : ""} style="padding:3px 8px;background:${on ? OR : own ? "#39404a" : SLATE};color:${on ? "#1a1410" : poor ? "#5d646e" : TXT};border:1px solid ${on ? OR : LINE};font:600 12px Rajdhani;letter-spacing:.5px;cursor:pointer">${label}</button>`;
    return `<div style="margin:6px 0"><div style="font:700 11px Rajdhani;letter-spacing:2px;color:${MUTE};text-transform:uppercase;margin-bottom:3px">${slot}</div><div style="display:flex;flex-wrap:wrap;gap:4px">
      ${chip(!cur, true, false, "NONE", `sendAction('fitAtt',{slot:'${slot}',id:null})`)}
      ${opts.map((a) => { const own = owned.includes(a.id); return chip(cur === a.id, own, !own && (money < a.price || !canBuy), esc(a.name) + (own ? "" : ` · $${a.price}`), `sendAction('buyAtt',{id:'${a.id}'})`); }).join("")}</div></div>`;
  };
  const statBar = (label, v, max) => { const pct = Math.max(3, Math.min(100, v / max * 100));
    return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:70px;font:600 12px Rajdhani;letter-spacing:1px;color:${MUTE};text-transform:uppercase">${label}</span><div style="flex:1;height:6px;background:#12151b;display:flex;gap:2px">${Array.from({ length: 10 }, (_, i) => `<div style="flex:1;background:${i < pct / 10 ? OR : "#2a2f37"}"></div>`).join("")}</div></div>`; };
  const loadChip = (slot, label) => { const k = s.kit?.[slot]; return `<div style="flex:1;padding:6px 10px;background:${s.slot === slot ? "#3a2a14" : SLATE};border:1px solid ${s.slot === slot ? OR : LINE}"><div style="font:600 10px Rajdhani;letter-spacing:2px;color:${MUTE}">${label}</div><div style="font:700 15px Rajdhani;color:${TXT};text-transform:uppercase">${k ? esc(weapon(k.id).name) : "—"}</div></div>`; };
  return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, oklch(0.1 0.01 250 / .55), oklch(0.05 0.01 250 / .85));pointer-events:auto;font-family:Rajdhani">
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,95vw);max-height:88vh;overflow:auto;background:${NAVY};border:1px solid ${LINE};box-shadow:0 20px 60px #000;color:${TXT}">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:2px solid ${OR};background:linear-gradient(90deg,#232933,${NAVY})">
      <div><div style="font:700 26px Rajdhani;letter-spacing:4px">GUNSMITH</div><div style="font:600 12px Rajdhani;letter-spacing:2px;color:${canBuy ? OR : MUTE}">${canBuy ? "BUY TIME · YOUR YARD" : "FITTING ONLY · BUY TIME IS OVER"}</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <div style="display:flex;align-items:center;gap:6px;font:700 26px Rajdhani;color:#f1d27a"><img src="${UI.coin}" style="height:24px">${money}</div>
        <button onclick="sendAction('buyArmor')" ${money < 650 || (s.armor ?? 0) >= 100 || !canBuy ? "disabled" : ""} style="padding:8px 12px;background:${(s.armor ?? 0) >= 100 ? "#253a2a" : SLATE};color:${TXT};border:1px solid ${(s.armor ?? 0) >= 100 ? "#6fbf5a" : LINE};font:700 14px Rajdhani;letter-spacing:1px;cursor:pointer">${(s.armor ?? 0) >= 100 ? "◈ VEST ON" : "◈ PLATE VEST · $650"}</button>
        <button onclick="sendAction('closePanel')" style="padding:8px 14px;background:${OR};color:#1a1410;border:0;font:700 16px Rajdhani;cursor:pointer">✕</button></div></div>
    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:16px;padding:14px 16px">
      <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:12px">${cols}</div>
      <div style="background:#161a21;border:1px solid ${LINE};padding:12px">
        <div style="display:flex;gap:6px;margin-bottom:10px">${loadChip("primary", "PRIMARY · 1")}${loadChip("secondary", "SIDEARM · 2")}</div>
        <div style="font:700 22px Rajdhani;letter-spacing:1px;text-transform:uppercase">${esc(w.name)}</div>
        <div style="font:600 12px Rajdhani;letter-spacing:2px;color:${MUTE};text-transform:uppercase;margin-bottom:6px">${w.cls} · ${st.magSize} rounds · ${st.auto ? "auto" : st.burst ? "burst" : "semi"}</div>
        ${statBar("damage", st.damage * (st.pellets ?? 1), 120)}${statBar("fire rate", 60000 / st.interval, 1000)}${statBar("accuracy", 1 / Math.max(0.05, st.adsSpread), 10)}${statBar("control", 1 / Math.max(0.2, st.kick), 3)}${statBar("range", st.reach, 200)}${statBar("mobility", st.speed, 1.05)}
        <div style="margin-top:10px;border-top:1px solid ${LINE};padding-top:6px">${SLOTS.map(slotRow).join("")}</div>
        <div style="font:600 11px Rajdhani;letter-spacing:1px;color:${MUTE};margin-top:8px">number keys buy · Esc back · B closes · owned attachments refit free</div></div></div></div></div>`;
}

// the knife out: a small dot; any gun: crosshair() (scope glass, red dot, irons, hip bars)
export function reticle(s, st, now) { return s.slot === "fists" ? `<div style="position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#f1f3f6;box-shadow:0 0 3px #000"></div>` : crosshair(s, st, now); }

// hurt flash and low-hp pulse at the screen's edge
export function vignette(s, hp, now) {
  const hurt = now - (s.hurtAt ?? 0) < 400 ? 0.55 : 0, low = hp < 35 ? 0.35 + 0.15 * Math.sin(now / 180) : 0;
  const vign = Math.max(hurt, low);
  return vign ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 45%, oklch(0.35 0.2 25 / ${vign}) 100%)"></div>` : "";
}

// where the hit came from: a red arc round the crosshair, pointing at the shooter
export function hurtArc(s, now) {
  const t = now - (s.hurtAt ?? -1e9); if (t > 1400 || s.hurtDir == null) return "";
  const a = Math.max(0, 1 - t / 1400);
  return `<div style="position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(${s.hurtDir}deg)"><div style="position:absolute;left:-70px;top:-150px;width:140px;height:40px;border-top:6px solid oklch(0.62 0.22 28 / ${a});border-radius:50% 50% 0 0 / 100% 100% 0 0;filter:drop-shadow(0 0 6px oklch(0.5 0.25 28 / ${a}))"></div></div>`;
}

// a round that landed beside you: a thin red arc on a 90 px ring, pointing where it came from, gone in 1.2 s
export function missArc(s, now) {
  const t = now - (s.nearMissFrom?.at ?? -1e9); if (t > 1200 || s.missDir == null) return "";
  const a = (1 - t / 1200) * 0.85;
  return `<div style="position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(${s.missDir}deg)"><div style="position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;border:3px solid transparent;border-top-color:oklch(0.62 0.22 28 / ${a});-webkit-mask:conic-gradient(from -28deg,#000 0 56deg,transparent 0);mask:conic-gradient(from -28deg,#000 0 56deg,transparent 0);filter:drop-shadow(0 0 4px oklch(0.5 0.25 28 / ${a}))"></div></div>`;
}

// the kill: a red X on the crosshair and the cash, climbing with the round's streak
export function killConfirm(s, now) {
  const t = now - (s.killAt ?? -1e9); if (t > 1600) return "";
  const a = t < 1200 ? 1 : 1 - (t - 1200) / 400, sc = t < 120 ? 1.4 - t / 300 : 1;
  return `<div style="position:absolute;left:50%;top:50%;width:0;height:0;opacity:${a}">${[45, 135, 225, 315].map((d) => `<div style="position:absolute;width:18px;height:3px;background:${RED};transform:rotate(${d}deg) translateX(${10 * sc}px);transform-origin:0 50%;box-shadow:0 0 4px ${RED}"></div>`).join("")}</div>
  <div style="position:absolute;left:50%;top:calc(50% + 46px);transform:translateX(-50%) scale(${sc});text-align:center;opacity:${a};font-family:Rajdhani"><div style="font:700 18px Rajdhani;letter-spacing:4px;color:${s.killHead ? "#f1d27a" : "#f1f3f6"}">${s.killHead ? "HEADSHOT" : "ELIMINATED"}${(s.rk ?? 0) > 1 ? ` ×${s.rk}` : ""}</div><div style="font:700 14px Rajdhani;color:#f1d27a">+$300</div></div>`;
}

// what the body takes in: blood on the screen's edges by hit and by low hp, a white flashbang burn that fades into a blurred after-image,
// smoke greying the whole view while your eyes are inside a cloud, and a soft muffled ring after a close blast or a round beside your head
export const BLOOD = "/cdn/value.179ca964cb92719d1a324778446f6b9377b06528d8652d19f9976e6dcc3b40dd.png";
export function impair(s, hp, now) {
  let out = "";
  const sinceHurt = now - (s.hurtAt ?? -1e9), fresh = sinceHurt < 1600 ? 1 - sinceHurt / 1600 : 0, lowB = hp < 60 ? (60 - hp) / 60 * 0.75 : 0, b = Math.min(0.95, Math.max(fresh * 0.9, lowB));
  if (b > 0.02 && !s.dead) out += `<div style="position:absolute;inset:0;background:url(${BLOOD}) center/100% 100% no-repeat;opacity:${b.toFixed(2)};transform:scale(${(1.06 - 0.06 * b).toFixed(3)})"></div>`;
  const fl = s.flashAt ? now - s.flashAt : 1e9, fms = s.flashMs ?? 2000, fk = s.flashK ?? 0;
  if (fl < fms + 1500) {
    const white = fl < fms ? Math.min(1, (0.55 + fk) * (1 - Math.pow(fl / fms, 2))) : 0, blur = Math.max(0, 1 - fl / (fms + 1500)) * (4 + 10 * fk);
    out += `<div style="position:absolute;inset:0;backdrop-filter:blur(${blur.toFixed(1)}px) brightness(${(1 + 1.5 * white).toFixed(2)});-webkit-backdrop-filter:blur(${blur.toFixed(1)}px)"></div><div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 48%, #fff 0%, #fffdf4 ${Math.round(40 + 40 * white)}%, rgba(255,250,235,.85) 100%);opacity:${white.toFixed(2)}"></div>`;
  }
  const sk = s.smokeK ?? 0;
  if (sk > 0) out += `<div style="position:absolute;inset:0;backdrop-filter:blur(${(sk * 9).toFixed(1)}px);-webkit-backdrop-filter:blur(${(sk * 9).toFixed(1)}px);background:radial-gradient(ellipse at center, rgba(168,168,162,${(sk * 0.82).toFixed(2)}) 0%, rgba(150,150,145,${Math.min(0.97, sk * 1.05).toFixed(2)}) 70%);transition:opacity .3s"></div>`;
  const rg = s.ringAt ? now - s.ringAt : 1e9, rk = s.ringK ?? 0, rl = 1200 + rk * 4500;
  if (rg < rl && !s.dead) { const a = (1 - rg / rl) * (0.15 + 0.35 * rk); out += `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 35%, rgba(20,16,12,${a.toFixed(2)}) 100%);backdrop-filter:blur(${(a * 3).toFixed(1)}px) saturate(${(1 - a).toFixed(2)})"></div>`; }
  const zp = s.zipAt ? now - s.zipAt : 1e9;
  if (zp < 500) out += `<div style="position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(160 * (1 - zp / 500))}px rgba(0,0,0,.55)"></div>`;
  return out;
}

// bottom right: weapon name (+ tier when opts.tiers is given: [{ name, color }] indexed by kit.tier - 1), fire mode, mag / reserve,
// one round per bullet, attachments and stance; the health ring with the armor arc over it
export function ammoPlate(s, now, opts = {}) {
  const tiers = opts.tiers, vslot = viewSlot(s), kit = viewKit(s), st = stats(kit), w = weapon(kit.id);
  const hp = Math.max(0, s.hp ?? 100), armor = s.armor ?? 0;
  const reloading = s.reloadUntil > now;
  const ammo = s.ammo?.[vslot] ?? 0, reserve = s.reserve?.[vslot] ?? 0;
  const bh = st.magSize > 30 ? 16 : st.magSize > 15 ? 20 : 26; // the pack's single round, 8x36, one per bullet in the mag
  const bullets = Array.from({ length: Math.min(st.magSize, 50) }, (_, i) => `<img src="${UI.single}" style="height:${bh}px;width:${bh * 8 / 36}px;${i < ammo ? "filter:brightness(1.6) sepia(.4)" : "opacity:.18"}">`).join("");
  return `<div style="position:absolute;right:70px;bottom:14px;width:388px;height:148px;background:url(${UI.frame}) center/contain no-repeat">
    <div style="position:absolute;right:${388 - 388 * 0.985}px;top:${148 * 0.06}px;width:${148 * 0.88}px;height:${148 * 0.88}px">
      <div style="position:absolute;inset:6%;background:url(${UI.ring}) center/contain no-repeat;opacity:.18"></div>
      <div style="position:absolute;inset:6%;background:url(${UI.ring}) center/contain no-repeat;filter:${hp < 35 ? "sepia(1) saturate(6) hue-rotate(-30deg)" : "sepia(1) saturate(3) hue-rotate(-10deg) brightness(1.1)"};-webkit-mask:conic-gradient(#000 ${hp * 3.6}deg, transparent 0);mask:conic-gradient(#000 ${hp * 3.6}deg, transparent 0)"></div>
      ${armor ? `<div style="position:absolute;inset:0;background:url(${UI.energy}) center/contain no-repeat;filter:sepia(1) saturate(4) hue-rotate(160deg);-webkit-mask:conic-gradient(#000 ${armor * 3.6}deg, transparent 0);mask:conic-gradient(#000 ${armor * 3.6}deg, transparent 0)"></div>` : ""}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Rajdhani"><span style="font:700 34px/1 Rajdhani;color:${hp < 35 ? RED : "#f1f3f6"}">${hp}</span><span style="font:600 11px Rajdhani;letter-spacing:2px;color:#8a93a0">${armor ? "◈ " + armor : "HEALTH"}</span></div></div>
    <div style="position:absolute;left:34px;top:24px;width:210px">
      <div style="display:flex;justify-content:space-between;align-items:center"><span style="font:700 15px Rajdhani;letter-spacing:1px;text-transform:uppercase;color:#e8ecf2;display:flex;align-items:center;gap:6px">${st.cls === "pistol" && s.slot !== "fists" ? `<span style="display:inline-block;width:44px;height:18px;background:#e8ecf2;-webkit-mask:url(/cdn/usp-u24104gez.webp) center/contain no-repeat;mask:url(/cdn/usp-u24104gez.webp) center/contain no-repeat;mask-mode:luminance"></span>` : ""}${s.slot === "fists" ? "Knife" : esc(w.name)}${s.slot === "fists" ? "" : (() => { const t = tiers?.[(kit.tier ?? 1) - 1]; if (!t) return ""; return ` <span style="color:${t.color};text-shadow:0 0 8px ${t.color}">${t.name}</span>`; })()}</span><img src="${st.burst ? UI.burst : st.auto ? UI.auto : UI.single}" style="height:18px;opacity:.85"></div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px"><span style="font:700 44px/1 Rajdhani;color:${ammo === 0 ? RED : ammo <= st.magSize * 0.25 ? AMBER : "#f1f3f6"}">${reloading ? "--" : ammo}</span><span style="font:600 18px Rajdhani;color:#8a93a0">/ ${reserve}</span></div>
      <div style="display:flex;gap:${st.magSize > 30 ? 1 : 2}px;margin-top:6px;flex-wrap:wrap;max-width:210px">${bullets}</div>
      <div style="font:600 11px Rajdhani;letter-spacing:1px;color:#8a93a0;margin-top:5px;text-transform:uppercase;white-space:nowrap;overflow:hidden">${reloading ? "reloading" : ammo === 0 ? "R reload" : Object.values(kit.att ?? {}).map((a) => attachment(a)?.name).filter(Boolean).join(" · ") || (s.ads ? "aiming" : "hip")}${s.lean ? ` · peek ${s.lean < 0 ? "L" : "R"}` : ""}${s.sliding ? " · slide" : s.crouch ? " · crouch" : ""}</div></div></div>`;
}
export function moneyLine(s) { return `<div style="position:absolute;right:78px;bottom:166px;display:flex;align-items:center;gap:6px;font:700 20px Rajdhani;color:#f1d27a"><img src="${UI.coin}" style="height:20px">${s.money ?? 0}<span style="font:600 13px Rajdhani;color:#8a93a0;margin-left:8px">${s.kills ?? 0} KILLS</span></div>`; }
export function throwables(s) { return `<div style="position:absolute;right:78px;bottom:192px;display:flex;gap:10px;font:700 15px Rajdhani;color:#e8ecf2">${[["F", "FRAG", s.grenades ?? 0, "frag"], ["F", "FLASH", s.flashes ?? 0, "flash"], ["F", "SMOKE", s.smokes ?? 0, "smoke"], ["T", "MOLOTOV", s.molotovs ?? 0], ["H", "SYRINGE", s.syringes ?? 0]].map(([k, n, c, nk]) => { const sel = nk && (s.nadeKind ?? "frag") === nk; return `<span style="background:${PANEL};padding:2px 8px;opacity:${c || sel ? 1 : 0.4};${sel ? `box-shadow:inset 0 -2px 0 ${AMBER};outline:1px solid ${AMBER}` : ""}">${nk && !sel ? "" : `<span style="color:${AMBER}">${k}</span> `}${n} <span style="color:${c ? "#f1f3f6" : "#5d646e"}">×${c}</span></span>`; }).join("")}<span style="padding:2px 4px;color:#8a919b;font-size:12px;align-self:center">X cycle</span></div>`; }
export function healRing(s, now) { return s.healUntil && s.slot === "syringe" ? (() => { const T = 2200, k = Math.max(0, Math.min(1, 1 - (s.healUntil - now) / T)); return `<div style="position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px;border-radius:50%;background:conic-gradient(oklch(0.82 0.16 150) ${k * 360}deg, oklch(0.25 0.02 150 / .45) 0);-webkit-mask:radial-gradient(circle, transparent 35px, #000 36px);mask:radial-gradient(circle, transparent 35px, #000 36px)"></div><div style="position:absolute;left:50%;top:calc(50% + 52px);transform:translateX(-50%);font:700 13px Rajdhani;letter-spacing:2px;color:oklch(0.85 0.14 150)">${k > 0.82 ? "INJECTING" : "HEALING"}</div>`; })() : ""; }

// everything above in one HUD. opts.canBuy: the gunsmith may sell (else fitting only); opts.money: draw the money line (default true);
// opts.tiers: gun tier labels on the plate
export function fpsHud(ctx, player, opts = {}) {
  const s = player.state ?? {}, now = ctx.now(), st = stats(viewKit(s)), hp = Math.max(0, s.hp ?? 100);
  return `${hudStyle()}<div style="position:fixed;inset:0;pointer-events:none;font-family:Rajdhani,sans-serif;color:${AMBER};text-shadow:0 1px 2px #000">
  ${vignette(s, hp, now)}
  ${impair(s, hp, now)}${s.ride ? "" : reticle(s, st, now)}
  ${hurtArc(s, now)}${missArc(s, now)}${killConfirm(s, now)}
  ${ammoPlate(s, now, opts)}
  ${opts.money === false ? "" : moneyLine(s)}
  ${throwables(s)}
  ${healRing(s, now)}
  ${s.panel ? gunsmith(s, !!opts.canBuy) : ""}
</div>`;
}
export default function (ctx, player) { return fpsHud(ctx, player, { canBuy: true }); }
