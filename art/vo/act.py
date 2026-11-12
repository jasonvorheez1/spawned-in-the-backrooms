# Records every named person's dialogue with spawn voice (the tape method) into scripts/lib/data/voice-acted.yml.
# usage: python3 art/vo/act.py [--dry-run] [id-prefix ...]
# Existing takes are skipped. Dialogue and camp chatter share the same cast.
import yaml, glob, re, subprocess, sys, os, json
from concurrent.futures import ThreadPoolExecutor
CAST = yaml.safe_load(open('scripts/lib/data/voice-cast.yml'))
OUT = 'scripts/lib/data/voice-acted.yml'
done = yaml.safe_load(open(OUT)) if os.path.exists(OUT) else {}
done = done or {}
import base64
PACK = lambda h: base64.urlsafe_b64encode(bytes.fromhex(h)).decode().rstrip('=') if re.fullmatch(r'[0-9a-f]{64}', h) else h  # voices.js decodes; keeps every level's load small
NUM = ['zero','one','two','three','four','five','six','seven','eight','nine']
def jhash(s):
    h = 7
    for c in s: h = (h * 31 + ord(c)) & 0xffffffff
    return h
def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        n, r = divmod(n, 36); o = d[r] + o
        if not n: return o
def slug(line, n=180):
    s = str(line)[:n]; s = re.sub(r'\d', lambda m: ' ' + NUM[int(m.group())] + ' ', s)
    s = re.sub(r'[^a-zA-Z ]', ' ', s).strip().lower(); return re.sub(r' +', '-', s)
MOOD = {'hurt': 'pained', 'death': 'dying, weak', 'spot': 'alarmed', 'hostile': 'angry', 'hit': 'brief and pained', 'kill': 'cold', 'flee': 'panicked', 'drawn': 'tense', 'clear': 'relieved', 'insult': 'offended', 'gift': 'touched', 'dance': 'playful', 'fail': '', 'cold': 'cool', 'warm': 'warm', 'sneak': 'whispering'}
SKIP = {'q', 'do', 'sk'}
jobs = []
def walk(x, who, key):
    if isinstance(x, dict):
        for k, v in x.items():
            if k not in SKIP: walk(v, who, k)
    elif isinstance(x, list):
        for v in x: walk(v, who, key)
    elif isinstance(x, str) and x.strip():
        jobs.append((who, key, x))
dry_run = '--dry-run' in sys.argv
pre = [arg for arg in sys.argv[1:] if arg != '--dry-run']
def cast_member(who):
    return who in CAST and (not pre or any(who.startswith(p) for p in pre))
for f in sorted(glob.glob('scripts/lib/data/dlg-*.yml')):
    for who, d in (yaml.safe_load(open(f, encoding='utf-8')) or {}).items():
        if cast_member(who): walk(d, who, '')
for exchanges in yaml.safe_load(open('scripts/lib/data/chatter.yml', encoding='utf-8')).values():
    if not isinstance(exchanges, list): continue
    for exchange in exchanges:
        for who, line in exchange:
            if cast_member(who): jobs.append((who, 'chatter', line))
# quest replies written in the level quest handlers: the speaker is the nearest id === "<npc>" above the reply (Nov 12, Shelly: level 1 voice acted)
for f in sorted(glob.glob('scripts/lib/level*-quests.js')):
    cur = None
    for ln in open(f, encoding='utf-8'):
        m = re.findall(r'id === "([a-z0-9-]+)"', ln)
        if m: cur = m[-1]
        if not cur or not cast_member(cur): continue
        for q in re.findall(r'(?:reply: |\? |: )"((?:[^"\\]|\\.)+)"', ln):
            if 'reply' in ln and len(q.split()) > 2: jobs.append((cur, 'quest', q.replace('\\"', '"')))
real = lambda sl: any(len(w) >= 3 and re.search('[aeiouy]', w) and not re.match(r'^(hmm+|mmm*|uhh*|umm*|hm+|ahh*|ohh*|erm*)$', w) for w in sl.split('-'))
todo, seen = [], set()
for who, key, line in jobs:
    k = b36(jhash(who + '|' + slug(line)))
    if k in done or k in seen or not real(slug(line)): continue
    seen.add(k); todo.append((k, who, key, line))
print('lines to record:', len(todo), 'already:', len(done), flush=True)
if dry_run: sys.exit(0)
def rec(j):
    k, who, key, line = j; v, tag = CAST[who]; mood = MOOD.get(key, '')
    delivery = 'grounded' if mood else 'natural conversational'
    txt = f"[{', '.join(part for part in (delivery, tag, mood) if part)}] {line}"
    for _ in range(3):
        r = subprocess.run(['spawn', 'voice', txt, '--voice', v, '--name', 'vo ' + who + ' ' + slug(line, 40)], capture_output=True, text=True)
        m = re.search(r'/cdn/value\.([0-9a-f]+)\.mp3', r.stdout)
        if m: return k, m.group(1)
    print('FAIL', who, line[:50], r.stdout[-200:], r.stderr[-200:], flush=True); return k, None
n = 0
with ThreadPoolExecutor(8) as ex:
    for k, url in ex.map(rec, todo):
        if url: done[k] = PACK(url)
        n += 1
        if n % 50 == 0:
            yaml.safe_dump(done, open(OUT, 'w'), width=400, sort_keys=True); print(n, flush=True)
yaml.safe_dump(done, open(OUT, 'w'), width=400, sort_keys=True)
print('recorded', len(done), flush=True)
