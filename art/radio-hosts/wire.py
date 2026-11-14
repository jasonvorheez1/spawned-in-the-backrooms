import json, re
out=json.load(open('out.json'))
def wire(path, prefix, tag):
    rows=[v for k,v in sorted(out.items(), key=lambda kv:int(kv[0][1:])) if k.startswith(prefix)]
    src=open(path).read().split('\n')
    if any('# new-lines-386892' in l for l in src): print('already',path); return
    songs=[i for i,l in enumerate(src) if 'kind: song' in l]
    per=-(-len(rows)//len(songs)); res=[]; q=list(rows)
    for i,l in enumerate(src):
        res.append(l)
        if i in songs:
            for _ in range(per):
                if q:
                    r=q.pop(0); t=r['title'].replace('"',"'")
                    res.append(f'  - {{ kind: host, title: "{t}", dur: {r["dur"]}, clip: "{r["clip"]}" }} # new-lines-386892')
    open(path,'w').write('\n'.join(res)); print(path, len(rows), 'wired')
wire('../../scripts/lib/data/radio.yml','r','')
wire('../../scripts/lib/data/radio-party.yml','s','')
wire('../../scripts/lib/data/radio-8bit.yml','o','')
