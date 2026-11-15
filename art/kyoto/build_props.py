# Level 178 kit, part 2: garden, furniture, kitchen. Same run line as build_arch.py.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
def rod(p0, p1, r, m, seg=10, node="body"):
    a, b = B(p0), B(p1); d = b - a; bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4(), verts=bm.verts)
    return finish(bm, "rod", m, "x", node, 0, True)
def cone(r1, r2, h, p, m, node="body", seg=20):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(B((p[0], p[1] + h / 2, p[2]))), verts=bm.verts)
    return finish(bm, "cone", m, "x", node, 0, True)
def go(name, fn):
    try: reset(); fn(); export(name)
    except Exception as e: print("KITFAIL", name, repr(e))
def spring():
    box(6, .2, 2.4, (0, -1.3, -.6), "stone", bevel=.01); box(6, .5, .6, (0, -1.3, .9), "stone", bevel=.02); box(6, .8, .6, (0, -1.3, 1.5), "stone", bevel=.02)
    for s in (-1, 1):
        box(.3, 1.3, 4.2, (s * 3.15, -1.3, 0), "stone", bevel=.01); box(6.6, 1.3, .3, (0, -1.3, s * 1.95), "stone", bevel=.01)
        box(.26, .3, 4.3, (s * 3.15, -.16, 0), "wood_wet", "z", .03); box(6.56, .3, .26, (0, -.16, s * 1.95), "wood_wet", "x", .03)
    for i in range(7):
        for j in range(3): blob(.42, (-2.6 + i * .87, -1.1, -1.4 + j * .78), "stone", (1, .12, .9), .12, seed=i * 3 + j)
    cyl(.045, .85, (-3.5, 0, .3), m="wood_light", seg=14); rod((-3.6, .78, .3), (-2.75, .55, .3), .035, "wood_light", 14); cyl(.03, .5, (-3.5, 0, .5), m="wood_light")
def slantern():
    cyl(.24, .1, (0, 0, 0), m="stone", seg=6); cyl(.09, .62, (0, .1, 0), m="stone", seg=16); cyl(.22, .07, (0, .72, 0), m="stone", seg=6)
    box(.2, .2, .2, (0, .8, 0), "washi", bevel=.004)
    for sx in (-1, 1):
        for sz in (-1, 1): box(.04, .22, .04, (sx * .1, .79, sz * .1), "stone", "y", .005)
    cone(.36, .06, .2, (0, 1.01, 0), "stone", seg=6); blob(.07, (0, 1.26, 0), "stone", (1, 1.3, 1), .02, seed=2)
def plantern():
    cyl(.004, .1, (0, -.1, 0), m="lacquer"); cyl(.075, .03, (0, -.13, 0), m="lacquer", seg=20); blob(.16, (0, -.33, 0), "washi", (1, 1.25, 1), 0, seed=1); cyl(.075, .03, (0, -.56, 0), m="lacquer", seg=20)
def table():
    box(1.5, .045, .85, (0, .3, 0), "wood_dark", "x", .012)
    for sx in (-1, 1):
        for sz in (-1, 1): box(.07, .3, .07, (sx * .66, 0, sz * .34), "wood_dark", "y", .008)
    box(1.3, .05, .04, (0, .22, .34), "wood_dark"); box(1.3, .05, .04, (0, .22, -.34), "wood_dark")
def futon(fab):
    def f():
        box(1.0, .09, 2.0, (0, 0, 0), "washi", bevel=.04); box(1.06, .08, 1.35, (0, .07, .32), fab, bevel=.035); box(1.06, .085, .18, (0, .07, -.42), "washi", bevel=.03)
        blob(.2, (0, .16, -.74), "washi", (1.25, .4, .7), 0, seed=4)
    return f
def stair():
    for i in range(8): box(.9, .2 * (i + 1), .262, (0, 0, -i * .26), "wood_mid", "x", .006)
    box(.9, 1.6, 1.0, (0, 0, -8 * .26 - .37), "wood_mid", "x", .006)
    for i in range(3): box(.8, .02, .02, (0, .5 + i * .4, -8 * .26 - .875), "wood_dark")
