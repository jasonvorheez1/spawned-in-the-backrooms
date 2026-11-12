import { H, RINK } from "./level31.js";
import { rbox } from "./rbox.js";

const RUBBER = { texture: "cdn/texture-black-ribbed-rubber-floor-mat-worn.png", wrap: "repeat", repeat: [0.6, 0.6], color: "#333839", roughness: 0.95 };

export function layDesign(ctx) {
  const sp = (id, spec) => ctx.spawn("l31-ld-" + id, { castShadow: false, ...spec });

  function sign(id, x, z, yaw, width, lines) {
    const viewW = width * 100;
    const viewH = 22 + lines.length * 23;
    const y = 2.7 + viewH / 200;
    const vector = `<svg viewBox='0 0 ${viewW} ${viewH}' width='${width}m'>
      <rect width='${viewW}' height='${viewH}' rx='3' fill='#233b3c'/>
      <rect x='4' y='4' width='${viewW - 8}' height='${viewH - 8}' rx='2' fill='none' stroke='#8b9a88'/>
      <g font-family='sans-serif' font-weight='bold' font-size='15' letter-spacing='1.1' text-anchor='middle' fill='#fff0cf'>
        ${lines.map((line, i) => `<text x='${viewW / 2}' y='${25 + i * 23}'>${line}</text>`).join("")}
      </g></svg>`;
    sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, vector,
      children: [-1, 1].map(side => ({
        feetPosition: { x: side * width * 0.35, y: viewH / 200 - 0.01, z: 0.02 },
        primitive: { kind: "cylinder", radiusTop: 0.014, radiusBottom: 0.014, height: H - 2.7 - viewH / 100 },
        material: { color: "#5d6562", metalness: 0.55, roughness: 0.5 },
      })),
    });
  }

  sign("directory", -26.4, 23, 180, 2.45, ["ROLLER RINK", "SKATE RENTAL  &#8594;", "LOCKERS  &#8592;"]);
  sign("junction", 24.7, -12, 90, 2.25, ["&#8593;  ARCADE", "&#8592;  PARTY ROOM", "&#8594;  SNACK BAR"]);
  sign("party", 33.4, -18.3, 180, 2.25, ["PARTY ROOM"]);
  sign("food", 25.65, 9.7, 90, 2.25, ["SNACK BAR"]);

  for (const side of [-1, 1]) sp("mat" + side, {
    feetPosition: { x: 0, y: 0.005, z: side * (RINK.rail + 0.84) },
    primitive: rbox(2.66, 0.022, 1.68, 0.008), material: RUBBER, receiveShadow: true,
  });
}
