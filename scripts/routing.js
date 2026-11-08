// Solo with friends (Shelly, 11-08): each player has their own Backrooms room;
// a friend arriving through Spawn's invite, a portal or a party lands in the room it names.
// The Bonus Room (johnadams2, Nov 8) is one shared room, "bonus"; when it's full the next walker opens bonus-2, bonus-3…
import { isHubRoom, soloRoom } from "./lib/hub.js"
export async function pickRoom(ctx) {
  const req = ctx.requestedRoomId
  if (req && !ctx.rejectedRooms.includes(req)) return req
  if (req && isHubRoom(req)) {
    for (let n = 2; n < 100; n++) { const r = `bonus-${n}`; if (!ctx.rejectedRooms.includes(r)) return r }
  }
  return soloRoom(ctx.player?.userId || ctx.player?.username)
}
