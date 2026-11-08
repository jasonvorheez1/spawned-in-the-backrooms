import struct
def rcol(b):
    ver,pub,unused,ext,inn=struct.unpack_from('<5I',b,0); p=20
    tgis=[]
    for _ in range(inn+ext):
        i,t,g=struct.unpack_from('<QII',b,p); p+=16; tgis.append((t,g,i))
    chunks=[]
    for k in range(inn):
        o,s=struct.unpack_from('<II',b,p); p+=8
        chunks.append(dict(t=tgis[k][0],i=tgis[k][2],data=b[o:o+s]))
    return chunks,tgis[inn:]
