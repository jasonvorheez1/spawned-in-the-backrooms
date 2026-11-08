# Level 11 street + subway + Sedco kit (exec'd by build.py, shares its helpers). Front +Y (game -z), origin bottom centre.
MATS.update({
    "taxiY": ((0.95, 0.68, 0.05), 0.35, 0.1, 0), "amber": ((1.0, 0.55, 0.1), 0.3, 0, 1.5), "umbB": ((0.08, 0.22, 0.6), 0.85, 0, 0), "umbY": ((0.95, 0.75, 0.15), 0.85, 0, 0),
    "steel": ((0.72, 0.72, 0.7), 0.32, 0.9, 0), "nbox": ((0.1, 0.25, 0.6), 0.5, 0.2, 0), "paper": ((0.85, 0.83, 0.76), 0.9, 0, 0), "sausage": ((0.55, 0.22, 0.12), 0.5, 0, 0),
    "pretzel": ((0.55, 0.32, 0.12), 0.6, 0, 0), "screen": ((0.35, 0.55, 0.8), 0.2, 0, 0.7), "girder": ((0.2, 0.22, 0.2), 0.6, 0.5, 0), "cardboard": ((0.62, 0.48, 0.3), 0.9, 0, 0),
    "printBox": ((0.15, 0.18, 0.3), 0.6, 0, 0), "laminate": ((0.55, 0.42, 0.3), 0.5, 0, 0), "crt": ((0.12, 0.14, 0.16), 0.2, 0, 0.35), "black": ((0.02, 0.02, 0.025), 0.5, 0.1, 0),
})
def bool_cut(M, m, cuts):
    bm = M.b[m]; me = bpy.data.meshes.new("tmp"); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new("tmp", me); bpy.context.collection.objects.link(ob); tmp = []
    for (c, r, h, rot) in cuts:
        cm = bpy.data.meshes.new("c"); cb = bmesh.new(); res = bmesh.ops.create_cone(cb, cap_ends=True, segments=20, radius1=r, radius2=r, depth=h)
        bmesh.ops.transform(cb, matrix=Matrix.Translation(c) @ Euler(rot, "XYZ").to_matrix().to_4x4(), verts=res["verts"]); cb.to_mesh(cm); cb.free()
        co = bpy.data.objects.new("c", cm); bpy.context.collection.objects.link(co); tmp.append(co)
        mod = ob.modifiers.new("b", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = co; mod.solver = "EXACT"
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); nb = bmesh.new(); nb.from_mesh(ev.to_mesh()); ev.to_mesh_clear(); M.b[m] = nb
    for o in tmp + [ob]: bpy.data.objects.remove(o)
AX = (0, math.pi / 2, 0)

def taxi():   # 2006 NYC Ford Crown Victoria cab, no wheels (the game turns them): body floor at z 0.2 above ground
    M = Mesh(); hl = 2.69; hw = 0.99; WB = 1.45
    M.profile("taxiY", [(-hl + .05, .27, hw), (hl - .05, .27, hw), (hl, .45, hw * .97), (hl - .03, .72, hw * .95), (hl - .3, .86, hw * .97), (1.15, .93, hw), (-1.6, .97, hw), (-hl + .12, .95, hw * .97), (-hl, .72, hw * .96), (-hl + .02, .42, hw * .97)])
    bool_cut(M, "taxiY", [((s * .82, w * WB, .36), .42, .42, AX) for s in (-1, 1) for w in (-1, 1)])
    M.profile("glass", [(1.13, .9, hw * .92), (-1.58, .94, hw * .92), (-1.12, 1.44, hw * .76), (.35, 1.44, hw * .76)])
    M.profile("taxiY", [(.33, 1.42, hw * .78), (-1.1, 1.42, hw * .78), (-1.05, 1.5, hw * .72), (.27, 1.5, hw * .72)])
    for s in (-1, 1):
        cbox(M, "taxiY", (s * hw * .84, -.38, 1.18), (.05, .12, .52), .01, rot=(0, s * .27, 0))
        for y in (.95, -.38, -1.5): M.box("black", (s * (hw + .002), y, .62), (.006, .012, .58))
        M.box("black", (s * (hw + .004), 0, .58), (.02, 4.6, .05))
        for i in range(32):   # the checker band
            for r in range(2): M.box("black" if (i + r) % 2 else "white", (s * (hw + .003), -2.05 + i * .13, .76 + r * .065), (.004, .13, .065))
        M.box("chrome", (s * (hw + .01), .55, .86), (.03, .14, .03)); M.box("chrome", (s * (hw + .01), -.75, .86), (.03, .14, .03))
        cbox(M, "black", (s * 1.05, .95, 1.0), (.12, .06, .1), .015)
        M.box("lamp", (s * .62, hl - .03, .64), (.42, .06, .15)); M.box("amber", (s * .9, hl - .08, .63), (.12, .06, .12))
        M.box("tail", (s * .66, -hl + .02, .7), (.42, .06, .18))
    cbox(M, "black", (0, hl - .01, .6), (.64, .05, .2), .01); cbox(M, "chrome", (0, hl + .02, .38), (1.96, .14, .17), .03); cbox(M, "chrome", (0, -hl - .02, .4), (1.96, .14, .17), .03)
    M.box("white", (0, -hl - .03, .58), (.32, .02, .16)); M.box("white", (0, hl + .06, .38), (.32, .02, .15))
    cbox(M, "white", (0, -.35, 1.66), (1.1, .2, .3), .03); M.box("black", (0, -.35, 1.52), (.5, .08, .04)); M.box("lamp", (0, -.24, 1.66), (.3, .01, .1)); M.box("lamp", (0, -.46, 1.66), (.3, .01, .1))
    cbox(M, "dark", (0, 0, .25), (1.6, 4.6, .1), .01)
    ob = M.finish("l11_taxi"); turnaround("taxi", ob, (35, 140, 250), .3, 1.25); return ob
