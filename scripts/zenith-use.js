// Zenith Station's flight-recorder drive bay in the control room: press to pull the drive (scripts/lib/zenith-quest.js)
import { setZen } from "./lib/zenith-quest.js";
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), s = who?.state; if (!s) return;
    if (s.zenDrive || s.zenQ === 99) { s.notice = { text: "The bay is empty. A cursor blinks: RECORDING CONTINUES.", at: ctx.now() }; return; }
    s.zenDrive = true;
    ctx.emit("playSound", { clip: "cdn/sfx-drive-cartridge-unlatch-click-slide-out-beep.mp3", position: ctx.self.feetPosition, volume: 0.7 });
    if (s.zenQ && s.zenQ < 3) setZen(ctx, who, 3, "Picked up: Zenith flight-recorder drive");
    else s.notice = { text: "Picked up: Zenith flight-recorder drive. Somebody in the B.N.T.G. would pay for this.", at: ctx.now() };
  },
};
