// A working Back OS terminal as a placed object. Press E on it and Back OS(tm) boots on your screen: scripts/computer.js starts it, scripts/os.js runs it and scripts/os-ui.js draws it
// (the yellow Windows 95 desktop: Backmail, the Database, Backdoor forum, files, a terminal, About). What a machine holds is chosen by its host's prefix (scripts/lib/data/os.yml: profiles).
//
//   terminalSpec({ host: "ALEF-COMMS-01", lock: "science:25", name: "Base Alef comms desk", at: { x, y, z }, yaw: 180 })
//
// host   a unique name that starts with a profile's prefix (OMEGA, GAMMA, ALEF, or none for an office). To give a new place its own mail, files and database entries add a profile.
// lock   '' (open to everyone) | 'science:N' (hack it with Science N) | 'pw:...'. The profile's password (data/os.yml: passwords) always works with `login <password>`.
// at     where the model stands: put its feet on the desk. yaw faces its screen (180 = the screen looks toward -z).
// note   an optional sticky note stuck to the bezel (the password hint, usually).
const CRT = "/cdn/value.71839574c3fa28f87d2f8f2d4194ab5b83fd0287045e868e37fe28d4c1811c11.glb"; // art/props/build.py: a beige CRT monitor with a keyboard, 0.46 x 0.6 x 0.81 m
const SCREEN = { y: 0.28, z: -0.104, w: 0.33, h: 0.26 }; // where the glass is, in the model's own frame (front is -z), measured in Blender

export const idleScreen = (host, tint = "#f2c200") => `<div face="front" width="${SCREEN.w}m" style="width:100%;height:100%;box-sizing:border-box;background:radial-gradient(ellipse at center,#1a1500 0%,#050400 100%);color:${tint};font-family:'Courier New',monospace;text-align:center;padding:14px 10px;line-height:1.25;overflow:hidden">
<div style="font-size:30px;letter-spacing:4px;font-weight:700;text-shadow:0 0 8px ${tint}">BACK OS(tm)</div>
<div style="font-size:15px;opacity:.85">Backdoor client · BACKDRIVE mounted</div>
<div style="font-size:20px;margin-top:10px;letter-spacing:2px">${host}</div>
<div style="font-size:14px;margin-top:12px;opacity:.7">login: <span>_</span></div>
<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);pointer-events:none"></div></div>`;

export function terminalSpec({ host, lock = "", name = "Computer", verb = "Log in", info, at, yaw = 0, tint = "#f2c200", note }) {
  return {
    feetPosition: { x: at.x, y: at.y, z: at.z }, rotation: { yaw }, tags: ["usable", "computer"], behavior: "scripts/computer.js", physics: { body: "static", collider: "box" },
    model: { id: CRT, materials: { glass: { color: "#0a0800", roughness: 0.12, metalness: 0.1 } } },
    layout: { box: { min: { x: -0.23, y: 0, z: -0.405 }, max: { x: 0.23, y: 0.6, z: 0.405 } } },
    state: { kind: "computer", host, lock, name, verb, info: info ?? (lock ? `Locked · ${lock.startsWith("science:") ? "Science " + lock.slice(8) : "a password"} or find the password` : "A working computer"), tint },
    children: [
      { feetPosition: { x: 0, y: SCREEN.y, z: SCREEN.z - 0.006 }, primitive: { kind: "box", width: SCREEN.w, height: SCREEN.h, depth: 0.004 }, material: { color: "#050400", emissive: "#241c00", emissiveIntensity: 0.9 }, ui: idleScreen(host, tint) },
      { feetPosition: { x: 0, y: 0.45, z: SCREEN.z - 0.35 }, light: { kind: "point", color: "oklch(0.8 0.15 85)", intensity: 1.1, distance: 4.2 } }, // the screen lights the desk
      ...(note ? [{ feetPosition: { x: -0.17, y: 0.46, z: SCREEN.z - 0.012 }, rotation: { roll: 6 }, primitive: { kind: "box", width: 0.07, height: 0.07, depth: 0.003 }, material: { color: "#f0e36a", roughness: 0.9 },
        ui: `<div face="front" width="0.07m" style="width:100%;height:100%;box-sizing:border-box;background:#f0e36a;color:#2a2410;font:700 11px/1.1 'Courier New',monospace;padding:3px">${note}</div>` }] : []),
    ],
  };
}
