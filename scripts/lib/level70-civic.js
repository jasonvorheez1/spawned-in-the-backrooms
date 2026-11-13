// Level 70 "civic" layer: Noahtown market, the Parliament Hotel lobby, the Calor Office garage and its valve room.
// Meshes: Tripo (stalls, kitchen, lectern, car, pump, valve, pipe run, ice fall, chandelier, both building shells) and art/level70/build.py (interiors merged
// into the shells, kit props). lay(ctx) once per V, tick(ctx) each second.
export const V = 4;
const G = {"car": "/cdn/value.943f235f8e91d633e7520e554c35d8ae9fa93622797b27c08014f95cb1d34857.glb", "kitchen": "/cdn/value.c5cf97f2932caf44b61d9cb3d3bd3069008c07542e3016965890fdeb20c34e81.glb", "lectern": "/cdn/value.956a6800bd9fd9e304d895d54df3fe8be38b48cbbf72767cb1d1d2e2ae616e02.glb", "piperun": "/cdn/value.39b4a4c5355091c644d89e231477dc7232178b75d9016faabc0b6322ba5b3744.glb", "pump": "/cdn/value.debf3c1e0ee3d3d9e38d2188746f9cb4da0a1e2f0f0d70b0b9eba6d4eb17575b.glb", "valve": "/cdn/value.a76bacd25382accd2629f0b3460299de143f6911ad0837f6728d172e0429fc38.glb", "stalla": "/cdn/value.5d69a7477ebf01d638933b9fc1c4a2d3170f7cf7d8a90785062ced159f4dbe5f.glb", "stallb": "/cdn/value.889e6c7023f8f41389ed28a5cd911f8333f6065d8ceeb6dce3b8c8d095a579ba.glb", "icefall": "/cdn/value.72d2b572286f76cb493d3ec6130dbf1928669bdea80c2fc227491dc29c25c5e7.glb", "chandelier": "/cdn/value.31ca981b457c1721057600f5d92e7dd6dd5d1102c518a566ebd99075b47c78f1.glb", "hotel": "/cdn/value.d65eb95495c0ce9cf8463384f0d0526e56a0661e9c73eaf49beadc6d1e0aed9a.glb", "office": "/cdn/value.737a95509c5473fa3eda467ca6b9296292d6005bfd56ccddd17ea5d6c701af42.glb", "banner": "/cdn/value.185990cc9f76c0378ec544a7cef07f92cc87928e1bbd68a5e968369cc84efac3.glb", "bench": "/cdn/value.9516cd89c5d8fb10afca59dfa6da7ee03080244ea56105c1d27eb5adac65d832.glb", "breaker": "/cdn/value.0919a72230d19f7a5fadf929b70747b4182eb4e61cb8d6f75633b74c5a87d390.glb", "bulbring": "/cdn/value.3fc9c3fd400394d9c7add056d11697b647ac6207f9d7e0c339ef30b1704ffde6.glb", "firewood": "/cdn/value.a8269d471ada83554f083b37b4036d3cf8dc5f4626a48ff4cf8fa2116ea229fe.glb", "gauge": "/cdn/value.d40c12f73436558674f508d566b5397f6f91e3beebeadbb47611327ee28d7e54.glb", "icicles": "/cdn/value.b05c80a9b51d43b51e05f663eadb3050b2f40992c56b85489856160bbb2717e6.glb", "noticeboard": "/cdn/value.4bdc3899162211807dfe16cb602e0861364f4b1e68b394edaa4061ae0a09761b.glb", "sled": "/cdn/value.6915653bca3fbcf61f38d869818195b028ab539769c1d7539e9df055de3139a0.glb", "snowheap": "/cdn/value.652183159aeb2aed35418c3c00070f3548523a47bf0459a44ca542e79acb5457.glb", "x_firebarrel": "/cdn/value.f9480030aeb78abf6f6f50b8f2a655d8ca77540fbddc0301e23d8b2fe1ee82ef.glb", "x_bench": "/cdn/value.79f1d7e5cb9f66321063c5449edeb0e169c6f6223a0bac5e89d7067905636e1e.glb", "x_bench-2": "/cdn/value.45e95889611ed3b530e2e62e3631d60d02abd46bbbd8e44a8740c4b2f1db91f0.glb", "x_bench-3": "/cdn/value.dd903b9338239a5216f0755d356585b5b50f91b7633c6c80a4830e7ce2052a73.glb", "x_chair": "/cdn/value.dff365a352c2ff6fff83265ff883004e863a291bbb23c1e952adebe1bd96caaa.glb", "x_chair-2": "/cdn/value.3493be6fa4868a8e11a714ced266844e881ca307a0dfb6872164f273dbb7c1ae.glb", "x_chair-3": "/cdn/value.e02cceb0c66d902fced411a31f21de9e9584de3272263a09e20b85c9455411be.glb", "x_chair-4": "/cdn/value.af73f38a4652489738efd29e3102b18c292f9391917b983c743e409cb1ba55f9.glb", "x_chair-5": "/cdn/value.2ec9e206b3b1212e56cf0322ecf16fdc333ddacb4a2ba21e00ddff32920705c6.glb", "x_chair-6": "/cdn/value.3f03c5a041552a2699cd8fe8fcd2d9a220328ba5440dbb226a8375df048fd4cc.glb", "x_chair-7": "/cdn/value.b8d82a3ce214d0d151b9535237651d29ad5503bd098b052ed99e95be8d0fd779.glb", "x_armchair": "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb", "x_crate": "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb", "x_crate-2": "/cdn/value.65b1cf4b647cedc952ad4a7628071e0fbbf64952b6cd06bb3ae156a729b11eb6.glb", "x_pallet": "/cdn/value.54dc26df7dc70e622aeb7df92fe86d9ace1a4c0ebd461dc8835643e5798a0dac.glb", "x_candles": "/cdn/value.ae97d51c608e349cb357872bed72fbce88260ee166074c5136c36932f1639fca.glb", "x_reception-desk-2": "/cdn/value.2c088503b2d0bc2059170d8cfd3c309ff0c962ab60e22a79372dd44229ef85be.glb", "x_lantern": "/cdn/value.4c87f2d28b86fe9703caf37d92b67726f5d8598e312f590bcfb50bfc5ac15971.glb", "x_tubelamp": "/cdn/value.e1d7e9d8285363fde672073e9fa6ea81325922de9f94306bc9ce454a7b0b53b7.glb", "x_rug": "/cdn/value.7a52a205e6005afc81d4fb66c6bd697f8b8a470cb14e2d812ee207660fd6a48c.glb", "x_trash-bag": "/cdn/value.995feda9ff8f26806fc11b84645a37bf2ae5bd8cb1bcfe8a8146d20b5aba877a.glb", "x_foldtable": "/cdn/value.f106a1dcbe11b66b98bc57dfe19f96299e4e0204832815f3841c9f751e0aaf60.glb", "x_stall": "/cdn/value.7e5561ee48de85e59cd6fb64b7961827a0bbcd6b65aa40daf13e419786814f8f.glb", "x_bntg-stall": "/cdn/value.f7e6008506e6d256bf36d1f08245b4133e7dd14034aaa56def75706efb87180d.glb", "x_tarp": "/cdn/value.78cd2d67c6b09ca3eb8872f55fb7d8f49a4ff6730f9482e392e293085d5aed8f.glb", "x_generator": "/cdn/value.43dce37c5c94828c4f73c350c550d1912c43026086ce914206d5ef670c478c2e.glb", "x_panel": "/cdn/value.8612285ca3c16cd450c63da8345f8b518cacd0c1c649aeed35deedefa666117b.glb", "x_pump": "/cdn/value.27ec9d05a1f59266dfcdc97e6713fa9b07509ec86ae09b9b3a19892f8cbe5267.glb", "x_pipe": "/cdn/value.80c1c013a5be30d06f7616da0e4df190fe23e3d4dc42e639e27d9622446d7d25.glb", "x_door-2": "/cdn/value.d881012e396884baff8281b8df4e473a981750577540f4b511c8da5280350a69.glb", "x_lamppost": "/cdn/value.c24e22aeb5283e7db0dfe271edbcf822e6e1e5ce582550db257bd3f821c5687c.glb", "x_amber-firering": "/cdn/value.4a5665988ced9c8d4a2b352e55c37106a4e520e50fd3aca97346dbefb5fe4fab.glb"};
const face = (x, z, tx, tz) => Math.atan2(x - tx, z - tz) * 180 / Math.PI; // yaw that turns a -Z front toward (tx, tz)
const MK = { x: 0, z: -72 }, HT = { x: 34, z: -80 }, OF = { x: 38, z: -22 };
const SR = [[-7.5, -4.5, "stalla"], [-8.5, 1.5, "stallb"], [-6, 7, "stalla"], [7.5, -3.5, "stallb"], [8, 3.5, "stalla"]];
export const STALL = SR.map(([x, z]) => { const k = 1 + 1.3 / Math.hypot(x, z); return { x: +(x * k).toFixed(2), z: +(MK.z + z * k).toFixed(2), yaw: Math.round(face(x, z, 0, 0)) }; });
export const FIRE = [{ x: -3.2, z: -70.5 }, { x: 3.2, z: -73.5 }];
export const LECTERN = { x: 34, y: 0.04, z: -76.4 };
export const HOTEL_DOOR = { x: 25.6, y: 0, z: -80 };
export const GARAGE_DOOR = { x: 22, y: 0, z: -22 };
export const VALVE_POS = [0, 1, 2, 3].map((i) => ({ x: 49.5, y: 0.62, z: -23.5 + i }));
export const GAUGE = { x: 47, y: 0.5, z: -24.86 };
export const PUMP = { x: 46.6, y: 0.16, z: -20.1 };
export const BREAKER = { x: 48.3, y: 1.0, z: -19.14 };
const SOLID = { physics: { body: "static", collider: "mesh" } };
const FLAME = `fx
pop coals n=8 on=disc(.16) size=.06..0.12 tint=<2.4,.9,.25>..<1.1,.3,.08> sz=$size*flick(.5,.12) col=$tint*flick(.8,.3) a=.9 r=sprite(soft-disc,add)
pop flame rate=flick(.45,.2)*?mobile:16|26 on=disc(.17) life=.35..0.6 v=up(.9)+cone(18)*(.2..0.5) size=.14..0.26 acc=curl(.5)*1.2+buoy(1.3)+drag(1.8)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(2.6,1.7,.6)>.3:hdr(2,.8,.16)>.65:hdr(1.2,.32,.06)>hdr(.4,.08,.02) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=4 on=disc(.16) life=.8..1.6 v=up(2.4)+cone(30)*(.4..1.2) size=.02..0.05 acc=curl(.8)+grav()*.4+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.2 inh=p;v:$v*.4 life=1.8..3 size=.16..0.26 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.22:.3>.7:.18>0 rot=spin(.15) r=sprite(smoke-puff,alpha)`;
const TUBE = { kind: "point", color: "oklch(0.93 0.03 220)", intensity: 5, distance: 13 };

