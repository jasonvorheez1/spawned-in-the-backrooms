// The game clock: one day is the hotel's day+night cycle (600 s real), shifted by time players waited or slept away.
// world.state.clockSkip (ms) is added to ctx.now(); every routine reads gameNow so a wait moves the whole world forward.
export const DAY_MS = 600000;             // a whole in-game day (Level 5's day 420 s + night 180 s)
export const HOUR_MS = DAY_MS / 24;       // 25 s real per in-game hour
export const gameNow = (ctx) => ctx.now() + (ctx.world.state.clockSkip ?? 0);
// the cycle starts at 06:00; night (the last 180 s) begins at 22:48
export function clockOf(ctx) { const t = ((gameNow(ctx) % DAY_MS) + DAY_MS) % DAY_MS, h = (6 + t / HOUR_MS) % 24; return { h, text: `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}` }; }
