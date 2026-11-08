// Spamton's dumpster battle (Level 11 alley). The player's own side: the deal, the hits, the win.
// scripts/spamton.js (the dumpster) opens it; scripts/spamton-ui.js draws the bullet box on the player's screen
// and sends: spam { k: 'hit', d } when the SOUL is struck, { k: 'done' } when an attack is survived,
// { k: 'pick', o } for a deal choice, { k: 'flee' } to back off. His sounds play here and nowhere else (Shelly's rule),
// except his laugh when the pocket perk fires (scripts/interact.js).
import F from './lib/data/spamton.yml'

const SND = {
  start: '/cdn/spamton-battle-start-glitch-303uhnhm.mp3',
  laugh: '/cdn/snd-spamton-laugh-glitch-sfx-7vvbohql.mp3',
  talkA: '/cdn/sfx-text-spam-digital-notifications-ww36wbyd.mp3',
  talkB: '/cdn/sfx-text-spam-digital-notifications-7z90nlb1.mp3',
  hurt: '/cdn/snd-hurt-character-damage-impact-2kswi6jp.mp3',
  chime: '/cdn/sfx-item-pickup-chime-reward-23p9yuvs.mp3',
  boost: '/cdn/sfx-boost-acceleration-mechanic-t08k7kvv.mp3',
  crit: '/cdn/sfx-critical-swing-heavy-strike-6ce7iylw.mp3',
  heavy: '/cdn/sfx-heavy-swing-weapon-whoosh-c829zq2g.mp3',
  small: '/cdn/sfx-small-swing-whoosh-fast-hkdsujvu.mp3',
}
const ATK_SND = { vacuum: 'boost', minitons: 'small', words: 'heavy', heads: 'heavy', heart: 'crit', pipis: 'crit', strings: 'small', rain: 'small' }
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)]

function play(ctx, k, volume = 0.7) { ctx.emit('playSound', { clip: SND[k], volume }, { audience: { player: ctx.self.id } }) }
// his two themes (Shelly's files, this fight only): the talk theme from the pop-up, the battle theme from his first attack.
// a local, page-wide loop on the fighter's own machine, so a friend in the room never hears it
const THEME = { talk: '/cdn/music-toby-fox-spamton-chiptune-boss-hkhzdgie.mp3', battle: '/cdn/music-nows-your-chance-to-be-a-3djhwuqa.mp3' }
function theme(ctx, which) {
  const ses = ctx.self.session
  if (ses.spamTheme === which) return
  if (ses.spamMusic) { try { ctx.destroy(ses.spamMusic) } catch {} ses.spamMusic = null }
  ses.spamTheme = which
  if (!which) return
  const p = ctx.self.feetPosition
  ses.spamMusic = ctx.spawn({ audience: 'local', scope: 'session', feetPosition: { x: p.x, y: p.y, z: p.z }, audio: { clip: THEME[which], gain: 0.4, loop: true, spatial: false, bus: 'music' } })
}
function dumpster(ctx) { return ctx.getObject('l11-spamton-dumpster') }
function pop(ctx, up) { const d = dumpster(ctx); if (d) d.state.up = up ? ctx.self.id : null }

// the deal: the right words in order, each beside a wrong one
function offer(ctx, b) {
  const st = F.deal[b.step]
  const opts = [st.yes, st.no]
  if (ctx.random() < 0.5) opts.reverse()
  b.opts = opts
  b.line = st.line
  b.phase = 'choose'
  play(ctx, ctx.random() < 0.5 ? 'talkA' : 'talkB', 0.55)
}
function attack(ctx, b) {
  const pool = b.step >= F.lateFromStep || b.rage >= 2 ? F.attacks.late : F.attacks.base
  const atk = pool[b.turn % pool.length]
  b.turn += 1
  b.atk = atk
  b.seed = Math.floor(ctx.random() * 1e6)
  b.phase = 'attack'
  b.atkAt = ctx.now()
  b.taunt = pick(ctx, F.taunts)
  play(ctx, ATK_SND[atk] ?? 'heavy', 0.6)
  theme(ctx, 'battle')
}

export function startSpamton(ctx) {
  const s = ctx.self.state
  if (s.spam?.on) return
  s.spam = { on: true, phase: 'intro', hp: F.soulHp, tp: 0, step: 0, rage: 0, turn: 0, line: F.intro, opts: null, atk: null, seed: 0, at: ctx.now() }
  s.invOpen = false; s.lootOpen = null
  pop(ctx, true)
  play(ctx, 'start', 0.8)
  theme(ctx, 'talk')
  ctx.after(F.introSeconds, 'spamIntroOver', {})
}
function chat(ctx, b) { // the talk before the fight: his line, two replies; the talk theme keeps playing
  const c = F.chat[b.chat]
  b.phase = 'chat'; b.line = c.line; b.opts = [...c.replies]
  play(ctx, ctx.random() < 0.5 ? 'talkA' : 'talkB', 0.55)
}
export function spamIntroOver(ctx) { const b = ctx.self.state.spam; if (b?.on && b.phase === 'intro') { b.chat = 0; chat(ctx, b) } }

