// Shared Reality Freshener aura check and fallback body geometry (used by player.js and remodel-quest.js).
export const FRESH_BODY = {
  primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 0.2, radialSegments: 20 },
  material: { color: "oklch(0.95 0.01 230)", roughness: 0.35, metalness: 0.1 },
  children: [
    { feetPosition: { x: 0, y: 0.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.04, height: 0.04, radialSegments: 16 }, material: { color: "oklch(0.75 0.13 200)", emissive: "oklch(0.75 0.13 200)", emissiveIntensity: 1.6 } },
    { feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.052, radiusBottom: 0.052, height: 0.03, radialSegments: 20 }, material: { color: "oklch(0.55 0.15 25)" } },
    { feetPosition: { x: 0, y: 0.3, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.1 200)", intensity: 0.5, distance: 3 } },
  ],
};

/** Returns true when a placed Reality Freshener is holding reality steady within 6 m. */
export function nearFresh(ctx) {
  const ses = ctx.self.session, now = ctx.now();
  if (now - (ses.freshAt ?? -1e9) > 1000) {
    ses.freshAt = now;
    ses.freshNear = ctx.query({ tags: ["freshener"], radius: 6 }).length > 0;
  }
  return ses.freshNear;
}
