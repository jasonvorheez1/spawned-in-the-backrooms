# Level 7's floating house, the outside of the entrance room, as a 2000s suburban house (Shelly, Nov 8: "make the house actually look like a 2000s style house").
# Fits the room in places/level7/sim.js: floor at the origin (world y = FY), walls inner faces at ±2.9, outer faces at ±3.2, door gaps
# south x∈[-0.6,0.6] to 2.2 m (Blender -Y = world +Z) and north x∈[-0.8,0.8] to 2.1 m. Lap vinyl siding, white corner boards and trim,
# windows with mini-blinds and shutters, an asphalt-shingle gable roof with gutters and downspouts, a satellite dish, a porch light and stoops.
# Slots: siding, trim, shingle, glass, blind, shutter, concrete, gutter, dish, door, bulb.
#   blender -b --factory-startup --python-exit-code 1 --python art/l7-house/build.py
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "l7kit"))
from l7lib import Kit
OUT = "/workspace/l7-house"; os.makedirs(OUT, exist_ok=True)
k = Kit(2003)
SID = k.mat("siding", (0.62, 0.60, 0.50), 0.6); TRIM = k.mat("trim", (0.85, 0.85, 0.82), 0.5); SH = k.mat("shingle", (0.17, 0.17, 0.18), 0.95)
GL = k.mat("glass", (0.05, 0.07, 0.08), 0.08, 0.2); BL = k.mat("blind", (0.80, 0.76, 0.66), 0.6); SHU = k.mat("shutter", (0.12, 0.2, 0.17), 0.6)
CON = k.mat("concrete", (0.45, 0.44, 0.42), 0.95); GUT = k.mat("gutter", (0.82, 0.82, 0.8), 0.4, 0.3); DISH = k.mat("dish", (0.75, 0.75, 0.74), 0.4, 0.3)
DOOR = k.mat("door", (0.36, 0.12, 0.1), 0.5); BULB = k.mat("bulb", (1, 0.85, 0.6), 0.3, 0, emit=(1, 0.8, 0.5))
H = 2.78; O = 3.22  # eave height above the floor; outer face of the siding
DOORS = {"S": (-0.6, 0.6, 2.2), "N": (-0.8, 0.8, 2.1)}
# windows per side: (centre along the wall, sill, width, height)
WIN = {"E": [(-1.4, 0.9, 0.95, 1.25), (1.4, 0.9, 0.95, 1.25)], "W": [(-1.4, 0.9, 0.95, 1.25), (1.4, 0.9, 0.95, 1.25)], "S": [(-1.9, 0.9, 0.95, 1.25), (1.9, 0.9, 0.95, 1.25)], "N": [(-1.9, 0.9, 0.95, 1.25), (1.9, 0.9, 0.95, 1.25)]}
def side(name):  # returns a function mapping (u along wall, out offset, z) -> world xyz and the wall's yaw
    if name == "S": return (lambda u, o, z: (u, -(O + o), z)), 0.0
    if name == "N": return (lambda u, o, z: (-u, O + o, z)), math.pi
    if name == "E": return (lambda u, o, z: (O + o, u, z)), math.pi / 2
    return (lambda u, o, z: (-(O + o), -u, z)), -math.pi / 2
def gaps(name):
    g = [(c - w / 2 - 0.09, c + w / 2 + 0.09, s - 0.09, s + h + 0.09) for c, s, w, h in WIN[name]]
    if name in DOORS: a, b, t = DOORS[name]; g.append((a - 0.1, b + 0.1, -1, t + 0.12))
    return g
