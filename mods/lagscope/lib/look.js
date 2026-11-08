// LAGSCOPE look: the F3 inspector's paint (scripts/ui/perf.js), carried inside the mod so the mod's panel reads the same
// in any game. Colours, font, logo, the terminal helpers (CARD/ROW/SEC/TABLE/PILL/bar/line) and the panel's stylesheet.
export const C = { bg: "rgba(6,6,8,.58)", ink: "#ffffff", sub: "rgba(255,255,255,.62)", dim: "rgba(255,255,255,.34)", line: "rgba(255,255,255,.10)", acc: "#ffffff", ok: "#ffffff", warn: "#ffd166", bad: "#ff4d5e" };
export const COLS = { ok: C.ok, warn: C.warn, bad: C.bad };
export const LOGO = "/cdn/value.f9fdc92e0fdc3c80c36af52a5fd3dd0f2a8d68b16bbff49b7c426fefd474b412.png";
export const FONT = `@font-face{font-family:LSMono;src:url(/cdn/value.14425ba9c695763c1547f48a206b7aa60350a33ae23de09f0407877f3fcd89eb.woff2) format("woff2");font-weight:400}@font-face{font-family:LSMono;src:url(/cdn/value.d0d4e818808f2a0ba39b2b09d1989366f63494e295f003c7ef436697378507e8.woff2) format("woff2");font-weight:700}`;
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const DIM = (t) => `<span style="color:${C.dim}">${t}</span>`;
export const glow = (col) => `color:${col};text-shadow:0 0 14px ${col === C.ink ? "rgba(255,255,255,.35)" : col + "88"}`;
export const CARD = (lab, val, sub, tone) => `<div class="lsc"><span class="lsck">${String(lab).toLowerCase()}</span><span style="color:${tone ? COLS[tone] : C.ink}">${val}</span>${sub ? " " + DIM(sub) : ""}</div>`;
export const ROW = (inner) => `<div class="lsrw">${inner}</div>`;
export const bar = (frac, col) => { const n = Math.round(Math.min(1, Math.max(0, frac || 0)) * 12); return `<span style="color:${col === C.bad || col === C.warn ? col : C.ink}">${"█".repeat(n)}</span>${DIM("░".repeat(12 - n))}`; };
export const TH = (cols, cls = []) => `<tr>${cols.map((c, i) => `<td class="${cls[i] || ""}" style="text-align:${i ? "right" : "left"};color:${C.dim}">${String(c).toLowerCase()}</td>`).join("")}</tr>`;
export const TD = (cells, cls = []) => `<tr>${cells.map((c, i) => `<td class="${cls[i] || ""}" style="text-align:${i ? "right" : "left"}">${c}</td>`).join("")}</tr>`;
export const TABLE = (head, rows, cols, cls = []) => `<table class="lstb">${cols ? `<colgroup>${cols.map((w, i) => `<col class="${cls[i] || ""}" style="${w ? "width:" + w : ""}">`).join("")}</colgroup>` : ""}${TH(head, cls)}${rows}</table>`;
export const SEC = (t, note) => `<div class="lssec">${t}${note ? ` <span>· ${note}</span>` : ""}</div>`;
export const PILL = (txt, tone) => `<span style="color:${COLS[tone] || C.sub}">[${txt}]</span>`;
// a press: a mod action ({op}) or a panel-local ask ({ui}) through globalThis.lsPanel
export const BTN = (lab, a, on, solid) => `<button class="lsb${on ? " on" : ""}${solid ? " solid" : ""}" onclick='lsPanel(${JSON.stringify(a).replace(/'/g, "&#39;")})'>${String(lab).toLowerCase()}</button>`;
export function line(a, col, W = 120, H = 18) { // thin white polyline sparkline
  const v = (a || []).slice(-60); let lo = Infinity, hi = -Infinity; for (const x of v) if (Number.isFinite(x)) { if (x < lo) lo = x; if (x > hi) hi = x; }
  if (lo === Infinity || v.length < 2) return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;margin-top:2px"></svg>`;
  const sp = hi - lo || 1, pts = v.map((x, i) => Number.isFinite(x) ? `${(i / (v.length - 1) * W).toFixed(1)},${(H - 2 - (x - lo) / sp * (H - 4)).toFixed(1)}` : null).filter(Boolean).join(" ");
  return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;margin-top:2px"><polyline points="${pts}" fill="none" stroke="${col === C.ink ? "rgba(255,255,255,.7)" : col}" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
}
// the panel's sheet, scoped to .lsp; .lsp.nar = the 320 px rail column (and phones): the table drops its shadow and bar columns
export const STYLE = `${FONT}
.lsp{position:relative;box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;color:${C.ink};font:12px/1.5 LSMono,ui-monospace,'SF Mono',Menlo,Consolas,monospace;pointer-events:auto;background:${C.bg};backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12)}
.lsp *{box-sizing:border-box}.lsp::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);border-radius:16px}
.lshd{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;padding:10px 14px;border-bottom:1px solid ${C.line};cursor:grab;user-select:none;touch-action:none;min-width:0}
.lsbtns{display:flex;gap:4px;flex-wrap:wrap;flex-basis:100%;min-width:0}
.lsscroll{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}.lsscroll::-webkit-scrollbar{display:none}
.lstop{padding:10px 14px 6px}.lsbody{padding:0 14px 12px;border-top:1px solid ${C.line};min-width:0}
.lst{background:rgba(255,255,255,.04);border:1px solid ${C.line};border-radius:10px;padding:7px 10px;min-width:0;overflow:hidden}.lstk{color:${C.dim};font-size:9px;letter-spacing:.2em;white-space:nowrap}
.lstiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px}.lsp.nar .lstiles{grid-template-columns:1fr 1fr}
.lsh{color:${C.ink};font-size:10px;letter-spacing:.2em;font-weight:700;margin:8px 0 3px}
.lse{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.lstabs{margin-top:8px;display:flex;gap:2px;flex-wrap:wrap;align-items:center}.lstabs>.lstab{pointer-events:auto;background:none;border:0;cursor:pointer;font:inherit;color:${C.dim};padding:2px 7px;text-transform:uppercase;letter-spacing:.14em;font-size:10px;border-radius:6px}.lstabs>.lstab.on{color:${C.ink};background:rgba(255,255,255,.1)}
.lsrw{display:grid;grid-template-columns:repeat(auto-fit,minmax(196px,1fr));column-gap:2ch;margin-top:8px}.lsc{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.lsck{color:${C.dim};display:inline-block;width:15ch}.lsp.nar .lsck{width:15ch}
.lssec{margin:12px 0 4px;color:${C.ink};font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lssec span{color:${C.dim};font-weight:400;letter-spacing:.04em;text-transform:none}
.lstb{width:100%;border-collapse:collapse;font:inherit;table-layout:fixed}.lstb td{padding:0 .6ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lsp.nar .lstb .w{display:none}
.lsb{pointer-events:auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:3px 9px;cursor:pointer;font:inherit;font-size:11px;color:${C.sub};letter-spacing:.06em;white-space:nowrap}
.lsb:hover,.lsb.on{color:#fff;border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.1)}.lsb.solid{background:#fff;color:#000;border-color:#fff;font-weight:700}.lsb.solid:hover{background:rgba(255,255,255,.85)}
.lsp.nar .lsb{padding:3px 6px}
.lsin{pointer-events:auto;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.16);border-radius:8px;color:#fff;font:inherit;padding:6px 10px;outline:none;min-width:0}.lsin:focus{border-color:rgba(255,255,255,.5)}
.lscard{min-width:0;border:1px solid ${C.line};background:rgba(255,255,255,.03);border-radius:10px;padding:8px 10px;margin-top:6px}.lstag{font-size:9px;letter-spacing:.12em;color:${C.dim};border:1px solid ${C.line};border-radius:5px;padding:0 5px}.lstag.new{color:#000;background:#fff}
.lsrow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid ${C.line};min-width:0}.lsrow>span{min-width:0}
.lssw{pointer-events:auto;width:34px;height:18px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);position:relative;cursor:pointer;flex:none}.lssw i{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:6px;background:rgba(255,255,255,.5);transition:left .15s}.lssw.on{background:#fff}.lssw.on i{left:18px;background:#000}
.lsstep{display:inline-flex;align-items:stretch;border:1px solid rgba(255,255,255,.16);border-radius:8px;overflow:hidden;background:rgba(0,0,0,.45);flex:none}.lsstep b{min-width:40px;text-align:center;padding:3px 0}.lsstep button{pointer-events:auto;width:26px;border:0;background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);font:inherit;font-size:14px;cursor:pointer}.lsstep button:hover{background:rgba(255,255,255,.16);color:#fff}
.lsft{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;padding:7px 14px;border-top:1px solid ${C.line};color:${C.dim};font-size:10px;letter-spacing:.12em;text-transform:uppercase}
@media (max-width:500px){.lsp .lstb .w{display:none}.lsp{font-size:11px}.lsp .lsb{padding:3px 6px}}@keyframes lsblink{50%{opacity:.2}}`;
