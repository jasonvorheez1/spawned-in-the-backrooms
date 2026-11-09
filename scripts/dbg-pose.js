// debug room gallery: a mannequin loops the clip its row names, so every new clip can be judged on the real bodies
// each wears ONE outfit, as a player or NPC would (the bare glb shows every garment stacked at once: a ragged band at the waist)
import { humanBody, HUMAN } from './lib/critter-model.js'
const OUTFITS = [
  { topw: 'tee', botw: 'pants', shoes: 'sneakers', top: '#6d8fb3', bottom: '#3b4558', shoec: '#e8e4dc' },
  { topw: 'sweater', botw: 'pants', shoes: 'boots', top: '#b8a27a', bottom: '#4a5a52', shoec: '#3a2a22' },
  { topw: 'hoodie', botw: 'skirt', shoes: 'sneakers', top: '#8a5a7a', bottom: '#5c6e78', shoec: '#f0eee8' },
  { topw: 'longsleeve', botw: 'longskirt', shoes: 'boots', top: '#e8dfc8', bottom: '#6a7f86', shoec: '#3a2a22' },
  { topw: 'jacket', botw: 'pants', shoes: 'boots', top: '#5a4a3a', bottom: '#2f3440', shoec: '#2a2024' },
  { topw: 'tank', botw: 'shorts', shoes: 'sneakers', top: '#d9d6cc', bottom: '#4f6a8a', shoec: '#c84a3a' },
]
export function onSpawn(ctx) { dress(ctx); pose(ctx) }
export function update(ctx) { pose(ctx); ctx.sleep(5) }
function dress(ctx) {
  if (!HUMAN) return
  const id = String(ctx.self.model?.id ?? ctx.self.model ?? '')
  const sex = id === HUMAN.f ? 'f' : 'm'
  const n = parseInt(String(ctx.self.id).split('-').pop(), 10) || 0
  const look = { sex, species: 'human', ...OUTFITS[n % OUTFITS.length] }
  ctx.self.model = humanBody(look)
}
function pose(ctx) {
  const s = ctx.self.state; if (!s?.clip) return
  if (ctx.self.anim.idle?.clip !== s.clip) ctx.self.anim.idle = { clip: s.clip, loop: true, weight: 1 }
}
