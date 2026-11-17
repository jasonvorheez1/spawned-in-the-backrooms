// Level 69 overlay: the wake-up (text on black, then the dash fades in), the car's gauges while you drive,
// and a whispered line when the Whispers find you. Pure render: reads player.state.l69 and the car you control.
export function l69Ui(ctx, player) {
  if (!String(player?.place ?? "").startsWith("level69")) return "";
  const s = player.state ?? {}, l = s.l69 ?? {}, now = ctx.now(), out = [];
  const t = l.introAt ? (now - l.introAt) / 1000 : 99;
  if (t < 13.2) { // the opening: black, then letterbox bars over the shots (scripts/lib/l69-cut.js), the bars draw back at the end
    const bars = t < 12.2 ? 1 : Math.max(0, 1 - (t - 12.2)), black = t < 1.4 ? 1 : t < 2.4 ? 1 - (t - 1.4) : 0;
    const line = (from, to, txt, css = "") => { const o = t < from ? 0 : t < from + 0.9 ? (t - from) / 0.9 : t < to - 0.9 ? 1 : Math.max(0, (to - t) / 0.9); return o > 0 ? `<div style="opacity:${o.toFixed(2)};${css}">${txt}</div>` : ""; };
    out.push(`<div style="position:fixed;inset:0;pointer-events:none;z-index:60">
      <div style="position:absolute;inset:0;background:#000;opacity:${black.toFixed(2)}"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:${(11 * bars).toFixed(1)}vh;background:#000"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:${(11 * bars).toFixed(1)}vh;background:#000"></div>
      <div style="position:absolute;left:0;right:0;top:40%;text-align:center;color:#e6dcc6;text-shadow:0 2px 12px #000">
        ${line(2.2, 5.6, "LEVEL 69", "font:600 13px Georgia,serif;letter-spacing:.6em;opacity:.85")}${line(2.7, 5.6, "The Road Trip of Affliction", "font:italic 30px Georgia,serif;letter-spacing:.06em;margin-top:8px")}</div>
      <div style="position:absolute;left:0;right:0;bottom:calc(11vh + 22px);text-align:center;font:16px Georgia,serif;letter-spacing:.06em;color:#d8d0bd;text-shadow:0 1px 6px #000">
        ${line(6.0, 9.3, "An engine, idling. Your hands are on a wheel.")}${line(9.6, 12.4, "You don't remember getting in.")}</div></div>`);
  }
  const car = player.controlling?.state;
  if (car && t > 12.4) {
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
  if (l.outAt && !player.controlling && t > 8) { const sec = (now - l.outAt) / 1000, o = Math.min(1, sec / 20), left = Math.max(0, Math.ceil(20 - sec));
    out.push(`<div style="position:fixed;inset:0;pointer-events:none;z-index:15;background:radial-gradient(ellipse at 50% 50%,transparent ${Math.round(70 - o * 25)}%,rgba(40,0,0,${(0.15 + o * 0.35).toFixed(2)}) 100%)"></div>`);
    out.push(`<div style="position:fixed;left:0;right:0;top:18%;text-align:center;pointer-events:none;z-index:26;font:600 15px Georgia,serif;color:#e8d9c0;letter-spacing:.14em;text-shadow:0 0 10px #000">${left > 0 ? `something above has noticed you · back in the car · ${left}` : `it's here. get in the car.`}</div>`); }
  return out.join("");
}