def taxi_wheel():
    M = Mesh(); M.cyl("tire", (0, 0, .33), .33, .24, seg=20, rot=AX); M.cyl("chrome", (0, 0, .33), .2, .25, seg=16, rot=AX); M.cyl("dark", (0, 0, .33), .06, .26, seg=8, rot=AX)
    ob = M.finish("l11_taxi_wheel"); return ob

def foodcart():   # a Sabrett-style hot dog cart: stainless box, two wheels, stand leg, push bar, blue/yellow umbrella
    M = Mesh()
    cbox(M, "steel", (0, 0, .62), (.8, 1.7, .64), .02); cbox(M, "steel", (0, 0, .955), (.86, 1.76, .03), .008)
    for s in (-1, 1):
        M.box("umbB", (s * .401, 0, .52), (.004, 1.64, .14)); M.box("umbY", (s * .401, 0, .66), (.004, 1.64, .06))
        M.box("dark", (s * .402, .3, .78), (.004, .006, .26)); M.box("chrome", (s * .41, .2, .8), (.02, .1, .02))
        M.cyl("tire", (s * .47, -.6, .28), .28, .1, seg=16, rot=AX); M.cyl("chrome", (s * .47, -.6, .28), .12, .11, seg=10, rot=AX)
        tube(M, "steel", [(s * .3, .75, .3), (s * .3, .78, .02)], .02, 6); M.box("dark", (s * .3, .78, .01), (.07, .07, .02))
    tube(M, "steel", [(-.36, -.86, .7), (-.36, -1.08, .98), (.36, -1.08, .98), (.36, -.86, .7)], .016, 6)
    M.cyl("steel", (0, -.6, .28), .025, 1.0, seg=8, rot=AX); M.cyl("white", (.2, .5, .2), .14, .32, seg=12)
    M.cyl("steel", (.25, .65, 1.6), .02, 1.3, seg=8)
    rim, n = 1.05, 8
    for i in range(n):
        a0 = i / n * math.tau; a1 = (i + 1) / n * math.tau; c = (.25, .65)
        p = lambda a, r, z: (c[0] + math.cos(a) * r, c[1] + math.sin(a) * r, z)
        M.hull("umbB" if i % 2 else "umbY", [(c[0], c[1], 2.36), (c[0], c[1], 2.33), p(a0, rim, 2.0), p(a0, rim, 1.98), p(a1, rim, 2.0), p(a1, rim, 1.98), p((a0 + a1) / 2, rim * .6, 2.2)])
    for x, m in ((-.3, "umbY"), (-.22, "red")): M.cyl(m, (x, -.65, 1.07), .04, .2, seg=8); M.cyl("white", (x, -.65, 1.19), .015, .05, seg=6)
    ob = M.finish("l11_foodcart"); turnaround("foodcart", ob, (35, 140, 250), .35, 1.2); return ob
