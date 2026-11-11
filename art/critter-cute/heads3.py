# Critter heads v2 (Shelly, Nov 9: "the furry models are awful" — Dandy's World style with a hint of a fluffy, detailed cat; eyes stay matte black, her pick).
# Runs build.py's own machinery (rig, ears, tails, species table, face keys, export contract) with the face redrawn:
#   - a flatter, softer face: the long snout bumps that made the mouth decals poke through the sphere's facets are cut to a gentle muzzle
#   - a finer head sphere, so drawn features sit on the surface instead of floating over flat facets
#   - big clean eyes: a thin ink ring, one large matte black pupil set straight (no cross-eyed inward shift), no coloured ring
#   - the mouth's hidden parts (inside, teeth, tongue) tucked well under the surface until the mouth opens
#   - markings with smooth edges and a few soft fur points instead of jagged sawtooth patches
#   - fluff (crown, cheek ruffs) as soft rounded locks, not cones
# Run: STAGE=heads ONLY=cat,wolf SEX=f HPROOF=1 NOEXPORT=1 blender -b --factory-startup --python art/critter-cute/heads2.py
import os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "build.py"), encoding="utf-8").read()

def sub(a, b, count=1):
    global src
    n = src.count(a)
    assert n == count, f"patch expected {count} of {a[:70]!r}, found {n}"
    src = src.replace(a, b)

# no build on import: this script calls run_sex itself
sub('for SEX in SEXES: run_sex(SEX)\nlog("done")', '')
# flatter face: a quarter of the old snout length, a little wider so it reads as a soft muzzle cushion
sub('L = sp.get("snout", .026 if sp.get("muzzle") else .016) * sp.get("snoutK", 2.1)',
    'L = sp.get("snout", .026 if sp.get("muzzle") else .016) * sp.get("snoutK", 2.1) * (.0 if sp.get("human") else .38)')
sub('sw = sp.get("snoutW", .26) * wd', 'sw = sp.get("snoutW", .26) * wd * (1.0 if sp.get("human") else 1.15)')
# rounder skull: less crown flattening and a softer cheek pouch (hats still fit: the crown rises a little, the brim sits where it did)
sub('skull = -sp.get("flat", .16) * top * top * 1.8', 'skull = -sp.get("flat", .16) * top * top * (1.8 if sp.get("human") else .9)')
sub('cheek_swell = .095 * ck * math.exp(', 'cheek_swell = .072 * ck * math.exp(')
# finer sphere
sub('bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=64, radius=1.0)', 'bmesh.ops.create_uvsphere(bm, u_segments=128, v_segments=88, radius=1.0)')
# eyes: thin ring, no coloured iris ring, a big straight pupil
sub('inner = ellipse(ew, eh, N); outer = ellipse(ew + .011, eh + .011, N)', 'inner = ellipse(ew, eh, N); outer = ellipse(ew + .0062, eh + .0062, N)')
sub('st["Half"] = [(x, min(y, cut)) for (x, y) in inner] + [(x, min(y, cut + .016) if y > cut else y) for (x, y) in outer]',
    'st["Half"] = [(x, min(y, cut)) for (x, y) in inner] + [(x, min(y, cut + .009) if y > cut else y) for (x, y) in outer]')
sub('a_out.append((xx, arc(xx) + sgn * .0075 * (1 - (xx / ew) ** 6)))', 'a_out.append((xx, arc(xx) + sgn * .0058 * (1 - (xx / ew) ** 6)))')
sub('add_decal(H, u, EYE_V, .0096, eye_types(st_i), ff_i, "iris")', 'pass  # v2: no coloured ring round the pupil')
sub('pw, ph = .042, .054; pc = (-s * .015, -.016)', 'pw, ph = .047, .059; pc = (-s * .004, -.010)')
# brows: finer strokes
sub('def brow(fy, th=.0048):', 'def brow(fy, th=.0036):')
# mouth insides tucked deeper while closed
sub('add_decal(H, 0, MV, -.0028, {', 'add_decal(H, 0, MV, -.0075, {')
sub('}, strip(M_), "mouth", outs={"Basis": -.0028, "Smile": -.0028, "Frown": -.0028, "Open": .0145, "O": .0145})',
    '}, strip(M_), "mouth", outs={"Basis": -.0075, "Smile": -.0075, "Frown": -.0075, "Open": .0145, "O": .0145})')
