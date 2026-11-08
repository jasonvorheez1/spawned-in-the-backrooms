# Level 2.1 locker room, after Shelly's ref: a grey six-tier box locker column (banks of them stand shoulder to shoulder) and a tall brown
# two-tier locker with perforated doors. Front +Y (glTF -Z), stands on z=0. Slot "paint" is recoloured in game. Out: art/props/out/<name>.glb
import bpy, os, sys
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "props", "build.py")).read().split("# ------------------------------------------------------------ a maintenance locker")[0]
exec(src)
which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["boxlocker", "ventlocker"]

def boxlocker():
    reset(); paint = mat("paint", (0.62, 0.62, 0.58), 0.5, 0.15); metal = mat("metal", (0.72, 0.72, 0.74), 0.3, 0.9); dark = mat("dark", (0.03, 0.03, 0.035), 0.9); lab = mat("label", (0.5, 0.6, 0.85), 0.6)
    W, Dp, H = 0.38, 0.45, 1.85; base = 0.1; parts = [box("body", (W, Dp, H - base), (0, 0, base + (H - base) / 2), paint, 0.006, 2)]
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(cyl("leg", 0.016, base, (sx * (W / 2 - 0.03), sy * (Dp / 2 - 0.04), base / 2), metal, verts=8))
    fy = Dp / 2 + 0.004; n = 6; dh = (H - base - 0.04) / n
    for k in range(n):
        z = base + 0.02 + dh * (k + 0.5)
        parts.append(box("door", (W - 0.03, 0.016, dh - 0.02), (0, fy, z), paint, 0.005, 2))
        for v in range(3): parts.append(box("louvre", (0.14, 0.012, 0.012), (0.03, fy + 0.012, z - dh * 0.22 + v * 0.025), dark, 0.0, 1))
        parts.append(box("handle", (0.03, 0.026, 0.07), (W / 2 - 0.06, fy + 0.018, z + 0.02), metal, 0.004, 1))
        parts.append(box("hasp", (0.024, 0.014, 0.04), (W / 2 - 0.06, fy + 0.014, z - 0.04), metal, 0.003, 1))
        parts.append(box("numtag", (0.06, 0.006, 0.025), (-0.08, fy + 0.01, z + dh * 0.3), metal, 0.002, 1))
    parts.append(box("toplabel", (0.1, 0.006, 0.04), (-0.06, fy + 0.006, H - 0.02), lab, 0.0, 1))
    ob = join_export("boxlocker", parts); preview("boxlocker", ob); return ob

def ventlocker():
    reset(); paint = mat("paint", (0.25, 0.17, 0.12), 0.55, 0.2); metal = mat("metal", (0.72, 0.72, 0.74), 0.3, 0.9); dark = mat("dark", (0.02, 0.02, 0.02), 0.9); rust = mat("rust", (0.32, 0.2, 0.12), 0.95)
    W, Dp, H = 0.42, 0.5, 1.95; base = 0.12; parts = [box("body", (W, Dp, H - base), (0, 0, base + (H - base) / 2), paint, 0.008, 2)]
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(cyl("leg", 0.018, base, (sx * (W / 2 - 0.03), sy * (Dp / 2 - 0.04), base / 2), metal, verts=8))
    fy = Dp / 2 + 0.004; split = base + (H - base) * 0.48
    for z0, z1 in ((base + 0.02, split - 0.01), (split + 0.01, H - 0.02)):
        zc = (z0 + z1) / 2; h = z1 - z0
        parts.append(box("door", (W - 0.03, 0.016, h), (0, fy, zc), paint, 0.006, 2))
        for r in range(int(h / 0.045) - 2):           # the diamond perforation field, staggered rows of punched holes
            for c in range(5):
                x = -0.12 + c * 0.05 + (0.025 if r % 2 else 0)
                if x > 0.12: continue
                parts.append(box("hole", (0.022, 0.006, 0.022), (x - 0.02, fy + 0.007, z0 + 0.07 + r * 0.045), dark, 0.0, 1))
        parts.append(box("latch", (0.035, 0.03, 0.16), (W / 2 - 0.05, fy + 0.02, z1 - h * 0.35), metal, 0.006, 2))
        parts.append(box("padlockhasp", (0.03, 0.02, 0.05), (W / 2 - 0.05, fy + 0.028, z1 - h * 0.35 - 0.11), metal, 0.004, 1))
    parts.append(box("scuff", (W + 0.004, Dp + 0.004, 0.08), (0, 0, base + 0.04), rust, 0.0, 1))
    parts.append(box("chip", (0.08, 0.004, 0.05), (-0.1, fy + 0.012, 1.55), rust, 0.0, 1))
    ob = join_export("ventlocker", parts); preview("ventlocker", ob); return ob

for w in which: globals()[w]()
