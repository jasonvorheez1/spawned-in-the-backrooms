import { gameNow, HOUR_MS } from "./clock.js";
import { groupOf, GROUPS, isVilified } from "./rep.js";
import { clearSight } from "./sight.js";

const BORN_HOSTILE = new Set(["l7-ezra", "l7-tobit"]);
const REP_EXEMPT = new Set(["l70-npc-larsson", "l70-npc-vael"]);
const short = (id) => String(id ?? "").split("/").pop();
export const faction = (npc) => npc.state?.faction5 ?? npc.state?.faction4 ?? npc.state?.faction;
const sightPoint = (o, height) => ({ ...o.feetPosition, y: o.feetPosition.y + height });

export function incidentOf(ctx, npc, player) {
  const incident = npc.state?.incidents?.[player.id];
  if (!incident) return null;
  const elapsed = gameNow(ctx) - incident.time;
  return elapsed >= 0 && elapsed < HOUR_MS ? incident : null;
}

export function hostileReason(ctx, npc, player) {
  if (!npc || npc.state?.dead || (npc.state?.hp ?? 1) <= 0 || npc.state?.follow === player.id) return null;
  if (npc.state?.attackOnSight || npc.tags?.includes("l8-hostile") || BORN_HOSTILE.has(short(npc.id)) || faction(npc) === "lightless") return "hostile";
  if (!REP_EXEMPT.has(short(npc.id)) && isVilified(player.state, npc)) return "reputation";
  return incidentOf(ctx, npc, player)?.kind ?? null;
}

export function explainHostility(npc, reason) {
  const name = String(npc.state?.name ?? "Someone").split(" ·")[0];
  if (reason === "reputation") return "Vilified by " + (GROUPS[groupOf(npc)]?.name ?? faction(npc)) + ".";
  if (reason === "hostile") return name + " attacks outsiders on sight.";
  const reasons = { theft: "caught you stealing.", trespass: "caught you trespassing.", assault: "is responding to an assault.", murder: "saw you kill one of their own." };
  return reasons[reason] ? name + " " + reasons[reason] : null;
}

export function recordIncident(ctx, npc, player, kind) {
  if (!npc?.state || !player?.id) return;
  const incident = { kind, time: gameNow(ctx), at: ctx.now() };
  const state = npc.state;
  state.incidents = { ...state.incidents, [player.id]: incident };
  state.angry = { ...state.angry, [player.id]: true };
  if (kind === "assault" || kind === "murder") state.fresh = { ...state.fresh, [player.id]: incident.at };
}

// Only an ally who can identify the attacker joins the fight.
export function alliedWitnesses(ctx, victim, player, rows) {
  const side = faction(victim);
  if (!side) return [];
  return rows.filter(n => n.id !== victim.id && !n.state?.dead && (n.state?.hp ?? 1) > 0 && faction(n) === side
    && n.state?.follow !== player.id
    && Math.hypot(n.feetPosition.x - victim.feetPosition.x, n.feetPosition.z - victim.feetPosition.z) <= 14
    && clearSight(ctx, sightPoint(n, 1.5), sightPoint(victim, 1), [n.id, victim.id, player.id])
    && clearSight(ctx, sightPoint(n, 1.5), sightPoint(player, 1), [n.id, victim.id, player.id]));
}

export function assaulted(ctx, victim, player) {
  if (victim.state?.follow || !victim.state) return;
  const prior = incidentOf(ctx, victim, player);
  const first = prior?.kind !== "assault";
  if (prior?.kind !== "murder") recordIncident(ctx, victim, player, "assault");
  if (!first || victim.state?.hp <= 0) return;
  const nearby = ctx.query({ anyTags: ["npc", "l61fc"], center: victim.feetPosition, radius: 14 });
  for (const row of alliedWitnesses(ctx, victim, player, nearby)) {
    const ally = ctx.getObject(row.id);
    if (ally && !hostileReason(ctx, ally, player)) recordIncident(ctx, ally, player, "assault");
  }
}

function clearIncident(npc, id) {
  const s = npc.state;
  for (const key of ["incidents", "angry", "fresh", "warned", "trespass"]) {
    if (!s[key] || !Object.hasOwn(s[key], id)) continue;
    const next = { ...s[key] }; delete next[id]; s[key] = next;
  }
  if (s.target === id) s.target = null;
}

export function forgiveTick(ctx) {
  const player = ctx.self, now = ctx.now(), ses = player.session;
  if (now - (ses.forgiveAt ?? -Infinity) < 750) return;
  ses.forgiveAt = now;
  const id = player.id, p = player.feetPosition;
  for (const row of ctx.query({ anyTags: ["npc", "l61fc"], center: p, radius: 45 })) {
    const npc = ctx.getObject(row.id), s = npc?.state;
    if (!s || s.dead || (!s.angry?.[id] && !s.incidents?.[id])) continue;
    const incident = incidentOf(ctx, npc, player);
    if (!incident) { clearIncident(npc, id); continue; }
    const sheath = player.state.sheathAt ?? -Infinity;
    if (incident.kind !== "murder" && player.state.sheathed && sheath >= incident.at
      && now - sheath < 4500 && now - incident.at >= 1400 && hostileReason(ctx, npc, player) === incident.kind
      && clearSight(ctx, sightPoint(player, 1.4), sightPoint(npc, 1.4), [npc.id, id])) {
      clearIncident(npc, id);
      player.state.notice = { text: String(s.name ?? "They").split(" ·")[0] + " accepts your surrender.", at: now };
    }
  }
  if (player.state.grudges) player.state.grudges = null; // legacy entries had no source and spread to bystanders
}
