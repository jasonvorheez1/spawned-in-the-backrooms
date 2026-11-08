// the two kemono foundation bodies (art/kemono/build.py, m12/f12 exports) and one-outfit-at-a-time dressing.
// every garment lives in the glb as its own named node; an outfit shows one per slot and hides the rest.
export const KEMONO = {
  m: "/cdn/value.725460421766358df13cd46c91fd46cd3680d8701093c92937caa6a846e86045.glb",
  f: "/cdn/value.f0e7f630535a4a04d4d3a6157b3de68b36ac8a6239131148b1b5a5d245168963.glb",
};
export const SLOTS = {
  Hat: ["beanie", "bow", "cap", "crown", "flower", "headphones", "partyhat", "tophat"],
  Eyew: ["glasses", "shades"],
  Neck: ["bell", "bowtie", "cape", "scarf"],
  Top: ["apron", "dress", "hoodie", "jacket", "longsleeve", "pajamas", "sweater", "tank", "tee"],
  Bot: ["longskirt", "overalls", "pants", "pjpants", "shorts", "skirt"],
  Shoes: ["boots", "slippers", "sneakers"],
};
// outfit = { Top: "tee", Bot: "pants", Shoes: "sneakers" }: a slot left out wears nothing
export function outfitParts(outfit = {}) {
  const parts = {};
  for (const [slot, names] of Object.entries(SLOTS))
    for (const n of names) parts[`${slot}_${n}`] = { visible: outfit[slot] === n };
  return parts;
}
export function kemonoModel(sex, outfit) {
  return { id: KEMONO[sex], forward: "+z", parts: outfitParts(outfit) };
}