def dogwell():
    M = Mesh(); cbox(M, "steel", (0, 0, .06), (.48, .56, .12), .01); M.box("dark", (0, 0, .12), (.42, .5, .01))
    for i in range(7): M.cyl("sausage", (-.15 + i * .05, -.06, .13), .014, .2, seg=6, rot=(math.pi / 2, 0, 0))
    cbox(M, "steel", (0, .17, .3), (.46, .02, .3), .005, rot=(-.35, 0, 0)); M.box("chrome", (0, -.1, .14), (.1, .02, .02))
    ob = M.finish("l11_dogwell"); return ob
def pretzels():
    M = Mesh(); M.box("steel", (0, 0, .02), (.46, .46, .04)); M.box("glass", (0, 0, .2), (.44, .44, .32)); cbox(M, "steel", (0, 0, .37), (.48, .48, .03), .005)
    for k in range(3):
        for j in range(2):
            pts = [((.07 * math.sin(t)) + (-.1 + j * .2), .045 * math.cos(t) - .03 * math.cos(2 * t) + (-.1 + k * .1), .06 + k * .09 + j * .01) for t in [i / 12 * math.tau for i in range(12)]]
            tube(M, "pretzel", pts, .013, 5, closed=True)
    ob = M.finish("l11_pretzels"); return ob

def trashcan():   # NYC wire litter basket, black bag inside
    M = Mesh(); N = 22; r = lambda z: .24 + z * .07
    for z in (.06, .3, .55, .8): tube(M, "green", [(math.cos(a) * r(z), math.sin(a) * r(z), z) for a in [i / N * math.tau for i in range(N)]], .008, 4, closed=True)
    tube(M, "green", [(math.cos(a) * r(.88), math.sin(a) * r(.88), .88) for a in [i / N * math.tau for i in range(N)]], .02, 6, closed=True)
    for d in (-1, 1):
        for i in range(N):
            pts = []
            for k in range(7):
                z = .06 + k * .82 / 6; a = (i + d * k * .5) / N * math.tau; pts.append((math.cos(a) * r(z), math.sin(a) * r(z), z))
            tube(M, "green", pts, .006, 4)
    M.cyl("dark", (0, 0, .03), .25, .06, seg=16); M.cyl("black", (0, 0, .46), .25, .8, r2=.29, seg=16)
    rnd = random.Random(3); M.sph("black", (0, 0, .86), .3, (1, 1, .35), 12, .15, rnd); M.sph("paper", (.08, -.05, .97), .07, (1.2, 1, .7), 6, .2, rnd); cbox(M, "cardboard", (-.1, .08, .95), (.14, .1, .08), .01, rot=(.3, .2, .5))
    ob = M.finish("l11_trashcan"); turnaround("trashcan", ob, (35, 140, 250), .5, 1.6); return ob

def newsbox():   # coin-op newspaper box on its pedestal; body slot "nbox" takes each paper's colour
    M = Mesh()
    cbox(M, "dark", (0, 0, .03), (.42, .38, .06), .01); cbox(M, "nbox", (0, 0, .22), (.16, .16, .34), .01)
    cbox(M, "nbox", (0, 0, .7), (.5, .44, .62), .025); M.hull("nbox", [(sx * .25, sy, z) for sx in (-1, 1) for (sy, z) in ((-.22, 1.01), (.22, 1.01), (.2, 1.08), (-.22, 1.1))])
    M.box("steel", (0, .222, .66), (.4, .012, .48)); M.box("glass", (0, .23, .7), (.34, .01, .3)); M.box("paper", (0, .2, .7), (.32, .02, .28)); M.box("black", (0, .205, .76), (.26, .01, .05))
    cbox(M, "steel", (0, .21, 1.03), (.2, .06, .1), .01); M.box("dark", (.05, .245, 1.04), (.03, .005, .05)); M.box("chrome", (0, .24, .47), (.14, .03, .03))
    for s in (-1, 1): M.box("white", (s * .252, 0, .78), (.004, .34, .14))
    ob = M.finish("l11_newsbox"); turnaround("newsbox", ob, (35, 140, 250), .35, 2.0); return ob

