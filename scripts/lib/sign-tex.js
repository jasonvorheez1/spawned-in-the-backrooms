// Swaps a generic text-panel sign for its own painted, hand-made face (Shelly Nov 16: "signs look the same and feel ai generated").
// table: [[marker text inside the sign's ui, "/cdn/…png"], …]. Scans this place's objects every 4 s (module memory per place) until
// every marker is found once in this room, then stamps place.state.signTexV so it never scans again.
const last = {};
export function texSigns(ctx, table, v = 1) {
  const st = ctx.place.state; if (st.signTexV === v) return;
  const k = ctx.place.name ?? "p", now = ctx.now(); if (now - (last[k] ?? -1e9) < 4000) return; last[k] = now;
  const found = new Set();
  for (const id of Object.keys(ctx.place.objects)) {
    const o = ctx.place.objects[id]; if (!o) continue;
    const ui = typeof o.ui === "string" ? o.ui : "";
    const k0 = o.primitive?.kind;
    const hit = ui && (k0 === "box" || k0 === "plane") && table.find(([m]) => ui.includes(m)); // built props (posts, frames) keep their own face
    if (hit) {
      o.material = { texture: hit[1], roughness: 0.8, metalness: 0 };
      o.ui = null;
      found.add(hit[0]);
    } else if (o.state?.signTex) found.add(o.state.signTex);
    if (hit) { o.state = { ...(o.state ?? {}), signTex: hit[0] }; }
  }
  if (ctx.place.players?.length && now > 20000) st.signTexV = v; // one pass after the level is laid
}
