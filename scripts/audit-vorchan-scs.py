"""Extract individual damage squares from the official Vorchan v3 vector PDF.
Usage: python scripts/audit-vorchan-scs.py /path/to/centauri-vorchan-warship.pdf
Requires PyMuPDF. The original PDF is deliberately not stored in this repository.
"""
import collections
import hashlib
import json
from pathlib import Path
import sys
import fitz

source = Path(sys.argv[1])
page = fitz.open(source)[0]
# Regions identify physical systems using the printed Icon Recognition legend.
regions = {
    'plasma_forward': (290, 248, 330, 266),
    'twin_nose_port': (274, 291, 295, 305),
    'twin_nose_starboard': (326, 291, 347, 305),
    'forward_structure': (283, 313, 338, 389),
    'forward_port_thrust': (219, 410, 253, 424),
    'forward_starboard_thrust': (367, 410, 402, 424),
    'sensors': (296, 455, 325, 490),
    'engine': (231, 492, 266, 513),
    'reactor': (353, 494, 388, 515),
    'primary_structure': (293, 505, 328, 546),
    'command': (232, 536, 267, 564),
    'hangar': (364, 543, 379, 551),
    'port_thrust': (121, 547, 143, 583),
    'starboard_thrust': (474, 550, 496, 585),
    'aft_structure': (161, 603, 460, 612),
    'aft_port_thrust': (209, 644, 238, 659),
    'aft_starboard_thrust': (382, 644, 411, 659),
    'jump_aft_centre': (296, 635, 326, 663),
}
# The PDF paints a fill and a stroke for each square: retain one fill only.
squares = set()
for drawing in page.get_drawings():
    rect = drawing['rect']
    if drawing['fill'] is not None and abs(rect.width - 6.75) < .02 and abs(rect.height - 6.75) < .02 and rect.y0 > 230 and rect.x0 > 100:
        squares.add(tuple(round(value, 3) for value in rect))
tracks = {}
assigned = set()
for system_id, bounds in regions.items():
    region = fitz.Rect(bounds)
    boxes = sorted((box for box in squares if region.contains(fitz.Rect(box))), key=lambda box: (box[1], box[0]))
    if not boxes or assigned.intersection(boxes):
        raise ValueError('Empty or overlapping region: ' + system_id)
    assigned.update(boxes)
    tracks[system_id] = {
        'region': list(bounds),
        'rows': list(collections.Counter(box[1] for box in boxes).values()),
        'boxes': [dict(id=f'{system_id}:{index + 1}', rect=list(box)) for index, box in enumerate(boxes)],
    }
if assigned != squares:
    raise ValueError(f'{len(squares - assigned)} unassigned damage squares')
manifest = {
    'source': {'publication': 'Centauri Vorchan Warship', 'revision': 'Version 3: 2E/SF', 'page': 1, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'pageSize': [page.rect.width, page.rect.height]},
    'totalBoxes': len(squares), 'tracks': tracks,
}
output = Path(__file__).resolve().parents[1] / 'shared/vorchan-vector-tracks.mjs'
output.write_text('// Generated from original vector damage squares by scripts/audit-vorchan-scs.py.\nexport const VORCHAN_VECTOR_AUDIT = ' + json.dumps(manifest, indent=2) + ';\n')
print(json.dumps({system_id: len(track['boxes']) for system_id, track in tracks.items()}))
print(f'{len(tracks)} systems; {len(squares)} unique damage squares')
