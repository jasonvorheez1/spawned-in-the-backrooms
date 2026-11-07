---
name: UI Builder Workflow
description: Complete guide to building gorgeous, reactive game UI in Spawn — covers layout rules, component architecture, theme recipes, animation patterns, 12+ ready-to-use component examples, multi-screen patterns, and best practices.
---

# UI Builder — Complete Guide to Game UI in Spawn

## When to Use

Load this skill when you need to build any game UI: HUDs, menus, dialogs, inventories, scoreboards, ability bars, or full screen-based interfaces. This covers everything from a simple health bar to a complex multi-screen lobby system.

---

## Core Concepts

### The Render Function

UI is a single script that exports a default function returning an HTML string:

```js
// scripts/ui.js
export default function(localPlayer, world) {
  return `<div class="fixed top-20 left-4 text-white">Hello</div>`;
}
```

- **localPlayer.state** — the current player's state object (health, coins, screen, etc.)
- **localPlayer.id** — the player's entity ID
- **localPlayer.feetPosition** — player's world position `{ x, y, z }`
- **world.query({ tags, radius, anyTags, excludeSelf })** — find other objects
- **world.getObject(id)** — get a specific object's data

This function runs every frame. Return empty string `''` to hide UI.

### Interactions: sendAction & sendAxis

Buttons trigger server-side logic via `sendAction()`. Sliders/drag use `sendAxis()`.

```html
<button onclick="sendAction('jump')">Jump</button>
<button onclick="sendAction('buyItem', { itemId: 'sword', cost: 50 })">Buy Sword</button>
<input type="range" min="-1" max="1" step="0.1" 
       oninput="sendAxis('steer', parseFloat(this.value))" />
```

**CRITICAL**: Every action name used in `sendAction()` MUST be registered in spec inputs, even with empty bindings:

```js
// In your input config
actions: {
  buyItem: {},       // empty binding — UI-only action
  jump: { keys: ["space"] },  // keyboard + UI
}
```

In the behavior's `onInput`, receive them:

```js
export function onInput(input, objectApi) {
  if (input.actions.buyItem && input.actionData?.buyItem) {
    const { itemId, cost } = input.actionData.buyItem;
    // handle purchase
  }
}
```

### Tailwind CSS

All Tailwind utility classes are available. No custom CSS files needed — use inline `<style>` tags for animations.

**NO `<script>` TAGS** — the engine uses innerHTML, so script tags are silently ignored. Use inline handlers only.

---

## Layout Rules

### Clearance

The Spawn overlay sits at the top of the screen. Always use `top-20` (not `top-4`) for top-positioned elements:

```html
<!-- WRONG: hidden behind Spawn overlay -->
<div class="fixed top-4 left-4">...</div>

<!-- RIGHT: clears the overlay -->
<div class="fixed top-20 left-4">...</div>
```

### Centering

Never use `left-1/2 -translate-x-1/2`. Use this pattern:

```html
<div class="fixed bottom-4 inset-x-0 flex justify-center">
  <div>Centered content</div>
</div>
```

### Pointer Events

Overlay containers should be `pointer-events-none`, with interactive children as `pointer-events-auto`:

```html
<div class="fixed inset-0 pointer-events-none">
  <!-- Non-interactive overlay -->
  <div class="absolute top-20 left-4">Score: 100</div>
  
  <!-- Interactive button -->
  <button class="absolute bottom-4 right-4 pointer-events-auto" 
          onclick="sendAction('dash')">Dash</button>
</div>
```

### Icons

Always use CDN images, never emojis:

```html
<img src="/cdn/icon-heart-transparent.png" class="w-5 h-5" />
<img src="/cdn/icon-coin-transparent.png" class="w-6 h-6" />
<img src="/cdn/icon-lightning-transparent.png" class="w-4 h-4" />
```

### Text Readability

Always use text-shadow over 3D game backgrounds:

```html
<span style="text-shadow: 0 1px 3px rgba(0,0,0,0.9);">Score: 100</span>
```

---

## Component Architecture

### When to Split

Split UI into components when:
- Main UI file exceeds ~150 lines
- A block is repeated (health bars for player + boss)
- A screen is complex enough to be its own file

### Component Pattern

Components live in `scripts/lib/` and use `module.exports`:

