// the tutorial card (scripts/lib/tutorial.js): an amber HALOGEN prompt, left of centre, in the HUD's own style
import { STEPS } from "./lib/tutorial.js"
export function tutUi(s, now) {
  const tut = s.tut, step = tut && STEPS[tut.n]; if (!step) return ""
  const k = step.key ? `<span style="display:inline-block;border:1px solid #ffb642;padding:1px 7px;margin-right:9px;color:#16140e;background:#ffb642;letter-spacing:.08em">${step.key}</span>` : ""
  return `<style>@keyframes tutIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}</style>
<div id="tut${tut.n}" style="position:fixed;left:24px;top:38%;max-width:340px;pointer-events:none;animation:tutIn .45s ease-out both;color:#ffb642;font-size:13px;line-height:1.5;text-shadow:1px 1px #000;background:linear-gradient(90deg,rgba(22,20,14,.72),rgba(22,20,14,0));padding:10px 16px 10px 12px;border-left:2px solid #ffb642">
<div style="font-size:10px;letter-spacing:.22em;opacity:.7;margin-bottom:5px">HALOGEN · ORIENTATION ${tut.n + 1}/${STEPS.length}</div>
<div>${k}${step.text}</div></div>`
}
