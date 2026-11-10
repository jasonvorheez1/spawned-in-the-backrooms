// Level 11 modern canal kit. Legacy kind "arch" is a flat concrete bridge with clear span S;
// "parapet" is an open metal guard on a concrete kerb; "quay" is a poured wall with joints and drains.
import { bx, pipe } from "./lib/l5-hall-kit.js";
const TEX = "cdn/texture-smooth-cold-poured-concrete-wall.png", STONE = "cdn/texture-weathered-grey-granite-ashlar-blocks.png";
function boxer(ctx) {
  const q = (a, b, c, e) => { ctx.quad(...a, ...b, ...c, ...e); };
  return (x0, y0, z0, x1, y1, z1) => {
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
}
const P = (c) => ({ kind: c.params.kind ?? "arch", L: c.params.L ?? 24, t: c.params.t ?? 1.2, H: c.params.H ?? 4.2, S: c.params.S ?? 17, r: c.params.r ?? 2.9, side: c.params.side ?? 1 });
export function geometry(ctx) {
  const p = P(ctx), box = boxer(ctx);
  if(p.kind==="arch"){
    // The legacy arch slot now draws a modern flat-span concrete bridge (reference 4).
    const {L,t,S,r}=p,top=r,base=top-.65;
    ctx.albedo(TEX);ctx.color("oklch(0.83 0.015 85)");ctx.roughness(.82);
    bx(ctx,-t/2,t/2,base,top,-L/2,L/2,.035);
    for(const sign of [-1,1]){
      const a=sign<0?-L/2:S/2,b=sign<0?-S/2:L/2;
      bx(ctx,-t/2,t/2,0,base,a,b,.045);
      ctx.color("oklch(0.58 0.025 145)");box(-t/2-.005,0,a,t/2+.005,.3,b);
      ctx.color("oklch(0.83 0.015 85)");
    }
    return;
  }
  if(p.kind==="parapet"){
    const {L,t,H}=p,lod=ctx.lod??1;
    ctx.albedo(TEX);ctx.color("oklch(0.84 0.01 85)");ctx.roughness(.8);
    bx(ctx,-t/2,t/2,0,.14,-L/2,L/2,.025);
    ctx.albedo(null);ctx.color("oklch(0.55 0.015 235)");ctx.metalness(.65);ctx.roughness(.38);
    for(const y of [H-.035,H*.53])pipe(ctx,[0,y,-L/2],[0,y,L/2],.028,10);
    const count=Math.ceil(L/(lod>=3?2.4:1.2));
    for(let i=0;i<=count;i++){
      const z=-L/2+L*i/count;
      pipe(ctx,[0,.14,z],[0,H-.035,z],.022,8);
      if(lod<3)bx(ctx,-.065,.065,.14,.17,z-.065,z+.065,.008);
    }
    ctx.metalness(0);return;
  }
  // quay
  const { L, t, H, side } = p, f = (side * t) / 2;
  ctx.albedo(TEX);ctx.color("oklch(0.8 0.015 85)");ctx.roughness(.88);box(-L/2,0,-t/2,L/2,H,t/2);
  ctx.color("oklch(0.44 0.025 150)");box(-L/2,0,Math.min(f,f+side*.025),L/2,2.15,Math.max(f,f+side*.025));
  ctx.albedo(null);ctx.color("oklch(0.59 0.01 80)");
  for(let x=-L/2+6;x<L/2;x+=6)box(x-.012,2.15,Math.min(f,f+side*.009),x+.012,H,Math.max(f,f+side*.009));
  for(let x=-L/2+10;x<L/2-1;x+=18){
    ctx.color("oklch(0.25 0.015 90)");box(x-.18,2.35,Math.min(f,f+side*.018),x+.18,2.55,Math.max(f,f+side*.018));
    ctx.color("oklch(0.48 0.04 65)");box(x-.055,2.15,Math.min(f,f+side*.013),x+.055,2.35,Math.max(f,f+side*.013));
  }
}
export function collider(ctx) {
  const p = P(ctx);
  if (p.kind === "arch") {
    const pier=(p.L-p.S)/2,top=p.r,base=top-.65;
    return [
      {kind:"box",width:p.t,height:base,depth:pier,center:[0,base/2,-p.L/2+pier/2]},
      {kind:"box",width:p.t,height:base,depth:pier,center:[0,base/2,p.L/2-pier/2]},
      {kind:"box",width:p.t,height:.65,depth:p.L,center:[0,(base+top)/2,0]},
    ];
  }
  if (p.kind === "parapet") return [{ kind: "box", width: p.t, height: p.H, depth: p.L, center: [0, p.H / 2, 0] }];
  return { kind: "box", width: p.L, height: p.H, depth: p.t, center: [0, p.H / 2, 0] };
}