```js
// scripts/lib/ui-healthbar.js
const { clamp } = require('builtin/math');

function renderHealthbar(current, max, label) {
  const pct = clamp((current / max) * 100, 0, 100);
  const color = pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#ef4444';
  return `
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-400 w-8">${label}</span>
      <div class="relative w-36 h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
        <div class="h-full rounded-full transition-all duration-300" 
             style="width: ${pct}%; background: ${color};"></div>
        <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
             style="text-shadow: 0 1px 2px black;">
          ${Math.ceil(current)}/${max}
        </div>
      </div>
    </div>
  `;
}

module.exports = { renderHealthbar };
```

```js
// scripts/ui.js
const { renderHealthbar } = require('lib/ui-healthbar.js');

export default function(localPlayer, world) {
  const hp = localPlayer.state.health ?? 100;
  const mp = localPlayer.state.mana ?? 50;
  
  return `
    <div class="fixed top-20 left-4 space-y-1">
      ${renderHealthbar(hp, 100, 'HP')}
      ${renderHealthbar(mp, 50, 'MP')}
    </div>
  `;
}
```

**CRITICAL**: Component files use `module.exports`. The main UI file uses `export default function`. Never mix `module.exports` with `export function` in behavior scripts — but UI components in lib/ are NOT behaviors, so `module.exports` is correct there.

---

## Theme Recipes

### Fantasy RPG
```
Frame:    bg-amber-900/70 border-2 border-amber-600/50 rounded-lg
Text:     font-serif text-amber-100
Accent:   text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]
Bg glow:  box-shadow: inset 0 0 20px rgba(120, 80, 20, 0.3)
```

### Sci-Fi / Cyberpunk
```
Frame:    bg-slate-900/80 border border-cyan-500/30 backdrop-blur-sm
Text:     font-mono text-cyan-100 uppercase tracking-wider
Accent:   text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]
Bg glow:  box-shadow: 0 0 20px rgba(6,182,212,0.1)
```

### Neon / Arcade
```
Frame:    bg-black/80 border border-purple-500/40
Text:     font-mono text-white
Accent:   text-fuchsia-400 or text-cyan-400 with emissive glow
Bg glow:  box-shadow: 0 0 30px rgba(168,85,247,0.2)
```

### Cozy / Casual
```
Frame:    bg-white/80 border-2 border-pink-200 rounded-2xl shadow-lg
Text:     text-gray-700 font-medium
Accent:   text-pink-500 or text-emerald-500
Bg glow:  box-shadow: 0 4px 12px rgba(0,0,0,0.1)
```

### Horror
```
Frame:    bg-black/90 border border-red-900/30
Text:     font-mono text-red-200/70 text-sm
Accent:   text-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]
Bg glow:  none — darkness is the aesthetic
```

### Medieval
```
Frame:    bg-stone-800/80 border-2 border-stone-500/50 rounded
Text:     font-serif text-stone-200
Accent:   text-yellow-600
Bg glow:  box-shadow: inset 0 2px 8px rgba(0,0,0,0.5)
```

---

## Animation Patterns

Define animations in `<style>` tags (these work, unlike `<script>` tags):

```html
<style>
  @keyframes ui-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
  @keyframes ui-pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
  @keyframes ui-pop { 0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes ui-float-up { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-40px);opacity:0} }
  @keyframes ui-slide-in { 0%{transform:translateX(-20px);opacity:0} 100%{transform:translateX(0);opacity:1} }
  @keyframes ui-glow { 0%,100%{box-shadow:0 0 5px rgba(255,255,255,0.3)} 50%{box-shadow:0 0 20px rgba(255,255,255,0.6)} }
  @keyframes ui-flicker { 0%,100%{opacity:1} 50%{opacity:0.7} 52%{opacity:1} 54%{opacity:0.8} }
  
  .shake { animation: ui-shake 0.15s ease-in-out 2; }
  .pulse { animation: ui-pulse 0.8s ease-in-out infinite; }
  .pop { animation: ui-pop 0.3s ease-out; }
  .float-up { animation: ui-float-up 1.5s ease-out forwards; }
  .slide-in { animation: ui-slide-in 0.3s ease-out; }
  .glow { animation: ui-glow 2s ease-in-out infinite; }
  .flicker { animation: ui-flicker 3s linear infinite; }
</style>
```

### Triggering from State

