# Vorchan SCS identification — diagram audit

Source: official Centauri Vorchan Warship, Version 3: 2E/SF, original PDF `centauri vorchan warship.pdf` (one page). All armour is the **circled** number beside the corresponding icon, and each small printed square represents one damage box. A number printed **inside** an icon is not necessarily armour.

`shared/vorchan-scs-identification.mjs` records eighteen separately identified diagram components, with unique IDs and armour, and row-by-row counts for fifteen uncomplicated system tracks. It intentionally leaves the three irregular structure grids uncounted until a final cell-by-cell audit. A failed completeness flag prevents automatic combat from using an incomplete track.

The identified systems are: forward retro thruster, two forward Plasma Accelerators, forward structure, two Twin Arrays, primary hangar, engine, reactor, sensors, C&C, primary structure, port and starboard thrusters, aft structure, two aft thrusters, and jump engine.

The official printed values for ship stats, speed turn tables, weapon data, and hit-location charts are in `shared/vorchan-trial-library.mjs`. Corrected the Plasma Accelerator count to **two mounts**, as shown by two icons on the original diagram. The trial retrieval endpoint now includes `scsIdentification` and `scsAudit`.

Still required to certify this as a **complete** SCS:
- Count and independently verify all squares in the irregular forward, primary and aft structure tracks.
- Verify weapon mount firing arcs from the appropriate rules/source conventions; the diagram alone does not mark every arc.
- Verify sensor EW rating and engine free thrust from applicable rules/ship references. The printed 2/1 engine efficiency is a **power-to-thrust ratio**, not an engine free-thrust value.
- Identify whether any icon annotations (e.g. diamond numbers, weapon icon values) affect the associated subsystem beyond its damage boxes.
- Convert the verified diagram to the canonical `validateSCS` schema and attach it to each trial ship, without inventing missing values.
- Integrate the full damage/critical engine with each ship instance.

**Movement design clarification:** the player chooses each hex movement, turn, slide, pivot and roll. The server checks costs and legality and records the chosen action. It must not automatically move the ship along its full speed path. Existing straight-line movement executor is only a validation/planning helper and must not be wired to an automatic move-all-hexes UI.

No production deployment performed.
