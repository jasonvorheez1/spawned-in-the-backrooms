# superstructure: cabin block with rounded face, sun-deck slab, bridge with wings, raked funnel, mast, lifeboats on davits,
# two trashed cabins open to the deck, windows (some smashed), doors, lamps, rails on both decks, stair handrails
import math
from lib import *
from hull import half
DOORS = [-11.6, -2.6, 6.4, 15.4]; OPEN = [-11.6, -2.6]; ROOMS = [(-13.2, -10.0), (-4.2, -1.0)]
LAMPZ = [-15, -9, -3, 3, 9, 15, 21]
def outline(off, xh=7.0, zf=-18.0, za=22.0, rf=3.0, ra=1.0, extra=()):
    """starboard half, fore centre -> aft centre, points with outward normals; then mirrored port"""
    P = []
    def add(x, z, nx, nz): P.append((x, z, nx, nz))
    add(0, zf - off, 0, -1); add(xh - rf, zf - off, 0, -1)
    for k in range(1, 9):
        a = -math.pi / 2 + math.pi / 2 * k / 8; add(xh - rf + math.cos(a) * (rf + off), zf + rf + math.sin(a) * (rf + off), math.cos(a), math.sin(a))
    zs = sorted(set([zf + rf, za - ra] + [z for z in extra if zf + rf < z < za - ra]))
    for z in zs[1:]: add(xh + off, z, 1, 0)
    for k in range(1, 7):
        a = math.pi / 2 * k / 6; add(xh - ra + math.cos(a) * (ra + off), za - ra + math.sin(a) * (ra + off), math.cos(a), math.sin(a))
    add(0, za + off, 0, 1)
    port = [(-x, z, -nx, nz) for (x, z, nx, nz) in reversed(P[1:-1])]
    return P + port + [P[0]]
def walls(M, plan, ys, mats, uvscale=(16, 4), skip=None, inner=False):
    rings = [[(x, y, z) for (x, z, nx, nz) in plan] for y in ys]
    us = [0.0]
    for i in range(1, len(plan)): us.append(us[-1] + math.hypot(plan[i][0] - plan[i - 1][0], plan[i][1] - plan[i - 1][1]))
    ids = [[M.v(p) for p in r] for r in rings]
    for j in range(len(ys) - 1):
        for i in range(len(plan) - 1):
            if skip and skip(plan[i], plan[i + 1], ys[j], ys[j + 1]): continue
            q = [ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]]
            if inner: q = q[::-1]
            ax, az = plan[i + 1][0] - plan[i][0], plan[i + 1][1] - plan[i][1]
            nx, nz = plan[i][2], plan[i][3]
            sg = -1.0 if (ax * nz - az * nx) < 0 else 1.0
            if inner: sg = -sg
            u0, u1 = sg * us[i], sg * us[i + 1]
            uv = [(u0 / uvscale[0], ys[j] / uvscale[1]), (u1 / uvscale[0], ys[j] / uvscale[1]), (u1 / uvscale[0], ys[j + 1] / uvscale[1]), (u0 / uvscale[0], ys[j + 1] / uvscale[1])]
            uv_old = [(us[i] / uvscale[0], ys[j] / uvscale[1]), (us[i + 1] / uvscale[0], ys[j] / uvscale[1]), (us[i + 1] / uvscale[0], ys[j + 1] / uvscale[1]), (us[i] / uvscale[0], ys[j + 1] / uvscale[1])]
            M.f(q, mats[j] if isinstance(mats, list) else mats, uv)
    return ids
def cap(M, plan, y, m, up=True, uvs=4.0):
    pts = plan[:-1]; idx = [M.v((x, y, z)) for (x, z, _, _) in pts]
    M.f(idx if up else idx[::-1], m, [(x / uvs, -z / uvs) for (x, z, _, _) in pts])
