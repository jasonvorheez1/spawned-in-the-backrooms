// Spawn 3D Modeling Studio job log: the last 5 jobs run through the studio, newest first, in world.state.m3d.jobs.
// one row per order: { order, kind, prompt, by, status: "ok" | "failed" | "cancelled", item, steps: [{ step, ok, s, note }],
// queuedAt, doneAt (ctx.now ms), waitS, date, error }. the panel draws them and copies them as a bug-report block.
export const KEEP = 5;
export function logJob(m3d, row) {
  const rest = (m3d.jobs ?? []).filter((j) => j.order !== row.order);
  m3d.jobs = [row, ...rest].slice(0, KEEP);
  return m3d.jobs;
}
export function reportText(jobs, world) {
  const L = [`3D Modeling Studio · last ${jobs.length} jobs · ${world ?? ""}`];
  jobs.forEach((j, k) => {
    L.push(`#${k + 1} ${String(j.status).toUpperCase()} · ${j.kind === "image" ? "paint" : "build 3D"} · order ${j.order}${j.item ? " → " + j.item : ""} · by ${j.by ?? "?"} · ${j.date ?? ""}`);
    L.push(`   prompt: ${String(j.prompt ?? "").slice(0, 160)}`);
    if (j.waitS != null) L.push(`   waited in queue: ${j.waitS}s`);
    for (const s of j.steps ?? []) L.push(`   ${s.ok ? "✓" : "✗"} ${s.step}${s.s != null ? ` ${s.s}s` : ""}${s.note ? ` · ${s.note}` : ""}`);
    if (j.error) L.push(`   error: ${j.error}`);
  });
  return L.join("\n");
}
