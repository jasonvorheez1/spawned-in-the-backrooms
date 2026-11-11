// Critter clothes fitter (Shelly Nov 11: "work on the fitting system... tears and the breast area seems very loose").
// For every garment vertex: (1) its Bust morph is rebuilt from the skin under it, so tops follow every bust size snugly;
// (2) at bust 0 and bust 1, with Dandy on (the game's weight), any vertex closer to the skin than its layer gap is pushed out
// along the skin normal, so fur never shows through. Pushes ride the Dandy target (always on in game) and the Bust target.
// Usage: node fit.mjs <in.glb> <out.glb>   (after andy-morph fold; uncompressed in and out)
const pkg = (n) => import(n);
const { NodeIO } = await pkg("@gltf-transform/" + "core");
const { ALL_EXTENSIONS } = await pkg("@gltf-transform/" + "extensions");
const { MeshoptDecoder } = await pkg("mesh" + "optimizer"); await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const [, , src, out] = process.argv;
const S = 0.625, OY = 0.583, W = (m) => m / S, RY = (wy) => (wy - OY) / S; // world metres -> raw
const GAP = { top: W(0.006), bottom: W(0.016), outer: W(0.022) }; // her picks: skin < tee < trousers < jackets; wide enough to survive the phone simplify (Nov 11: hem tore at 6/9 mm)
const OUTER = /hoodie|jacket|coat|blazer|robe|poncho|cloak|cape|mantle|oilskin|tailcoat|vest|hauberk|plate|apron|seawatch|opera|bellhop|pinstripe/;
const BOTTOM = /^Bot_|pants|jeans|cargo|slacks|shorts|skirt|overalls|waders|pjpants/;
const SKIP = /^(Body|Skin_|Hat_|Eyew_|Shoes_)|beanie|beret|cap$|crown|helm|hood$|hat$|bow$|flower|glasses|shades|headphones|boots|sneakers|slippers|heels|steeltoe|souwester|bell$|partyhat|tophat/;
const doc = await io.read(src);
const meshes = doc.getRoot().listMeshes();
const tIdx = (m, n) => (m.getExtras()?.targetNames ?? []).indexOf(n);
// skin cloud at the game pose (base + Dandy), with normals and Bust deltas
const sk = []; 
for (const m of meshes) if (/^Skin_/.test(m.getName())) { const arm = /hands|forearms|upperarms/.test(m.getName()) ? 1 : 0; const di = tIdx(m, "Dandy"), bi = tIdx(m, "Bust");
  for (const p of m.listPrimitives()) { const P = p.getAttribute("POSITION"), N = p.getAttribute("NORMAL"), T = p.listTargets(), D = di >= 0 ? T[di]?.getAttribute("POSITION") : null, B = bi >= 0 ? T[bi]?.getAttribute("POSITION") : null;
    const v = [0,0,0], d = [0,0,0], n = [0,0,0], b = [0,0,0];
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (D) D.getElement(i, d); else d.fill(0); N.getElement(i, n); if (B) B.getElement(i, b); else b.fill(0);
      sk.push([v[0]+d[0], v[1]+d[1], v[2]+d[2], n[0], n[1], n[2], b[0], b[1], b[2], arm]) } } }
const C = W(0.04), key = (x, y, z) => `${Math.floor(x/C)},${Math.floor(y/C)},${Math.floor(z/C)}`, grid = new Map();
sk.forEach((s, i) => { const k = key(s[0], s[1], s[2]); (grid.get(k) ?? grid.set(k, []).get(k)).push(i) });
function near(x, y, z, K = 4, noArm = false) { const cx = Math.floor(x/C), cy = Math.floor(y/C), cz = Math.floor(z/C); let best = [];
  for (let r = 1; r <= 3 && best.length < K; r++) { best = [];
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (const i of grid.get(`${cx+a},${cy+b},${cz+c}`) ?? []) { const s = sk[i]; if (noArm && s[9]) continue; best.push([(s[0]-x)**2+(s[1]-y)**2+(s[2]-z)**2, i]) } }
  best.sort((p, q) => p[0] - q[0]); return best.slice(0, K) }
