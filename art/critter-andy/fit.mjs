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
const GAP = { top: W(0.006), bottom: W(0.009), outer: W(0.014) }; // her picks: skin < tee < trousers < jackets
const OUTER = /hoodie|jacket|coat|blazer|robe|poncho|cloak|cape|mantle|oilskin|tailcoat|vest|hauberk|plate|apron|seawatch|opera|bellhop|pinstripe/;
const BOTTOM = /^Bot_|pants|jeans|cargo|slacks|shorts|skirt|overalls|waders|pjpants/;
const SKIP = /^(Body|Skin_|Hat_|Eyew_|Shoes_)|beanie|beret|cap$|crown|helm|hood$|hat$|bow$|flower|glasses|shades|headphones|boots|sneakers|slippers|heels|steeltoe|souwester|bell$|partyhat|tophat/;
const doc = await io.read(src);
const meshes = doc.getRoot().listMeshes();
const tIdx = (m, n) => (m.getExtras()?.targetNames ?? []).indexOf(n);
// skin cloud at the game pose (base + Dandy), with normals and Bust deltas
const sk = []; 
for (const m of meshes) if (/^Skin_/.test(m.getName())) { const di = tIdx(m, "Dandy"), bi = tIdx(m, "Bust");
  for (const p of m.listPrimitives()) { const P = p.getAttribute("POSITION"), N = p.getAttribute("NORMAL"), T = p.listTargets(), D = di >= 0 ? T[di]?.getAttribute("POSITION") : null, B = bi >= 0 ? T[bi]?.getAttribute("POSITION") : null;
    const v = [0,0,0], d = [0,0,0], n = [0,0,0], b = [0,0,0];
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); if (D) D.getElement(i, d); else d.fill(0); N.getElement(i, n); if (B) B.getElement(i, b); else b.fill(0);
      sk.push([v[0]+d[0], v[1]+d[1], v[2]+d[2], n[0], n[1], n[2], b[0], b[1], b[2]]) } } }
const C = W(0.04), key = (x, y, z) => `${Math.floor(x/C)},${Math.floor(y/C)},${Math.floor(z/C)}`, grid = new Map();
sk.forEach((s, i) => { const k = key(s[0], s[1], s[2]); (grid.get(k) ?? grid.set(k, []).get(k)).push(i) });
function near(x, y, z, K = 4) { const cx = Math.floor(x/C), cy = Math.floor(y/C), cz = Math.floor(z/C); let best = [];
  for (let r = 1; r <= 3 && best.length < K; r++) { best = [];
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (const i of grid.get(`${cx+a},${cy+b},${cz+c}`) ?? []) { const s = sk[i]; best.push([(s[0]-x)**2+(s[1]-y)**2+(s[2]-z)**2, i]) } }
  best.sort((p, q) => p[0] - q[0]); return best.slice(0, K) }
const hasBust = sk.some((s) => s[6] || s[7] || s[8]);
let fitted = 0, pushed = 0;
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
      const nn = near(x, y, z); let dx = d[0], dy = d[1], dz = d[2], bx = 0, by = 0, bz = 0;
      if (nn.length && on > 0) { let ws = 0, nx = 0, ny = 0, nz = 0, sx = 0, sy = 0, sz = 0;
        for (const [q, j] of nn) { const w = 1 / (Math.sqrt(q) + 1e-4), s = sk[j]; ws += w; nx += w*s[3]; ny += w*s[4]; nz += w*s[5]; bx += w*s[6]; by += w*s[7]; bz += w*s[8]; sx += w*s[0]; sy += w*s[1]; sz += w*s[2] }
        bx /= ws; by /= ws; bz /= ws; sx /= ws; sy /= ws; sz /= ws; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const far = Math.sqrt(nn[0][0]) > W(0.08); // a skirt hem or cape far from skin: leave it hanging free
        if (!far) {
          // bust 0: push out to the gap
          const d0 = (x - sx) * nx + (y - sy) * ny + (z - sz) * nz;
          if (d0 < gap) { const k = (gap - d0) * on; dx += nx * k; dy += ny * k; dz += nz * k; pushed++ }
          // bust 1: the skin moved by (bx,by,bz); the garment follows it, then clears it too
          const d1 = (x + bx - (sx + bx)) * nx + (y + by - (sy + by)) * ny + (z + bz - (sz + bz)) * nz; // = d0 after the follow
          if (d1 < gap && d0 >= gap) { /* already clear */ }
        } else { bx *= 0.5; by *= 0.5; bz *= 0.5 } }
      else { bx = by = bz = 0 }
      nd[i*3] = dx; nd[i*3+1] = dy; nd[i*3+2] = dz; nb[i*3] = bx * on; nb[i*3+1] = by * on; nb[i*3+2] = bz * on }
    T[di].setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(nd).setBuffer(P.getBuffer()));
    if (B) T[bi].setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(nb).setBuffer(P.getBuffer())) }
  fitted++ }
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === "EXT_meshopt_compression") e.dispose();
await io.write(out, doc);
console.log("fitted", fitted, "garments; pushed", pushed, "verts; bust", hasBust);
