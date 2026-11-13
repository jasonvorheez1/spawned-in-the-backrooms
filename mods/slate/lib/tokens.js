// TOKENS: the Slate OS design system (docs/DESIGN-SYSTEM.md v1.1) as one stylesheet every app draws from.
// Colours are written as Slate's lowercase house hexes, so themes.js's remap re-dresses every token with the theme.
// Apps use the CSS variables (--s, --h, --t, --r, --d, --e, --c) and the .ds-* controls; nothing here changes how an
// unmigrated screen looks until it opts in. Every number names its generator (Appendix B): Fibonacci, φ half-steps,
// powers of φ, Major Third.
const VARS = `#vwp-tablet,.ds-root{
 --s-0:1px;--s-1:2px;--s-2:3px;--s-3:5px;--s-4:8px;--s-5:13px;--s-6:21px;--s-7:34px;--s-8:55px;--s-9:89px;
 --h-1:17px;--h-2:21px;--h-3:27px;--h-4:34px;--h-5:44px;--h-6:55px;--h-7:70px;--h-8:89px;
 --w-menu:183px;--w-side:233px;--w-flyout:297px;--w-sheet:377px;
 --t-hero:55px;--t-display:34px;--t-head:21px;--t-title:16px;--t-prose:16px;--t-body:13px;--t-meta:10.5px;
 --lh-hero:68px;--lh-display:42px;--lh-head:29px;--lh-title:22px;--lh-prose:26px;--lh-body:18px;--lh-meta:13px;
 --tr-tight:-.021em;--tr-meta:.021em;--tr-caps:.146em;--tr-mark:.236em;
 --r-1:3px;--r-2:5px;--r-3:8px;--r-4:13px;--r-5:21px;--r-6:34px;--r-pill:999px;
 --d-1:89ms;--d-2:144ms;--d-3:233ms;--d-4:377ms;--d-5:610ms;--d-loop-1:1597ms;--d-loop-2:2584ms;
 --e-phi-out:cubic-bezier(.236,.618,.382,1);--e-phi-in:cubic-bezier(.618,0,.764,.382);--e-phi-io:cubic-bezier(.618,0,.382,1);--e-spring:cubic-bezier(.236,1.382,.382,1);
 --o-hover:rgba(255,255,255,.056);--o-active:rgba(255,255,255,.146);--o-disabled:.382;
 --edge-0:inset 0 0 0 .5px rgba(255,255,255,.09);--edge-1:inset 0 0 0 .5px rgba(255,255,255,.146);--edge-2:inset 0 0 0 .5px rgba(255,255,255,.236),inset 0 1px 0 rgba(255,255,255,.382);--edge-3:inset 0 0 0 .5px rgba(255,255,255,.382),inset 0 1px 0 rgba(255,255,255,.618);
 --sh-1:0 2px 8px rgba(0,0,0,.236);--sh-2:0 8px 21px rgba(0,0,0,.382);--sh-3:0 21px 55px rgba(0,0,0,.618);
 --c-bg:#0d1522;--c-well:#0a121e;--c-panel:#1a2b3d;--c-raise:#223246;--c-bezel:#22262b;--c-line:#2c3b4c;--c-ink:#d9e0d9;--c-dim:#8a9aa0;--c-accent:#a37d45;--c-soft:#ffd79a;--c-glow:#53d9e5;
 --c-danger:#ff453a;--c-warn:#ff9f0a;--c-caution:#ffd60a;--c-ok:#30d158;--c-info:#64d2ff;
 --zi-tablet:34;--zi-system:89;
 --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}`;
