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
const ATK_SND = { vacuum: 'boost', minitons: 'small', words: 'heavy', heads: 'heavy', heart: 'crit', pipis: 'crit' }

function play(ctx, k, volume = 0.7) { ctx.emit('playSound', { clip: SND[k], volume }, { audience: { player: ctx.self.id } }) }
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
  const pool = b.step >= F.neoFromStep || b.rage >= 2 ? F.attacks.neo : F.attacks.base
  const atk = pool[b.turn % pool.length]
  b.turn += 1
  b.atk = atk
  b.seed = Math.floor(ctx.random() * 1e6)
  b.phase = 'attack'
  b.atkAt = ctx.now()
  play(ctx, ATK_SND[atk] ?? 'heavy', 0.6)
}

export function startSpamton(ctx) {
  const s = ctx.self.state
  if (s.spam?.on) return
  s.spam = { on: true, phase: 'intro', hp: F.soulHp, step: 0, rage: 0, turn: 0, line: F.intro, opts: null, atk: null, seed: 0, at: ctx.now() }
  s.invOpen = false; s.lootOpen = null
  pop(ctx, true)
  play(ctx, 'start', 0.8)
  ctx.after(F.introSeconds, 'spamIntroOver', {})
}
export function spamIntroOver(ctx) { const b = ctx.self.state.spam; if (b?.on && b.phase === 'intro') { b.phase = 'talk'; offer(ctx, b) } }

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
  s.spam = null
}

export function onInput(ctx, input) {
  const d = input.actionData?.spam
  if (!input.pressed?.spam || !d) return
  const s = ctx.self.state, b = s.spam
  if (!b?.on) return
  if (d.k === 'flee') { end(ctx, 'flee'); return }
  if (d.k === 'hit' && b.phase === 'attack') {
    const dmg = Math.min(F.maxHit, Math.max(1, Number(d.d) || F.hit))
    b.hp = Math.max(0, b.hp - dmg)
    play(ctx, 'hurt', 0.55)
    if (b.hp <= 0) { b.phase = 'lost'; b.line = F.loseLine; ctx.after(2.2, 'spamEnd', { how: 'lose' }) }
    return
  }
  if (d.k === 'done' && b.phase === 'attack' && ctx.now() - b.atkAt > (F.attackSeconds - 1) * 1000) { offer(ctx, b); return }
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