```js
const recentlyHit = (localPlayer.state.gameTime ?? 0) - (localPlayer.state.lastHitTime ?? 0) < 0.3;
const lowHealth = (localPlayer.state.health ?? 100) < 25;

// Apply classes conditionally
const barClass = recentlyHit ? 'shake' : lowHealth ? 'pulse' : '';
```

---

## Common UI Components

### Health Bar (Animated, Color-Shifting)

```js
function renderHealthBar(health, maxHealth) {
  const pct = Math.round((health / maxHealth) * 100);
  const gradient = pct > 60 
    ? 'linear-gradient(to right, #4ade80, #10b981)' 
    : pct > 30 
    ? 'linear-gradient(to right, #facc15, #f97316)' 
    : 'linear-gradient(to right, #ef4444, #e11d48)';

  return `
    <div class="flex items-center gap-2">
      <img src="/cdn/icon-heart-transparent.png" class="w-6 h-6" 
           style="filter: drop-shadow(0 0 4px rgba(239,68,68,0.5));" />
      <div class="relative w-44 h-5 bg-gray-900/80 rounded-full border border-gray-600 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-300" 
             style="width: ${pct}%; background: ${gradient};"></div>
        <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
             style="text-shadow: 0 1px 2px black;">
          ${health}/${maxHealth}
        </div>
      </div>
    </div>
  `;
}
```

### Coin Counter

```js
function renderCoins(coins) {
  return `
    <div class="flex items-center gap-2 px-4 py-2 rounded-full
                bg-gradient-to-b from-yellow-400 to-amber-500
                border-2 border-yellow-300 shadow-lg"
         style="box-shadow: 0 4px 12px rgba(251,191,36,0.4);">
      <img src="/cdn/icon-coin-transparent.png" class="w-6 h-6" />
      <span class="text-xl font-black text-amber-900">${coins.toLocaleString()}</span>
    </div>
  `;
}
```

### Crosshair (Dot + Lines)

```js
function renderCrosshair(recentHit) {
  const color = recentHit ? 'bg-red-500' : 'bg-white/70';
  return `
    <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div class="relative w-6 h-6">
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 ${color} rounded-full"
             style="box-shadow: 0 0 4px rgba(255,255,255,0.5);"></div>
        <div class="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-2 ${color}"></div>
        <div class="absolute left-1/2 bottom-0 -translate-x-1/2 w-0.5 h-2 ${color}"></div>
        <div class="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 w-2 ${color}"></div>
        <div class="absolute top-1/2 right-0 -translate-y-1/2 h-0.5 w-2 ${color}"></div>
      </div>
    </div>
  `;
}
```

### Inventory Hotbar

```js
function renderHotbar(inventory, selectedSlot) {
  const slots = Array.from({ length: 8 }, (_, i) => {
    const item = inventory[i];
    const sel = i === selectedSlot;
    const border = sel ? 'border-yellow-400 border-2 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'border-gray-500 border';
    const bg = sel ? 'bg-yellow-900/30' : 'bg-gray-800';
    
    return `
      <button class="relative w-14 h-14 ${bg} ${border} rounded-lg flex items-center justify-center
                     hover:brightness-110 transition-all"
              onclick="sendAction('useItem', { slot: ${i} })">
        ${item?.icon ? `<img src="${item.icon}" class="w-8 h-8" />` : ''}
        ${item?.count > 1 ? `<span class="absolute bottom-0.5 right-1 text-xs font-bold text-white" style="text-shadow:0 1px 2px black;">${item.count}</span>` : ''}
        <span class="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-mono">${i + 1}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="fixed bottom-4 inset-x-0 flex justify-center">
      <div class="flex gap-1 p-2 rounded-xl bg-gray-900/90 border border-gray-600 shadow-2xl backdrop-blur-sm">
        ${slots}
      </div>
    </div>
  `;
}
```

### Leaderboard

