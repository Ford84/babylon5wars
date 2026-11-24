"""Verify Vorchar v2 damage tracks against the original vector PDF.
Usage: python scripts/audit-vorchar-scs.py /path/to/centauri-vorchar-warscout.pdf
Requires PyMuPDF. The original personal-use PDF is not stored in git.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
import fitz
source=Path(sys.argv[1])
page=fitz.open(source)[0]
squares=set()
for drawing in page.get_drawings():
    r=drawing['rect']
    if drawing['fill'] is not None and abs(r.width-6.75)<.02 and abs(r.height-6.75)<.02 and r.y0>230 and r.x0>100:
        squares.add(tuple(round(v,3) for v in r))
root=Path(__file__).resolve().parents[1]
tracks=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {VORCHAR_VECTOR_TRACKS as t} from './shared/vorchar-vector-tracks.mjs'; process.stdout.write(JSON.stringify(t));"],cwd=root))
assigned=[tuple(round(v,3) for v in rect) for boxes in tracks.values() for rect in boxes]
assert len(set(assigned))==len(assigned),'Duplicate damage squares'
assert set(assigned)==squares,f'Missing: {squares-set(assigned)}; Extra: {set(assigned)-squares}'
print(json.dumps({'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'totalBoxes':len(squares),'systems':{k:len(v) for k,v in tracks.items()}},indent=2))
