# Vorchan Ship Data Correction — Revision 2

Source: original **Centauri Vorchan Warship, Version 3: 2E/SF**, page 1, from the supplied official Centauri archive. Ship identity remains 360 points, +8 initiative, +4 extra power, 10 free thrust and 2:1 engine efficiency. This is the Warship, not the +6-power Warscout.

The printed Icon Recognition legend and 281 individually extracted vector squares identify **18 physical ship systems**:

| System | Armour | Damage Boxes | Printed Output / Value |
| --- | ---: | ---: | --- |
| Plasma Accelerator, Mount 1 | 4 | 10 | 5 power |
| Port Twin Array, Mount 2 | 3 | 6 | 2 power |
| Starboard Twin Array, Mount 3 | 3 | 6 | 2 power |
| Forward Structure | 5 | 48 | — |
| Forward Port Retro Thruster | 5 | 10 | 3 thrust |
| Forward Starboard Retro Thruster | 5 | 10 | 3 thrust |
| Sensors | 6 | 20 | 8 EW; 4 power |
| Engine | 7 | 11 | 10 free thrust |
| Reactor | 7 | 12 | +4 ship surplus is in Combat Stats |
| Primary Structure | 6 | 28 | — |
| Command And Control | 6 | 12 | — |
| Hangar | 6 | 2 | 2 shuttles |
| Port Thruster | 5 | 15 | 5 thrust |
| Starboard Thruster | 5 | 15 | 5 thrust |
| Aft Structure | 4 | 44 | — |
| Aft Port Main Thruster | 4 | 8 | 5 thrust |
| Aft Starboard Main Thruster | 4 | 8 | 5 thrust |
| Aft Centre Jump Engine | 6 | 16 | 3 power |

The separate two shuttle tracks are 10 boxes each and are not included in the 281 ship-system boxes. Their printed thrust, armour and defence remain 4, 0 and 8/10 respectively.

## Corrections Applied

- Deleted the invented `retro` system. The symbol numbered 1 above the Plasma Accelerator is its firing-arc diagram, not a 1-thrust retro nozzle.
- Replaced the invented 2/3-thrust external symbols with the actual wing-root retro thrusters, rated 3 each. Removed the two false forward jump engines. There is one physical jump engine, aft centre.
- Corrected plasma capacity from 8 to 10 and side-thruster capacity from 12 to 15 each.
- Swapped the misidentified sensor/reactor tracks back to their printed identities and armour. Sensors provide 8 EW; the first purchased EW costs 9 power, not 3. With +4 spare power, purchasing one extra EW requires additional power from deactivation.
- Shared the physical thruster ratings between server and player planner. Updated retro hit-location candidates and limited jump hits to the real jump engine.
- Verified all 18 tracks against the vector squares; retained explicit `automaticCombatReady:false` because full condition/critical integration remains a separate task.

## Reproduce The Count

Run `python scripts/audit-vorchan-scs.py /path/to/centauri-vorchan-warship.pdf` with PyMuPDF installed. The generated `shared/vorchan-vector-tracks.mjs` records the PDF SHA-256, page coordinates, system regions, row counts and unique per-box IDs. It excludes the legend, weapon-card art, and separate shuttle tracks. The source PDF is not committed.

## Existing Battles

New ships save `shipDataRevision:2`. Old saves contain different system identities, capacities and EW allocations. Continuing them against revision 2 would silently reinterpret earlier results, so the API rejects further battle commands with an explanatory message. Existing records are preserved for reference/export; start a new battle to use corrected data. No existing saved damage or movement history is rewritten.

## Validation

Regression coverage checks the physical component identities, armour, unique vector squares, damage capacities, retro/jump hit candidates, six-channel movement allocation and the corrected EW power budget. The production front end is built before deployment. This change does not claim that the remaining rules audit has been implemented.
