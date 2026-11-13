# Fills the model table of scripts/lib/level70-town.js from the Tripo logs (/workspace/tripo70/<name>.log) and /workspace/l70/fixed.json, and bumps V.
import re, json, os
M = json.load(open("/workspace/l70/fixed.json"))
for n in "lamp pole sedan pickup snowbank bldga bldgb nhouse shelter swing".split():
    p = f"/workspace/tripo70/{n}.log"
    if os.path.exists(p) and os.path.exists(f"/workspace/tripo70/{n}.glb"):
        a = re.search(r"/cdn/value\.[0-9a-f]+\.glb", open(p).read())
        if a: M[n] = a.group(0)
f = "scripts/lib/level70-town.js"; s = open(f).read()
s = re.sub(r"/\*M\*/.*?/\*M\*/", "/*M*/" + json.dumps(M) + "/*M*/", s, flags=re.S)
s = re.sub(r"export const V = (\d+);", lambda m: f"export const V = {int(m.group(1)) + 1};", s)
open(f, "w").write(s); print("models", sorted(M))
