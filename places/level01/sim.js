// Level 0.1 "Zenith Station": a fragment of a spherical research megastructure grown into Level 0. One kit (scripts/zenith-geo.js), one layout:
// vestibule (the way back to Level 0) → a spine hall running north, intact at the south end and failing toward the north → eight rooms off it →
// the gallery, a seven-metre window over the hollow inside the shell with its lit spindle. Rooms: control (the drive for Kade's job), lab, crew quarters,
// frozen wash room | mess and galley, hydroponics, gym, overheating maintenance. Doors slide (scripts/zenith-door.js), cleaning bots keep their routes.
export const cadence = "1s";
const G = "scripts/zenith-geo.js", LAYV = 1;
const geo = (params) => ({ kind: "scripted", script: G, params });
const ZONES = [ // [x0, x1, z0, z1, line] climate notices, said once per visit
  [-12.6, -2.6, -43, -35, "It's freezing in here. Frost on every surface."], [2.6, 12.6, -43, -35, "The air is scorching. Something in the walls is still running hot."], [-12, 12, -64, -48, "The window looks out into the hollow. It goes on for miles."]];
function lay(ctx) {
  let n = 0; const put = (id, x, z, yaw, params, extra = {}) => ctx.spawn(id, { feetPosition: { x, y: extra.y ?? 0, z }, rotation: { yaw }, physics: extra.physics ?? "static", primitive: geo(params), ...extra.more });
  const light = (id, x, y, z, color, intensity, distance, flick) => ctx.spawn(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance }, ...(flick ? { behavior: "scripts/zenith-flicker.js" } : {}) });
  const door = (id, x, z, yaw, mode, sign) => {
    put(id + "-frame", x, z, yaw, { kind: "doorframe", depth: 0.6, state: mode });
    const ax = yaw === 0 ? { x: 1, z: 0 } : { x: 0, z: 1 };
    const L = [-1, 1].map((sd, i) => put(`${id}-leaf${i}`, x + ax.x * sd * 0.38, z + ax.z * sd * 0.38, yaw, { kind: "doorleaf" }, { physics: "kinematic" }));
    ctx.spawn(id, { feetPosition: { x, y: 0, z }, behavior: "scripts/zenith-door.js", state: { leaves: L, base: { x, y: 0, z }, ax, mode } });
    if (sign) { const side = Math.sign(x) || 1, sx = x - side * 0.36; ctx.spawn(id + "-sign", { feetPosition: { x: sx, y: 2.62, z }, rotation: { yaw: side < 0 ? -90 : 90 }, primitive: { kind: "box", width: 1.2, height: 0.2, depth: 0.02 }, material: { color: "#15181b" }, ui: `<div face="front" width="1.2m" emissive style="color:#bfe6ee;font:700 64px Arial;text-align:center;letter-spacing:6px">${sign}</div>` }); }
  };
  // vestibule and the way home
  put("z-vest", 0, 4, 0, { kind: "room", w: 6, d: 6, doors: [{ side: "n", at: 0 }, { side: "s", at: 0 }], seed: 1 });
  door("z-d-vest", 0, 1, 0, "auto"); door("z-d-home", 0, 7, 0, "auto"); // the way home always opens (Shelly, Nov 9: "i cant leave level 0.1")
  ctx.spawn("l01-back", { feetPosition: { x: 0, y: 0, z: 7.35 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 2.2, depth: 0.3 }, visible: false, behavior: "scripts/zenith-hatch.js", state: { to: "main" } });
  ctx.spawn("l01-from-main", { feetPosition: { x: 0, y: 0.1, z: 5.6 }, rotation: { yaw: 0 } });
  ctx.spawn("z-vest-sign", { feetPosition: { x: 0, y: 2.55, z: 1.32 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 3, height: 0.5, depth: 0.03 }, material: { color: "#e9eae6" }, ui: `<div face="front" width="3m" style="color:#2a4a52;font:800 64px Arial;text-align:center;line-height:1.25">ZENITH STATION<br><span style="font-size:40px;letter-spacing:5px">HABITATION RING · SECTOR 7-C</span></div>` });
  // the spine: intact south half, failing north half
  put("z-hallA", 0, 1, 0, { kind: "hall", len: 25, doorsL: [-8, -18], doorsR: [-8, -18], seed: 2 });
  put("z-hallB", 0, -24, 0, { kind: "hall", len: 24, doorsL: [-5, -15, -22], doorsR: [-5, -15], dmg: 2, lit: 0.55, seed: 3 });
  const R = [ // id, x, z, params, door mode, sign
    ["z-ctrl", -7.6, -7, { style: "white" }, "auto", "CONTROL"], ["z-lab", -7.6, -17, { dmg: 1 }, "auto", "LAB 2"], ["z-crew", -7.6, -29, { dmg: 1, lit: 0.75 }, "auto", "CREW B"], ["z-wash", -7.6, -39, { style: "frozen", dmg: 2, lit: 0.6 }, "auto", "WASH"],
    ["z-mess", 7.6, -7, {}, "auto", "GALLEY"], ["z-hydro", 7.6, -17, { style: "green", dmg: 1 }, "auto", "HYDRO"], ["z-gym", 7.6, -29, { style: "gym", dmg: 1 }, "auto", "FITNESS"], ["z-maint", 7.6, -39, { style: "hot", dmg: 3, lit: 0.35 }, "stuck", "MAINT"]];
  R.forEach(([id, x, z, p, mode, sign], i) => {
    put(id, x, z, 0, { kind: "room", w: 10, d: 8, doors: [{ side: x < 0 ? "e" : "w", at: 0 }], seed: 10 + i, ...p });
    door(id + "-door", x < 0 ? -2.3 : 2.3, z, 90, mode, sign);
    const hot = p.style === "hot", cold = p.style === "frozen", green = p.style === "green";
    light(id + "-light", x, 3.0, z, hot ? "#ff7a3a" : cold ? "#bfe0ff" : green ? "#e9a8ff" : "#f4f1e6", (p.lit ?? 1) * (hot ? 4 : 5), 13, (p.dmg ?? 0) >= 2);
  });
  ctx.spawn("z-door-sealed", { feetPosition: { x: -2.3, y: 0, z: -46 } }); door("z-d-seal", -2.3, -46, 90, "sealed", "SECTOR 8");
  // hall lights
  for (let z = -2; z > -24; z -= 6) light("z-hl" + z, 0, 2.9, z, "#f2f2ec", 3.2, 10);
  for (let z = -27; z > -48; z -= 6) light("z-hl" + z, 0, 2.9, z, "#e8e2cc", 1.8, 9, true);
  // the gallery over the hollow
  put("z-gallery", 0, -56, 0, { kind: "room", w: 24, d: 16, h: 7, open: ["n"], doors: [{ side: "s", at: 0 }], dmg: 1, seed: 30 });
  door("z-d-gal", 0, -48, 0, "auto");
  put("z-window", 0, -64, 0, { kind: "window", w: 24, h: 7, broken: [4, 13, 14, 22] });
  light("z-gal-light", 0, 5.5, -54, "#cfe2ff", 4, 22);
  ctx.spawn("z-shell", { feetPosition: { x: 0, y: -262, z: -340 }, primitive: { kind: "sphere", radius: 262, widthSegments: 64, heightSegments: 32 }, material: { color: "#3a3d40", metalness: 0.6, roughness: 0.7, side: "double" } });
  ctx.spawn("z-core", { feetPosition: { x: 0, y: -220, z: -340 }, primitive: { kind: "cylinder", radiusTop: 14, radiusBottom: 14, height: 440, radialSegments: 48 }, material: { color: "#cfd4d8", emissive: "#ffe2b0", emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.5 } });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.spawn("z-rib" + i, { feetPosition: { x: Math.cos(a) * 130, y: -60 + (i % 3) * 50, z: -340 + Math.sin(a) * 130 }, rotation: { yaw: -a * 57.3 }, primitive: { kind: "box", width: 6, height: 4, depth: 240 }, material: { color: "#55595d", metalness: 0.7, roughness: 0.6 } }); }
  ctx.spawn("z-core-glow", { feetPosition: { x: 0, y: 40, z: -320 }, light: { kind: "point", color: "#ffe2b0", intensity: 900, distance: 420 } });
  // furniture: [kind, roomX, roomZ, rx, rz, yaw, params]
  const F = [
    ["desk", -7.6, -7, -2.8, -3.4, 0, { on: 1 }], ["desk", -7.6, -7, 0, -3.4, 0, { on: 1, mug: 1 }], ["desk", -7.6, -7, 2.8, -3.4, 0, { on: 0.6 }],
    ["chair", -7.6, -7, -2.8, -2.6, 0, {}], ["chair", -7.6, -7, 0.3, -2.5, 20, {}], ["chair", -7.6, -7, 2.6, -2.4, 0, { tipped: 1 }],
    ["desk", -7.6, -7, 0, 1.1, 0, { on: 1 }], ["desk", -7.6, -7, 0, 0.3, 180, { on: 1 }], ["chair", -7.6, -7, 0, 1.9, 0, {}], ["chair", -7.6, -7, 0.2, -0.5, 190, {}],
    ["rack", -7.6, -7, -4.5, 1.5, 90, { seed: 1 }], ["rack", -7.6, -7, -4.5, 2.7, 90, { seed: 2 }], ["locker", -7.6, -7, -1.5, 3.95, 180, { n: 3 }],
    ["labbench", -7.6, -17, -0.5, -3.5, 0, {}], ["labbench", -7.6, -17, -0.5, 0.6, 0, { spill: 1 }], ["desk", -7.6, -17, -1, 3.5, 180, { cracked: 1, on: 0.5 }], ["chair", -7.6, -17, 1.6, 2.2, 70, { tipped: 1 }], ["crate", -7.6, -17, -4.1, 2.8, 90, {}],
    ["pod", -7.6, -29, -2.5, -3.4, 0, { seed: 1 }], ["pod", -7.6, -29, 0, -3.4, 0, { seed: 2 }], ["pod", -7.6, -29, 2.5, -3.4, 0, { seed: 4 }], ["locker", -7.6, -29, -4.5, 1.2, 90, { n: 4, ajar: 1 }], ["table", -7.6, -29, 1, 1.6, 0, { meal: 1 }],
    ["stall", -7.6, -39, -3.4, -3.45, 0, {}], ["stall", -7.6, -39, -2.2, -3.45, 0, { broken: 1 }], ["stall", -7.6, -39, -1.0, -3.45, 0, {}], ["counter", -7.6, -39, 0.5, 3.62, 180, { w: 3, on: 0 }],
    ["counter", 7.6, -7, 1, -3.62, 0, { w: 5 }], ["table", 7.6, -7, 0, 0.6, 0, { meal: 1 }], ["table", 7.6, -7, 2.8, 2.4, 90, {}],
    ["growbed", 7.6, -17, 1, -2.7, 0, { dead: 0.1 }], ["growbed", 7.6, -17, 1, 0, 0, { over: 1, dead: 0.2 }], ["growbed", 7.6, -17, 1, 2.7, 0, { dead: 0.85, lampOff: 1 }],
    ["treadmill", 7.6, -29, 0.8, -2.6, 0, { on: 1 }], ["treadmill", 7.6, -29, 2.1, -2.6, 0, {}], ["treadmill", 7.6, -29, 3.4, -2.6, 0, {}], ["locker", 7.6, -29, 1.5, 3.95, 180, { n: 3 }], ["crate", 7.6, -29, 3.6, 1.2, 0, { w: 1.4, h: 0.45, d: 0.5, skin: "rubber" }],
    ["pipes", 7.6, -39, 4.6, -3.2, -90, {}], ["pipes", 7.6, -39, 4.6, 0.2, -90, {}], ["rack", 7.6, -39, 4.5, 2.6, -90, { on: 0 }], ["crate", 7.6, -39, 0.6, -2.8, 15, {}], ["crate", 7.6, -39, 1.9, -3.1, -8, { skin: "steel" }], ["crate", 7.6, -39, 1.2, -2.9, 30, { w: 0.8, h: 0.6, d: 0.6 }, 0.8],
    ["desk", 0, -56, -6, -6.3, 0, { on: 0.7 }], ["desk", 0, -56, 6, -6.3, 0, { on: 0, cracked: 1 }], ["chair", 0, -56, -6, -5.4, 0, {}], ["crate", 0, -56, -1.5, -6.6, 22, { w: 0.9, h: 0.5, d: 0.6, skin: "steel" }], ["crate", 0, -56, 1.2, -6.4, -35, { w: 0.7, h: 0.4, d: 0.5 }],
  ];
  F.forEach(([kind, cx, cz, rx, rz, yaw, p, y], i) => { put(`z-f${i}`, cx + rx, cz + rz, yaw, { kind, seed: i, ...p }, { y: y ?? 0, physics: kind === "debris" ? "none" : "static" }); n++; });
  // the drive Kade wants: a bay on the control room's island desk
  driveBay(ctx);
  // cleaning bots on shift
  const bot = (id, x, z, route) => ctx.spawn(id, { tags: ["zbot"], feetPosition: { x, y: 0, z }, physics: "kinematic", primitive: geo({ kind: "bot" }), audio: { clip: "cdn/sfx-small-robot-vacuum-motor-whir-and-brush-hum-loop.mp3", loop: true, gain: 0.18, maxDistance: 9 }, state: { route } });
  bot("z-bot1", 0.7, -3, [[0.7, -3], [0.7, -22], [-0.7, -22], [-0.7, -3]]);
  bot("z-bot2", 4.5, -18.4, [[4.5, -18.4], [11.6, -18.4], [11.6, -15.6], [4.5, -15.6]]);
  bot("z-bot3", -6, -52, [[-6, -52], [6, -52], [6, -58], [-6, -58]]);
  ctx.spawn("z-bots", { behavior: "scripts/zenith-bots.js" });
  // sound beds and life
  ctx.spawn("z-hum", { audio: { clip: "cdn/sfx-distant-deep-space-station-machinery-and-ventilation-drone-loop.mp3", loop: true, gain: 0.14, spatial: false, bus: "Ambience" } });
  ctx.spawn("z-heat", { feetPosition: { x: 10, y: 1, z: -39 }, audio: { clip: "cdn/sfx-overheating-vent-roaring-hiss-and-metal-ticking-loop.mp3", loop: true, gain: 0.3, maxDistance: 12 },
    fx: { script: `fx\npop steam rate=flick(.4,.5)*14 on=box(4,.1,3) life=1.5..2.5 v=up(.5..1)+sdir()*.2 size=.3..0.6 acc=buoy(.4)+curl(.4)+drag(1) col=<.8,.75,.7> a=0>.2:.18>0 sz=$size*(1>2.4) r=sprite(smoke-puff,alpha)\npop spark rate=flick(.25,1)*6 on=box(.2,.6,3).c(1.4) life=.2..0.4 v=sdir()*(2..4) size=.015..0.03 acc=grav()*.7 col=hdr(5,2.6,.8) a=1>0 sz=$size floor=bounce(.3) r=sprite(ember,add,velocity,.02)` } });
  ctx.spawn("z-cold", { feetPosition: { x: -7.6, y: 0, z: -39 }, audio: { clip: "cdn/sfx-icy-wind-whistling-through-cracked-air-vent-loop.mp3", loop: true, gain: 0.25, maxDistance: 11 },
    fx: { script: `fx\npop frost n=?low:60|140 on=box(4.5,1.6,3.5).c(1.6) life=4..7 v=sdir()*.08+<0,-.12,0> size=.012..0.025 acc=curl(.3)*.3 col=<.9,.95,1> a=0>.7:.7>0 sz=$size floor=die r=sprite(snowflake,alpha)` } });
  ctx.spawn("z-hallsparks", { feetPosition: { x: -1.9, y: 2.2, z: -33 }, fx: { script: `fx\npop spark rate=flick(.2,1)*9 on=point() life=.2..0.5 v=sdir()*(1.5..3.5)+<.8,0,0> size=.012..0.025 acc=grav()*.8 col=hdr(5,3,1) a=1>0 sz=$size floor=bounce(.3) r=sprite(ember,add,velocity,.02)\npop glow n=1 at=point() g=flick(.2,1) r=light(<.6,.75,1>,$g*4,4)` } });
  return n;
}
// security drones (scripts/zenith-drones.js): watchers in the halls, an enforcer at the lab and the gym, a warden over the failing north end and the gallery
const DRONE = { id: "/cdn/value.bf200211dd9298d9c54c509cd3e666e3a503169f5f4448b112578d516c67eaab.glb", forward: "+z" }, DRONEV = 1;
const POSTS = [["watcher", 0, -14], ["watcher", 0, -30], ["enforcer", -7.6, -17], ["watcher", 7.6, -17], ["enforcer", 7.6, -29], ["watcher", 0, -44], ["warden", 0, -56], ["watcher", -5, -58]]; // Savi's picks: the vestibule and control room stay quiet
function drones(ctx) {
  for (const r of ctx.query({ tags: ["zdrone"], radius: 1e4, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(r.id);
  POSTS.forEach(([type, x, z], i) => {
    const sz = { watcher: 0.55, enforcer: 0.75, warden: 1.05 }[type], hp = { watcher: 55, enforcer: 110, warden: 220 }[type];
    ctx.spawn(`z-drone${i}`, { tags: ["zdrone"], feetPosition: { x, y: 1.8, z }, model: DRONE, layout: { box: { min: { x: -sz / 2, y: -sz * 0.35, z: -sz / 2 }, max: { x: sz / 2, y: sz * 0.35, z: sz / 2 } } }, physics: { body: "kinematic", collider: "sphere" },
      audio: { clip: "cdn/sfx-hovering-security-drone-rotor-hum-and-servo-whir-loop.mp3", loop: true, gain: 0.22, maxDistance: 14 },
      state: { type, hp, maxHp: hp, home: { x, z }, mode: "idle", name: type[0].toUpperCase() + type.slice(1) + " drone" } });
  });
  if (!ctx.place.objects["z-dronebrain"]) ctx.spawn("z-dronebrain", { behavior: "scripts/zenith-drones.js" });
}
// breakable station (Shelly, Nov 9: "id like to break stuff, and have to break doors open"): furniture takes hits and wrecks into parts;
// three doors whose motors died stay shut until you break a leaf out. Kinds → material and toughness are Savi's picks.
const BREAKV = 1;
const FMAT = { desk: ["machine", 140, "Workstation"], chair: ["metal", 60, "Chair"], rack: ["machine", 160, "Server rack"], locker: ["metal", 150, "Locker"], labbench: ["metal", 140, "Lab bench"], crate: ["metal", 90, "Crate"], table: ["metal", 80, "Table"], pod: ["metal", 180, "Sleep pod"], counter: ["metal", 140, "Counter"], treadmill: ["machine", 120, "Treadmill"], stall: ["metal", 70, "Stall"], growbed: ["metal", 90, "Grow bed"], pipes: ["pipe", 140, "Pipes"] };
const JAMMED = ["z-lab-door", "z-wash-door", "z-gym-door"];
function breakable(ctx) {
  for (let i = 0; i < 200; i++) {
    const o = ctx.getObject(`z-f${i}`); if (!o) continue;
    const m = FMAT[o.primitive?.params?.kind]; if (!m) continue;
    o.tags = [...new Set([...(o.tags ?? []), "breakable"])];
    o.state = { ...(o.state ?? {}), mat: m[0], hp: m[1], maxHp: m[1], name: m[2] };
  }
  for (const id of JAMMED) {
    const d = ctx.getObject(id); if (!d?.state?.leaves) continue;
    d.state.mode = "jammed";
    d.state.leaves.forEach((lid, i) => {
      const leaf = ctx.getObject(lid); if (!leaf) return;
      const b = d.state.base, ax = d.state.ax, off = (i === 0 ? -1 : 1) * 0.38;
      leaf.feetPosition = { x: b.x + ax.x * off, y: 0, z: b.z + ax.z * off };
      leaf.tags = [...new Set([...(leaf.tags ?? []), "breakable"])];
      leaf.state = { ...(leaf.state ?? {}), mat: "metal", hp: 220, maxHp: 220, name: "Jammed door", door: id };
    });
  }
}
// the drive Kade wants: a bay on the control room's island desk, its front toward the room (+Z)
const DRIVEV = 3;
function driveBay(ctx) {
  if (ctx.place.objects["z-drive"]) ctx.destroy("z-drive");
  const gun = { color: "#2b3036", metalness: 0.75, roughness: 0.38 };
  ctx.spawn("z-drive", { tags: ["usable"], feetPosition: { x: -6.75, y: 0.76, z: -5.9 }, physics: "none",
    model: { id: "/cdn/value.4dc164d69828f09737d500759de3083228feda52c407d9a0bf64b053318fa38d.glb", forward: "+z" }, behavior: "scripts/zenith-use.js",
    state: { kind: "drive", name: "Flight-recorder bay", verb: "Pull the flight-recorder drive", info: "ZENITH FDR-4. Its amber light still blinks." },
    children: [
      { id: "led", feetPosition: { x: 0.125, y: 0.087, z: 0.134 }, primitive: { kind: "sphere", radius: 0.0075 }, material: { color: "#111", emissive: "#ffa020", emissiveIntensity: 2.5 } },
      { id: "cart", feetPosition: { x: 0, y: 0.03, z: 0.015 }, model: { id: "/cdn/value.bcfbeb0642d6af0c9850b019699a63b1facc62aef21e6ef53f6b53de844a64cc.glb", forward: "+z" } },
      { id: "hinge", feetPosition: { x: 0, y: 0.098, z: 0.137 },
        children: [{ id: "cover", feetPosition: { x: 0, y: -0.088, z: 0.004 }, model: { id: "/cdn/value.67720653fdef55ccd8b522798c069cd2927fefcb259788e5e93734d76dcbd27d.glb", forward: "+z" } }] },
    ] });
}
// modeled furniture (art/zfurn/build.py) over the kit's code-shape desks and chairs; ids, breakable state and colliders kept
const FURNV = 2;
const FURN = {
  desk: { id: "/cdn/value.e3215f58bcdde6d876cea7966507245a59de5ecef0103689e913a695d05207f6.glb", forward: "+z" },
  chair: { id: "/cdn/value.ae5e296c6ba88216876102ddfc99d58c663b522c6cc4fe32321f3718ab60cee1.glb", forward: "+z" },
};
function furnish(ctx) {
  for (let i = 0; i < 200; i++) {
    const o = ctx.getObject(`z-f${i}`); if (!o) continue;
    const p = o.primitive?.params ?? o.state?.zp; const kind = p?.kind ?? o.state?.zkind; if (!FURN[kind]) continue;
    const m = { ...FURN[kind] };
    if (kind === "desk") { const on = p.on ?? 1; m.materials = { screen: on > 0 ? { color: "#0d1f24", emissive: p.cracked ? "#9fc6c9" : "#8fe6ff", emissiveIntensity: 0.75 * on } : { color: "#08090a", emissiveIntensity: 0, roughness: 0.15, metalness: 0.3 } }; }
    o.state = { ...(o.state ?? {}), zkind: kind, zp: p };
    o.primitive = null; o.model = m;
    o.physics = { body: "static", collider: "box" };
    if (kind === "chair" && p.tipped) { const r = o.rotation; o.rotation = { yaw: (p.yaw ?? 0), pitch: -82 }; o.feetPosition = { ...o.feetPosition, y: 0.33 }; }
  }
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.furnV !== FURNV && s.layV === LAYV && ctx.place.players?.length) { s.furnV = FURNV; furnish(ctx); }
  if (s.breakV !== BREAKV && s.layV === LAYV && ctx.place.players?.length) { s.breakV = BREAKV; breakable(ctx); }
  if (s.layV !== LAYV && ctx.place.players?.length) { s.layV = LAYV; lay(ctx); }
  if (s.droneV !== DRONEV && ctx.place.players?.length) { s.droneV = DRONEV; drones(ctx); }
  if (s.driveV !== DRIVEV && s.layV === LAYV && ctx.place.players?.length) { s.driveV = DRIVEV; driveBay(ctx); }
  const now = ctx.now();
  for (const p of ctx.place.players ?? []) {
    const ps = p.state; if (!ps) continue;
    if (ps.zenQ === 1) { ps.zenQ = 2; ps.quest = { name: "The Zenith Survey", step: "Find the flight-recorder drive in Zenith Station's control room", at: Date.now() }; }
    const f = p.feetPosition, seen = (ps.zenZones ??= "");
    ZONES.forEach(([x0, x1, z0, z1, line], i) => { if (f.x > x0 && f.x < x1 && f.z > z0 && f.z < z1 && !seen.includes(i)) { ps.zenZones = seen + i; ps.notice = { text: line, at: now }; } });
  }
}
