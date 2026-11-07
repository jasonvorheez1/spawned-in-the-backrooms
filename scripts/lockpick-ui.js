// the lock face while picking: the cylinder turns with W, the bobby pin sweeps with A/D, pins left below
export function pickUi(ctx, player) {
  const s = player.state, pk = s.pick
  if (!pk) return ''
  const p = s.pickP ?? 90, r = s.pickR ?? 0, snap = s.pickSnap && ctx.now() - s.pickSnap < 300
  return `<style>@keyframes lpShake{25%{translate:-4px 0}75%{translate:4px 0}}</style>
<div class="fixed inset-0 pointer-events-none flex items-center justify-center" data-modal style="background:radial-gradient(circle,rgba(10,8,4,.35),rgba(10,8,4,.85))">
 <div style="text-align:center;color:#f2c14e;font-family:inherit">
  <svg width="340" height="340" viewBox="-170 -170 340 340" style="${snap ? 'animation:lpShake .1s 3' : ''}">
   <circle r="150" fill="#2a2418" stroke="#6b5a36" stroke-width="10"/>
   <circle r="118" fill="#1a160e" stroke="#4a3e26" stroke-width="4"/>
   <g style="transform:rotate(${r}deg);transition:transform 70ms linear">
    <circle r="96" fill="#8f7a4a" stroke="#c9a85c" stroke-width="3"/>
    <rect x="-9" y="-46" width="18" height="40" rx="8" fill="#0d0b07"/><rect x="-5" y="-10" width="10" height="44" fill="#0d0b07"/>
    <line x1="0" y1="20" x2="0" y2="160" stroke="#9aa0a6" stroke-width="10" stroke-linecap="round"/>
   </g>
   <g style="transform:rotate(${p - 90}deg);transition:transform 70ms linear">
    <line x1="0" y1="-20" x2="0" y2="-168" stroke="#d6d2c4" stroke-width="5" stroke-linecap="round"/>
    <path d="M0 -168 q10 -2 6 8" fill="none" stroke="#d6d2c4" stroke-width="4"/>
   </g>
  </svg>
  <div style="margin-top:10px;font-size:20px;text-shadow:2px 2px #000">LOCKPICK ${pk.lv} · BOBBY PINS ${s.bobbypins ?? 0}</div>
  <div style="font-size:15px;opacity:.8;text-shadow:2px 2px #000">A / D move the pin · hold W to turn · S to stop</div>
 </div>
</div>`
}