```js
function renderLeaderboard(world, myId) {
  const players = world.query({ tags: ['player'] })
    .map(p => ({ id: p.id, name: p.state.name ?? 'Player', score: p.state.score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const medals = ['from-yellow-400 to-amber-500 text-amber-900', 'from-gray-300 to-slate-400 text-slate-700', 'from-orange-400 to-amber-600 text-amber-900'];

  const rows = players.map((p, i) => {
    const isMe = p.id === myId;
    return `
      <div class="flex items-center gap-2 p-1.5 rounded-lg ${isMe ? 'ring-2 ring-cyan-400 bg-cyan-900/30' : ''}">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
                    bg-gradient-to-r ${medals[i] ?? 'bg-gray-600 text-gray-300'} shadow-md">${i + 1}</div>
        <span class="flex-1 font-medium ${isMe ? 'text-cyan-300' : 'text-white'} truncate">${p.name}</span>
        <span class="font-bold text-amber-400">${p.score.toLocaleString()}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="fixed top-20 right-4">
      <div class="min-w-[180px] rounded-xl overflow-hidden bg-gray-900/90 border border-gray-600/50 shadow-2xl backdrop-blur-sm">
        <div class="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-indigo-500/50">
          <div class="text-center font-bold text-white flex items-center justify-center gap-2">
            <img src="/cdn/icon-trophy-transparent.png" class="w-5 h-5" />
            <span>Leaderboard</span>
          </div>
        </div>
        <div class="p-2 space-y-1 text-sm">${rows}</div>
      </div>
    </div>
  `;
}
```

### Dialog Box (NPC Conversation)

```js
function renderDialog(dialog) {
  if (!dialog) return '';
  
  const options = (dialog.options ?? []).map((opt, i) => `
    <button class="w-full text-left px-4 py-2.5 rounded-lg font-medium
                   bg-gradient-to-r from-indigo-600/80 to-purple-600/80
                   hover:from-indigo-500 hover:to-purple-500
                   border border-indigo-400/30 text-white shadow-lg
                   transition-all duration-150 hover:translate-x-1"
            onclick="sendAction('dialogChoice', { choice: ${i} })">
      <span class="text-indigo-300 mr-2">▸</span>${opt.text}
    </button>
  `).join('');

  return `
    <div class="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
      <div class="max-w-3xl mx-auto pointer-events-auto">
        <div class="relative rounded-2xl overflow-hidden bg-gray-900/95 border-2 border-indigo-500/30 shadow-2xl backdrop-blur-md">
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          <div class="p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-2 h-2 bg-indigo-400 rounded-full pulse"></div>
              <span class="text-lg font-bold bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">${dialog.speaker}</span>
              <div class="flex-1 h-px bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
            </div>
            <div class="text-gray-100 text-base leading-relaxed mb-4 pl-4 border-l-2 border-indigo-500/30">${dialog.text}</div>
            <div class="space-y-2">${options}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

### Ability Button with Cooldown

```js
function renderAbility(name, icon, cost, cooldown, canUse, actionName) {
  const onCd = cooldown > 0;
  const style = onCd || !canUse 
    ? 'from-gray-600 to-gray-700 border-gray-500 opacity-70 cursor-not-allowed' 
    : 'from-blue-500 to-indigo-600 border-blue-400 hover:from-blue-400 cursor-pointer active:scale-95';

  return `
    <button class="relative px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-b ${style} border-2 shadow-lg transition-all duration-150"
            onclick="sendAction('${actionName}')" ${onCd || !canUse ? 'disabled' : ''}>
      ${onCd ? `<div class="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"><span class="text-2xl font-bold">${Math.ceil(cooldown)}</span></div>` : ''}
      <div class="flex items-center gap-2">
        <img src="${icon}" class="w-5 h-5" />
        <span>${name}</span>
      </div>
      ${cost ? `<div class="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-b from-yellow-400 to-amber-500 text-amber-900 border border-yellow-300">${cost}</div>` : ''}
    </button>
  `;
}
```

### Announcement Text