def turnstile():   # MTA stainless turnstile cabinet with its tripod rotor sticking across the lane (+X)
    M = Mesh()
    cbox(M, "steel", (0, 0, .48), (.28, 1.05, .96), .02); M.hull("steel", [(sx * .15, sy, z) for sx in (-1, 1) for (sy, z) in ((-.53, .95), (.53, .95), (.45, 1.04), (-.45, 1.04))])
    M.box("black", (0, .3, 1.02), (.1, .2, .04)); M.box("dark", (.02, .3, 1.045), (.01, .18, .01)); M.box("screen", (0, .44, 1.0), (.12, .06, .04), rot=(.5, 0, 0))
    M.box("lamp", (0, -.45, 1.02), (.06, .04, .03)); M.box("dark", (.141, 0, .48), (.004, .9, .7))
    hub = Vector((.3, 0, .82)); a = Vector((0, .5, -.866)); u = Vector((1, 0, 0)); w = a.cross(u)
    tube(M, "steel", [(.12, 0, .82), tuple(hub)], .05, 10); M.cyl("chrome", tuple(hub), .07, .08, seg=12, rot=(0, math.pi / 2, 0))
    for k in range(3):
        t = k * math.tau / 3; d = u * math.cos(t) + w * math.sin(t); tube(M, "chrome", [tuple(hub), tuple(hub + d * .55)], .022, 8)
    ob = M.finish("l11_turnstile", center=False); turnaround("turnstile", ob, (60, 150, 300), .35, 1.6); return ob

def payphone():   # 2006 NYC Verizon payphone on its post, side wings, blue header
    M = Mesh()
    cbox(M, "dark", (0, 0, .02), (.3, .3, .04), .01); cbox(M, "steel", (0, 0, .55), (.12, .12, 1.05), .01)
    cbox(M, "steel", (0, -.05, 1.35), (.62, .3, .9), .015)
    for s in (-1, 1): cbox(M, "steel", (s * .33, .1, 1.35), (.03, .5, .86), .01)
    cbox(M, "chrome", (0, .12, 1.4), (.34, .1, .55), .015)
    for r in range(4):
        for c in range(3): M.box("dark", (-.05 + c * .05, .175, 1.3 + r * .045), (.036, .01, .03))
    M.box("crt", (0, .175, 1.56), (.18, .01, .06)); M.box("black", (.11, .175, 1.48), (.02, .01, .07)); M.box("dark", (0, .175, 1.18), (.12, .01, .05))
    tube(M, "black", [(-.2, .2, 1.25), (-.22, .21, 1.38), (-.21, .2, 1.5)], .03, 8); M.sph("black", (-.21, .21, 1.24), .045, (1, .8, .6), 8); M.sph("black", (-.21, .2, 1.52), .045, (1, .8, .6), 8)
    tube(M, "chrome", [(-.17, .17, 1.22), (-.12, .2, 1.1), (-.17, .19, 1.0), (-.1, .17, 1.18)], .008, 4)
    cbox(M, "umbB", (0, .02, 1.96), (.72, .5, .28), .02); M.box("white", (0, .272, 1.96), (.5, .005, .08)); M.box("white", (0, -.232, 1.96), (.5, .005, .08))
    ob = M.finish("l11_payphone"); turnaround("payphone", ob, (30, 140, 250), .3, 1.6); return ob

def mvm():   # MetroCard vending machine
    M = Mesh()
    cbox(M, "steel", (0, 0, .9), (.9, .56, 1.8), .02); M.box("black", (0, .28, 1.05), (.76, .02, 1.2))
    M.box("screen", (0, .29, 1.35), (.3, .01, .24)); M.box("chrome", (-.25, .295, 1.0), (.12, .01, .06)); M.box("dark", (.22, .295, 1.0), (.14, .01, .04)); M.box("dark", (.22, .295, .85), (.12, .01, .03))
    M.box("dark", (0, .3, .6), (.3, .03, .12)); cbox(M, "steel", (0, .31, .52), (.36, .05, .04), .01); M.box("umbB", (0, .282, 1.72), (.86, .02, .14)); M.box("white", (0, .292, 1.72), (.5, .005, .05))
    M.box("umbY", (.22, .292, 1.15), (.12, .005, .03))
    ob = M.finish("l11_mvm"); turnaround("mvm", ob, (30, 140, 250), .3, 1.8); return ob