def slats(w, h, y, z, node, x=0):
    n = int(w / .06)
    for i in range(n): box(.045, h, .022, (x - w / 2 + w * (i + .5) / n, y, z), "wood_dark", "y", .003, node)
    box(w, .04, .026, (x, y, z), "wood_dark", "x", .003, node); box(w, .04, .026, (x, y + h - .04, z), "wood_dark", "x", .003, node)
def base():
    box(.9, .85, .55, (0, 0, .02), "wood_dark", "y", .006); box(.94, .04, .62, (0, .85, 0), "stone", bevel=.008)
    box(.84, .17, .03, (0, .64, -.265), "wood_mid", "x", .005, "drawer"); box(.3, .015, .02, (0, .72, -.29), "brass", "x", .003, "drawer")
    slats(.84, .52, .09, -.265, "door"); box(.02, .12, .02, (.36, .3, -.285), "brass", "y", .003, "door")
def cupboard():
    box(.9, .6, .32, (0, 0, .01), "wood_dark", "y", .006)
    slats(.43, .56, .02, -.16, "door_l", -.22); slats(.43, .56, .02, -.16, "door_r", .22)
def sink():
    box(.9, .85, .55, (0, 0, .02), "wood_dark", "y", .006); slats(.84, .7, .09, -.265, "body")
    box(.94, .04, .62, (0, .85, 0), STEEL, bevel=.008); box(.6, .012, .4, (0, .885, 0), "lacquer", bevel=.002)
    for s in (-1, 1): box(.02, .03, .42, (s * .3, .885, 0), STEEL, "z", .006); box(.62, .03, .02, (0, .885, s * .2), STEEL, "x", .006)
    cyl(.018, .3, (0, .89, .26), m=STEEL, seg=14); rod((0, 1.18, .26), (0, 1.14, .06), .015, STEEL, 14)
    rod((.05, .93, .26), (.16, .97, .26), .01, STEEL, 10, "tap")
def fridge():
    box(.7, 1.75, .64, (0, 0, .04), "plaster", "y", .02); box(.69, 1.12, .045, (0, .62, -.3), "plaster", "y", .015, "door"); rod((-.28, .8, -.35), (-.28, 1.4, -.35), .012, STEEL, 10, "door")
    box(.69, .58, .045, (0, .02, -.3), "plaster", "y", .015, "drawer"); rod((-.2, .5, -.35), (.2, .5, -.35), .012, STEEL, 10, "drawer")
def oven():
    box(.6, .85, .56, (0, 0, .02), "lacquer", "y", .01); box(.62, .03, .6, (0, .85, 0), "lacquer", bevel=.008)
    for sx in (-1, 1):
        for sz in (-1, 1): cyl(.085, .012, (sx * .15, .88, sz * .14), m=STEEL, seg=20)
    box(.54, .46, .03, (0, .14, -.275), "lacquer", "x", .008, "door"); box(.4, .26, .008, (0, .24, -.292), "glass", bevel=0, node="door"); rod((-.22, .56, -.31), (.22, .56, -.31), .012, STEEL, 10, "door")
    for i in range(4): cyl(.02, .02, (-.2 + i * .13, .68, -.27), "z", STEEL, seg=12)