L = O + 0.02  # half length of each wall run
for name in "SNEW":
    P, yaw = side(name); G = gaps(name)
    # lap siding: 0.19 m courses, each board tilted so its foot kicks out (the shadow line), cut round windows and doors
    z = 0.0; row = 0
    while z < H - 0.05:
        zc = z + 0.1
        cuts = sorted([(a, b) for a, b, lo, hi in G if lo < zc < hi])
        u = -L
        for a, b in cuts + [(L, L)]:
            if a - u > 0.05:
                k.box(P((u + a) / 2, 0.015, zc), (a - u, 0.022, 0.2), SID, rot=(-0.09, 0, yaw) if name in "SN" else (0, 0.09 if name == "E" else -0.09, yaw))
            u = max(u, b)
        z += 0.19; row += 1
    # corner boards
    for u in (-L + 0.06, L - 0.06): k.box(P(u, 0.04, H / 2), (0.13, 0.05, H), TRIM, rot=(0, 0, yaw))
    # frieze board under the eave
    k.box(P(0, 0.035, H - 0.08), (2 * L, 0.04, 0.16), TRIM, rot=(0, 0, yaw))
    # windows: casing, sill, sashes with a meeting rail and 6-over-6 muntins, glass, mini-blinds half down, louvered shutters
    for c, s, w, h in WIN[name]:
        for dz in (s - 0.06, s + h + 0.06): k.box(P(c, 0.05, dz), (w + 0.3 if dz < s else w + 0.24, 0.07 if dz < s else 0.05, 0.1 if dz > s else 0.07), TRIM, rot=(0, 0, yaw))
        for du in (-w / 2 - 0.06, w / 2 + 0.06): k.box(P(c + du, 0.045, s + h / 2), (0.1, 0.05, h + 0.2), TRIM, rot=(0, 0, yaw))
        k.box(P(c, -0.06, s + h / 2), (w, 0.02, h), GL, rot=(0, 0, yaw))
        for j in range(int(h * 0.55 / 0.035)): k.box(P(c, -0.09, s + h - 0.03 - j * 0.035), (w - 0.04, 0.03, 0.006), BL, rot=(0.6, 0, yaw) if name in "SN" else (0, 0.6 if name == "E" else -0.6, yaw))
        k.box(P(c, -0.09, s + h * 0.45 - 0.02), (w - 0.02, 0.04, 0.03), BL, rot=(0, 0, yaw))
        k.box(P(c, -0.035, s + h / 2), (w, 0.04, 0.05), TRIM, rot=(0, 0, yaw))
        for du in (-w / 6, w / 6): k.box(P(c + du, -0.04, s + h / 2), (0.02, 0.025, h), TRIM, rot=(0, 0, yaw))
        for dz in (h / 4, 3 * h / 4): k.box(P(c, -0.04, s + dz), (w, 0.025, 0.02), TRIM, rot=(0, 0, yaw))
        for du in (-1, 1):
            sc = c + du * (w / 2 + 0.11 + 0.21)
            k.box(P(sc, 0.04, s + h / 2), (0.4, 0.035, h + 0.12), SHU, rot=(0, 0, yaw))
            for j in range(int((h - 0.1) / 0.06)): k.box(P(sc, 0.065, s + 0.08 + j * 0.06), (0.32, 0.02, 0.035), SHU, rot=(-0.5, 0, yaw) if name in "SN" else (0, 0.5 if name == "E" else -0.5, yaw))
    # door casing, a six-panel door swung open against the wall, a porch light, a concrete stoop with two steps
    if name in DOORS:
        a, b, t = DOORS[name]
        for u in (a - 0.06, b + 0.06): k.box(P(u, 0.045, t / 2), (0.12, 0.06, t + 0.1), TRIM, rot=(0, 0, yaw))
        k.box(P((a + b) / 2, 0.05, t + 0.08), (b - a + 0.34, 0.07, 0.16), TRIM, rot=(0, 0, yaw))
        k.box(P((a + b) / 2, 0.08, t + 0.18), (b - a + 0.4, 0.13, 0.04), TRIM, rot=(0, 0, yaw))
        dw = b - a
        k.box(P(b + 0.08 + 0.025, -0.04 + dw / 2 + 0.03, t / 2 - 0.02), (0.045, dw, t - 0.04), DOOR, rot=(0, 0, yaw + math.pi / 2))
        k.box(P(b + 0.4, 0.09, 1.75), (0.14, 0.12, 0.24), GUT, rot=(0, 0, yaw)); k.box(P(b + 0.4, 0.13, 1.74), (0.09, 0.06, 0.15), BULB, rot=(0, 0, yaw))
        for j, (dep, top) in enumerate(((1.2, -0.02), (1.6, -0.2))):
            k.box(P((a + b) / 2, dep / 2, top - 0.09), (b - a + 1.0 + j * 0.3, dep, 0.18 + j * 0.0), CON, rot=(0, 0, yaw))
        k.box(P((a + b) / 2, 1.0, -0.9), (b - a + 1.6, 2.0, 1.4), CON, rot=(0, 0, yaw))