def ibeam():   # a riveted ceiling girder, 13 m across X, 0.18 deep
    M = Mesh(); L = 13.0
    for z in (.01, .17): M.box("girder", (0, 0, z), (L, .2, .02))
    M.box("girder", (0, 0, .09), (L, .014, .14))
    for i in range(10):
        x = -L / 2 + .6 + i * (L - 1.2) / 9; M.box("girder", (x, 0, .09), (.012, .19, .14))
        for s in (-1, 1): M.box("girder", (x, s * .07, .005), (.08, .03, .012))
    ob = M.finish("l11_ibeam"); return ob
def column():   # a painted wide-flange subway column, 2.0 m, base and cap plates
    M = Mesh(); H = 2.0
    for s in (-1, 1): M.box("girder", (0, s * .11, H / 2), (.24, .02, H))
    M.box("girder", (0, 0, H / 2), (.016, .2, H)); cbox(M, "girder", (0, 0, .015), (.34, .34, .03), .005); cbox(M, "girder", (0, 0, H - .015), (.34, .34, .03), .005)
    for z in (.4, 1.0, 1.6):
        for s in (-1, 1): M.box("girder", (s * .03, 0, z), (.012, .2, .1))
    M.box("white", (0, .122, 1.5), (.18, .004, .1))
    ob = M.finish("l11_column"); return ob

# ---- Sedco Spotlight (2006 AV / security store) fixtures
def boxed(M, rnd, c, s, art=True):
    cbox(M, "cardboard" if rnd.random() < .4 else "printBox", c, s, .006)
    if art: M.box("white", (c[0], c[1] + s[1] / 2 + .002, c[2]), (s[0] * .7, .003, s[2] * .4))
def sedco_counter():   # L sales counter, laminate top, register, monitor, receipt printer, impulse rack
    M = Mesh()
    cbox(M, "printBox", (0, 0, .47), (2.6, .62, .94), .01); cbox(M, "laminate", (0, 0, .96), (2.7, .72, .04), .01); M.box("black", (0, .312, .06), (2.6, .02, .12))
    cbox(M, "printBox", (1.05, -.75, .47), (.62, .9, .94), .01); cbox(M, "laminate", (1.05, -.75, .96), (.72, 1.0, .04), .01)
    cbox(M, "black", (-.5, -.05, 1.03), (.42, .38, .1), .01); cbox(M, "black", (-.5, -.12, 1.14), (.38, .2, .12), .01, rot=(.4, 0, 0)); M.box("dark", (-.5, .05, 1.09), (.34, .12, .02), rot=(.2, 0, 0))
    cbox(M, "black", (-.5, -.15, 1.32), (.08, .06, .25), .005); cbox(M, "crt", (-.5, -.13, 1.47), (.26, .08, .16), .01)
    cbox(M, "white", (-.05, -.05, 1.05), (.16, .2, .14), .01); cbox(M, "black", (.4, -.1, 1.0), (.4, .3, .04), .005)
    M.box("steel", (.9, .37, .8), (.6, .04, .03)); rnd = random.Random(8)
    for i in range(6): cbox(M, "printBox" if i % 2 else "umbY", (.66 + i * .09, .4, .72), (.07, .03, .12), .003)
    ob = M.finish("l11_sedco_counter"); turnaround("sedco_counter", ob, (30, 150, 240), .45, 1.3); return ob
def sedco_gondola():   # 2.4 m double-sided gondola: boxed CRT TVs low, camcorders and DVD players high
    M = Mesh(); rnd = random.Random(11); L = 2.4
    cbox(M, "steel", (0, 0, .06), (L, .9, .12), .008); M.box("steel", (0, 0, .78), (L, .06, 1.4))
    for s in (-1, 1):
        for z in (.48, .98, 1.32): M.box("steel", (0, s * .24, z), (L, .42, .025))
        x = -L / 2 + .05
        while x < L / 2 - .5:
            w = rnd.uniform(.45, .6); boxed(M, rnd, (x + w / 2, s * .24, .12 + .32 / 2 + .01), (w, .38, .32)); x += w + .02
        x = -L / 2 + .05
        while x < L / 2 - .4:
            w = rnd.uniform(.36, .5); d = rnd.uniform(.3, .42); h = rnd.uniform(.3, .44); boxed(M, rnd, (x + w / 2, s * .24, .5 + h / 2), (w, d * .9, h)); x += w + .03
        for i in range(8):
            x = -L / 2 + .15 + i * .29; boxed(M, rnd, (x, s * .3, .99 + .09), (.2, .14, .16))
            cbox(M, "black", (x, s * .14, 1.33 + .05), (.12, .08, .08), .01); M.cyl("dark", (x, s * .19, 1.38), .025, .04, seg=8, rot=(math.pi / 2, 0, 0))
        cbox(M, "umbY", (0, s * .45, .06), (L, .01, .08), .002); M.box("umbB", (0, s * .035, 1.55), (L, .01, .12))
    ob = M.finish("l11_sedco_gondola"); turnaround("sedco_gondola", ob, (30, 120, 220), .45, 1.1); return ob