export function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  const put = (id, key, x, y, z, yaw, h, fwd, extra) => {
    if (!G[key]) return;
    const s = { feetPosition: { x, y, z }, rotation: { yaw: yaw || 0 }, model: fwd ? { id: G[key], forward: fwd } : G[key], ...(extra || {}) };
    if (h) s.layout = { box: { min: { y: 0 }, max: { y: h } } };
    return sp(id, s);
  };
  const lamp = (id, x, y, z, color, intensity, distance) => sp(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance } });
  const WARM = "oklch(0.8 0.13 62)";
  // ---- Noahtown market
  put("l70-bp-market", "bulbring", MK.x, 0, MK.z, 0, 0, null, { tags: ["l70-civic"] });
  put("l70-c-banner", "banner", 0, 0, -60, 0, 0, null);
  SR.forEach(([x, z, k], i) => {
    put("l70-c-stall-" + i, k, MK.x + x, 0, MK.z + z, face(x, z, 0, 0) + (i % 2 ? 6 : -5), k === "stalla" ? 2.6 + (i % 3) * 0.12 : 2.7, "+x", SOLID);
    put("l70-c-stallsnow-" + i, "snowheap", MK.x + x * 1.22, 0, MK.z + z * 1.22 + 1.2, i * 70, 0, null, { scale: 0.7 + (i % 3) * 0.2 });
    put("l70-c-stallcrate-" + i, i % 2 ? "x_crate-2" : "x_crate", MK.x + x * 0.86 + 1.3, 0, MK.z + z * 0.86 - 1.1, i * 37, 0.62, null, SOLID);
    lamp("l70-c-stalllamp-" + i, MK.x + x * 0.9, 2.1, MK.z + z * 0.9, WARM, 3, 7);
  });
  FIRE.forEach((f, i) => {
    put("l70-c-drum-" + i, "x_firebarrel", f.x, 0, f.z, i * 50, 0.95, null, SOLID);
    sp("l70-c-fire-" + i, { feetPosition: { x: f.x, y: 0.9, z: f.z }, fx: { script: FLAME }, light: { kind: "point", color: "oklch(0.78 0.16 55)", intensity: 28, distance: 16 },
      audio: { clip: "cdn/moodboard-realistic-gritty/sfx-oil-drum-fire-crackle-loop.mp3", loop: true, spatial: true, gain: 0.5, maxDistance: 26 } });
    const s = i ? 1 : -1;
    [[s * 1.9, 0], [0, -s * 2.0]].forEach(([dx, dz], j) => put("l70-c-bench-" + i + j, "bench", f.x + dx, 0, f.z + dz, face(f.x + dx, f.z + dz, f.x, f.z), 0, null,
      { tags: ["seat", "usable"], state: { seat: { d: 0, w: 3, gap: 0.55, y: 0.47 } }, ...SOLID }));
  });
  put("l70-c-kitchen", "kitchen", 6, 0, -64, face(6, 8, 0, 0), 2.1, "+x", SOLID);
  put("l70-c-notice", "noticeboard", 4, 0, -80.5, face(4, -8.5, 0, 0), 0, null, SOLID);
  lamp("l70-c-noticelamp", 3.6, 2.2, -79.6, WARM, 2.5, 6);
  put("l70-c-wood-0", "firewood", -4.5, 0, -80.5, 20, 0, null, SOLID); put("l70-c-wood-1", "firewood", 9.6, 0, -72, 95, 0, null, SOLID);
  put("l70-c-sled-0", "sled", -3.6, 0, -62.5, 40, 0, null); put("l70-c-sled-1", "sled", 4.8, 0, -78, -70, 0, null);
  put("l70-c-pallet", "x_pallet", -5, 0, -75.5, 15, 0.7, null, SOLID); put("l70-c-crate-k", "x_crate", 7.6, 0, -65.2, 10, 0.62, null, SOLID);
  [[-10.5, -66, 1.3], [10.8, -68, 1.1], [-10, -78, 1.5], [9.5, -79, 0.9], [-5.6, -58.8, 0.8], [5.8, -59, 1.0], [2.2, -83, 0.7]].forEach(([x, z, s], i) =>
    put("l70-c-heap-" + i, "snowheap", x, 0, z, i * 53, 0, null, { scale: s }));
  // ---- Parliament Hotel
  put("l70-bp-hotel", "hotel", HT.x, 0, HT.z, 0, 0, null, { ...SOLID, tags: ["l70-civic"] });
  put("l70-c-lectern", "lectern", 34, 0.04, -77, 0, 1.9, "+x", SOLID);
  put("l70-c-chandelier", "chandelier", 31.5, 2.35, -80, 0, 1.45, null);
  put("l70-c-desk", "x_reception-desk-2", 29.5, 0.04, -84.4, 0, 1.1, null, SOLID);
  const CH = ["x_chair-6", "x_chair-3", "x_armchair", "x_chair-7", "x_chair-6", "x_armchair", "x_chair-3"];
  CH.forEach((k, i) => { const a = (200 + i * 23.5) * Math.PI / 180, x = 34 + Math.cos(a) * 2.8, z = -77 + Math.sin(a) * 2.8;
    put("l70-c-chair-" + i, k, x, 0.04, z, face(x, z, 34, -77) + (i % 2 ? 7 : -9), k === "x_armchair" ? 0.9 : 0.95, k === "x_chair-6" ? "+z" : null,
      { tags: ["seat", "usable"], state: { seat: { d: 0, w: 1, gap: 0.5 } }, physics: "static" }); });
  put("l70-c-candles-0", "x_candles", 35.1, 0.04, -76.6, 0, 0.35, null); put("l70-c-candles-1", "x_candles", 36.6, 0.04, -78.9, 40, 0.35, null); put("l70-c-candles-2", "x_candles", 27, 0.04, -75, 80, 0.35, null);
  lamp("l70-c-lobbylight", 31.5, 2.2, -80, "oklch(0.82 0.12 65)", 9, 16); lamp("l70-c-lecternlight", 34.4, 1.9, -77.6, WARM, 5, 9);
  lamp("l70-c-desklight", 29.5, 1.8, -83.2, WARM, 4, 8); lamp("l70-c-corrlight", 39.5, 2.2, -80, "oklch(0.7 0.12 55)", 2.5, 7); lamp("l70-c-doorlight", 24.3, 2.6, -80, WARM, 4, 9);
  put("l70-c-ice-hotel", "icicles", 24.25, 2.0, -80, 90, 0, null);
  // lobby dressing: a worn rug under the gathering, lanterns on the floor, a waiting bench, a trash bag by the desk, a lit barrel at the door
  put("l70-c-rug", "x_rug", 33.4, 0.01, -77.6, 12, 0, null, { layout: { box: { min: { x: -2, y: 0, z: -1.5 }, max: { x: 2, y: 0.03, z: 1.5 } } } });
  put("l70-c-lant-0", "x_lantern", 28.2, 0.04, -83.6, 20, 0.45, null); put("l70-c-lant-1", "x_lantern", 37.2, 0.04, -75.4, 70, 0.45, null); put("l70-c-lant-2", "x_lantern", 26.4, 0.04, -77.2, 0, 0.45, null);
  put("l70-c-lbench", "x_bench-2", 27.2, 0.04, -86.2, 0, 0.9, null, SOLID); put("l70-c-lbag", "x_trash-bag", 31.4, 0.04, -85.6, 33, 0.6, null);
  put("l70-c-doorbarrel", "x_firebarrel", 22.6, 0, -82.4, 0, 0.95, null, SOLID); put("l70-c-doorheap", "snowheap", 22.2, 0, -77.4, 140, 0, null, { scale: 0.8 });
  lamp("l70-c-lantlight-0", 28.2, 0.6, -83.6, WARM, 2.2, 6); lamp("l70-c-lantlight-1", 37.2, 0.6, -75.4, WARM, 2.2, 6); lamp("l70-c-lantlight-2", 26.4, 0.6, -77.2, WARM, 1.8, 5);
  lamp("l70-c-barrellight", 22.6, 1.3, -82.4, "oklch(0.78 0.16 50)", 4, 8); lamp("l70-c-lobbyfill", 36.5, 2.4, -82.5, "oklch(0.8 0.09 70)", 4, 12);
  // ---- Calor Office Block: garage + valve room
  put("l70-bp-office", "office", OF.x, 0, OF.z, 0, 0, null, { ...SOLID, tags: ["l70-civic"] });
  put("l70-c-car-0", "car", 30.5, 0.04, -28.3, 0, 1.45, "+x", SOLID); put("l70-c-car-1", "car", 35.7, 0.04, -15.7, 176, 1.45, "+x", SOLID);
  [0, 1, 2, 3].forEach((i) => put("l70-c-pipes-" + i, "piperun", 30.2 + i * 3.5, 2.0, -20.5, 90, 0.7, null));
  [[25, -26.5], [31, -17.5], [42.2, -26.5]].forEach(([x, z], i) => sp("l70-c-tube-" + i, { feetPosition: { x, y: 2.6, z }, light: TUBE }));
  sp("l70-c-tube-flicker", { feetPosition: { x: 37, y: 2.6, z: -17.5 }, light: TUBE });
  lamp("l70-c-valvelight", 47, 2.5, -22, "oklch(0.9 0.05 90)", 6, 9);
  VALVE_POS.forEach((p, i) => put("l70-valve-" + i, "valve", p.x, p.y, p.z, 0, 0.54, null, { tags: ["usable", "l70-valve"], state: { n: i, turn: 0 }, physics: "static" }));
  put("l70-gauge", "gauge", GAUGE.x, GAUGE.y, GAUGE.z, 180, 0, null, { tags: ["l70-gauge"], physics: "static" });
  put("l70-pump", "pump", PUMP.x, PUMP.y, PUMP.z, 0, 0.9, null, { tags: ["usable", "l70-pump"], state: { on: false }, physics: "static" });
  put("l70-breaker", "breaker", BREAKER.x, BREAKER.y, BREAKER.z, 0, 0, null, { tags: ["usable", "l70-breaker"], state: { on: false }, physics: "static" });
  put("l70-c-icefall", "icefall", 49.2, 0, -24.2, 0, 2.6, "+x");
  put("l70-c-ice-garage", "icicles", 21.75, 2.1, -20.5, 90, 0, null); put("l70-c-ice-garage2", "icicles", 21.75, 2.1, -23.6, 90, 0, null, { scale: 1.2 });
  // garage dressing: the tube fixtures themselves, stacked crates and pallets on the bays, a dead generator, bags, and a work lamp
  [[25, -26.5], [31, -17.5], [42.2, -26.5], [37, -17.5]].forEach(([x, z], i) => put("l70-c-tubefix-" + i, "x_tubelamp", x, 2.68, z, 90, 0, null));
  put("l70-c-gcrate-0", "x_crate", 26.4, 0.04, -15.6, 12, 0.8, null, SOLID); put("l70-c-gcrate-1", "x_crate-2", 27.3, 0.04, -15.4, -20, 0.7, null, SOLID); put("l70-c-gcrate-2", "x_crate", 26.8, 0.84, -15.5, 40, 0.6, null, SOLID);
  put("l70-c-gpallet", "x_pallet", 40.5, 0.04, -15.8, 8, 0, null); put("l70-c-gpcrate", "x_crate-2", 40.5, 0.2, -15.8, 25, 0.75, null, SOLID);
  put("l70-c-ggen", "x_generator", 44.2, 0.04, -28, 90, 0.9, null, SOLID); put("l70-c-gbag-0", "x_trash-bag", 45.4, 0.04, -27.4, 10, 0.55, null); put("l70-c-gbag-1", "x_trash-bag", 23.6, 0.04, -28.2, 70, 0.6, null);
  put("l70-c-glant", "x_lantern", 44.6, 0.95, -28, 0, 0.42, null); lamp("l70-c-glantlight", 44.6, 1.5, -28, WARM, 3, 8);
  lamp("l70-c-gfill-0", 28, 2.4, -22, "oklch(0.88 0.03 220)", 5, 14); lamp("l70-c-gfill-1", 38.5, 2.4, -22, "oklch(0.88 0.03 220)", 5, 14);
  // the Modeling Studio's register of what this layer made
  const w = ctx.world.state, m3d = w.m3d || (w.m3d = { items: [], pending: [], showing: {} }), have = new Set((m3d.items || []).map((i) => i.id)), add = [];
  for (const k of Object.keys(G)) if (!k.startsWith("x_") && !have.has("m-l70-" + k))
    add.push({ id: "m-l70-" + k, kind: "model", name: "Froidetown " + k, by: "savi", made: ctx.world.date, spec: { model: { id: G[k], forward: "-z" } }, how: { tool: "Tripo v3.1 / Blender art/level70/build.py", steps: "true-size fit, PBR" } });
  if (add.length) m3d.items = [...(m3d.items || []), ...add];
}
export function tick(ctx) {
  const t = ctx.place.objects["l70-c-tube-flicker"];
  if (t) t.light = { ...TUBE, intensity: ctx.random() < 0.45 ? 0.3 : 5 };
}