sub('add_decal(H, 0, MV, -.0024, {', 'add_decal(H, 0, MV, -.0070, {')
sub('}, strip(M_), "eyewhite", outs={"Basis": -.0024, "Smile": -.0024, "Frown": -.0024, "Open": .0162})',
    '}, strip(M_), "eyewhite", outs={"Basis": -.0070, "Smile": -.0070, "Frown": -.0070, "Open": .0162})')
sub('add_decal(H, 0, MV, -.0026, {', 'add_decal(H, 0, MV, -.0072, {')
sub('}, fan(18), "tongue", outs={"Basis": -.0026, "Smile": -.0026, "Frown": -.0026, "Open": .0154, "Blep": .0160})',
    '}, fan(18), "tongue", outs={"Basis": -.0072, "Smile": -.0072, "Frown": -.0072, "Open": .0154, "Blep": .0160})')
# mouth line a little finer
sub('def band(fn, th=.0048):', 'def band(fn, th=.0040):')
# markings: smooth shapes with a few soft points
sub('        spike = (1.0 - abs(math.sin(tufts * t / 2 + seed))) ** 3.5\n        rr.append(1.0 - amp * .55 + amp * 1.25 * spike + amp * .35 * jit[i])',
    '        spike = (1.0 - abs(math.sin(min(tufts, 6) * t / 2 + seed))) ** 2.2\n        rr.append(1.0 - amp * .2 + amp * .45 * spike + amp * .04 * jit[i])')
sub('            spike = (1.0 - abs(math.sin(9 * t / 2 + seed))) ** 3.0\n            rr.append(1.0 - 0.08 + 0.16 * spike + 0.04 * (rnd.random() - 0.5))',
    '            spike = (1.0 - abs(math.sin(5 * t / 2 + seed))) ** 2.2\n            rr.append(1.0 - 0.03 + 0.06 * spike)')
# fluff: rounded locks
sub('o, _ = tube("spike", [base, base + d1, base + d1 + d2], [r, r * .58, r * .10], 8); H.add_obj(o, matname, bone)',
    'o, _ = tube("spike", [base, base + d1 * .9, base + d1 + d2 * .8], [r * 1.1, r * .8, r * .34], 12); H.add_obj(o, matname, bone)')
# the head proofs: a touch more light so the drawn face reads
sub('key.data.energy = 120; key.data.size = 2', 'key.data.energy = 140; key.data.size = 2.5')

# ---- v3 anime pass (Shelly #205430 "less creepy, not blocky, more anime"; #205440 "i do like the black eyes") ----
# eyes a touch narrower and taller, set lower and closer like a chibi face; the matte black pupil fills most of the eye
# so only a thin white crescent shows (no wide stare); a thick inked upper lid that tapers to a thin lower line
sub('EYE_U, EYE_V = .365, .048', 'EYE_U, EYE_V = .335, .018')
sub('N = 32; ew, eh = .074, .090', 'N = 32; ew, eh = .066, .088')
sub('inner = ellipse(ew, eh, N); outer = ellipse(ew + .0062, eh + .0062, N)',
    'inner = ellipse(ew, eh, N); outer = [(x * (ew + .0050) / ew + (s * .022 * max(0.0, y / eh) ** 2 * max(0.0, s * x / ew)), y * (eh + .0030) / eh + (.0260 * (y / eh) ** 2 if y > 0 else 0)) for (x, y) in inner]')
