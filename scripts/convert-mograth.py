import numpy as np,struct,json,hashlib,argparse,gzip,zipfile
from pathlib import Path
# Model supplied by the user, sculpted by Tyrel Lohr. No geometry is generated.
parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);args=parser.parse_args();z=zipfile.ZipFile(args.archive);src=z.read(next(name for name in z.namelist() if name.endswith('/Centauri-Mograth-RC1.stl')));n=struct.unpack_from('<I',src,80)[0];a=np.ndarray(n,dtype=[('norm','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')],buffer=src,offset=84)['v'].reshape(-1,3)
# Sub-pixel vertex welding: 0.01mm in a 16mm sculpt, preserving its silhouette.
keys=np.round(a/.01).astype('i4');_,first,inv=np.unique(keys,axis=0,return_index=True,return_inverse=True);v=a[first].astype('f4');faces=inv.reshape(-1,3);faces=faces[(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2])]
lo=v.min(0);hi=v.max(0);p=(v-(hi+lo)/2);p=np.stack([p[:,0],p[:,2],-p[:,1]],axis=1)*(14/max(hi-lo)) # Tactical model, nose -Z, +Y up.
p[:,1]-=p[:,1].min();normal=np.zeros_like(p);cross=np.cross(p[faces[:,1]]-p[faces[:,0]],p[faces[:,2]]-p[faces[:,0]])
for i in range(3):np.add.at(normal,faces[:,i],cross)
normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-8)
x,y,z=p.T;nx=(v[:,0]-lo[0])/(hi[0]-lo[0]);fore=(v[:,1]-lo[1])/(hi[1]-lo[1]);height=(v[:,2]-lo[2])/(hi[2]-lo[2])
# A restrained Centauri scheme follows the sculpt: aubergine hull, lighter
# raised plates, muted brass wing tips and leading bands, graphite gun mouths.
# Smooth masks avoid painted triangle patterns on broad, sparsely tessellated plates.
low=np.clip(height/.35,0,1)[:,None];c=np.concatenate([np.array([46,32,65])+low*(np.array([89,59,119])-np.array([46,32,65])),np.full((len(v),1),255)],axis=1)
raised=np.clip((height-.55)/.4,0,1)[:,None];c[:,:3]=c[:,:3]*(1-raised*.45)+np.array([114,80,141])*(raised*.45)
tips=np.clip((np.abs(nx-.5)-.39)/.075,0,1)*np.clip(height/.25,0,1);c[:,:3]=c[:,:3]*(1-tips[:,None])+np.array([163,132,79])*tips[:,None]
c[(fore>.985)&((nx>.42)&(nx<.58))]=[42,39,49,255]
c[(fore<.025)&((nx>.34)&(nx<.66))]=[48,46,56,255]
c=np.clip(np.round(c),0,255).astype('u1')
rgb=c[:,:3].astype('f4')/255;c[:,:3]=np.round(np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)*255).astype('u1')
arrays=[p.astype('<f4'),normal.astype('<f4'),c,faces.astype('<u4').reshape(-1)];buf=b'';views=[]
for a in arrays:
 raw=a.tobytes();views.append({'buffer':0,'byteOffset':len(buf),'byteLength':len(raw),'target':34963 if len(views)==3 else 34962});buf+=raw;buf+=b' ' * ((-len(buf))%4)
access=[{'bufferView':0,'componentType':5126,'count':len(p),'type':'VEC3','min':p.min(0).tolist(),'max':p.max(0).tolist()},{'bufferView':1,'componentType':5126,'count':len(p),'type':'VEC3'},{'bufferView':2,'componentType':5121,'normalized':True,'count':len(p),'type':'VEC4'},{'bufferView':3,'componentType':5125,'count':faces.size,'type':'SCALAR'}]
g={'asset':{'version':'2.0','generator':'B5W Mograth original RC1 mesh conversion'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'CR-Mograth-RC1'}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'COLOR_0':2},'indices':3,'material':0}]}],'materials':[{'name':'Purple And Muted Gold','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':.32,'roughnessFactor':.58},'doubleSided':False}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':access}
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf
Path('public/models/mograth').mkdir(parents=True,exist_ok=True);Path('public/models/mograth/centauri-mograth-rc1.glb.gz').write_bytes(gzip.compress(out,compresslevel=9,mtime=0))
print({'source_triangles':n,'triangles':len(faces),'vertices':len(v),'bytes':len(out),'source_sha256':hashlib.sha256(src).hexdigest()})
