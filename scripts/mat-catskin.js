// The new cat's skin, clothes painted in (Shelly Nov 11: "theyre painted in"): fur where she is bare, fabric where a garment covers her, decided per pixel
// from the body's bind-pose position (positionGeometry: metres, y up, front +z, arms out along x), so a hem is a clean line and nothing can clip or tear.
// The material colour is the fur tint (white fur picture × colour). Every number and colour is a live param (ctx.param): one compiled program dresses every cat.
// params: fur (picture), top/bot/sock = 0|1, pats, hems (see scripts/lib/cat-wardrobe.js catSkin), colours as r,g,b triples.
import { uv, materialColor, positionGeometry, positionLocal, normalLocal, positionWorld, normalWorld, cameraPosition, normalize, dot, pow, saturate, vec2, vec3, vec4, float, abs, fract, sin, mix, smoothstep, step, max, min, clamp, mx_noise_float, mx_fractal_noise_float } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";

const E = 0.0025; // edge softness, metres
export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const P = (n, d = 0) => ctx.param(n, Number(ctx.params[n] ?? d));
  const C = (n) => vec3(P(n + "R", 1), P(n + "G", 1), P(n + "B", 1));
  const q = positionGeometry, ax = abs(q.x);
  if (ctx.params.face) {
    // Project the portrait in bind space so it follows the head through the full pose.
    const v = q.y.mul(P("faceVScale")).add(P("faceVBias"));
    const muzzle = smoothstep(0.30, 0.43, v).oneMinus();
    const u = q.x.mul(float(2.75).mul(muzzle.mul(0.10).add(1))).add(0.5);
    const inside = step(0, u).mul(step(u, 1)).mul(step(0, v)).mul(step(v, 1));
    const front = smoothstep(0, 0.028, q.z.sub(P("faceNear")));
    const pic0 = ctx.texture(String(ctx.params.face)).sample(vec2(u, v));
    // a mouth type: its layer over the face picture, same projection (critter-faces.yml mouths)
    const mo = ctx.params.mouth ? ctx.texture(String(ctx.params.mouth)).sample(vec2(u, v)) : null;
    let pic = mo ? vec4(mix(pic0.rgb, mo.rgb, mo.a), max(pic0.a, mo.a)) : pic0;
    // the sculpted head has its own nose (Shelly 'double noses'): the picture's painted nose is filled with the muzzle beside it
    const nd = u.sub(0.5).div(0.075).pow(2).add(v.sub(P("noseCutV", 0.36)).div(0.07).pow(2)).sqrt();
    const noseCut = smoothstep(1.0, 0.8, nd);
    const sL = ctx.texture(String(ctx.params.face)).sample(vec2(u.sub(0.11), v)), sR = ctx.texture(String(ctx.params.face)).sample(vec2(u.add(0.11), v));
    const fill = max(sL, sR);
    pic = vec4(mix(pic.rgb, fill.rgb, noseCut), mix(pic.a, fill.a, noseCut));
    // on the snout the projection grazes its sides and the mouth smears: muzzle paint only lands where the surface faces the front
    const facing = mix(float(1), smoothstep(0.32, 0.62, normalLocal.z), muzzle);
    // iris: the picture's blue above max(r,g) is the iris shading (art/cat-wardrobe/iris.py); look.eyes colours it, the pupil stays black
    const grey = max(pic.r, pic.g), irisAmt = saturate(pic.b.sub(grey));
    const eye = vec3(P("eyeR", 0.85), P("eyeG", 0.6), P("eyeB", 0.15));
    const art = min(pic.rgb, vec3(grey, grey, grey)).add(eye.mul(irisAmt.mul(1.3)));
    let col = mix(materialColor, art, pic.a.mul(inside).mul(front).mul(facing));
    // one nose, on the sculpted snout tip itself (bind space): a soft rounded triangle, wider on top, with a small shine
    const ns = P("noseS", 1), ny = q.y.sub(P("noseY", 0.797)).div(0.0125 * 1).div(ns);
    const nx = q.x.div(float(0.017).mul(ns)).div(float(1).add(ny.mul(0.28)).max(0.3));
    const nDist = nx.mul(nx).add(ny.mul(ny)).sqrt();
    const onTip = smoothstep(-0.065, -0.048, q.z.sub(P("noseZ", 0.249)));   // wide enough for the flat snout key (tip 4 cm back)
    const noseM = smoothstep(1.0, 0.86, nDist).mul(onTip);
    const shine = smoothstep(0.5, 0.15, nx.add(0.25).mul(nx.add(0.25)).add(ny.sub(0.45).mul(ny.sub(0.45))).sqrt());
    col = mix(col, mix(vec3(0.045, 0.032, 0.03), vec3(0.42, 0.38, 0.38), shine.mul(0.6)), noseM);
    m.colorNode = col;
    m.emissiveNode = col.mul(0.06).add(eye.mul(irisAmt.mul(pic.a).mul(inside).mul(front).mul(0.35)));   // a little glow so the iris reads in the dim yellow light
    m.roughness = 0.68;
    return m;
  }
  const furT = ctx.params.fur ? ctx.texture(String(ctx.params.fur)).sample(vec2(uv().x, uv().y.oneMinus())).rgb : vec3(1, 1, 1);
  const fur = furT.mul(materialColor);
  // --- tail: a capsule line the garments leave a hole for
  const tl = [0, 1, 2, 3].map((i) => vec3(P("t" + i + "x"), P("t" + i + "y"), P("t" + i + "z")));
  const seg = (a, b) => { const pa = q.sub(a), ba = b.sub(a), h = clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1); return pa.sub(ba.mul(h)).length(); };
  const tailD = min(seg(tl[0], tl[1]), min(seg(tl[1], tl[2]), seg(tl[2], tl[3])));
  const tailR = P("tailR", 0.036);
  // a region is a signed "depth inside" in metres (positive = covered); masks are smoothsteps of it, so hems, trims and shadows share one edge
  const inside = (d, grow) => smoothstep(-E, E, d.add(grow));
  const notTail = tailD.sub(tailR);
  // --- top: hem..collar band, sleeve end on the arm, a scoop collar front and back
  const tLo = P("tLo"), tHi = P("tHi"), tSl = P("tSl"), nW = P("nW"), nF = P("nF"), nB = P("nB"), fz = P("frontZ");
  const isFront = smoothstep(-0.01, 0.01, q.z.sub(fz));
  const nD = mix(nB, nF, isFront);
  const ex = q.x.div(nW), ey = q.y.sub(tHi.add(0.004)).div(nD.max(0.001));
  const scoop = ex.mul(ex).add(ey.mul(ey)).sqrt().sub(1).mul(min(nW, nD.max(0.012))); // >0 outside the collar hole
  const topBand = min(q.y.sub(tLo), tHi.sub(q.y));
  // The fitted top needs fabric backing above the usual shirt line at the shoulder seam.
  const shoulder = min(min(ax.sub(0.069), float(0.215).sub(ax)), tHi.add(0.021).sub(q.y));
  const upper = max(topBand, min(min(shoulder, q.y.sub(tHi.sub(0.05))), P("tShoulder").mul(2).sub(1)));
  const topD = min(upper, min(tSl.sub(ax), min(scoop, notTail)));
  // --- bottom: waist..leg hem
  const bLo = P("bLo"), bHi = P("bHi");
  const botD = min(min(q.y.sub(bLo), bHi.sub(q.y)), min(notTail, float(0.2).sub(ax)));
  // --- socks: ankle up
  const sHi = P("sHi");
  const sockD = sHi.sub(q.y);
  const onTop = P("top"), onBot = P("bot"), onSock = P("sock");
  const fab = (pat, base, s) => {
    const u = q.x.add(q.z.mul(0.7)), v = q.y, fine = mx_noise_float(q.mul(300)).mul(0.5).add(0.5);
    const band = (x, w) => smoothstep(0.5 - w - 0.03, 0.5 - w, abs(fract(x).sub(0.5))).oneMinus();
    let c;
    if (pat === "denim") { const tw = fract(u.add(v).mul(160)), fade = mx_fractal_noise_float(q.mul(7)).mul(0.5).add(0.5); c = base.mul(float(0.8).add(smoothstep(0.35, 0.65, tw).mul(0.16))).mul(float(0.9).add(fade.mul(0.22))); }
    else if (pat === "stripes") c = mix(base, vec3(0.95, 0.94, 0.9), band(v.mul(22), 0.24).mul(0.9));
    else if (pat === "gingham") { const a = step(0.5, fract(u.mul(30))), b = step(0.5, fract(v.mul(30))); c = mix(vec3(0.96, 0.95, 0.92), base, a.add(b).mul(0.5).add(a.mul(b).mul(0.5)).min(1).mul(0.8).add(0.15)); }
    else if (pat === "rib") c = base.mul(float(0.84).add(abs(sin(u.mul(330))).mul(0.18)));
    else if (pat === "knit") c = base.mul(float(0.76).add(abs(sin(u.mul(240))).mul(0.16)).add(smoothstep(0.1, 0.5, fract(v.mul(150))).mul(0.14)));
    else { const wv = abs(sin(u.mul(320))).mul(0.5).add(abs(sin(v.mul(320))).mul(0.5)); c = base.mul(float(0.9).add(wv.mul(0.1))); }
    const folds = mx_fractal_noise_float(q.mul(vec3(9, 4.5, 9)).add(s)).mul(0.5).add(0.5);
    return c.mul(float(0.95).add(fine.mul(0.06))).mul(float(0.86).add(smoothstep(0.25, 0.75, folds).mul(0.17)));
  };
  // one layer: fabric inside, a stitched darker hem just inside the edge, a soft contact shadow on whatever lies just outside it
  let col = fur, cloth = float(0);
  const layer = (d, on, pat, name, s) => {
    const mk = inside(d, 0).mul(on), hem = mk.mul(inside(d, -0.006).oneMinus()), sh = inside(d, 0.007).mul(on).mul(mk.oneMinus());
    const f = fab(pat, C(name), s);
    col = mix(col.mul(float(1).sub(sh.mul(0.3))), f.mul(float(1).sub(hem.mul(0.2))), mk);
    cloth = max(cloth, mk);
  };
  layer(sockD, onSock, "rib", "sock", 3.1);
  layer(botD, onBot, String(ctx.params.bpat ?? "weave"), "bot", 7.7);
  layer(topD, onTop, String(ctx.params.tpat ?? "weave"), "top", 0);
  if (ctx.params.tprint) { // a printed tee (Thrift Mode): the picture on her chest, front only, inside the top
    const ps = P("tps", 0.17), pu = q.x.sub(P("tpx", 0)).div(ps).add(0.5), pv = q.y.sub(P("tpy", 0.54)).div(ps).add(0.5);
    const inPic = step(0.0, pu).mul(step(pu, 1.0)).mul(step(0.0, pv)).mul(step(pv, 1.0)).mul(isFront).mul(inside(topD, 0)).mul(onTop);
    const t = ctx.texture(String(ctx.params.tprint)).sample(vec2(pu, pv));
    col = mix(col, t.rgb.mul(0.94), t.a.mul(inPic));
  }
  if (ctx.params.tband) { // a contrast band along the low hem (the crop's trim)
    const bd = inside(topD, 0).mul(onTop).mul(smoothstep(0.016 + E, 0.016 - E, q.y.sub(tLo)));
    col = mix(col, C("trim"), bd.mul(0.9));
  }
  // tuck: under a modelled garment the skin itself sinks inward (metres, fading in over 2 cm from the edge) so a sleeve or hem bending a little differently never shows fur through it
  const tuck = (d, n) => smoothstep(0.003, 0.022, d).mul(P(n, 0));
  const sink = max(max(tuck(topD, "tuckT").mul(onTop), tuck(botD, "tuckB").mul(onBot)), tuck(sockD, "tuckS").mul(onSock));
  m.positionNode = positionLocal.sub(normalLocal.mul(sink));
  const N = normalize(normalWorld), V = normalize(cameraPosition.sub(positionWorld)), fres = pow(float(1).sub(saturate(abs(dot(N, V)))), 3.0);
  m.colorNode = col;
  m.emissiveNode = col.mul(0.06).add(col.mul(0.5).add(vec3(0.16, 0.15, 0.14)).mul(fres).mul(0.16).mul(cloth));
  m.roughnessNode = mix(float(0.6), float(0.88), cloth);
  m.metalness = 0;
  return m;
}

// toon shading for the new cats: two soft bands, a lifted shadow tone, so Tripo's sculpt lumps stop catching light
export function lighting(surface, lights, ctx) {
  const direct = lights.each((light) => {
    const ndl = clamp(dot(surface.normal, light.direction), 0, 1);
    const band = mix(float(0.55), float(0.85), smoothstep(-0.1, 0.7, ndl));
    return surface.albedo.mul(light.color).mul(band).mul(light.shadow);
  });
  return direct.add(surface.albedo.mul(lights.ambient.add(lights.environment)).mul(surface.occlusion).mul(0.45));
}
