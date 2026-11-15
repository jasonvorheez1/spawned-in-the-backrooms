# Level 178 kit, part 1: structure. blender -b --factory-startup --python-exit-code 1 --python art/kyoto/build_arch.py
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
W, H, KAMOI = 1.82, 2.5, 1.80; LW, LH = 0.91, 1.77; TR = 0.018
def roofY(d): return 2.9 + (d - 6.5) * 0.303 if d <= 13.1 else 4.9 - (d - 13.1) * 0.303
def rod(p0, p1, r, m, seg=8, node="body"):
    a, b = B(p0), B(p1); d = b - a; bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4(), verts=bm.verts)
    return finish(bm, "rod", m, "x", node, 0, True)
def frame(w=W, ranma="plaster"):
    box(.12, H, .12, (-w / 2, 0, 0), "wood_dark", "y", .008)
    box(w - .12, .10, .11, (0, KAMOI, 0), "wood_dark"); box(w - .12, .14, .13, (0, H - .14, 0), "wood_dark"); box(w - .12, .025, .11, (0, 0, 0), "wood_dark")
    if ranma == "shoji":
        box(w - .12, .46, .003, (0, 1.90, .004), "washi", bevel=0)
        n = round((w - .12) / .2)
        for i in range(1, n): box(.008, .46, .012, (-(w - .12) / 2 + (w - .12) * i / n, 1.90, 0), "wood_light", "y", 0)
        box(w - .12, .008, .012, (0, 2.125, 0), "wood_light", bevel=0)
    else: box(w - .12, .46, .04, (0, 1.90, 0), ranma, bevel=0)
def leaf(u0, t0, along="x", koshi=True, kind="shoji", node="body"):
    def lb(su, sy, st, u, y, t, m, g="u", bv=.003):
        if along == "x": box(su, sy, st, (u0 + u, y, t0 + t), m, "x" if g == "u" else "y", bv, node)
        else: box(st, sy, su, (t0 + t, y, u0 + u), m, "z" if g == "u" else "y", bv, node)
    if kind == "fusuma":
        fr = "lacquer"; lb(LW - .03, LH - .03, .018, LW / 2, .015, 0, "washi", bv=0)
        for u in (.0075, LW - .0075): lb(.015, LH, .024, u, 0, 0, fr, "y")
        for y in (0, LH - .015): lb(LW, .015, .024, LW / 2, y, 0, fr)
        for t in (-.011, .011): lb(.06, .06, .006, LW - .09, .85, t, "brass", bv=.002)
        return
    for u in (.015, LW - .015): lb(.03, LH, .028, u, 0, 0, "wood_light", "y")
    lb(LW - .06, .05, .028, LW / 2, 0, 0, "wood_light"); lb(LW - .06, .035, .028, LW / 2, LH - .035, 0, "wood_light")
    y0 = .05
    if koshi:
        lb(LW - .06, .36, .008, LW / 2, .05, 0, "wood_mid", "y", 0); lb(LW - .06, .025, .028, LW / 2, .41, 0, "wood_light"); y0 = .435
    hh = LH - .035 - y0; lb(LW - .06, hh, .003, LW / 2, y0, .006, "washi", bv=0)
    for i in range(1, 4): lb(.008, hh, .012, .03 + (LW - .06) * i / 4, y0, -.002, "wood_light", "y", 0)
    rows = 6 if koshi else 8
    for i in range(1, rows): lb(LW - .06, .008, .012, LW / 2, y0 + hh * i / rows, -.002, "wood_light", bv=0)

reset()
frame(); export("bay_open")
frame(); box(W - .12, 1.775, .05, (0, .025, 0), "plaster", bevel=0); box(W - .12, .06, .07, (0, .9, 0), "wood_dark"); export("bay_plaster")
frame(); box(W - .12, 1.775, .05, (0, .025, 0), "ochre", bevel=0); box(W - .12, .06, .07, (0, .9, 0), "wood_dark"); export("bay_ochre")
frame(ranma="shoji"); leaf(-LW, -TR); leaf(0, TR); export("bay_shoji")
frame(ranma="shoji"); leaf(0, TR); export("bay_door")
frame(2 * W, "shoji"); leaf(-2 * LW, TR); leaf(LW, TR); export("bay_wide")
frame(); leaf(-LW, -TR, kind="fusuma"); leaf(0, TR, kind="fusuma"); export("bay_fusuma")
frame()
for s in (-1, 1): box(.33, 1.775, .05, (s * .685, .025, 0), "plaster", bevel=0); box(.05, 1.775, .1, (s * .5, .025, 0), "wood_dark", "y")
export("bay_hub")
frame(); box(W - .12, .83, .05, (0, .025, 0), "plaster", bevel=0); box(W - .12, .05, .09, (0, .85, 0), "wood_dark"); box(W - .12, .9, .006, (0, .9, 0), "glass", bevel=0)
for i in range(1, 6): box(.02, .9, .03, (-.85 + 1.7 * i / 6, .9, 0), "wood_dark", "y", .002)
for y in (1.2, 1.5): box(W - .12, .02, .03, (0, y, 0), "wood_dark", bevel=.002)
export("bay_window")
frame(ranma="wood_mid")
for i in range(7): box(.238, 1.775, .03, (-.85 + .243 * (i + .5), .025, 0), "wood_mid", "y", .004)
export("bay_wood")
leaf(0, 0, "z"); export("shoji_leaf")
leaf(0, 0, "z", kind="fusuma"); export("fusuma_leaf")
# floor slab 3.64 x 7.8, top y .45
box(3.64, .41, 7.8, (0, 0, 0), "stone", bevel=.02)
for i in range(26): box(3.64, .04, .298, (0, .41, -3.9 + .3 * (i + .5)), "wood_dark", "x", .004)
export("floor")
def tmat(cx, cz, rot=False):
    if rot:
        box(.906, .03, 1.816, (cx, 0, cz), "tatami", "z", .003)
        for s in (-1, 1): box(.035, .031, 1.82, (cx + s * .4375, 0, cz), "border", "z", .002)
    else:
        box(1.816, .03, .906, (cx, 0, cz), "tatami", "x", .003)
        for s in (-1, 1): box(1.82, .031, .035, (cx, 0, cz + s * .4375), "border", "x", .002)
