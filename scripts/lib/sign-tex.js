// Swaps a generic text-panel sign for its own painted, hand-made face (Shelly Nov 16: "signs look the same and feel ai generated").
// table: [[marker text inside the sign's ui, "/cdn/…png"], …]. The sign keeps its body; its ui face becomes the painted picture,
// same width, so boxes and built (scripted) signs alike. Scans this place every 4 s until every marker is found
// (or 30 scans with a player present), then stamps place.state.signTexV so it never scans again.
const last = {}, scans = {};
export function texSigns(ctx, table, v = 2) {
  const st = ctx.place.state; if (st.signTexV === v) return;
  const k = ctx.place.name ?? "p", now = ctx.now(); if (now - (last[k] ?? -1e9) < 4000) return; last[k] = now;
  const found = new Set();
  for (const id of Object.keys(ctx.place.objects)) {
    const o = ctx.place.objects[id]; if (!o) continue;
    if (o.state?.signTex) { found.add(o.state.signTex); continue; }
    const ui = typeof o.ui === "string" ? o.ui : "";
    const hit = ui && table.find(([m]) => ui.includes(m));
    if (!hit) continue;
    const w = (ui.match(/width="([0-9.]+m)"/) || [])[1] || "1m", face = (ui.match(/face="(\w+)"/) || [])[1] || "front";
    o.ui = `<div face="${face}" width="${w}" style="width:100%;height:100%;padding:0;margin:0;overflow:hidden"><img src="${hit[1]}" style="display:block;width:100%;height:100%;object-fit:fill"></div>`;
    o.state = { ...(o.state ?? {}), signTex: hit[0] };
    found.add(hit[0]);
  }
  if (ctx.place.players?.length) scans[k] = (scans[k] ?? 0) + 1;
  if (found.size >= table.length || (scans[k] ?? 0) >= 30) st.signTexV = v;
}
