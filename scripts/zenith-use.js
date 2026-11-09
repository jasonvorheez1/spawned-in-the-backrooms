// Zenith Station's flight-recorder drive bay: press → the smoked cover flips up, the cartridge slides out on its rail, then flies to your hand.
import { setZen } from "./lib/zenith-quest.js";
import { animate } from "builtin/tween";
const part = (ctx, n) => ctx.getObject(`${ctx.self.id}/${n}`) ?? ctx.getObject(n);
const LED = (on, c) => ({ color: "#111", emissive: c, emissiveIntensity: on ? 3 : 0.4 });
export function onSpawn(ctx) {
  if (!ctx.self.state.pulled) return;
  const h = part(ctx, "hinge"), c = part(ctx, "cart"), l = part(ctx, "led");
  if (h) h.rotation = { pitch: -105 };
  if (c) c.visible = false;
  if (l) l.material = LED(true, "#30ff6a");
}
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), s = who?.state; if (!s) return;
    const st = ctx.self.state;
    if (st.busy) return;
    if (st.pulled || s.zenDrive || s.zenQ === 99) { s.notice = { text: "The bay is empty. A cursor blinks: RECORDING CONTINUES.", at: ctx.now() }; return; }
    st.busy = true; st.by = by;
    const p = ctx.self.feetPosition;
    ctx.emit("playSound", { clip: "cdn/sfx-plastic-hinged-cover-latch-pop-and-flip-open.mp3", position: p, volume: 0.6 });
    const h = part(ctx, "hinge"); if (h) animate(ctx, h, { "rotation.pitch": -105 }, { duration: 0.35, easing: "easeOutBack" });
    const l = part(ctx, "led"); if (l) l.material = LED(true, "#ff3a2a");
    ctx.after(0.45, "slide", {});
  },
};
export function slide(ctx) {
  const p = ctx.self.feetPosition;
  ctx.emit("playSound", { clip: "cdn/sfx-drive-cartridge-unlatch-click-slide-out-beep.mp3", position: p, volume: 0.7 });
  const c = part(ctx, "cart"); if (c) animate(ctx, c, { "feetPosition.z": 0.22 }, { duration: 0.9, easing: "easeOutCubic" });
  const l = part(ctx, "led"); if (l) l.material = LED(true, "#30ff6a");
  ctx.after(1.5, "grab", {});
}
export function grab(ctx) {
  const st = ctx.self.state, who = ctx.getObject(st.by), c = part(ctx, "cart");
  if (c) {
    animate(ctx, c, { "feetPosition.y": 0.22, "feetPosition.z": 0.42, scale: 0.4 }, { duration: 0.35, easing: "easeInQuad" });
    ctx.after(0.36, "gone", {});
  }
  ctx.emit("playSound", { clip: "cdn/sfx-hand-grabs-small-plastic-cartridge-cloth-rustle.mp3", position: ctx.self.feetPosition, volume: 0.6 });
  st.pulled = true; st.busy = false;
  const s = who?.state; if (!s) return;
  s.zenDrive = true;
  if (s.zenQ && s.zenQ < 3) setZen(ctx, who, 3, "Picked up: Zenith flight-recorder drive");
  else s.notice = { text: "Picked up: Zenith flight-recorder drive. Somebody in the B.N.T.G. would pay for this.", at: ctx.now() };
}
export function gone(ctx) { const c = part(ctx, "cart"); if (c) c.visible = false; }
