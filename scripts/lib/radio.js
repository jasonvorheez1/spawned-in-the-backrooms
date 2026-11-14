// Radio Backrooms' broadcast clock (scripts/lib/data/radio.yml). One loop of segments runs off the room's clock,
// so every listener hears the same song at the same second, and a late tune-in lands mid-song.
import R from "./data/radio.yml";
export const STATION = R;
const TOTAL = R.segments.reduce((a, s) => a + s.dur, 0);
export function onAir(nowMs) {
  let t = ((nowMs / 1000) % TOTAL + TOTAL) % TOTAL;
  for (let i = 0; i < R.segments.length; i++) {
    const s = R.segments[i];
    if (t < s.dur) return { i, seg: s, offset: t, left: s.dur - t, next: R.segments[(i + 1) % R.segments.length] };
    t -= s.dur;
  }
  return { i: 0, seg: R.segments[0], offset: 0, left: R.segments[0].dur, next: R.segments[1] };
}
