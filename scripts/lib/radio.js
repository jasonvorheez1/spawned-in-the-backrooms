// The HALOGEN's stations (scripts/lib/data/radio*.yml). Each station is one loop of segments run off the room's clock,
// so every listener hears the same song at the same second, and a late tune-in lands mid-song.
// STATIONS[0] is Radio Backrooms: the world radios (scripts/world-radio.js) carry it.
import R from "./data/radio.yml";
import B from "./data/radio-8bit.yml";
export const STATIONS = [R, B].map((s, i) => ({ ...s, key: i, total: s.segments.reduce((a, x) => a + x.dur, 0) }));
export const STATION = STATIONS[0];
export function stationOf(i) { return STATIONS[i | 0] ?? STATIONS[0]; }
export function onAir(nowMs, st = STATION) {
  const S = st.segments, TOTAL = st.total;
  let t = ((nowMs / 1000) % TOTAL + TOTAL) % TOTAL;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    if (t < s.dur) return { i, seg: s, offset: t, left: s.dur - t, next: S[(i + 1) % S.length] };
    t -= s.dur;
  }
  return { i: 0, seg: S[0], offset: 0, left: S[0].dur, next: S[1] };
}
