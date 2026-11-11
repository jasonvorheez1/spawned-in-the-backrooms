# Cat head on the Tripo sculpt (Shelly #206324 "do you think tripo might help you", liked the sculpt): heads3's face,
# eyes, mouth and every expression key, laid onto the Tripo head's own surface instead of the procedural ball.
# The procedural skull, ears and fluff are dropped; the Tripo mesh is the skin; head_r raycasts the Tripo surface.
# Run: TRIPO=/workspace/tripo-cat/cat-head.glb HPROOF=1 FACES=1 STAGE=heads ONLY=cat SEX=f NOEXPORT=1 blender -b --factory-startup --python art/critter-cute/heads4.py
import os
HERE = os.path.dirname(os.path.abspath(__file__))
s3 = open(os.path.join(HERE, "heads3.py"), encoding="utf-8").read()
hook = 'exec(compile(src, os.path.join(HERE, "build.py"), "exec"))'
s3 = s3.replace(hook, hook + "\n" + open(os.path.join(HERE, "tripo_fit.py"), encoding="utf-8").read(), 1)
exec(compile(s3, os.path.join(HERE, "heads3.py"), "exec"))
