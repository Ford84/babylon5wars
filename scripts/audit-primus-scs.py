"""Extract every ship-system square from the official Primus v3 SCS (excluding shuttle inset)."""
from pathlib import Path
import hashlib,json,sys,fitz
source=Path(sys.argv[1]);p=fitz.open(source)[0]
regions={'forward_port_thrust':(238,180,273,195),'forward_starboard_thrust':(348,180,383,195),'twin_5':(242,259,264,274),'twin_6':(229,311,251,326),'twin_7':(357,259,379,274),'twin_8':(371,311,393,326),'forward_structure':(269,318,352,346),'hangar':(242,392,271,420),'reactor':(344,391,378,426),'engine':(292,422,327,450),'port_structure':(175,419,203,515),'starboard_structure':(411,419,440,515),'command':(332,473,360,508),'sensors':(254,477,282,512),'primary_structure':(294,525,329,580),'port_thrust':(177,528,199,563),'starboard_thrust':(416,528,437,563),'laser_1':(83,473,104,495),'laser_2':(53,545,75,566),'laser_3':(515,473,536,495),'laser_4':(546,545,568,566),'twin_9':(125,525,147,540),'twin_10':(125,579,147,593),'twin_11':(474,524,496,539),'twin_12':(474,578,496,592),'jump_aft_centre':(293,624,328,659),'aft_port_outer_thrust':(166,635,194,650),'aft_starboard_outer_thrust':(425,635,453,650),'aft_port_thrust':(222,682,250,697),'aft_starboard_thrust':(368,682,397,697),'aft_structure':(296,691,325,760)}
squares=set()
for d in p.get_drawings():
 r=d['rect']
 if d['fill'] is not None and abs(r.width-6.75)<.02 and abs(r.height-6.75)<.02 and r.y0>175 and not (200<r.y0<220):squares.add(tuple(round(v,3) for v in r))
tracks={};assigned=set()
for name,bounds in regions.items():
 boxes=sorted((b for b in squares if fitz.Rect(bounds).contains(fitz.Rect(b))),key=lambda b:(b[1],b[0]))
 assert boxes and not assigned.intersection(boxes),name
 tracks[name]=boxes;assigned.update(boxes)
assert squares==assigned,sorted(squares-assigned)
result={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'totalBoxes':len(squares),'tracks':tracks}
(Path(__file__).resolve().parents[1]/'shared/primus-vector-tracks.mjs').write_text('// Original Primus v3 vector squares; see scripts/audit-primus-scs.py.\nexport const PRIMUS_VECTOR_AUDIT = '+json.dumps(result,separators=(',',':'))+';\n')
print(json.dumps({'totalBoxes':len(squares),'systems':{k:len(v) for k,v in tracks.items()}}))
