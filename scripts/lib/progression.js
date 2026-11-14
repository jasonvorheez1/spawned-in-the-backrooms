// XP is stored within the current level. Preserve its percentage when migrating older saves.
export const xpNeed = level => 200 + 85 * (Math.max(1, Math.floor(Number(level) || 1)) - 1);
export const xpNeedFor = s => s?.xpCurve === 1 ? xpNeed(s.level) : 72 * Math.max(1, Math.floor(Number(s?.level) || 1));
export function migrateXp(s) {
  if (!s || s.xpCurve === 1) return;
  const old = xpNeedFor(s), next = xpNeed(s.level), xp = Number(s.xp);
  s.xp = Number.isFinite(xp) ? Math.max(0, Math.round(xp * next / old)) : 0;
  s.xpCurve = 1;
}
