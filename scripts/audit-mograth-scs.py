"""Extract and verify every damage square in the official Mograth v2 SCS.
Usage: python scripts/audit-mograth-scs.py SOURCE.pdf
"""
from pathlib import Path
import collections,hashlib,json,sys
import fitz
source=Path(sys.argv[1]);page=fitz.open(source)[0]
regions={'plasma_stream':(294,275,329,297),'forward_port_thrust':(260,331,295,346),'forward_starboard_thrust':(330,331,365,346),'twin_port':(61,413,83,428),'twin_starboard':(542,412,563,427),'matter_port':(256,444,278,465),'matter_starboard':(346,444,368,465),'primary_structure':(276,518,345,553),'port_thrust':(67,528,82,563),'starboard_thrust':(542,528,557,563),'hangar':(185,529,193,537),'command':(420,524,442,552),'sensors':(189,583,217,605),'reactor':(256,582,291,604),'engine':(409,578,444,599),'guardian':(344,594,359,609),'aft_port_thrust':(248,675,284,697),'aft_starboard_thrust':(340,675,376,697)}
squares=set()
for d in page.get_drawings():
 r=d['rect']
 if d['fill'] is not None and abs(r.width-6.75)<.02 and abs(r.height-6.75)<.02 and r.y0>240:squares.add(tuple(round(v,3) for v in r))
tracks={};assigned=set()
for name,bounds in regions.items():
 boxes=sorted((b for b in squares if fitz.Rect(bounds).contains(fitz.Rect(b))),key=lambda b:(b[1],b[0]))
 assert boxes and not assigned.intersection(boxes),name
 tracks[name]=boxes;assigned.update(boxes)
assert squares==assigned,sorted(squares-assigned)
result={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'totalBoxes':len(squares),'tracks':tracks}
out=Path(__file__).resolve().parents[1]/'shared/mograth-vector-tracks.mjs';out.write_text('// Extracted from official Mograth v2 vector PDF; see scripts/audit-mograth-scs.py.\nexport const MOGRATH_VECTOR_AUDIT = '+json.dumps(result,separators=(',',':'))+';\n')
print(json.dumps({'totalBoxes':len(squares),'systems':{k:len(v) for k,v in tracks.items()}}))