def sedco_monitors():   # a 3 x 5 wall of 14" CCTV monitors on a steel rack, faces lit (the game can paint the screens)
    M = Mesh(); cbox(M, "steel", (0, 0, .6), (2.6, .5, .05), .005); cbox(M, "black", (0, -.15, .3), (2.6, .2, .6), .01)
    for r in range(3):
        M.box("steel", (0, 0, 1.03 + r * .44), (2.6, .5, .025))
        for c in range(5):
            x = -1.04 + c * .52; z = .65 + r * .44 + .2
            cbox(M, "printBox", (x, -.02, z), (.44, .42, .38), .02); cbox(M, "crt", (x, .2, z + .02), (.34, .02, .27), .02); M.box("black", (x + .15, .195, z - .14), (.06, .01, .02))
    for s in (-1, 1): M.box("steel", (s * 1.29, 0, .9 + .4), (.04, .5, 1.8))
    ob = M.finish("l11_sedco_monitors"); turnaround("sedco_monitors", ob, (25, 150, 330), .3, 1.1); return ob
def sedco_spot():   # a stage fresnel on a black tripod stand
    M = Mesh(); top = Vector((0, 0, 1.6))
    for k in range(3):
        a = k * math.tau / 3; tube(M, "black", [(math.cos(a) * .45, math.sin(a) * .45, 0.02), (0, 0, .7)], .015, 6)
    M.cyl("steel", (0, 0, 1.15), .02, .95, seg=8); M.cyl("black", (0, 0, .72), .03, .1, seg=8)
    tube(M, "black", [(-.17, 0, 1.62), (-.17, 0, 1.8), (.17, 0, 1.8), (.17, 0, 1.62)], .012, 6)
    M.cyl("black", (0, .02, 1.78), .14, .34, seg=16, rot=(math.pi / 2 - .35, 0, 0)); M.cyl("lamp", (0, .19, 1.84), .1, .02, seg=16, rot=(math.pi / 2 - .35, 0, 0))
    for k in range(4): M.box("black", (0, .2, 1.84), (.02 if k % 2 else .3, .1, .3 if k % 2 else .02), rot=(-.35, 0, 0))
    ob = M.finish("l11_sedco_spot"); turnaround("sedco_spot", ob, (30, 140, 250), .3, 1.4); return ob
def sedco_door():   # back-wall steel door in its frame, push bar, STAFF ONLY plate (the game writes the words)
    M = Mesh()
    for s in (-1, 1): cbox(M, "steel", (s * .5, 0, 1.05), (.08, .14, 2.1), .01)
    cbox(M, "steel", (0, 0, 2.14), (1.08, .14, .08), .01); cbox(M, "door", (0, .02, 1.04), (.92, .05, 2.06), .01)
    M.box("chrome", (0, .06, 1.0), (.7, .04, .05)); M.box("white", (0, .046, 1.6), (.4, .005, .14)); M.box("dark", (.38, .05, 1.95), (.08, .02, .1))
    ob = M.finish("l11_sedco_door"); turnaround("sedco_door", ob, (25, 150, 330), .2, 1.3); return ob

FUNCS_ST = {"taxi": taxi, "taxi_wheel": taxi_wheel, "foodcart": foodcart, "dogwell": dogwell, "pretzels": pretzels, "trashcan": trashcan, "newsbox": newsbox, "turnstile": turnstile,
    "payphone": payphone, "mvm": mvm, "ibeam": ibeam, "column": column, "sedco_counter": sedco_counter, "sedco_gondola": sedco_gondola, "sedco_monitors": sedco_monitors, "sedco_spot": sedco_spot, "sedco_door": sedco_door}
