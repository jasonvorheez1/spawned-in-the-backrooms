import { currentTip, GUIDE_CHAPTERS, GUIDE_LESSONS, orientation, tipsMuted } from "./lib/tutorial.js"
import { hasHalogen, screen } from "./lib/screen.js"

const CSS = `<style>
.orientation,.field-book{--guide-ink:#f6f3e7;--guide-muted:#b8c2b0;--guide-line:#536151;--guide-accent:#d5efa0;--guide-paper:#161e19;color:var(--guide-ink);font:400 14px/1.46 var(--ui-font,Geist,system-ui,sans-serif);color-scheme:dark}
.orientation{box-sizing:border-box;position:fixed;z-index:35;top:clamp(65px,11vh,118px);left:clamp(12px,2.4vw,34px);width:min(350px,calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 28px));padding:15px 16px 14px;background:linear-gradient(105deg,#17251e 0%,#131a16 65%);border:1px solid #647464;border-left:3px solid var(--guide-accent);box-shadow:0 10px 34px #0008;pointer-events:none;animation:guide-enter .36s cubic-bezier(.2,.75,.2,1) both}
.orientation[data-kind="opening"],.orientation[data-kind="now"]{--guide-accent:#edcd88;background:linear-gradient(105deg,#2a2418 0%,#1c1b15 65%)}
.orientation small,.field-book .guide-group{display:block;color:var(--guide-accent);font:600 11px/1.3 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.09em;text-transform:uppercase}
.orientation h2{font-size:clamp(17px,2vw,22px);line-height:1.13;margin:7px 0 5px;font-weight:650;letter-spacing:-.025em}
.orientation p{margin:0;color:var(--guide-muted)}
.guide-progress{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:0 0 10px}
.guide-progress i{height:2px;background:#716049;opacity:.7}.guide-progress .done{background:var(--guide-accent);opacity:.55}.guide-progress .active{background:var(--guide-accent);height:3px;opacity:1;transform-origin:left;animation:guide-fill .46s ease-out both}
.guide-keys{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.guide-keys kbd{border:1px solid var(--guide-line);background:#0d1411;color:var(--guide-ink);border-radius:2px;padding:2px 6px;font:500 11px/1.45 'IBM Plex Mono',ui-monospace,monospace}
.orientation[data-kind="tip"] .guide-keys{margin-top:10px}
.field-book{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:clamp(12px,4vh,48px) calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) clamp(12px,4vh,48px) 12px;background:#0a100cbf}
.field-book section{width:min(780px,100%);max-height:100%;min-height:0;display:flex;flex-direction:column;background:var(--guide-paper);border:1px solid var(--guide-line);border-top:3px solid var(--guide-accent);box-shadow:0 20px 70px #000a;animation:guide-enter .24s ease-out both}
.field-book header{padding:18px clamp(12px,3vw,28px) 14px;border-bottom:1px solid var(--guide-line);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.field-book h1{font-size:clamp(24px,3vw,36px);line-height:1.1;margin:0;letter-spacing:-.035em}.field-book nav{display:flex;flex-wrap:wrap;gap:6px}
.field-book button{font:inherit;font-weight:600;font-size:12px;color:var(--guide-ink);border:1px solid var(--guide-line);background:#263228;min-height:38px;padding:5px 10px;cursor:pointer}
.field-book button:hover,.field-book summary:hover{background:#334134}.field-book button:focus-visible,.field-book summary:focus-visible{outline:2px solid var(--guide-accent);outline-offset:2px}
.field-book .guide-index{overflow:auto;padding:4px clamp(12px,3vw,28px) 22px;overscroll-behavior:contain;scrollbar-color:#627060 transparent}
.field-book .guide-group{margin:18px 0 8px}
.field-book details{border-top:1px solid var(--guide-line);background:#1c251e}.field-book details:last-child{border-bottom:1px solid var(--guide-line)}
.field-book summary{cursor:pointer;padding:9px 10px;font-size:15px;font-weight:620;min-height:36px}.field-book details p{margin:0;color:var(--guide-muted)}
.field-book .guide-note{padding:1px 12px 13px 21px;max-width:60ch}.field-book [open] summary{color:var(--guide-accent)}
@keyframes guide-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes guide-fill{from{transform:scaleX(.12)}to{transform:none}}
@media(max-width:570px){.orientation{top:58px;font-size:12px;padding:10px 12px}.orientation h2{font-size:17px}.field-book button{min-height:44px}}
.orientation[data-motion="reduced"],.orientation[data-motion="reduced"] .guide-progress .active,.field-book[data-motion="reduced"] section{animation:none}
@media(prefers-reduced-motion:reduce){.orientation,.guide-progress .active,.field-book section{animation:none}}
</style>`
const bindings = (keys) => keys.length ? `<div class="guide-keys">${keys.map((key) => `<kbd>${key}</kbd>`).join("")}</div>` : ""

export function tutUi(s, now, player) {
  const place = player.place
  if (screen(s, place) !== "play" || s.dead || s.pick || s.os || s.building || s.l26cut) return ""
  const stage = orientation(s, place, player.feetPosition)
  const tip = stage ?? currentTip(s, place, now)
  if (!tip || (!stage && s.uiPrefs?.hudMinimal)) return ""
  const kind = stage ? "opening" : tip.now ? "now" : "tip"
  const progress = stage ? `<div class="guide-progress" aria-label="Part ${stage.chapter + 1} of ${GUIDE_CHAPTERS.length}">${GUIDE_CHAPTERS.map((_, i) => `<i class="${i === stage.chapter ? "active" : i < stage.chapter ? "done" : ""}"></i>`).join("")}</div>` : ""
  return CSS + `<aside id="guide-${tip.id}" class="orientation" data-kind="${kind}" aria-live="polite"${s.uiPrefs?.motion === "reduced" ? ' data-motion="reduced"' : ""}>
    ${progress}<small>${stage ? GUIDE_CHAPTERS[stage.chapter] : "Field Guide · " + tip.group}</small><h2>${tip.title}</h2><p>${tip.text}</p>${bindings(stage || tip.now ? tip.keys : [...tip.keys, "J · Open guide"])}
  </aside>`
}

export function fieldGuideUi(s, place) {
  if (s.jrnOpen !== "guide" || !hasHalogen(s, place)) return ""
  const groups = [...new Set(GUIDE_LESSONS.map((lesson) => lesson.group))]
  const archive = groups.map((group) => `<div class="guide-group">${group}</div>${GUIDE_LESSONS.filter((lesson) => lesson.group === group).map(({ title, text, keys }) =>
    `<details><summary>${title}</summary><div class="guide-note"><p>${text}</p>${bindings(keys)}</div></details>`).join("")}`).join("")
  return CSS + `<div class="field-book" data-modal tabindex="0" role="dialog" aria-modal="true" aria-labelledby="field-guide-title"${s.uiPrefs?.motion === "reduced" ? ' data-motion="reduced"' : ""} onkeydown="if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('journal')}">
    <section><header><h1 id="field-guide-title">Field Guide</h1><nav aria-label="Field Guide controls">
      <button aria-pressed="${!tipsMuted(s)}" onclick="sendAction('fieldGuide',{k:'mute'})">Automatic tips ${tipsMuted(s) ? "off" : "on"}</button>
      <button onclick="sendAction('fieldGuide',{k:'quests'})">Quests</button><button onclick="sendAction('journal')">Close <kbd>Esc</kbd></button>
    </nav></header><div class="guide-index">${archive}</div></section>
  </div>`
}