// light-polarity status set (§2.4.1): themed() adds .ds-light to the tablet when bg is lighter than ink
const LIGHT = `#vwp-tablet[data-polarity="light"],.ds-light{--c-danger:#d70015;--c-warn:#c93400;--c-caution:#a05a00;--c-ok:#248a3d;--c-info:#0071a4;--o-hover:rgba(0,0,0,.056);--o-active:rgba(0,0,0,.09)}`;
// type roles (§2.2)
const TYPE = `.ds-hero{font-size:var(--t-hero);line-height:var(--lh-hero);letter-spacing:var(--tr-tight);font-weight:200}
.ds-display{font-size:var(--t-display);line-height:var(--lh-display);letter-spacing:var(--tr-tight);font-weight:600}
.ds-head{font-size:var(--t-head);line-height:var(--lh-head);letter-spacing:var(--tr-tight);font-weight:600;margin:0}
.ds-title{font-size:var(--t-title);line-height:var(--lh-title);font-weight:600;margin:0}
.ds-prose{font-size:var(--t-prose);line-height:var(--lh-prose);max-width:76ch}
.ds-body{font-size:var(--t-body);line-height:var(--lh-body)}
.ds-meta{font-size:var(--t-meta);line-height:var(--lh-meta);letter-spacing:var(--tr-meta);color:var(--c-dim)}
.ds-mono{font-family:var(--font-mono);font-size:var(--t-meta);line-height:var(--lh-meta)}
.ds-caps{font-size:var(--t-meta);line-height:var(--lh-meta);letter-spacing:var(--tr-caps);text-transform:uppercase;font-weight:600;color:var(--c-dim)}
.ds-dim{color:var(--c-dim)}.ds-ink{color:var(--c-ink)}`;
// surfaces (§2.3): Z1 cards and fields, Z2 flyouts, Z3 focal
const SURF = `.ds-z1{background:var(--c-panel);box-shadow:var(--edge-1),var(--sh-1);border-radius:var(--r-3)}
.ds-z2{background:var(--c-raise);box-shadow:var(--edge-2),var(--sh-2);border-radius:var(--r-4);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px)}
.ds-z3{background:var(--c-raise);box-shadow:var(--edge-3),var(--sh-3);border-radius:var(--r-5);backdrop-filter:blur(21px);-webkit-backdrop-filter:blur(21px)}
.ds-well{background:var(--c-well);border-radius:var(--r-3);box-shadow:var(--edge-0)}
.ds-card{background:var(--c-panel);box-shadow:var(--edge-1),var(--sh-1);border-radius:var(--r-3);padding:var(--s-5);display:flex;flex-direction:column;gap:var(--s-4);min-width:0}
.ds-region{background:var(--c-panel);box-shadow:var(--edge-1);border-radius:var(--r-4);padding:var(--s-5);display:flex;flex-direction:column;gap:var(--s-4);min-width:0}
.ds-sep{height:var(--s-0);background:var(--c-line);border:0;margin:0}
.ds-stack{display:flex;flex-direction:column;gap:var(--s-4);min-width:0}.ds-row{display:flex;align-items:center;gap:var(--s-4);min-width:0}
.ds-grow{flex:1;min-width:0}.ds-pad{padding:var(--s-5)}.ds-gap-3{gap:var(--s-3)}.ds-gap-5{gap:var(--s-5)}.ds-gap-6{gap:var(--s-6)}`;
// controls (§3.2, §4.3): one shape per intent; pointer hit ≥ 27, touch hit ≥ 44
const CTRL = `.ds-btn,.ds-chip,.ds-seg>button,.ds-icon,.ds-field,.ds-tab{font:inherit;font-size:var(--t-body);color:var(--c-ink);box-sizing:border-box;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.ds-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:var(--s-3);height:var(--h-3);padding:0 var(--s-5);border-radius:var(--r-pill);border:0;background:var(--c-raise);box-shadow:var(--edge-1);cursor:pointer;white-space:nowrap;font-weight:500;transition:background var(--d-1) var(--e-phi-out),transform var(--d-2) var(--e-phi-out),color var(--d-1)}
.ds-btn.primary{background:var(--c-accent);color:var(--c-on-accent,var(--c-soft));box-shadow:none}
.ds-btn.quiet{background:transparent;box-shadow:none;color:var(--c-dim)}.ds-btn.quiet:hover{color:var(--c-ink)}
.ds-btn.lg{height:var(--h-5);padding:0 var(--s-6);font-size:var(--t-title)}
.ds-btn.danger-armed,.ds-btn[data-armed]{color:var(--c-danger)}
.ds-icon{display:inline-flex;align-items:center;justify-content:center;width:var(--h-3);height:var(--h-3);padding:0;border:0;border-radius:var(--r-pill);background:transparent;color:var(--c-dim);cursor:pointer;transition:background var(--d-1),color var(--d-1)}
.ds-icon:hover{color:var(--c-ink)}
.ds-chip{display:inline-flex;align-items:center;gap:var(--s-3);height:var(--h-3);padding:0 var(--s-5);border-radius:var(--r-pill);border:0;background:transparent;box-shadow:inset 0 0 0 1px var(--c-line);color:var(--c-dim);cursor:pointer;white-space:nowrap;flex:none;transition:background var(--d-2),color var(--d-2)}
.ds-chip[aria-pressed="true"],.ds-chip.on{background:var(--c-accent);color:var(--c-on-accent,var(--c-soft));box-shadow:none}
.ds-chip .n{font-size:var(--t-meta);opacity:.618}
.ds-chips{display:flex;gap:var(--s-3);overflow-x:auto;scrollbar-width:none;min-width:0;scroll-snap-type:x proximity}.ds-chips::-webkit-scrollbar{display:none}
.ds-seg{display:inline-flex;height:var(--h-3);padding:var(--s-1);gap:0;border-radius:var(--r-pill);background:var(--c-well);box-shadow:var(--edge-0);box-sizing:border-box;flex:none}
.ds-seg>button{flex:1;height:100%;padding:0 var(--s-5);border:0;border-radius:var(--r-pill);background:transparent;color:var(--c-dim);cursor:pointer;font-size:var(--t-meta);letter-spacing:var(--tr-meta);font-weight:500;white-space:nowrap;transition:background var(--d-2),color var(--d-2)}
.ds-seg>button[aria-pressed="true"],.ds-seg>button.on{background:var(--c-accent);color:var(--c-on-accent,var(--c-soft))}
.ds-field{height:var(--h-3);padding:0 var(--s-5);border-radius:var(--r-3);border:0;background:var(--c-well);box-shadow:inset 0 0 0 1px var(--c-line);outline:none;min-width:0;transition:box-shadow var(--d-1)}
textarea.ds-field{height:auto;padding:var(--s-4) var(--s-5);line-height:var(--lh-body);resize:vertical}
.ds-field::placeholder{color:var(--c-dim);opacity:.8}
.ds-field.create{box-shadow:inset 0 0 0 1px var(--c-accent)}
.ds-badge{display:inline-flex;align-items:center;height:var(--h-1);padding:0 var(--s-3);border-radius:var(--r-1);font-size:var(--t-meta);letter-spacing:var(--tr-meta);color:var(--c-dim);box-shadow:inset 0 0 0 1px var(--c-line);white-space:nowrap}
.ds-dot{display:inline-block;width:var(--s-4);height:var(--s-4);border-radius:50%;flex:none}
.ds-led{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--c-glow);box-shadow:0 0 var(--s-3) var(--c-glow)}
.ds-btn:hover,.ds-chip:hover,.ds-seg>button:hover,.ds-icon:hover,.ds-tab:hover{background-image:linear-gradient(var(--o-hover),var(--o-hover))}
.ds-btn:active,.ds-chip:active,.ds-seg>button:active,.ds-icon:active,.ds-tab:active{background-image:linear-gradient(var(--o-active),var(--o-active));transform:scale(.979)}
.ds-btn:focus-visible,.ds-chip:focus-visible,.ds-seg>button:focus-visible,.ds-icon:focus-visible,.ds-tab:focus-visible{outline:2px solid var(--c-accent);outline-offset:2px}
.ds-field:focus{box-shadow:inset 0 0 0 1px var(--c-accent)}
.ds-btn:disabled,.ds-chip:disabled,.ds-icon:disabled,.ds-field:disabled{opacity:var(--o-disabled);cursor:default}
.ds-list{display:flex;flex-direction:column;border-radius:var(--r-3);background:var(--c-panel);box-shadow:var(--edge-1);overflow:hidden}
.ds-list>.ds-li{display:flex;align-items:center;gap:var(--s-4);min-height:var(--h-4);padding:0 var(--s-5);border:0;background:transparent;color:var(--c-ink);font:inherit;font-size:var(--t-body);text-align:left;cursor:pointer;box-shadow:inset 0 -1px 0 var(--c-line)}
.ds-list>.ds-li:last-child{box-shadow:none}.ds-list>.ds-li:hover{background:var(--o-hover)}.ds-list>.ds-li[aria-current="true"]{background:var(--c-accent);color:var(--c-on-accent,var(--c-soft))}
@media (pointer:coarse){.ds-btn,.ds-chip,.ds-seg,.ds-field,.ds-list>.ds-li{min-height:var(--h-5)}.ds-icon{min-width:var(--h-5);min-height:var(--h-5)}}`;
// app frame (§3.1): app bar 34, content padding 13, dock 34
const FRAME = `.ds-appbar{display:flex;align-items:center;gap:var(--s-4);height:var(--h-4);padding:0 var(--s-5);flex:none;box-shadow:inset 0 -1px 0 var(--c-line)}
.ds-appbar .ds-apptitle{font-size:var(--t-title);font-weight:600;line-height:var(--lh-title);white-space:nowrap}
.ds-appbar .ds-appsub{font-size:var(--t-meta);color:var(--c-dim);letter-spacing:var(--tr-meta);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ds-content{padding:var(--s-5);display:flex;flex-direction:column;gap:var(--s-6);min-width:0}
.ds-dock{display:flex;height:var(--h-4);flex:none;box-shadow:inset 0 1px 0 var(--c-line)}
.ds-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:var(--s-3);border:0;background:transparent;color:var(--c-dim);cursor:pointer;font-size:var(--t-meta);letter-spacing:var(--tr-caps);text-transform:uppercase;font-weight:600}
.ds-tab[aria-current="true"]{color:var(--c-soft);box-shadow:inset 0 2px 0 var(--c-accent)}
.ds-split{display:grid;grid-template-columns:minmax(0,1.618fr) minmax(0,1fr);gap:var(--s-6);min-width:0}
@container slate (max-width:610px){.ds-split{grid-template-columns:minmax(0,1fr)}}
.ds-empty{padding:var(--s-9) var(--s-6);text-align:center;color:var(--c-dim);display:flex;flex-direction:column;align-items:center;gap:var(--s-4)}
#vwp-tablet *{scrollbar-width:thin;scrollbar-color:var(--c-line) transparent}
#vwp-tablet ::-webkit-scrollbar{width:5px;height:5px}#vwp-tablet ::-webkit-scrollbar:hover{width:8px;height:8px}
#vwp-tablet ::-webkit-scrollbar-thumb{background:var(--c-line);border-radius:var(--r-pill)}#vwp-tablet ::-webkit-scrollbar-track{background:transparent}
@media (prefers-reduced-motion:reduce){#vwp-tablet *{animation-duration:.01ms!important;transition-duration:var(--d-2)!important;transition-property:opacity,background-color,color!important}}`;
export const TOKENS_CSS = `<style id="ds-tokens">${VARS}${LIGHT}${TYPE}${SURF}${CTRL}${FRAME}</style>`;
// is a theme light polarity? bg lighter than ink (§2.4.1)
export function isLight(c) { const L = (h) => { const n = parseInt(String(h || '#000000').slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); }; return L(c?.bg) > L(c?.ink); }
// small helpers apps share so markup stays one shape everywhere
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function appBar(title, sub = '', actions = '', back = '') { return `<div class="ds-appbar">${back}<span class="ds-apptitle">${title}</span>${sub ? `<span class="ds-appsub">${sub}</span>` : ''}<span class="ds-grow"></span>${actions}</div>`; }
export function seg(items, cur, act) { return `<div class="ds-seg" role="group">${items.map(([id, label]) => `<button aria-pressed="${id === cur}" onclick="${act(id)}">${label}</button>`).join('')}</div>`; }
export function chip(label, on, onclick, n) { return `<button class="ds-chip" aria-pressed="${!!on}" onclick="${onclick}">${label}${n != null ? `<span class="n">${n}</span>` : ''}</button>`; }
