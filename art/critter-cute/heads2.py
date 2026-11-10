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
if os.environ.get("LIST"): print("SPECIES", " ".join(SP)); raise SystemExit
for SEX in SEXES: run_sex(SEX)
log("done v2")
