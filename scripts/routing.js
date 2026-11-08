// Solo with friends (Shelly, 11-08): each player has their own Backrooms room;
// a friend arriving through Spawn's invite, a portal or a party lands in the room it names.
export async function pickRoom(ctx) {
  const req = ctx.requestedRoomId;
  if (req && !ctx.rejectedRooms.includes(req)) return req;
  const id = String(ctx.player?.userId || ctx.player?.username || "guest").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 50);
  return "solo-" + (id || "guest");
}
