// Shared by every level (fix once, apply everywhere): is this foe actually after someone right now?
// A foe standing at its post, roaming, frozen, fleeing or disguised is NOT combat (Shelly Nov 13: "it says im in combat but im not").
const CALM = new Set(["post", "roam", "return", "frozen", "flee", "idle", "sleep", "wander", "graze", "sit", "rest", "patrol", "dormant", "gone"]);
const HUNT = new Set(["creep", "swarm", "strike", "chase", "hunt", "attack", "pounce", "rage", "charge", "stalk", "bite", "fight"]);
export function hunting(f, pid, dist = 99) {
  const s = f?.state ?? {};
  if (s.dead || (s.hp ?? 1) <= 0 || s.disguised || s.corpseAt) return false;
  const t = s.target?.id ?? s.target ?? s.prey ?? s.chasing;
  if (t) return !pid || t === pid || typeof t !== "string";
  if (s.hunting || s.aggro || s.angry) return true;
  if (HUNT.has(s.mode)) return true;
  if (CALM.has(s.mode)) return false;
  return dist < 4; // a foe with no mode of its own: only close counts
}