function end(ctx, how) {
  const s = ctx.self.state, b = s.spam
  if (!b) return
  if (how === 'win') {
    s.keyItems = [...new Set([...(s.keyItems ?? []), 'spamton'])]
    play(ctx, 'chime', 0.8)
    s.notice = { text: 'KEY ITEM: [[SPAMTON G. SPAMTON]]. 0 kg. Loot pays more now.', at: ctx.now() }
    ctx.emit('milestone', { step: 1, name: 'Made a [[Deal]] with Spamton' }, { audience: { player: ctx.self.id } })
  } else if (how === 'lose') {
    play(ctx, 'laugh', 0.8)
    s.hp = Math.max(1, (s.hp ?? 100) - F.losePenaltyHp)
    s.notice = { text: 'Spamton laughs and slams the lid. Knock again when you are ready.', at: ctx.now() }
  } else {
    play(ctx, 'laugh', 0.5)
    s.notice = { text: 'You back away. The dumpster giggles.', at: ctx.now() }
  }
  pop(ctx, false)
  theme(ctx, null)
  s.spam = null
}

// the real-time fight (Shelly 11-08): the talk ends, the screen tears pink, and you land in his arena
function toArena(ctx) {
  const s = ctx.self.state
  play(ctx, 'start', 0.9); play(ctx, 'laugh', 0.6)
  ctx.emit('screenFlash', { color: '#ff2bd0', duration: 0.9, intensity: 1 }, { audience: { player: ctx.self.id } })
  ctx.emit('screenShake', { intensity: 0.5, duration: 0.4 }, { audience: { player: ctx.self.id } })
  pop(ctx, false); theme(ctx, null)
  s.spam = null
  s.clipKind = 'glitch'
  ctx.cross(ctx.self, 'spamton#spam-in')
}
// in the arena: SPARE, KEEP FIGHTING and LEAVE go to Spamton himself (his state.req)
function arenaAsk(ctx, k) {
  const boss = ctx.getObject('spam-boss')
  if (boss) boss.state.req = { k, by: ctx.self.id, at: ctx.now() }
  else if (k === 'leave') ctx.cross(ctx.self, 'level11#spam-return')
}

export function onInput(ctx, input) {
  const d = input.actionData?.spam
  if (!input.pressed?.spam || !d) return
  if (ctx.self.place === 'spamton' && ['spare', 'fight', 'leave'].includes(d.k)) { arenaAsk(ctx, d.k); return }
  const s = ctx.self.state, b = s.spam
  if (!b?.on) return
  if (d.k === 'flee') { end(ctx, 'flee'); return }
  if (d.k === 'hit' && b.phase === 'attack') {
    const dmg = Math.min(F.maxHit, Math.max(1, Number(d.d) || F.hit))
    b.hp = Math.max(0, b.hp - dmg)
    play(ctx, 'hurt', 0.55)
    if (ctx.random() < 0.55) b.taunt = pick(ctx, F.hitTaunts)
    if (b.hp <= 0) { b.phase = 'lost'; b.line = F.loseLine; ctx.after(2.2, 'spamEnd', { how: 'lose' }) }
    return
  }
  if (d.k === 'graze' && b.phase === 'attack') { // grazing fills the TP gauge (a few per second at most: the screen sends batches)
    const n = Math.max(0, Math.min(6, Math.round(Number(d.n) || 0))); if (ctx.now() - (b.grazeAt ?? 0) < 250 || !n) return
    b.grazeAt = ctx.now(); b.tp = Math.min(100, (b.tp ?? 0) + n * F.grazeTp); if (ctx.random() < 0.25) b.taunt = pick(ctx, F.grazeTaunts); return
  }
  if (d.k === 'heal' && b.phase === 'choose' && (b.tp ?? 0) >= F.healCost && b.hp < F.soulHp) { // cash the TP in for health at the deal
    b.tp -= F.healCost; b.hp = Math.min(F.soulHp, b.hp + F.healHp); play(ctx, 'chime', 0.6); b.line = "HEH!! A [[REFUND]]?? THAT'S NOT ON THE [[MENU]]!!"; return
  }
  if (d.k === 'done' && b.phase === 'attack' && ctx.now() - b.atkAt > (F.attackSeconds - 1) * 1000) { offer(ctx, b); return }
  if (d.o == null && Number.isInteger(d.i)) d.o = b.opts?.[d.i] // the screen sends the button's index
  if (d.k === 'pick' && b.phase === 'chat' && b.opts?.includes(d.o)) {
    b.chat = (b.chat ?? 0) + 1
    if (b.chat < F.chat.length) chat(ctx, b)
    else { b.opts = null; toArena(ctx) } // talk's over: he drags you into his showroom (places/spamton, scripts/spamton-boss.js)
    return
  }
  if (d.k === 'pick' && b.phase === 'choose' && b.opts?.includes(d.o)) {
    const st = F.deal[b.step]
    if (d.o === st.yes) {
      b.step += 1
      if (b.step >= F.deal.length) { b.phase = 'won'; b.line = F.winLine; play(ctx, 'laugh', 0.7); ctx.after(3, 'spamEnd', { how: 'win' }); return }
      b.line = st.ok
    } else {
      b.rage += 1
      b.hp = Math.min(F.soulHp, b.hp) // no heal on a mistake
      b.line = st.bad
      play(ctx, 'laugh', 0.7)
      if (st.repeat) { offer(ctx, b); b.line = st.bad; return } // NO DEAL: he just asks again
    }
    attack(ctx, b)
  }
}
export function spamEnd(ctx, { how }) { end(ctx, how) }