def bowl(): cone(.03, .07, .055, (0, 0, 0), "washi"); cone(.071, .071, .004, (0, .055, 0), "glass")
def cup(): cone(.025, .035, .07, (0, 0, 0), "washi")
def swords():
    box(1.3, .7, .42, (0, 0, 0), "wood_dark", "x", .008); slats(1.2, .6, .05, -.215, "body")
    for sx in (-1, 1):
        for sz in (-1, 1): box(.03, .7, .03, (sx * .63, .7, sz * .19), "wood_dark", "y", .004)
    box(1.3, .03, .42, (0, 1.4, 0), "wood_dark", "x", .006); box(1.24, .68, .005, (0, .71, -.2), "glass", bevel=0)
    for i, y in enumerate((.95, 1.15)):
        for s in (-1, 1): box(.03, .1 + .2 * i + .15, .06, (s * .4, .7, .05), "wood_light", "y", .004)
        rod((-.55, y, .0), (.3, y + .02, .0), .014, "lacquer", 10); rod((.3, y + .02, .0), (.55, y + .02, .0), .016, "border", 10); cyl(.035, .008, (.3, y + .02, 0), "x", "brass", seg=12)
def kimono():
    for s in (-1, 1): box(.05, 1.65, .05, (s * .8, 0, 0), "lacquer", "y", .006); box(.06, .05, .4, (s * .8, 0, 0), "lacquer", "z", .006)
    box(1.75, .04, .04, (0, 1.6, 0), "lacquer"); box(1.6, .03, .03, (0, .3, 0), "lacquer")
    box(1.4, .5, .03, (0, 1.08, 0), "ochre", bevel=.012); box(.62, 1.25, .035, (0, .33, 0), "ochre", bevel=.012); box(.62, .12, .04, (0, 1.0, 0), "border", bevel=.01)
def geta():
    for s in (-1, 1):
        box(.09, .018, .23, (s * .07, .05, 0), "wood_light", "z", .006)
        for z in (-.05, .06): box(.085, .05, .02, (s * .07, 0, z), "wood_light", "x", .003)
        rod((s * .07, .07, -.08), (s * .07 - .03, .075, .02), .006, "border", 6); rod((s * .07, .07, -.08), (s * .07 + .03, .075, .02), .006, "border", 6)
def towels():
    for i in range(5): box(.36, .065, .26, (0, i * .066, 0), "washi", bevel=.025)
def rock(seed):
    return lambda: (blob(.5, (0, .22, 0), "stone", (1.2, .65, .9), .28, seed=seed), blob(.25, (.5, .1, .2), "stone", (1.1, .6, 1), .25, seed=seed + 1))
def maple():
    rod((0, 0, 0), (.15, 1.3, .05), .09, "wood_dark"); rod((.15, 1.3, .05), (.8, 2.3, .2), .05, "wood_dark"); rod((.15, 1.3, .05), (-.6, 2.2, -.3), .05, "wood_dark"); rod((.15, 1.3, .05), (.1, 2.5, .6), .04, "wood_dark")
    for i, (x, y, z, r) in enumerate(((.9, 2.5, .2, .8), (-.7, 2.4, -.35, .75), (.1, 2.8, .7, .7), (.1, 3.0, -.1, .8), (-.3, 2.5, .6, .55))): blob(r, (x, y, z), "ochre", (1.2, .5, 1.1), .3, seed=20 + i)
def shrub(): blob(.45, (0, .25, 0), "tatami", (1.2, .7, 1), .25, seed=31); blob(.3, (.45, .18, .2), "tatami", (1, .7, 1), .25, seed=32)
reset()
try: box(.1, .1, .1, (0, 0, 0), "steel"); STEEL = "steel"
except Exception: STEEL = "stone"
print("STEEL", STEEL)
for n, f in (("spring", spring), ("stone_lantern", slantern), ("paper_lantern", plantern), ("table", table), ("futon_a", futon("border")), ("futon_b", futon("ochre")), ("futon_c", futon("tatami")),
             ("zabuton", lambda: blob(.3, (0, .05, 0), "border", (1, .17, 1), 0, seed=5)), ("stair", stair), ("cab_base", base), ("cupboard", cupboard), ("sink", sink), ("fridge", fridge), ("oven", oven),
             ("bowl", bowl), ("cup", cup), ("swords", swords), ("kimono", kimono), ("geta", geta), ("towels", towels), ("rock_a", rock(7)), ("rock_b", rock(13)), ("maple", maple), ("shrub", shrub)): go(n, f)