def plane_n(name, c, w, h, m, n, uv=None):
    nx, nz = n; rx, rz = nz, -nx; x, y, z = c; s = Mesh()
    P = [(x - rx * w / 2, y - h / 2, z - rz * w / 2), (x + rx * w / 2, y - h / 2, z + rz * w / 2), (x + rx * w / 2, y + h / 2, z + rz * w / 2), (x - rx * w / 2, y + h / 2, z - rz * w / 2)]
    s.f([s.v(p) for p in P], m, uv or [(0, 0), (1, 0), (1, 1), (0, 1)]); return s.build(name, smooth=False, weld=False)
def plane_h(name, c, w, d, m, yaw=0):
    o = plane_n(name, (0, 0, 0), w, d, m, (0, 1)); o.rotation_euler = (math.radians(90), 0, math.radians(yaw)); o.location = W(c)
    import bpy; o.rotation_euler = (math.radians(-90) * -1, 0, math.radians(yaw)); return o
def build_super():
    steel = mat("cabin_steel", tex="cabin_steel.jpg", rough=0.5)
    white = mat("white_paint", (0.82, 0.82, 0.78), rough=0.5)
    teak = MATS.get("teak") or mat("teak", tex="teak.jpg", rough=0.8)
    glass = mat("glass_dark", (0.015, 0.02, 0.025), rough=0.08, metal=0.6)
    smash = mat("glass_smashed", tex="glass_smashed.png", rough=0.1, metal=0.4, alpha=True)
    frame = mat("frame_grey", (0.18, 0.18, 0.17), rough=0.5, metal=0.4)
    voidm = mat("interior_dark", (0.01, 0.008, 0.006), rough=1.0)
    parts = []
    ext = []
    for d in OPEN: ext += [d - 0.5, d + 0.5]
    ext += [r[0] for r in ROOMS] + [r[1] for r in ROOMS]
    plan = outline(0.0, extra=ext); inn = outline(-0.15, extra=ext)
    def opening(a, b, y0, y1):
        if y0 >= 2.09: return False
        if abs(a[0]) < 6.9 or abs(b[0]) < 6.9: return False
        lo, hi = sorted((a[1], b[1]))
        return any(abs(lo - (d - 0.5)) < 0.01 and abs(hi - (d + 0.5)) < 0.01 for d in OPEN)
    M = Mesh()
    walls(M, plan, [0.0, 2.1, 3.16], steel, skip=opening)
    def inner_skip(a, b, y0, y1):
        if opening(a, b, y0, y1): return True
        return False
    walls(M, inn, [0.0, 2.1, 3.16], white, skip=inner_skip, inner=True)
    # door jambs and lintel soffits for the openings
    for s in (1, -1):
        for d in OPEN:
            for z in (d - 0.5, d + 0.5):
                M.f([M.v((s * 7.0, 0, z)), M.v((s * 6.85, 0, z)), M.v((s * 6.85, 2.1, z)), M.v((s * 7.0, 2.1, z))], white)
            M.f([M.v((s * 7.0, 2.1, d - 0.5)), M.v((s * 6.85, 2.1, d - 0.5)), M.v((s * 6.85, 2.1, d + 0.5)), M.v((s * 7.0, 2.1, d + 0.5))], white)
    parts.append(M.build("cabin_walls", angle=0.5))
    # sun-deck slab: teak top at 3.4, white edge and soffit, plinth rail band
    S = Mesh(); sp = outline(0.3, xh=7.0, zf=-18.0, za=21.7, rf=3.0, ra=0.01)
    walls(S, sp, [3.12, 3.4], white); cap(S, sp, 3.4, teak); cap(S, sp, 3.12, white, up=False)
    parts.append(S.build("sundeck_slab", angle=0.5))
    # windows: frame, glass (some smashed) along both sides, avoiding doors
    k = 0
    for s in (1, -1):
        z = -14.4
        while z < 20.6:
            if all(abs(z - d) > 1.15 for d in DOORS):
                parts.append(plane_n(f"wf{s}{k}", (s * 7.012, 1.75, z), 1.22, 1.0, frame, (s, 0)))
                sm = (k * 7 + (3 if s > 0 else 5)) % 9 == 0
                if sm: parts.append(plane_n(f"wb{s}{k}", (s * 7.016, 1.75, z), 1.08, 0.86, voidm, (s, 0)))
                parts.append(plane_n(f"wg{s}{k}", (s * 7.024, 1.75, z), 1.08, 0.86, smash if sm else glass, (s, 0)))
                k += 1
            z += 1.6
        for a in (-70, -45, -20):
            r = math.radians(a); n = (s * math.cos(r), math.sin(r)); c = (s * (4 + 3.012 * math.cos(r)), 1.75, -15 + 3.012 * math.sin(r))
            parts.append(plane_n(f"wcf{s}{a}", c, 0.95, 1.0, frame, n))
            c2 = (s * (4 + 3.024 * math.cos(r)), 1.75, -15 + 3.024 * math.sin(r))
            parts.append(plane_n(f"wcg{s}{a}", c2, 0.82, 0.86, smash if a == -45 and s < 0 else glass, n))
    # doors: closed ones steel with porthole, open ones with frame and the leaf kicked onto the floor
    doorm = mat("door_steel", (0.55, 0.55, 0.52), rough=0.45, metal=0.3)
    for s in (1, -1):
        for d in DOORS:
            for dz in (-0.56, 0.56): parts.append(rbox(f"dj{s}{d}{dz}", (s * 7.03, 1.07, d + dz), (0.1, 2.24, 0.1), frame, 0.02))
            parts.append(rbox(f"dl{s}{d}", (s * 7.03, 2.17, d), (0.1, 0.1, 1.22), frame, 0.02))
            if d in OPEN:
                parts.append(rbox(f"leaf{s}{d}", (s * 6.0, 0.05, d + 0.9 * (1 if d < -5 else 1)), (0.95, 0.05, 2.0), doorm, 0.015, yaw=12 * s))
            else:
                parts.append(rbox(f"door{s}{d}", (s * 7.01, 1.03, d), (0.06, 2.06, 1.0), doorm, 0.02))
                parts.append(sphere(f"dport{s}{d}", (s * 7.045, 1.55, d), 0.16, glass, (0.12, 1, 1)))
                parts.append(sphere(f"dknob{s}{d}", (s * 7.06, 1.0, d + 0.38), 0.04, frame))
    # bulkhead lamps under the overhang (the lights themselves are the l26-lamp rows)
    lampg = mat("lamp_glow", (1, 0.85, 0.6), emit=(1, 0.8, 0.5), estr=6.0)
    for s in (1, -1):
        for z in LAMPZ:
            parts.append(rbox(f"lb{s}{z}", (s * 7.02, 2.72, z), (0.06, 0.32, 0.24), frame, 0.02))
            parts.append(sphere(f"lg{s}{z}", (s * 7.08, 2.72, z), 0.12, lampg, (0.6, 1.1, 0.8)))
    # the two trashed cabins each side
    carpet = mat("cabin_carpet", (0.22, 0.07, 0.07), rough=0.95)
    spray = mat("room_spray", tex="room_spray.png", rough=0.7, alpha=True)
    mattr = mat("mattress_stained", (0.62, 0.58, 0.48), rough=0.9)
    mattr2 = mat("mattress_blue", (0.26, 0.33, 0.45), rough=0.9)
    bag = mat("garbage_bag", (0.02, 0.02, 0.02), rough=0.25, metal=0.0)
    card = mat("cardboard", (0.55, 0.42, 0.27), rough=0.9)
    pizza = mat("pizza", tex="pizza.jpg", rough=0.8)
    shade = mat("lampshade_glow", (1, 0.9, 0.7), emit=(1, 0.75, 0.45), estr=4.0)
    for s in (1, -1):
        for (z0, z1) in ROOMS:
            R = Mesh()
            fl = [(s * 4.2, 0.012, z0), (s * 6.85, 0.012, z0), (s * 6.85, 0.012, z1), (s * 4.2, 0.012, z1)]
            if s < 0: fl = fl[::-1]
            R.f([R.v(p) for p in fl], carpet)
            ce = [(s * 4.2, 3.11, z0), (s * 6.85, 3.11, z0), (s * 6.85, 3.11, z1), (s * 4.2, 3.11, z1)]
            if s > 0: ce = ce[::-1]
            R.f([R.v(p) for p in ce], white)
            for zz, nz in ((z0, 1), (z1, -1)):
                q = [(s * 4.2, 0, zz), (s * 6.85, 0, zz), (s * 6.85, 3.11, zz), (s * 4.2, 3.11, zz)]
                if (s * nz) < 0: q = [q[1], q[0], q[3], q[2]]
                R.f([R.v(p) for p in q], white)
            q = [(s * 4.2, 0, z1), (s * 4.2, 0, z0), (s * 4.2, 3.11, z0), (s * 4.2, 3.11, z1)]
            if s < 0: q = [q[1], q[0], q[3], q[2]]
            R.f([R.v(p) for p in q], white)
            parts.append(R.build(f"room{s}{z0}", smooth=False, weld=False))
            parts.append(plane_n(f"spr1{s}{z0}", (s * 4.215, 1.6, (z0 + z1) / 2), 3.0, 1.5, spray, (s, 0)))
            parts.append(plane_n(f"spr2{s}{z0}", (s * 5.5, 1.5, z1 - 0.015), 2.4, 1.2, spray, (0, -1), [(1, 0), (0.45, 0), (0.45, 1), (1, 1)]))
            # bunk against the fore partition
            bz = z0 + 0.5
            for px in (4.45, 6.45):
                for pz in (bz - 0.42, bz + 0.42): parts.append(cyl(f"bp{s}{z0}{px}{pz}", (s * px, 0, pz), 0.03, 1.9, frame, 8))
            for by in (0.45, 1.45):
                parts.append(rbox(f"bf{s}{z0}{by}", (s * 5.45, by, bz), (2.05, 0.08, 0.9), frame, 0.015))
            parts.append(rbox(f"bm{s}{z0}", (s * 5.45, 1.58, bz), (1.95, 0.18, 0.84), mattr, 0.07, 3, roll=2))
            # mattress dragged onto the floor
            parts.append(rbox(f"fm{s}{z0}", (s * 4.85, 0.1, z1 - 1.2), (0.95, 0.18, 1.95), mattr2, 0.07, 3, yaw=-8 * s))
            # garbage bags in the corner by the door
            for i, (bx, bzz, r) in enumerate(((6.4, z1 - 0.4, 0.38), (6.0, z1 - 0.35, 0.33), (6.45, z1 - 0.9, 0.3), (4.6, z0 + 1.35, 0.3))):
                parts.append(sphere(f"gb{s}{z0}{i}", (s * bx, r * 0.8, bzz), r, bag, (1.0, 0.85, 1.1), 14, 9))
                parts.append(cyl(f"gt{s}{z0}{i}", (s * bx, r * 1.55, bzz), 0.05, 0.12, bag, 8, 0.02))
            # pizza boxes, one open
            parts.append(rbox(f"pb1{s}{z0}", (s * 5.6, 0.03, z1 - 1.7), (0.42, 0.05, 0.42), card, 0.008, yaw=20))
            parts.append(rbox(f"pb2{s}{z0}", (s * 5.62, 0.08, z1 - 1.7), (0.42, 0.05, 0.42), card, 0.008, yaw=-5))
            parts.append(rbox(f"pb3{s}{z0}", (s * 6.2, 0.02, z0 + 1.6), (0.42, 0.03, 0.42), card, 0.006, yaw=40))
            o = plane_n(f"pz{s}{z0}", (0, 0, 0), 0.38, 0.38, pizza, (0, -1)); o.rotation_euler = (math.radians(0), 0, math.radians(40)); o.location = W((s * 6.2, 0.036, z0 + 1.6))
            import bpy; o.rotation_euler[0] = 0; parts.append(o)
            parts.append(rbox(f"pl{s}{z0}", (s * 6.2, 0.22, z0 + 1.6 - 0.24), (0.42, 0.42, 0.02), card, 0.005, pitch=-70))
            # the working lamp on a crate
            parts.append(rbox(f"cr{s}{z0}", (s * 4.55, 0.25, z1 - 0.35), (0.5, 0.5, 0.5), card, 0.02, yaw=10))
            parts.append(cyl(f"lbase{s}{z0}", (s * 4.55, 0.5, z1 - 0.35), 0.09, 0.04, frame, 12))
            parts.append(cyl(f"lstem{s}{z0}", (s * 4.55, 0.54, z1 - 0.35), 0.015, 0.36, frame, 6))
            parts.append(cyl(f"lshade{s}{z0}", (s * 4.55, 0.82, z1 - 0.35), 0.17, 0.2, shade, 16, 0.1))
    # bridge with wraparound windows and wings
    bp = outline(0.0, xh=5.0, zf=-0.5, za=6.5, rf=2.0, ra=0.3)
    B = Mesh()
    def back(a, b, y0, y1): return False
    bmats = [white, frame, glass, frame, white]
    ids = walls(B, bp, [3.4, 4.5, 4.58, 5.82, 5.9, 6.4], bmats)
    rp = outline(0.45, xh=5.0, zf=-0.5, za=6.5, rf=2.0, ra=0.3)
    walls(B, rp, [6.4, 6.58], white); cap(B, rp, 6.58, white); cap(B, rp, 6.4, white, up=False)
    parts.append(B.build("bridge", angle=0.5))
    for s in (1, -1):
        parts.append(rbox(f"wing{s}", (s * 5.6, 3.4 + 1.45, 0.75), (1.25, 2.9, 2.5), white, 0.06))
        parts.append(plane_n(f"wingg{s}", (s * 5.6, 5.2, 0.75 - 1.262), 1.0, 1.1, glass, (0, -1)))
        parts.append(plane_n(f"winggs{s}", (s * 6.232, 5.2, 0.75), 2.2, 1.1, glass, (s, 0)))
        parts.append(rbox(f"wingroof{s}", (s * 5.7, 6.32, 0.75), (1.55, 0.14, 2.8), white, 0.04))
    navr = mat("nav_red", (1, 0.05, 0.03), emit=(1, 0.05, 0.02), estr=8)
    navg = mat("nav_green", (0.05, 1, 0.2), emit=(0.05, 1, 0.2), estr=8)
    navw = mat("nav_white", (1, 1, 0.9), emit=(1, 1, 0.9), estr=8)
    parts.append(sphere("navp", (-6.25, 5.95, 0.4), 0.11, navr)); parts.append(sphere("navs", (6.25, 5.95, 0.4), 0.11, navg))
    # foremast with yard, masthead light and radar
    parts.append(cyl("mast", (0, 6.58, 1.6), 0.13, 5.2, white, 12, 0.07))
    parts.append(rbox("yard", (0, 10.2, 1.6), (2.8, 0.09, 0.09), white, 0.02))
    parts.append(sphere("navmast", (0, 11.85, 1.6), 0.12, navw))
    for s in (1, -1): parts.append(sphere(f"navyard{s}", (s * 1.35, 10.32, 1.6), 0.08, navw))
    parts.append(cyl("radarpost", (0, 6.58, 4.6), 0.12, 0.6, frame, 10))
    parts.append(rbox("radar", (0, 7.25, 4.6), (2.4, 0.16, 0.22), frame, 0.05, yaw=25))
    # lifeboats on davits
    orng = mat("lifeboat_orange", (0.95, 0.32, 0.03), rough=0.45)
    for s in (1, -1):
        for zc in (-7.0, 11.0):
            parts.append(sphere(f"lbh{s}{zc}", (s * 8.4, 2.55, zc), 1.0, white, (1.05, 0.55, 3.1), 24, 12))
            parts.append(sphere(f"lbt{s}{zc}", (s * 8.4, 2.75, zc), 1.0, orng, (1.0, 0.75, 2.95), 24, 12))
            parts.append(rbox(f"lbr{s}{zc}", (s * 8.4, 2.62, zc), (2.12, 0.08, 5.0), frame, 0.03))
            for dz in (-2.3, 2.3):
                parts.append(tube(f"dav{s}{zc}{dz}", [(s * 7.1, 3.4, zc + dz), (s * 7.2, 4.4, zc + dz), (s * 7.6, 4.85, zc + dz), (s * 8.45, 4.75, zc + dz)], 0.09, white, 3))
                parts.append(tube(f"fall{s}{zc}{dz}", [(s * 8.45, 4.7, zc + dz), (s * 8.4, 3.45, zc + dz * 0.9)], 0.015, frame, 1))
    return parts
