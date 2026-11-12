// One continuous deck avoids coplanar seams where the straight meets the turns.
export function geometry(ctx) {
  const { half = 10, r = 12 } = ctx.params ?? {};
  const edge = [];
  for (const side of [1, -1]) for (let i = 0; i <= 24; i++) {
    const a = (i / 24 - 0.5) * Math.PI + (side < 0 ? Math.PI : 0);
    edge.push([side * half + Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  const uvs = [];
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i], b = edge[(i + 1) % edge.length];
    ctx.tri(0, 0, 0, ...b, ...a);
    uvs.push(0, 0, b[0] / 3, b[2] / 3, a[0] / 3, a[2] / 3);
  }
  return { uvs };
}
