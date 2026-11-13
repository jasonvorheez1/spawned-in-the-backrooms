// One place for what a Duller is: the spawner, the Enemy Bay and anything else lay it from here.
import D from "./data/dullers.yml";
export function dullerSpec(at, yaw = 0) {
  return { tags: ["duller", "foe", "l8-hostile"], feetPosition: at, rotation: yaw, physics: { body: "character" },
    model: { id: D.model }, layout: { box: { min: { x: -0.45, y: 0, z: -0.45 }, max: { x: 0.45, y: D.height, z: 0.45 } } },
    behavior: "scripts/duller.js", audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-faint-wet-rattling-breath-and-bone-creak-loop.mp3", loop: true, gain: 0.22, spatial: true, maxDistance: 9 }, state: { hp: D.hp, maxHp: D.hp, name: "Duller", stolen: "" } };
}
