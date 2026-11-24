"""Rebuild the source SCS with self-contained lettering outlines.
Usage: python scripts/build-scs-outlines.py source.pdf output.svg
Requires PyMuPDF and fontTools; uses the supplied City fonts, not PDF fallbacks.
"""
import sys,math,statistics,xml.etree.ElementTree as E
from pathlib import Path
import fitz
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parents[1]
ns='http://www.w3.org/2000/svg';tag=lambda n:'{'+ns+'}'+n
E.register_namespace('',ns);E.register_namespace('xlink','http://www.w3.org/1999/xlink')
p=fitz.open(sys.argv[1])[0];svg=E.fromstring(p.get_svg_image(text_as_path=False))
fonts={'City':TTFont(root/'public/fonts/city-medium.ttf'),'Other':TTFont(root/'public/fonts/city-regular.ttf'),'OCR':TTFont('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf')}
defs=E.Element(tag('defs'));svg.insert(0,defs);cache={}
for parent in list(svg.iter()):
 for text in list(parent):
  if text.tag!=tag('text'):continue
  family=text.get('font-family','City');font=fonts.get(family,fonts['Other']);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm;size=float(text.get('font-size','10'));italic=text.get('font-style')=='italic'
  group=E.Element(tag('g'),{k:v for k,v in text.attrib.items() if k in ('transform','fill','opacity','clip-path')})
  for span in text.findall(tag('tspan')):
   chars=(span.text or '').replace('\ufffd',' ');xs=[float(v) for v in span.get('x','0').split()];ys=[float(v) for v in span.get('y','0').split()];ratios=[]
   for i,ch in enumerate(chars[:-1]):
    name=cmap.get(ord(ch),'space');advance=font['hmtx'][name][0]*size/units
    if i+1<len(xs) and advance>0 and xs[i+1]>xs[i]:ratios.append((xs[i+1]-xs[i])/advance)
   default=min(1,statistics.median(ratios)) if ratios else 1
   for i,ch in enumerate(chars):
    name=cmap.get(ord(ch),'space');key=(family,name,italic)
    if key not in cache:
     pen=SVGPathPen(glyphs);out=TransformPen(pen,(1,0,.18,1,0,0)) if italic else pen;glyphs[name].draw(out);gid='scs-letter-'+str(len(cache));E.SubElement(defs,tag('path'),{'id':gid,'d':pen.getCommands()});cache[key]=gid
    advance=font['hmtx'][name][0]*size/units;x=xs[min(i,len(xs)-1)];y=ys[min(i,len(ys)-1)];scale=1
    if family!='City':scale=min(1,(xs[i+1]-x)/advance) if i+1<len(xs) and advance>0 else default
    E.SubElement(group,tag('use'),{'{http://www.w3.org/1999/xlink}href':'#'+cache[key],'transform':f'matrix({size/units*scale} 0 0 {-size/units} {x} {y})'})
  parent.insert(list(parent).index(text),group);parent.remove(text)
svg.set('role','img');E.SubElement(svg,tag('title')).text='Vorchan Control Sheet — Embedded Lettering Outlines'
E.ElementTree(svg).write(sys.argv[2],encoding='utf-8',xml_declaration=True)
print('Embedded',len(cache),'glyph outlines; no browser fonts required')