sub('pw, ph = .047, .059; pc = (-s * .004, -.010)', 'pw, ph = .060, .079; pc = (-s * .002, -.002)')
# ---- v3b (Shelly #205470 "do a bit better"): anime eye shape, softer fluff ----
# the eye's top is flattened into a lid line that lifts at the outer corner (a soft cat-eye), the bottom stays round;
# the black pupil is cut flat under that lid so it reads tucked under it, the way anime eyes do; lashes follow the new lid
sub('FACE_KEYS = [', '''def _A(x, y, s, ew=.066):
    y = y * (.62 if y > 0 else .86)
    return (x * 1.08, y + .012 * max(0.0, s * x / ew) ** 1.6)
def _top(x, s, ew=.066, eh=.088):
    t = max(0.0, 1 - (x / ew) ** 2) ** .5
    return _A(x, eh * t, s)[1]
FACE_KEYS = [''')
sub('pts, ff = disc(ew, eh, N, 6)\n', 'pts, ff = disc(ew, eh, N, 6); pts = [_A(x, y, s) for x, y in pts]\n')
sub("(.0260 * (y / eh) ** 2 if y > 0 else 0)) for (x, y) in inner]", "(.0260 * (y / eh) ** 2 if y > 0 else 0)) for (x, y) in inner]; inner = [_A(x, y, s) for x, y in inner]; outer = [_A(x, y, s) for x, y in outer]")
sub('pts, ff = disc(pw, ph, N, 6, *pc)', 'pts, ff = disc(pw, ph, N, 6, *pc); pts = [(x, min(y, _top(x, s) - .004)) for x, y in pts]')
sub('bx, by = r0[0] * math.cos(a), r0[1] * math.sin(a)', 'bx, by = _A(r0[0] * math.cos(a), r0[1] * math.sin(a) * 1.0, s)', 2)
sub('for j, ang in enumerate((18, 40, 62)):', 'for j, ang in enumerate((8, 24, 42)):')
# one small soft tuft on the crown instead of the three-spike crown
sub('spike(H, b, n * .052 + f * .022, n * .040 + f * .035, .030, "fur")', 'spike(H, b, n * .030 + f * .022, n * .016 + f * .030, .022, "fur")')
sub('spike(H, b2, n2 * .038 + f * .016 + V(s * .012, 0, 0), n2 * .028 + f * .024 + V(s * .018, 0, 0), .022, "fur")', 'pass')
# cheek fluff: two short soft tufts a side, not three long spikes
sub('for v_, ln, r0, dz in ((-.09, .064, .028, -.008), (-.21, .078, .032, -.018), (-.33, .060, .026, -.026)):',
    'for v_, ln, r0, dz in ((-.14, .040, .026, -.008), (-.27, .046, .028, -.016)):')
# markings off (Shelly #205720 "take off the markings too"): no tabby M, no cheek stripes, no two-tone ear tips on the cat
sub('tail="cat", ex=["eartip"], muzzle=True, snout=.024, whisk=True, catnose=True, fang=True, fluff=True, mark="#d9843a", marks=["tabby"]',
    'tail="cat", ex=[], muzzle=True, snout=.024, whisk=True, catnose=True, fang=True, fluff=True, mark="#d9843a", marks=[]')
# the crown tuft off entirely: a smooth round skull between the ears
sub('    if "mane" not in sp["ex"] and "wool" not in sp["ex"]:\n        # Soft kemono crown', '    if False:\n        # Soft kemono crown')
# ears (Shelly #205735 "the ears especially needs to be better"): Andy's ears: a wide soft base, a rounded tip, leaning out
# from the crown, a pale fluff tuft in the bowl
sub('EAR_UV = (.6, .78)', 'EAR_UV = (.64, .72)')
sub('w_fn = lambda t: .092 * sc * (math.sin(math.pi * (.12 + .84 * (1.0 - t))) ** .68) * ((1.0 - t * .86) ** .52)',
    'w_fn = lambda t: .112 * sc * (math.sin(math.pi * (.10 + .86 * (1.0 - t))) ** .95) * ((1.0 - t * .78) ** .36)')
sub('H_len = .205 * sc', 'H_len = .19 * sc')
sub("""    else:
        up = (nrm * .52 + V(0, 0, .54)).normalized()""", """    else:
        up = (nrm * .50 + V(0, 0, .52) + right * .16).normalized()""")
