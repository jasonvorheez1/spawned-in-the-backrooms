import dbpf,rcol,struct,numpy as np
r=dbpf.read('0x1599a2eca2f24f510456d33bfa9304cd.package')
e=[e for e in r if e['t']==0x1d10f34 and e['g']==0][0]
ch,ex=rcol.rcol(e['data'])
def vrtf(b):
    v,st,cnt,ext=struct.unpack_from('<4I',b,4); els=[tuple(b[20+4*i:24+4*i]) for i in range(cnt)]; return st,els
def ibuf(b):
    flags=struct.unpack_from('<I',b,8)[0]
    a=np.frombuffer(b[16:],dtype='<i4' if flags&2 else '<i2').astype(np.int64)
    if flags&1: a=np.cumsum(a)&(0xffffffff if flags&2 else 0xffff)
    return a
m=ch[0]['data']; ver,n=struct.unpack_from('<2I',m,4); p=12
meshes=[]
for i in range(n):
    sz=struct.unpack_from('<I',m,p)[0]; f=struct.unpack_from('<12I',m,p+4)
    name,mat,vf,vb,ib,pt,so,sv,si,mv,vc,pc=f
    st,els=vrtf(ch[vf&0xfffffff]['data'])
    vbuf=ch[vb&0xfffffff]['data'][16:]
    idx=ibuf(ch[ib&0xfffffff]['data'])[si:si+pc*3].reshape(-1,3)
    raw=vbuf[so:so+vc*st]
    pos=np.zeros((vc,3));nor=np.zeros((vc,3));uv=np.zeros((vc,2))
    for (us,ui,fm,off) in els:
        if us==0 and fm==7:
            a=np.ndarray((vc,4),'<i2',raw,off,(st,2)).astype(float); w=a[:,3].copy(); w[w==0]=32767; pos=a[:,:3]/w[:,None]
        if us==1 and fm==5:
            a=np.ndarray((vc,4),'u1',raw,off,(st,1)).astype(float); nor=a[:,[2,1,0]]/127.5-1
        if us==2 and ui==0 and fm==6:
            uv=np.ndarray((vc,2),'<i2',raw,off,(st,2)).astype(float)
    p+=4+sz
    meshes.append(dict(i=i,mat=mat&0xfffffff,pos=pos,nor=nor,uv=uv,idx=idx-mv if False else idx))
if __name__=='__main__':
    for M in meshes:
        print(M['i'],'mat',M['mat'],'pos',M['pos'].min(0).round(3),M['pos'].max(0).round(3),'uv',M['uv'].min(0),M['uv'].max(0),'idx',M['idx'].min(),M['idx'].max(),len(M['pos']))
