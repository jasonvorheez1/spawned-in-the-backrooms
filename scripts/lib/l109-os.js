import { queuePayout } from "./quests.js";

// Actions belong to the machine's own room, not the nearest other stockroom.
export function hospitalControl(ctx, s, key, id) {
  const os = s.os, machine = ctx.getObject(os.id), m = machine?.state;
  const modes = { l109triage: "outpost", l109stock: "supply", l109ward: "wardlog", l109lore: "lore" };
  if (ctx.self.place !== "level109" || !machine || m?.kind !== "terminal" || m.mode !== modes[key] || m.host !== os.host) return false;
  if (key === "l109stock" && id === "release") {
    if (!m.roomId) return false;
    const pos = machine.worldFeetPosition ?? machine.feetPosition;
    let count = 0;
    for (const o of ctx.query({ center: pos, radius: 34 })) {
      if (o.id?.startsWith(`l109o-${m.roomId}-`) && o.tags?.includes("container") && o.state?.lock) { o.state.lock = ""; count++; }
    }
    ctx.place.state.l109StockUnlocked = { ...(ctx.place.state.l109StockUnlocked ?? {}), [m.roomId]: true };
    s.notice = { text: count ? `Released ${count} local supply container(s).` : "Local stock cage latches released.", at: ctx.now() };
  } else if (key === "l109triage" && id === "status") {
    const n = Object.keys(ctx.place.state.l109Purged ?? {}).length, q = s.l109q ?? 0;
    s.notice = { text: `${q >= 99 ? "Breach closed" : q > 0 ? `Active breach, stage ${q}` : "Unassigned: speak to Dr. Halloran"} · ${n} biohazard suites purged.`, at: ctx.now() };
  } else if (id === "lore") {
    const page = m.page ?? (key === "l109triage" ? 116 : key === "l109stock" ? 114 : /ICU/.test(m.name ?? "") ? 110 : 112);
    if (!Number.isInteger(page) || page < 110 || page > 116) return false;
    if (!String(s.pages ?? "").split(",").includes(String(page)) && !(s.payout?.items ?? []).includes(`page:${page}`)) {
      queuePayout(s, { xp: 5, items: [`page:${page}`], text: "Printed recovered hospital record." });
    } else s.notice = { text: "You already have this record.", at: ctx.now() };
  } else if ((key === "l109triage" || key === "l109ward") && id === "print") {
    const page = key === "l109triage" ? 101 : 103;
    if (!String(s.pages ?? "").split(",").includes(String(page)) && !(s.payout?.items ?? []).includes(`page:${page}`)) {
      queuePayout(s, { items: [`page:${page}`], text: page === 101 ? "Printed intake sheet #109-01." : "Printed nursing chart #109-03." });
    } else s.notice = { text: "You already have this record.", at: ctx.now() };
  } else return false;
  s.os = { ...os, done: { ...(os.done ?? {}), [id]: true } };
  return true;
}
