#!/usr/bin/env python3
# Whole-game check (Shelly Nov 13: fix once, every level). Run: python3 tests/check.py
# Scans EVERY level at once, so a shared-system change is checked against all of them:
#  1 imports: every relative import in scripts/ and places/*/sim.js points at a file that exists
#  2 references: every scripts/... or templates/... path named in a scene, config or script exists
#  3 dialogue: every dlg-*.yml parses; each choice has q and a; sk reads "<skill> <number>"; do: is an action talk.js knows
#  4 quests: every place a quest marker or route names is a real place
import os, re, sys, glob, yaml
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
errs, warns = [], []
PLACES = set(os.listdir('places'))
code = glob.glob('scripts/**/*.js', recursive=True) + glob.glob('places/*/*.js') + glob.glob('templates/*.js') + glob.glob('jobs/*.js') + ['sim.js', 'ui.js']
code = [f for f in code if os.path.exists(f)]
# 1 imports
for f in code:
    s = open(f, errors='ignore').read()
    for m in re.finditer(r'''(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}/[^'"]+)['"]''', s):
        t = os.path.normpath(os.path.join(os.path.dirname(f), m.group(1)))
        if not os.path.exists(t): errs.append(f'import  {f}: "{m.group(1)}" does not exist')
# 2 references
refre = re.compile(r'''["'\s:(\[]((?:scripts|templates)/[A-Za-z0-9_\-/.]+\.(?:js|yml))''')
for f in code + glob.glob('places/*/cells/*.scene') + glob.glob('places/*/config.yaml') + ['world.config.yaml']:
    if not os.path.exists(f): continue
    s = open(f, errors='ignore').read()
    for m in refre.finditer(s):
        p = m.group(1)
        if '*' in p or '${' in p: continue
        if not os.path.exists(p): (errs if f.endswith(('.scene', '.yaml')) else warns).append(f'ref     {f}: {p} missing')
# 3 dialogue
KNOWN = {'heal', 'discount', 'recruit', 'boilerkey'}; PREFIX = ('l31:', 'trail:', 'errand:', 'errand-alt:')
SK = re.compile(r'^\s*[a-z]+\s+\d+\s*$', re.I)
for f in sorted(glob.glob('scripts/lib/data/dlg-*.yml')):
    try: D = yaml.safe_load(open(f)) or {}
    except Exception as e: errs.append(f'dialog  {f}: does not parse: {e}'); continue
    def walk(key, lst, path):
        if lst is None: return
        if not isinstance(lst, list): errs.append(f'dialog  {f} {key}{path}: ask is not a list'); return
        seen = set()
        for i, n in enumerate(lst):
            at = f'{key}{path}[{i}]'
            if not isinstance(n, dict): errs.append(f'dialog  {f} {at}: not a choice'); continue
            if not n.get('q'): errs.append(f'dialog  {f} {at}: no q (what the player says)')
            if not n.get('a') and not str(n.get('do', '')).startswith('l31:'): errs.append(f'dialog  {f} {at}: no a (their answer)')
            if n.get('q') in seen: warns.append(f'dialog  {f} {at}: the same choice twice: "{n.get("q")}"')
            seen.add(n.get('q'))
            if 'sk' in n and not SK.match(str(n['sk'])): errs.append(f'dialog  {f} {at}: sk "{n["sk"]}" is not "<skill> <number>"')
            if 'sk' in n and not n.get('fail'): warns.append(f'dialog  {f} {at}: a check with no fail line')
            d = n.get('do')
            if d is not None and d not in KNOWN and not str(d).startswith(PREFIX): errs.append(f'dialog  {f} {at}: do "{d}" is not an action talk.js knows')
            walk(key, n.get('then'), f'{path}[{i}].then')
    for key, e in D.items():
        if isinstance(e, dict): walk(key, e.get('ask'), '.ask')
# 4 quests
for f in glob.glob('scripts/lib/*quest*.js') + ['scripts/lib/quest-route.js', 'scripts/lib/errands.js']:
    s = open(f, errors='ignore').read()
    for m in re.finditer(r'place:\s*["\']([a-z0-9_-]+)["\']', s):
        if m.group(1) not in PLACES: errs.append(f'quest   {f}: names place "{m.group(1)}", which does not exist')
for f in glob.glob('scripts/lib/data/*.yml'):
    try: D = yaml.safe_load(open(f))
    except Exception as e: errs.append(f'data    {f}: does not parse: {e}'); continue
print(f'checked {len(code)} scripts, {len(PLACES)} places, {len(glob.glob("scripts/lib/data/dlg-*.yml"))} dialogue files')
for w in warns: print('warn ', w)
for e in errs: print('ERROR', e)
print(f'{len(errs)} errors, {len(warns)} warnings')
sys.exit(1 if errs else 0)
