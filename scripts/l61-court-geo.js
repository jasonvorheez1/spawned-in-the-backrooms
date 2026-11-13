export function geometry(ctx) {
  const { part, radius, outer, height } = ctx.params;
  const uvs = [];
  function face(a, b, c) {
    ctx.tri(...a, ...b, ...c);
    for (const [x, y, z] of [a, b, c]) uvs.push(x / 2 + y, z / 2 + y);
  }
  function edge(i, r, y = 0) {
    const a = i * Math.PI / 24, x = Math.cos(a), z = Math.sin(a);
    const d = r ?? 7 / Math.max(Math.abs(x), Math.abs(z));
    return [x * d, y, z * d];
  }
  for (let i = 0; i < 48; i++) {
    const a = edge(i, radius), b = edge(i + 1, radius);
    if (part === "floor") {
      face([0, 0, 0], b, a);
      continue;
    }
    const c = edge(i, part === "hall" ? null : outer), d = edge(i + 1, part === "hall" ? null : outer);
    face(a, b, d);
    face(a, d, c);
    const lowA = edge(i, radius, -height), lowB = edge(i + 1, radius, -height);
    face(a, lowB, b);
    face(a, lowA, lowB);
  }
  return { uvs };
}
