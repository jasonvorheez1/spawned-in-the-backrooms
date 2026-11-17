// Level 69 overlay: the wake-up (text on black, then the dash fades in), the car's gauges while you drive,
// and a whispered line when the Whispers find you. Pure render: reads player.state.l69 and the car you control.
export function l69Ui(ctx, player) {
  if (player?.place !== "level69") return "";
  const s = player.state ?? {}, l = s.l69 ?? {}, now = ctx.now(), out = [];
  const t = l.introAt ? (now - l.introAt) / 1000 : 99;
  if (t < 11) { // 0-3 black, the engine already idling; two lines; 7-11 the black lifts
    const a = t < 7 ? 1 : Math.max(0, 1 - (t - 7) / 4);
    const line = (from, to, txt) => { const o = t < from ? 0 : t < from + 0.8 ? (t - from) / 0.8 : t < to - 0.8 ? 1 : Math.max(0, (to - t) / 0.8); return o > 0 ? `<div style="opacity:${o.toFixed(2)};margin:10px 0">${txt}</div>` : ""; };
    out.push(`<div style="position:fixed;inset:0;background:#000;opacity:${a.toFixed(2)};pointer-events:none;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;font:16px Georgia,serif;letter-spacing:.06em;color:#cfc8b6;text-shadow:0 1px 3px #000">
      ${line(1.2, 4.6, "An engine, idling. Your hands are on a wheel.")}${line(4.2, 7.6, "You don't remember getting in.")}</div>`);
  }
  const car = player.controlling?.state;
  if (car && t > 8) {
    const kmh = car.kmh ?? 0, hp = car.hp ?? 100, km = ((car.odo ?? 0) / 1000).toFixed(1);
    const cond = hp > 70 ? "#a9d18e" : hp > 25 ? "#e3b04b" : "#e05a3c";
    const faults = (car.faults ?? []).map((f) => ({ headL: "L HEADLIGHT", pull: "ALIGNMENT", dash: "DASH", window: "GLASS" }[f] ?? f)).join(" · ");
    out.push(`<div style="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);pointer-events:none;z-index:20;display:flex;gap:22px;align-items:flex-end;font:12px 'Courier New',monospace;color:#9fe3ff;text-shadow:0 0 6px #2aa8d8aa">
      <div style="text-align:center"><div style="font-size:34px;line-height:1">${kmh}</div><div style="opacity:.7">KM/H</div></div>
      <div style="text-align:center"><div style="font-size:16px">${km}</div><div style="opacity:.7">KM</div></div>
      <div style="text-align:center"><div style="color:${cond};font-size:16px">${hp > 0 ? Math.round(hp) + "%" : "DEAD"}</div><div style="opacity:.7">ENGINE</div></div>
      ${faults ? `<div style="color:#e3b04b;opacity:.85;max-width:180px">${faults}</div>` : ""}
      <div style="opacity:.6">${car.lights ? "LIGHTS ON" : "LIGHTS OFF"}</div></div>`);
  }
  const w = l.whisper;
  if (w && now - w.at < 4200) { const a = Math.min(1, (now - w.at) / 600) * Math.min(1, (4200 - (now - w.at)) / 900);
    out.push(`<div style="position:fixed;left:0;right:0;top:30%;text-align:center;pointer-events:none;z-index:25;opacity:${(a * 0.8).toFixed(2)};font:italic 15px Georgia,serif;color:#d9d2c4;letter-spacing:.12em;filter:blur(.4px);text-shadow:0 0 8px #000">${w.text}</div>`); }
  if (l.outAt && !player.controlling && t > 8) { const o = Math.min(1, (now - l.outAt) / 15000);
    out.push(`<div style="position:fixed;inset:0;pointer-events:none;z-index:15;background:radial-gradient(ellipse at 50% 50%,transparent ${Math.round(60 - o * 30)}%,rgba(0,0,0,${(0.35 + o * 0.5).toFixed(2)}) 100%)"></div>`); }
  return out.join("");
}