```js
function renderAnnouncement(text, subtitle) {
  if (!text) return '';
  return `
    <style>
      @keyframes announce-in { 0%{transform:scale(2) translateY(-20px);opacity:0} 30%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
      .announce { animation: announce-in 0.4s ease-out forwards; }
    </style>
    <div class="fixed inset-x-0 top-1/3 flex flex-col items-center pointer-events-none announce">
      <div class="text-5xl font-black uppercase tracking-wider text-white"
           style="text-shadow: 0 0 20px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.8);">${text}</div>
      ${subtitle ? `<div class="text-lg text-gray-300 mt-2" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${subtitle}</div>` : ''}
    </div>
  `;
}
```

### Progress Bar (XP, Quest, Loading)

```js
function renderProgress(label, current, max, color) {
  const pct = Math.round((current / max) * 100);
  return `
    <div class="space-y-1">
      <div class="flex justify-between text-xs text-gray-400">
        <span>${label}</span>
        <span>${current}/${max}</span>
      </div>
      <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500" 
             style="width: ${pct}%; background: ${color};"></div>
      </div>
    </div>
  `;
}
```

### Danger / Environment Overlays

```js
// Low health danger vignette
function renderDangerOverlay(healthPct) {
  if (healthPct >= 25) return '';
  return `
    <div class="fixed inset-0 pointer-events-none pulse"
         style="box-shadow: inset 0 0 80px rgba(239,68,68,0.4);"></div>
  `;
}

// Underwater tint
function renderUnderwaterOverlay() {
  return `<div class="fixed inset-0 pointer-events-none" style="background: rgba(0,100,180,0.12);"></div>`;
}

// Boss health bar
function renderBossBar(name, healthPct) {
  return `
    <div class="fixed top-20 inset-x-0 flex justify-center pointer-events-none">
      <div class="w-96 space-y-1">
        <div class="text-center text-sm font-bold text-red-400 uppercase tracking-widest"
             style="text-shadow: 0 0 10px rgba(239,68,68,0.5);">${name}</div>
        <div class="h-3 bg-gray-900/80 rounded-full border border-red-900/50 overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
               style="width: ${healthPct}%;"></div>
        </div>
      </div>
    </div>
  `;
}
```

---

## Multi-Screen UI Pattern

For games with menus, lobbies, and gameplay screens, use a `screen` state field:

```js
export default function(localPlayer, world) {
  const screen = localPlayer.state.screen ?? 'menu';
  
  switch (screen) {
    case 'menu': return renderMenu();
    case 'playing': return renderHUD(localPlayer, world);
    case 'gameover': return renderGameOver(localPlayer);
    default: return '';
  }
}

function renderMenu() {
  return `
    <div class="fixed inset-0 flex items-center justify-center bg-black/80">
      <div class="text-center space-y-6">
        <h1 class="text-5xl font-black text-white">MY GAME</h1>
        <button class="px-8 py-4 rounded-xl text-xl font-bold text-white
                       bg-gradient-to-r from-green-500 to-emerald-600
                       hover:from-green-400 hover:to-emerald-500
                       shadow-xl transition-all active:scale-95"
                onclick="sendAction('startGame')">PLAY</button>
      </div>
    </div>
  `;
}
```

---

## Interactive Elements

### Drag and Drop

```html
<div draggable="true" ondragstart="event.dataTransfer.setData('text', 'item-1')">
  Drag me
</div>
<div ondragover="event.preventDefault()" 
     ondrop="sendAction('dropItem', { item: event.dataTransfer.getData('text'), slot: 2 })">
  Drop here
</div>
```

### Text Input

Use `data-interactive` attribute on inputs so they capture keyboard focus:

```html
<input type="text" data-interactive maxlength="4" placeholder="Enter code"
       class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 text-center text-2xl tracking-widest" />
```

Read input value in onclick handlers:

```html
<button onclick="sendAction('joinRoom', { code: document.querySelector('input').value })">Join</button>
```

---

## Do's and Don'ts

### DO
- Use `transition-all duration-300` on bars and progress fills
- Use `text-shadow` on ALL text over 3D backgrounds
- Use `/cdn/icon-*-transparent.png` for icons
- Use `pointer-events-none` on overlay containers
- Use `backdrop-blur-sm` for glass effect panels
- Use `overflow-hidden` on bar containers
- Match your UI palette to the game's atmosphere
- Keep total HTML output reasonable — thousands of elements will lag

### DON'T
- Never use `<script>` tags — they are silently ignored
- Never use emojis as icons — they render differently per platform
- Never use `left-1/2 -translate-x-1/2` for centering — use `inset-x-0 flex justify-center`
- Never use `top-4` for top elements — use `top-20` to clear Spawn overlay
- Never bind left mouse click to game actions in UI-heavy games — it conflicts with button clicks
- Never forget to register sendAction names in inputs (even with empty bindings `{}`)
- Never put `module.exports` in the main UI file (it uses `export default function`)

---

## Performance Tips

- Avoid calling `world.query()` with large radius every frame for data that rarely changes
- Keep DOM element count low — 100-200 elements is fine, 1000+ will lag
- Use `display:none` or return `''` for hidden screens instead of rendering invisible elements
- Inline styles are fine for dynamic values (width percentages, colors from state)
- CSS animations are GPU-accelerated and free — use them liberally for polish
