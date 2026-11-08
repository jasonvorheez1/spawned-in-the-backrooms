// Level 6.1 "The Snackrooms": what you press. Vending machines and counters hand out free 2000s food (scripts/lib/data/snacks.yml); nothing costs a thing here.
import { heard } from "./lib/hear.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const POOL = { snack: ["doritos", "doritos", "coolranch"], soda: ["coke", "coke", "pepsi", "dew", "dew"] };
const LINE = { coke: "A glass Coca-Cola clunks down, sweating cold.", pepsi: "A Pepsi rolls into the tray. Blue globe can.", dew: "Mountain Dew. Neon green. You can feel your heart already.", doritos: "Doritos Nacho Cheese drop off the coil.", coolranch: "Cool Ranch. The blue bag.", pizza: "A faceling slides you a hot slice on a paper plate.", burger: "A faceling wraps a cheeseburger and pushes it across. It waves.", almond: "Almond water, poured over ice. On the house." };
const COOL = 20000;
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const tell = (text, color = "#ffe9a8") => ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, text, color, size: 0.9 }, { audience: { player: who.id } });
    if (now - (cool[uid] ?? -1e9) < (s.cooldown ?? COOL)) { tell(s.kind === "vend" ? "THE COIL IS RESTOCKING" : "COME BACK IN A BIT"); return; }
    cool[uid] = now;
    const list = s.gives ? s.gives.split(",") : POOL[s.sells ?? "snack"], tok = list[Math.floor(ctx.random() * list.length)];
    heard(ctx, { clip: G(s.kind === "vend" ? "vending-machine-clunk-item-drop" : "paper-plate-slid-across-counter"), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: 0.75, maxDistance: 14 });
    who.state.payout = { xp: 1, items: [tok], text: LINE[tok] ?? "Free, like everything here." };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};
