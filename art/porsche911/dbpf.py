import struct,zlib
def refpack(src):
    p=0
    flags=src[0]; p=2
    if flags&0x80: size=int.from_bytes(src[p:p+4],'big'); p+=4
    else: size=int.from_bytes(src[p:p+3],'big'); p+=3
    out=bytearray()
    while p<len(src):
        b0=src[p]
        if b0<0x80:
            b1=src[p+1]; p+=2
            pl=b0&3; cl=((b0>>2)&7)+3; off=((b0&0x60)<<3)+b1+1
        elif b0<0xC0:
            b1,b2=src[p+1],src[p+2]; p+=3
            pl=b1>>6; cl=(b0&0x3f)+4; off=((b1&0x3f)<<8)+b2+1
        elif b0<0xE0:
            b1,b2,b3=src[p+1],src[p+2],src[p+3]; p+=4
            pl=b0&3; cl=((b0&0x0c)<<6)+b3+5; off=((b0&0x10)<<12)+(b1<<8)+b2+1
        elif b0<0xFC:
            p+=1; pl=((b0&0x1f)<<2)+4; cl=0; off=0
        else:
            p+=1; pl=b0&3; cl=0; off=0
        out+=src[p:p+pl]; p+=pl
        for i in range(cl): out.append(out[-off])
        if b0>=0xFC: break
    return bytes(out)
def read(path):
    d=open(path,'rb').read()
    cnt=struct.unpack_from('<I',d,36)[0]; ipos=struct.unpack_from('<I',d,64)[0] or struct.unpack_from('<I',d,40)[0]
    p=ipos; flags=struct.unpack_from('<I',d,p)[0]; p+=4
    const=[None]*4
    for i in range(4):
        if flags&(1<<i): const[i]=struct.unpack_from('<I',d,p)[0]; p+=4
    res=[]
    for _ in range(cnt):
        v=[]
        for i in range(4):
            if const[i] is None: v.append(struct.unpack_from('<I',d,p)[0]); p+=4
            else: v.append(const[i])
        off,fs,ms=struct.unpack_from('<III',d,p); comp=struct.unpack_from('<H',d,p+12)[0]; p+=16
        fs&=0x7fffffff
        raw=d[off:off+fs]
        if comp==0x5A42: data=zlib.decompress(raw)
        elif comp==0xFFFF: data=refpack(raw)
        else: data=raw
        res.append(dict(t=v[0],g=v[1],i=(v[2]<<32)|v[3],data=data,comp=comp,ms=ms))
    return res