const hasBust = sk.some((s) => s[6] || s[7] || s[8]);
// the trousers' waistband height, world metres (top of Ward_pants at the game pose)
const wys = []; let WAIST = 0; for (const m of meshes) if (m.getName() === "Ward_pants") { const di = tIdx(m, "Dandy"); for (const p of m.listPrimitives()) { const P = p.getAttribute("POSITION"), D = p.listTargets()[di]?.getAttribute("POSITION"), v = [0,0,0], d = [0,0,0]; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (D) D.getElement(i, d); wys.push((v[1]+d[1]) * S + OY) } } }
wys.sort((a, b) => a - b); WAIST = Math.min(0.7, wys[Math.floor(wys.length * 0.97)] ?? 0.68) - 0.01; // pants top; a stray high vert never sets it console.log("waist", WAIST.toFixed(3));
// the trousers' own surface at the game pose: a shirt hem below the waistband is tucked just inside it (Nov 11: the back hem hung outside the pants and tore through)
const pc = []; for (const m of meshes) if (m.getName() === "Ward_pants") { const di = tIdx(m, "Dandy"); for (const p of m.listPrimitives()) { const P = p.getAttribute("POSITION"), D = p.listTargets()[di]?.getAttribute("POSITION"), v = [0,0,0], d = [0,0,0]; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (D) D.getElement(i, d); pc.push([v[0]+d[0], v[1]+d[1], v[2]+d[2]]) } } }
const pg = new Map(); pc.forEach((q, i) => { const k = key(q[0], q[1], q[2]); (pg.get(k) ?? pg.set(k, []).get(k)).push(i) });
function nearPants(x, y, z) { const cx = Math.floor(x/C), cy = Math.floor(y/C), cz = Math.floor(z/C); let b = null, bd = 1e9;
  for (let a = -2; a <= 2; a++) for (let e = -2; e <= 2; e++) for (let c = -2; c <= 2; c++) for (const i of pg.get(`${cx+a},${cy+e},${cz+c}`) ?? []) { const q = pc[i], dd = (q[0]-x)**2 + (q[1]-y)**2 + (q[2]-z)**2; if (dd < bd) { bd = dd; b = q } }
  return b }