# foundation: poured concrete down into the rock under the siding
k.box((0, 0, -0.75), (2 * O + 0.06, 2 * O + 0.06, 1.5), CON)
# --- the roof: a gable with its ridge along X, 6/12 pitch, 0.45 m eaves and 0.3 m rakes, architectural shingles in staggered courses
EAVE = 0.45; RAKE = 0.3; HY = O + EAVE; PITCH = math.atan(0.5); RISE = (O + 0.05) * 0.5; ZR = H + RISE
LEN = 2 * (O + RAKE); slope = HY / math.cos(PITCH)
for sgn in (1, -1):
    # deck
    cy = sgn * HY / 2; cz = H + (O + 0.05) * 0.5 - (HY / 2) * 0.5 - 0.02 - (EAVE * 0.5) * 0 
    k.box((0, sgn * (HY / 2), ZR - HY / 2 * 0.5 + 0.0 - 0.02), (LEN, slope, 0.05), SH, rot=(sgn * PITCH, 0, 0))
    # shingle courses: rows of tabs with random widths, each course 0.14 down-slope, slightly lifted at its butt
    n = int(slope / 0.14)
    for r in range(n):
        d = (r + 0.5) * 0.14; y = sgn * d * math.cos(PITCH); z = ZR - d * math.sin(PITCH) + 0.035
        x = -LEN / 2 + (k.R.uniform(0, 0.3) if r % 2 else 0)
        while x < LEN / 2 - 0.05:
            w = min(k.R.uniform(0.25, 0.45), LEN / 2 - x)
            k.box((x + w / 2, y, z), (w - 0.012, 0.16, 0.012 + k.R.uniform(0, 0.006)), SH, rot=(sgn * PITCH + sgn * 0.03, 0, 0))
            x += w
    # fascia and a K-style gutter along the eave, a downspout at each end
    ye, ze = sgn * (HY + 0.02), ZR - slope * math.sin(PITCH) - 0.08
    k.box((0, ye, ze), (LEN, 0.03, 0.2), TRIM)
    k.box((0, ye + sgn * 0.07, ze - 0.02), (LEN, 0.12, 0.12), GUT); k.box((0, ye + sgn * 0.02, ze - 0.075), (LEN, 0.03, 0.02), GUT)
    for xs in (-1, 1):
        x = xs * (O - 0.05)
        k.box((x, sgn * (O + 0.12), ze - 0.25), (0.07, 0.07, 0.4), GUT, rot=(sgn * 0.6, 0, 0))
        k.box((x, sgn * (O + 0.06), (ze - 0.4) / 2), (0.08, 0.06, ze - 0.4), GUT)
        k.box((x, sgn * (O + 0.2), 0.05), (0.08, 0.3, 0.06), GUT)
    # soffit under the eave
    k.box((0, sgn * (O + EAVE / 2), H - 0.0), (2 * O, EAVE, 0.02), TRIM)
# ridge cap
k.box((0, 0, ZR + 0.06), (LEN, 0.3, 0.05), SH)
# gable ends: a siding triangle, a louvered vent, rake boards
for xs in (1, -1):
    x = xs * (O + 0.015)
    z = H
    while z < ZR:
        half = (ZR - z - 0.1) * 2
        if half > 0.05: k.box((x, 0, z + 0.1), (0.022, 2 * half, 0.2), SID, rot=(0, xs * 0.09, 0))
        z += 0.19
    k.box((x + xs * 0.02, 0, H + RISE * 0.55), (0.04, 0.55, 0.55), TRIM, rot=(math.pi / 4, 0, 0))
    for j in range(5): k.box((x + xs * 0.04, 0, H + RISE * 0.55 - 0.18 + j * 0.09), (0.02, 0.36, 0.03), GUT, rot=(0, xs * 0.5, 0))
    for sgn in (1, -1):
        k.box((xs * (O + RAKE - 0.02), sgn * HY / 2, ZR - HY / 2 * 0.5 - 0.05), (0.04, slope + 0.05, 0.2), TRIM, rot=(sgn * PITCH, 0, 0))
# a satellite dish on the south slope, the 2000s on every roof
dz = ZR - 1.4 * 0.5 + 0.05
k.box((1.8, -1.4, dz + 0.15), (0.05, 0.05, 0.4), DISH)
k.cyl((1.8, -1.62, dz + 0.42), 0.32, 0.06, DISH, rot=(1.2, 0, 0.3), verts=20, r2=0.24)
k.box((1.78, -1.85, dz + 0.36), (0.03, 0.4, 0.03), DISH, rot=(-0.3, 0, 0.3)); k.box((1.76, -2.03, dz + 0.3), (0.1, 0.1, 0.1), GUT)
ob = k.finish("l7_house")
k.export(os.path.join(OUT, "l7_house.glb"))
k.proof(OUT, {"a": ((7.5, -9, 5.5), (0, 0, 1.8)), "b": ((-8, 7, 4.5), (0, 0, 1.8)), "c": ((0, -6.5, 1.6), (0, 0, 1.6))})
