import { animate } from "builtin/tween";

export const ears = {
  press(ctx) {
    const door = ctx.self, st = door.state;
    st.open = !st.open;
    st.verb = st.open ? "Close" : "Open";
    const yaw = (st.yaw0 ?? 0) + (st.open ? 90 * (st.swing ?? 1) : 0);
    animate(ctx, door, { "rotation.yaw": yaw }, { duration: 0.65, easing: "easeInOutQuad" });
    ctx.emit("playSound", {
      clip: st.open ? "/cdn/moodboard-realistic-gritty/sfx-old-wooden-door-creak-open.mp3" : "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-thud.mp3",
      position: door.feetPosition, volume: 0.5,
    });
  },
};