const TUCK = W(0.02); let tucked = 0, lifted = 0;
const CROTCH = pc.filter(q => Math.abs(q[0]) < W(0.015)).reduce((m, q) => Math.min(m, q[1]), 1e9); // the trousers' centre seam: a shirt tail below it shows between the legs (Nov 11: Andrew's blue seat patch)
const SL = new Map(); for (const q of pc) { const k = Math.round(q[1] / C); const e = SL.get(k) ?? SL.set(k, [0, 0, 0]).get(k); e[0] += q[0]; e[1] += q[2]; e[2]++ }
function sliceC(y) { for (const o of [0, -1, 1, -2, 2]) { const e = SL.get(Math.round(y / C) + o); if (e && e[2] > 8) return [e[0] / e[2], e[1] / e[2]] } return null }
function torsoAt(px, py, pz) { const c = sliceC(py); if (!c) return Math.abs(px * S) < 0.12; const q = nearPants(px, py, pz); if (!q) return Math.abs(px * S) < 0.12; const rq = Math.hypot(q[0] - c[0], q[2] - c[1]); return Math.hypot(px - c[0], pz - c[1]) < rq + W(0.04) } // a sleeve hangs clear of the trousers; the shirt body hugs them
let fitted = 0, pushed = 0, pulled = 0;
for (const m of meshes) { const name = m.getName(); if (SKIP.test(name)) continue; if (!/^(Top_|Bot_|Ward_|Neck_)/.test(name)) continue;
  const lname = name.toLowerCase(), gap = BOTTOM.test(lname) ? GAP.bottom : OUTER.test(lname) ? GAP.outer : GAP.top;
  let names = [...(m.getExtras()?.targetNames ?? [])]; let di = names.indexOf("Dandy"), bi = names.indexOf("Bust");
  if (di < 0) continue;
  if (hasBust && bi < 0) { // this garment never followed the bust: give it the target
    for (const p of m.listPrimitives()) { const cnt = p.getAttribute("POSITION").getCount(), t = doc.createPrimitiveTarget("Bust");
      for (const sem of p.listTargets()[0].listSemantics()) t.setAttribute(sem, doc.createAccessor().setType("VEC3").setArray(new Float32Array(cnt * 3)).setBuffer(p.getAttribute("POSITION").getBuffer()));
      p.addTarget(t) }
    names.push("Bust"); bi = names.length - 1; m.setExtras({ ...(m.getExtras() ?? {}), targetNames: names }); m.setWeights([...m.getWeights(), 0]) }
  for (const p of m.listPrimitives()) { const P = p.getAttribute("POSITION"), T = p.listTargets(), D = T[di].getAttribute("POSITION"), B = bi >= 0 ? T[bi].getAttribute("POSITION") : null, cnt = P.getCount();
    const nd = new Float32Array(cnt * 3), nb = new Float32Array(cnt * 3), v = [0,0,0], d = [0,0,0];
    for (let i = 0; i < cnt; i++) { P.getElement(i, v); D.getElement(i, d); const x = v[0]+d[0], y = v[1]+d[1], z = v[2]+d[2];
      const wy = y * S + OY, on = Math.max(0, Math.min(1, (1.12 - wy) / 0.04)) * Math.max(0, Math.min(1, (wy - 0.1) / 0.04)); // body only, not head or soles
      const isBot = BOTTOM.test(lname), nn = near(x, y, z, 4, isBot || !/sleeve|hoodie|sweater|jacket|coat|blazer|robe|pajamas|shirt|tailcoat|oilskin|suit|opera|bellhop|pinstripe|megjacket|padjacket/.test(lname) || Math.abs(x * S) < 0.13); let hemmed = false, dx = d[0], dy = d[1], dz = d[2], bx = 0, by = 0, bz = 0;
      if (nn.length && on > 0) { let ws = 0, nx = 0, ny = 0, nz = 0, sx = 0, sy = 0, sz = 0;
        for (const [q, j] of nn) { const w = 1 / (Math.sqrt(q) + 1e-4), s = sk[j]; ws += w; nx += w*s[3]; ny += w*s[4]; nz += w*s[5]; bx += w*s[6]; by += w*s[7]; bz += w*s[8]; sx += w*s[0]; sy += w*s[1]; sz += w*s[2] }
        bx /= ws; by /= ws; bz /= ws; sx /= ws; sy /= ws; sz /= ws; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const far = Math.sqrt(nn[0][0]) > W(0.08); // a skirt hem or cape far from skin: leave it hanging free
        if (!far) {
          // bust 0: push out to the gap
          const d0 = (x - sx) * nx + (y - sy) * ny + (z - sz) * nz;
          if (d0 < gap) { const k = (gap - d0) * on; dx += nx * k; dy += ny * k; dz += nz * k; pushed++ }
          else if (!isBot && !OUTER.test(lname) && wy < WAIST && d0 > gap) { const k = -(d0 - gap * 0.5) * on; dx += nx * k; dy += ny * k; dz += nz * k; pulled++ }
          else if (!BOTTOM.test(lname) && !OUTER.test(lname)) { // a top floating off the chest is drawn in snug (Shelly: "breast area very loose")
            const chest = Math.max(0, Math.min(1, (wy - 0.7) / 0.05)) * Math.max(0, Math.min(1, (1.02 - wy) / 0.05)), slack = d0 - gap * 1.5;
            if (slack > 0 && d0 < W(0.06)) { const k = -slack * 0.85 * chest * on; dx += nx * k; dy += ny * k; dz += nz * k; pulled++ } }
          // bust 1: the skin moved by (bx,by,bz); the garment follows it, then clears it too
          const d1 = (x + bx - (sx + bx)) * nx + (y + by - (sy + by)) * ny + (z + bz - (sz + bz)) * nz; // = d0 after the follow
          if (d1 < gap && d0 >= gap) { /* already clear */ }
        } else { bx *= 0.5; by *= 0.5; bz *= 0.5 } }
      else { bx = by = bz = 0 }
      if (!BOTTOM.test(lname) && !OUTER.test(lname) && /^(Top_|Ward_)(tee|tank|longsleeve|shirt|officeshirt|jerrytee|sweater)$/.test(name) && torsoAt(x + dx - d[0], y + dy - d[1], z + dz - d[2])) { const py = (y + dy - d[1]) * S + OY, hem = WAIST - 0.05; if (py < hem && py > 0.2) { dy += (hem - py) / S; lifted++; hemmed = true } } // the hem stops 5 cm inside the waistband: a tail lower than that showed through the seat (Nov 11: Andrew's blue patch)
      if (!BOTTOM.test(lname) && !OUTER.test(lname) && pc.length && (hemmed || (wy < WAIST + 0.03 && Math.abs(x * S) < 0.26))) { // every hem point, sides too (Nov 11: a blue rim flared over Andrew's waistband) // tuck: same height, just inside the trousers' own ring there
        const px = x + dx - d[0], py = y + dy - d[1], pz = z + dz - d[2], c = sliceC(py); if (c) { const ox = px - c[0], oz = pz - c[1], r0 = Math.hypot(ox, oz) || 1e-6, q = nearPants(px, py, pz);
          if (q) { const rq = Math.hypot(q[0] - c[0], q[2] - c[1]), lim = rq - TUCK; if (r0 > lim && lim > 0) { const f = lim / r0; dx = c[0] + ox * f - v[0] + (dx - (px - v[0])); dz = c[1] + oz * f - v[2] + (dz - (pz - v[2])); tucked++ } } } }
      nd[i*3] = dx; nd[i*3+1] = dy; nd[i*3+2] = dz; nb[i*3] = bx * on; nb[i*3+1] = by * on; nb[i*3+2] = bz * on }
    T[di].setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(nd).setBuffer(P.getBuffer()));
    if (B) T[bi].setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(nb).setBuffer(P.getBuffer())) }
  fitted++ }
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === "EXT_meshopt_compression") e.dispose();
await io.write(out, doc);
console.log("lifted", lifted, "tucked", tucked, "fitted", fitted, "garments; pushed", pushed, "pulled", pulled, "verts; bust", hasBust);