def rail_path_main(side):
    pts = []
    zs = [-50.5 + 1.0 * i for i in range(17)] + [-33.0 + 4 * i for i in range(19)] + [40 + 2 * i for i in range(9)] + [57.0, 57.5]
    for z in zs:
        x = half(z, 0) - 0.42
        if x > 0.05: pts.append((side * x, z))
    return pts
def build_rails():
    rm = mat("rail_white", (0.8, 0.8, 0.76), rough=0.4, metal=0.2)
    wire = mat("rail_wire", (0.3, 0.3, 0.3), rough=0.4, metal=0.8)
    parts = []
    for s in (1, -1):
        P = [p for p in rail_path_main(s) if p[1] > -34]
        P = P + [(0.0, 57.62)]
        parts.append(tube(f"mtop{s}", [(x, 1.1, z) for x, z in P], 0.035, rm, 3, cap=False))
        for wy in (0.45, 0.78): parts.append(tube(f"mw{s}{wy}", [(x, wy, z) for x, z in P], 0.008, wire, 1, cap=False))
        acc = 0.0
        for i, (x, z) in enumerate(P):
            if i: acc += math.dist(P[i], P[i - 1])
            if i == 0 or acc > 1.45 or i == len(P) - 1:
                parts.append(cyl(f"ms{s}{i}", (x, 0, z), 0.028, 1.1, rm, 8)); acc = 0.0
    # sun-deck rail around the slab, gaps at the stair heads
    sp = outline(0.22, xh=7.0, zf=-18.0, za=21.7, rf=3.0, ra=0.01)
    pts = [(x, z) for (x, z, _, _) in sp]
    segs = [[]]
    for (x, z) in pts:
        if z > 21.5 and 4.6 < abs(x) < 6.6:
            if segs[-1]: segs.append([])
            continue
        segs[-1].append((x, z))
    # dense along straights
    def densify(seg):
        out = []
        for i in range(len(seg) - 1):
            a, b = seg[i], seg[i + 1]; n = max(1, int(math.dist(a, b) / 1.4))
            for k in range(n): out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
        out.append(seg[-1]); return out
    # rejoin wrap: last seg + first seg
    if len(segs) > 1: segs[0] = segs[-1] + segs[0]; segs = segs[:-1]
    # clip ends at the stair heads
    for n, seg in enumerate(segs):
        seg = densify(seg)
        if len(seg) < 2: continue
        parts.append(tube(f"stop{n}", [(x, 4.5, z) for x, z in seg], 0.035, rm, 3))
        for wy in (3.85, 4.18): parts.append(tube(f"sw{n}{wy}", [(x, wy, z) for x, z in seg], 0.008, wire, 1))
        for i, (x, z) in enumerate(seg): parts.append(cyl(f"ss{n}{i}", (x, 3.4, z), 0.028, 1.1, rm, 8))
    # stair handrails both sides of both stairways (stairs run z 28 at y0 to z 22 at y3.4)
    for sx in (5.6, -5.6):
        for dx in (-0.85, 0.85):
            x = sx + dx
            parts.append(tube(f"hr{sx}{dx}", [(x, 0.95, 28.3), (x, 4.35, 22.0), (x, 4.5, 21.75)], 0.03, rm, 3))
            for k in range(5):
                z = 28.0 - 1.5 * k; y = 3.4 * (28 - z) / 6
                parts.append(cyl(f"hp{sx}{dx}{k}", (x, y, z), 0.025, 0.95, rm, 8))
    return parts
def sun_rail_segments():
    sp = outline(0.22, xh=7.0, zf=-18.0, za=21.7, rf=3.0, ra=0.01)
    return [(x, z) for (x, z, _, _) in sp]