sub("""    basep = H.add_v(root - up * .035, bone)""", """    basep = H.add_v(root - up * .035, bone)
    if kind == "point":
        for j, (dx, ln_) in enumerate(((-.016, .050), (0.0, .062), (.016, .046))):
            b_ = root + up * .010 + side_v * dx + fwd * (-.004)
            spike(H, b_, up * ln_ * .55 + fwd * .012 + side_v * dx * .6, up * ln_ * .45 + fwd * .016 + side_v * dx * .5, .010, inner_mat if inner_mat != "inner" else "belly", bone)""")
# expressions (Shelly #205760 "then improve expressions"): sad, angry and pout read apart from neutral
# sad: outer lid droops hard, pupils float up; angry: inner lid slams down, pupils sink; brows tilt twice as far
sub('elif key == "Sad": out.append((x, y * (1 - .38 * xo(x)) if y > 0 else y))', 'elif key == "Sad": out.append((x, (y * (1 - .75 * xo(x)) - .010 * xo(x)) if y > 0 else y * .94))')
sub('elif key == "Angry": out.append((x, y * (1 - .55 * xi(x)) if y > 0 else y))', 'elif key == "Angry": out.append((x, (y * (1 - .92 * xi(x)) - .006) if y > 0 else y * .9))')
src_brow_fix = True
src = src.replace('"Sad": [(x, y + .012) for x, y in pts]', '"Sad": [(x, min(y + .016, _top(x, s) - .004)) for x, y in pts]')
src = src.replace('"Angry": [(x - s * .004, y - .006) for x, y in pts]}', '"Angry": [(x - s * .006, min(y - .012, _top(x, s) - .02)) for x, y in pts]}')
src = src.replace('.024 * (0.35 - s * x / .096)', '.050 * (0.35 - s * x / .096)').replace('.028 * (0.35 - s * x / .096)', '.055 * (0.35 - s * x / .096)')
src = src.replace('- .036 * (0.40 - s * x / .096)', '- .070 * (0.40 - s * x / .096)').replace('- .034 * (0.40 - s * x / .096)', '- .068 * (0.40 - s * x / .096)')
# frown: a real downturned mouth, corners sinking (the pout's base too)
src = src.replace('return (t * .040, .014 * (1 - t * t) - .005)', 'return (t * .034, .024 * (1 - t * t) - .010)')
src = src.replace('("pout", {"Frown": .8, "Blush": .4})', '("pout", {"Frown": .7, "Blush": 1, "Sad": .35, "Half": .2})')
exec(compile(src, os.path.join(HERE, "build.py"), "exec"))
# proofs show the head as the game draws it by default: no beard, no blush unless worn (the game hides those slots)
_ht = head_turn
def head_turn(heads, SEX):
    for o in heads.values():
        for m in o.data.materials:
            if m and m.name.endswith(("_beard",)):
                m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
                out = nt.nodes.new("ShaderNodeOutputMaterial"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); nt.links.new(tr.outputs[0], out.inputs[0])
    _ht(heads, SEX)
    if os.environ.get("FACES"): _faces(heads, SEX)
def _faces(heads, SEX):
    # expression sheet: the front camera, one still per face set
    sc = bpy.context.scene; cam = sc.camera; tgt = Vector((0, 0, 1.30))
    cam.location = tgt + Vector((0, 1.3, .06)); cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = sc.render.resolution_y = 360
    for name, head in heads.items():
        for nm_, ks in FACESETS:
            for kb in head.data.shape_keys.key_blocks[1:]: kb.value = ks.get(kb.name, 0)
            sc.render.filepath = os.path.join(PROOF, f"fx_{SEX}_{name}_{nm_}.png"); bpy.ops.render.render(write_still=True)
        for kb in head.data.shape_keys.key_blocks[1:]: kb.value = 0
if os.environ.get("LIST"): print("SPECIES", " ".join(SP)); raise SystemExit
for SEX in SEXES: run_sex(SEX)
log("done v3")