tmat(0, 0); export("tatami")
for cx, cz, r in ((-.91, -1.365, 0), (.91, -1.365, 0), (-1.365, 0, 1), (1.365, 0, 1), (0, -.455, 0), (0, .455, 0), (-.91, 1.365, 0), (.91, 1.365, 0)): tmat(cx, cz, r)
export("tatami8")
for i in range(8): box(.452, .02, 7.8, (-1.82 + .455 * (i + .5), 0, 0), "wood_mid", "z", .003)
for i in range(17): box(3.64, .04, .035, (0, -.04, -3.9 + .4875 * i), "wood_dark", "x", .003)
box(.12, .18, 7.8, (-1.82, -.18, 0), "wood_dark", "z", .008); export("ceiling")
# engawa module: 2.4 along x, garden edge at z -1.1, house wall at z +1.1
for i in range(14): box(2.4, .035, .155, (0, .415, -1.1 + .157 * (i + .5)), "wood_wet", "x", .004)
box(2.4, .3, 2.0, (0, 0, .1), "stone", bevel=.01); box(2.4, .12, .04, (0, .295, -1.08), "wood_dark")
blob(.14, (-1.2, .04, -1.0), "stone", (1, .5, 1), .15, seed=3); cyl(.06, .3, (-1.2, .1, -1.0), m="wood_dark")
cyl(.075, 2.42, (-1.2, .45, -1.0), m="wood_mid", seg=24); cyl(.08, 2.4, (0, 2.87, -1.0), "x", "wood_mid", seg=16)
for i in range(6):
    x = -1.0 + .4 * i; y0, y1 = roofY(6.6) - .072, roofY(9.2) - .072
    sheet([(x - .025, y0, -1.5), (x + .025, y0, -1.5), (x + .025, y1, 1.1), (x - .025, y1, 1.1)], "wood_dark", grain="z", thick=.07)
sheet([(-1.2, roofY(6.55) - .062, -1.55), (1.2, roofY(6.55) - .062, -1.55), (1.2, roofY(9.2) - .062, 1.1), (-1.2, roofY(9.2) - .062, 1.1)], "wood_mid", grain="z", thick=.012)
export("engawa")
# roof, one side of the square ring (north side; yaw 90 steps make the other three), mitred at 45 degrees
L = 18.2
sheet([(-L, 2.9, -6.5), (L, 2.9, -6.5), (L, 4.9, -13.1), (-L, 4.9, -13.1)], "kawara", thick=.06)
sheet([(-L, 4.9, -13.1), (L, 4.9, -13.1), (L, roofY(17.7), -17.7), (-L, roofY(17.7), -17.7)], "kawara", thick=.06)
n = int(2 * L / .3)
for i in range(n):
    x = -L + .3 * (i + .5)
    rod((x, 2.93, -6.52), (x, 4.93, -13.1), .042, "kawara", 6); rod((x, 4.93, -13.1), (x, roofY(17.7) + .03, -17.68), .042, "kawara", 6)
rod((-L, 5.0, -13.1), (L, 5.0, -13.1), .14, "kawara", 12); box(2 * L, .1, .3, (0, 4.86, -13.1), "kawara")
box(2 * L, .1, .035, (0, 2.8, -6.52), "wood_dark"); box(2 * L, .1, .035, (0, roofY(17.7) - .1, -17.68), "wood_dark")
for o in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    bm = bmesh.new(); bm.from_mesh(o.data)
    for no in ((1, -1, 0), (-1, -1, 0)):
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=(0, 0, 0), plane_no=no, clear_outer=True)
    bm.to_mesh(o.data); bm.free()
    if not o.data.polygons: bpy.data.objects.remove(o, do_unlink=True)
for s in (-1, 1): rod((s * 13.1, 4.97, -13.1), (s * 17.7, roofY(17.7) + .07, -17.7), .1, "kawara", 10)
export("roof_side")
