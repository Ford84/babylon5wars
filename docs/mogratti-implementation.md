# Mogratti Battle Frigate — Version2: 2E/SF

Source: supplied official Centauri Mogratti Battle Frigate SCS. This uncommon Mograth variant entered service in2236 and costs575 points.

| Change from Mograth | Implemented data |
| --- | --- |
| Plasma Stream replaced | Mount1 is a Plasma Accelerator: standard plasma damage,5 power, armour3,10 boxes and the printed120° forward arc. |
| Guardian Array replaced | Mount6 is a third Twin Array: two independent guns,2 power, armour4,6 boxes,360° arc, mounted in primary. It does not provide Guardian protection to other ships. |
| Spare power | +2, enabling one extra thrust point without shutting down systems. |
| Hit charts | Forward4–5 hits the accelerator; primary8–9 hits the primary Twin Array. Forward Twin Array results choose between mounts4 and5. |
| Source tracks | All200 individual squares are extracted and mapped independently from the variant's original PDF. |

The two Matter Cannons, two forward Twin Arrays, medium/agile hull, +12 initiative, one shuttle, no jump engine, thrusters, turn costs/delays and single50-box structure remain as printed. The existing purple Mograth hull model and2D silhouette are reused; no new model was supplied or claimed.

The accelerator uses the existing verified charge rules:1d10+4 at one turn,2d10+8 at two turns, or4d10+12 at three turns, minus1 damage per hex; half armour. Readiness resets on firing/deactivation, and the server rejects unavailable charge levels. This is standard damage, with no Plasma Stream raking or armour erosion. There are nine independent guns across six mounts.

The live SCS is a self-contained outlined SVG with automatic damage crosses. Its primary Twin Array uses the Twin Array critical table and per-gun destruction, not the old Guardian weapon identity. Critical summaries now obtain system and weapon types from the selected hull profile.

Run `python scripts/audit-mogratti-scs.py SOURCE.pdf` to repeat the original-vector extraction. The source SHA-256 is recorded in `mogratti-vector-tracks.mjs`.

Validation covers catalogue points,200 unique damage squares, hull/weapon replacements, correct forward/primary hit allocation, plasma charge dice and cooldown, nine readiness histories, primary-gun interception and criticals, and guided damage resolution. The authenticated SQLite Worker test creates a Mogratti/Mograth battle and completes two turns, confirming separate identities,575/450-point fleets, spare-power purchases, one shuttle each and automatic skipping of absent jump engines. Browser checks covered the575-point catalogue entry, power controls without Guardian prompts, all six weapon cards, switching the accelerator to its two-turn damage formula, and the correct variant SCS.

Existing ships, users and battles are preserved. No database migration or reset is needed.
