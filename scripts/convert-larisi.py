import numpy as np,struct,json,hashlib,argparse,gzip,zipfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);args=parser.parse_args();z=zipfile.ZipFile(args.archive);src=z.read(z.namelist()[0]);n=struct.unpack_from('<I',src,80)[0];a=np.ndarray(n,dtype=[('norm','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')],buffer=src,offset=84)['v'].reshape(-1,3)
# Sub-pixel vertex welding: 0.01mm in a 16mm sculpt, preserving its silhouette.
keys=np.round(a/.01).astype('i4');_,first,inv=np.unique(keys,axis=0,return_index=True,return_inverse=True);v=a[first].astype('f4');faces=inv.reshape(-1,3);faces=faces[(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2])]
lo=v.min(0);hi=v.max(0);p=(v-(hi+lo)/2);p=np.stack([p[:,0],p[:,2],-p[:,1]],axis=1)*(.5) # 8-unit length, nose -Z, +Y up.
p[:,1]-=p[:,1].min();normal=np.zeros_like(p);cross=np.cross(p[faces[:,1]]-p[faces[:,0]],p[faces[:,2]]-p[faces[:,0]])
for i in range(3):np.add.at(normal,faces[:,i],cross)
normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-8)
x,y,z=p.T;nx=(v[:,0]-lo[0])/(hi[0]-lo[0]);fore=(v[:,1]-lo[1])/(hi[1]-lo[1]);height=(v[:,2]-lo[2])/(hi[2]-lo[2])
# Purple hull, muted gold forward band / fin tips, graphite engine recesses.
c=np.tile(np.array([79,57,111,255],dtype='u1'),(len(v),1));c[height<.2]=[49,41,63,255]
gold=((fore>.77)&(fore<.80))|((fore<.12)&((nx<.17)|(nx>.83))&(height>.45));c[gold]=[157,123,65,255]
c[(fore<.12)&(nx>.35)&(nx<.65)]=[47,49,57,255]
# Pale front observation windows, restrained rather than invented hull markings.
windows=(fore>.94)&(height>.40)&(height<.62)&((np.floor(nx*24).astype(int)%3)==0);c[windows]=[203,220,232,255]
rgb=c[:,:3].astype('f4')/255;c[:,:3]=np.round(np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)*255).astype('u1')
arrays=[p.astype('<f4'),normal.astype('<f4'),c,faces.astype('<u4').reshape(-1)];buf=b'';views=[]
for a in arrays:
 raw=a.tobytes();views.append({'buffer':0,'byteOffset':len(buf),'byteLength':len(raw),'target':34963 if len(views)==3 else 34962});buf+=raw;buf+=b' ' * ((-len(buf))%4)
access=[{'bufferView':0,'componentType':5126,'count':len(p),'type':'VEC3','min':p.min(0).tolist(),'max':p.max(0).tolist()},{'bufferView':1,'componentType':5126,'count':len(p),'type':'VEC3'},{'bufferView':2,'componentType':5121,'normalized':True,'count':len(p),'type':'VEC4'},{'bufferView':3,'componentType':5125,'count':faces.size,'type':'SCALAR'}]
g={'asset':{'version':'2.0','generator':'B5W verified first Larisi mesh conversion'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'CR-Larisi-RC1'}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'COLOR_0':2},'indices':3,'material':0}]}],'materials':[{'name':'Purple And Muted Gold','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':.32,'roughnessFactor':.58},'doubleSided':False}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':access}
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf
Path('public/models/shuttle').mkdir(parents=True,exist_ok=True);Path('public/models/shuttle/centauri-larisi-rc1.glb.gz').write_bytes(gzip.compress(out,compresslevel=9,mtime=0))
print({'source_triangles':n,'triangles':len(faces),'vertices':len(v),'bytes':len(out),'source_sha256':hashlib.sha256(src).hexdigest()})
