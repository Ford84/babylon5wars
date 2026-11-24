# Mograth Frigate — Version 2: 2E/SF

The supplied official SCS spells the ship **Mograth**. It is selectable alongside Vorchan and Vorchar in either player's fleet, at 450 points including its one unarmed shuttle.

## Source Data

Medium, agile ship; service 2195; initiative +12; defence 12 in all aspects; 8 sensors requiring 4 power; free thrust10; no spare power; engine efficiency2/1; acceleration2; turn cost and delay1/3; immediate pivot2 per60° and roll2; no jump engine. Skin dancing has no eligible enormous targets in the current catalogue; ramming and boarding remain outside the scenario.

All197 damage squares were extracted from the original vector PDF, with source hash stored in `mograth-vector-tracks.mjs`. Run `python scripts/audit-mograth-scs.py SOURCE.pdf` to reproduce. The single50-box structure is used from both forward and aft charts. Sensors have12 boxes, plasma stream9, matter cannons7 each, twin arrays6 each and Guardian4. The SCS is an outlined, font-independent SVG; live marks and permanent armour reductions use the ship's actual tracks.

## Weapons

| Mount | Weapon | Engine behaviour |
| --- | --- | --- |
|1|Plasma Stream|3d10+4 minus range; Raking(5); two-turn reload; one damage roll followed by a separate animated location roll and defender choice for each sub-volley. Every sub-volley applies half the current armour. Every full5 points reaching a system reduces its armour by1 immediately and permanently, after that sub-volley's mitigation. A partial sub-volley does not erode armour. Against shuttles, use one standard volley.|
|2,3|Matter Cannon|2d10+2; two-turn reload; range−1 per2hexes, rounded up; ignores all armour; excess damage is discarded at the struck system.|
|4,5|Twin Array|Two independent guns per mount; existing standard damage, interception and twin critical rules.|
|6|Guardian Array|Defensive interception−3, including eligible friendly-bound shots. Guardian must cover the shooter, occupy the same incoming aspect of the protected unit, and be closer to the shooter. Same-hex positions use saved approaches and entry order. No passive energy web. Offensive mode only targets fighters/shuttles, with1d10+5 and FC+8.|

Guardian mode is chosen in power allocation. The starting mode is immediately available; changing it later deactivates the array for one full turn. Mode and arming state persist. Defensive reservations cannot be reused, and interception degradation applies across all guns assigned to one shot.

Printed arcs are represented in60° hex sectors: plasma stream120° forward, port/starboard matter cannons120° each, port/starboard twin arrays240° each, Guardian360°. Rolled orientation mirrors asymmetric weapon arcs.

## Movement And Combat Timing

Agile snap turns120°/180° cost2×/3× a normal turn, without increasing delay. Pivots up to180° and rolls complete immediately. A turn into an existing halted pivot aligns travel to facing for normal turn cost. Thrust is charged to the printed physical thrusters; agile roll/pivot fire penalties last through that turn.

Combat preserves immutable firing capability snapshots for simultaneous return fire. Plasma-stream armour erosion is an immediate damage-resolution effect and therefore applies to subsequent volleys in the same turn, including opposing fire. Saved sub-volley journals allow the final authoritative reducer to reproduce exactly the displayed damage without rerolling. Weapon effects include a plasma effect for the stream.

## Model

The user's standard `Centauri-Mograth-RC1.stl` is preserved, welded for size, converted to compressed GLB, and painted in purple with lighter raised plates, dark recesses and restrained brass wing tips. The alternate `-H` sculpt is not used. The map chooses the Mograth model by hull identity; global Vorchan model selection does not replace it. A separate2D silhouette is provided. Reproduce with `scripts/convert-mograth.py ORIGINAL.zip`; original sculpt attribution accompanies the model.

## Verification

Tests cover fleet points, original tracks, eight individual guns, two-turn arming, single-structure routing, medium fire control, matter overkill, permanent armour erosion, saved raking prompts, Guardian modes/geometry, same-hex arrival order, agile movement, rolled arcs and two complete turns. The authenticated Worker API test covers catalogue setup, initial shuttle count, absent jump prompts, animated-roll state persistence, replay conflicts and raking journal completion.

Browser checks exercised fleet selection and points, power modes, agile options, all six weapon cards, attack/damage animation and the raking location prompt, and the live SCS. The browser environment lacks WebGL; the GLB was additionally imported and rendered in Blender to inspect its actual geometry and materials. The source model, GLB attributes and tactical dimensions are checked independently.

Existing users, battles and Vorchan/Vorchar ship data revisions are preserved. No database migration or reset is required.
