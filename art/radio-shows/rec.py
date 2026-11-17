# records shows.py into out.json, then splices each block between songs in scripts/lib/data/<station>.yml
import subprocess, re, json, os, sys, time, urllib.parse, glob, yaml
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import shows as S
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out.json')
out = json.load(open(OUT)) if os.path.exists(OUT) else {}
RALPH = 'voice-calm-warm-middle-aged-man-late-night-radio-dj-host-ralph-close-mic-saying-'
def sh(c, t=300): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=t).stdout
def dur(p): return round(float(sh(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{p}"').strip()), 2)
def fetched(clip, name):
    for _ in range(40):
        o = sh(f'cd /tmp/rs && spawn fetch "{clip}" {name}.mp3', 240)
        hits = glob.glob(f'/workspace/**/{name}.mp3', recursive=True) + glob.glob(f'/tmp/rs/{name}.mp3')
        if hits: return dur(hits[0])
        time.sleep(15)
    return None
def job(j):
    key, who, text = j
    if key in out: return
    if who == 'sfx':
        clip = f'/cdn/moodboard-realistic-gritty/{text}.mp3'; d = fetched(clip, key)
    elif who == S.R:
        line = re.sub(r'\[[^\]]*\]\s*', '', text).strip(); clip = '/cdn/' + RALPH + urllib.parse.quote(line, safe='') + '.mp3'; d = fetched(clip, key)
    else:
        txt = ('[Japanese accent] ' if who in S.JP else '') + text
        o = sh(f'spawn voice --text {json.dumps(txt)} --voice {S.VOICES[who]} --stability creative --name {json.dumps("show " + key)}')
        m = re.search(r'(/cdn/value\.[0-9a-f]+\.mp3)\n([\d.]+) s', o); clip, d = (m.group(1), float(m.group(2))) if m else (None, None)
    if clip and d: out[key] = {'clip': clip, 'dur': round(d, 2), 'who': who}
    else: print('FAIL', key, who, text[:40], flush=True)
jobs = []
for st, blocks in S.SHOWS.items():
    for bi, (title, lines) in enumerate(blocks):
        for li, ln in enumerate(lines):
            jobs.append((f'{st}-{bi}-{li}', ln[0], ln[1]))
for rnd in range(3):
    with ThreadPoolExecutor(6) as ex: list(ex.map(job, jobs))
    json.dump(out, open(OUT, 'w'), indent=1)
    if all(k in out for k, _, _ in jobs): break
print('recorded', sum(k in out for k, _, _ in jobs), 'of', len(jobs), flush=True)
# splice: each block between songs, spread through the loop; a block with any line missing stays out
for st, blocks in S.SHOWS.items():
    p = f'scripts/lib/data/{st}.yml'; d = yaml.safe_load(open(p)); segs = [s for s in d['segments'] if not s.get('show')]
    songs = [i for i, s in enumerate(segs) if s['kind'] == 'song']
    ins = []
    for bi, (title, lines) in enumerate(blocks):
        keys = [f'{st}-{bi}-{li}' for li in range(len(lines))]
        if not all(k in out for k in keys): print('skip block', st, title); continue
        seg = []
        for k, ln in zip(keys, lines):
            o = out[k]; name = 'sound' if ln[0] == 'sfx' else S.NAMES[ln[0]]
            seg.append({'kind': 'host', 'title': f'{title} ({name})', 'dur': o['dur'], 'clip': o['clip'], 'show': 1})
        at = songs[min(len(songs) - 1, round((bi + 1) * len(songs) / (len(blocks) + 1)))]
        ins.append((at, seg))
    for at, seg in sorted(ins, key=lambda x: -x[0]): segs[at + 1:at + 1] = seg
    d['segments'] = segs; yaml.safe_dump(d, open(p, 'w'), width=4000, sort_keys=False, allow_unicode=True)
    talk = sum(float(s['dur']) for s in segs if s['kind'] in ('host', 'ad'))
    print(st, 'talk now', round(talk), 's', flush=True)
