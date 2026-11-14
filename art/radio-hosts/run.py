import subprocess, re, json, sys, urllib.parse, os
sys.path.insert(0,'.'); import lines as L
os.makedirs('/workspace/art/radio-hosts', exist_ok=True)
W='/workspace/art/radio-hosts/'
out = json.load(open('out.json')) if os.path.exists('out.json') else {}
def sh(c, t=180): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=t).stdout
def dur(p): return round(float(sh(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{p}"').strip()), 2)
def voice(text, v, name):
    o = sh(f'spawn voice --text {json.dumps(text)} --voice {v} --stability creative --name {name}')
    m = re.search(r'(/cdn/value\.[0-9a-f]+\.mp3)\n([\d.]+) s', o); return (m.group(1), float(m.group(2))) if m else (None, o[-300:])
def save(): json.dump(out, open('out.json','w'), indent=1)
for i,(t,line) in enumerate(L.SPRINKLES):
    k=f's{i}'
    if k in out: continue
    c,d = voice(line,'Laura',f'sprinkles-{i}')
    if c: out[k]={'host':'Sprinkles','title':t,'clip':c,'dur':round(d,2)}; save()
    else: print('fail',k,d)
for i,(t,line) in enumerate(L.OLEHBA):
    k=f'o{i}'
    if k in out: continue
    c,d = voice(line,'Callum',f'olehba-raw-{i}')
    if not c: print('fail',k,d); continue
    sh(f'spawn fetch {c} raw_{k}.mp3')
    sh(f'ffmpeg -y -loglevel error -i {W}raw_{k}.mp3 -af "asetrate=44100*0.8,aresample=44100,atempo=1.12,aecho=0.8:0.6:90|170:0.35|0.2,lowpass=f=6500,volume=1.3" {W}ole_{k}.mp3')
    u = sh(f'spawn upload {W}ole_{k}.mp3'); m = re.search(r'/cdn/value\.[0-9a-f]+\.mp3', u)
    if m: out[k]={'host':"Ole'hba",'title':t,'clip':m.group(0),'dur':dur(f'{W}ole_{k}.mp3')}; save()
    else: print('upfail',k,u[-200:])
P='voice-calm-warm-middle-aged-man-late-night-radio-dj-host-ralph-close-mic-saying-'
for i,(t,line) in enumerate(L.RALPH):
    k=f'r{i}'
    if k in out: continue
    c='/cdn/'+P+urllib.parse.quote(line, safe='')+'.mp3'
    sh(f'spawn fetch "{c}" ralph_{k}.mp3', 240)
    if os.path.exists(f'{W}ralph_{k}.mp3'): out[k]={'host':'Ralph','title':t,'clip':c,'dur':dur(f'{W}ralph_{k}.mp3')}; save()
    else: print('ralphfail',k)
print('done', len(out))
