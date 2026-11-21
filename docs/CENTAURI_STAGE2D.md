# Centauri stage 2D — original-sheet chart transcription

Sources inspected directly: `centauri_official.zip` → `Ships of the Fleet/centauri primus battlecruiser.pdf`, `centauri vorchan warship.pdf`, and `centauri sentri medium fighters.pdf`, all Version 3: 2E/SF.

Implemented in `shared/centauri-combat-data.mjs`:
- Primus: forward, side, aft and primary d20 hit-location tables.
- Vorchan: forward, aft and primary d20 hit-location tables (the source does **not** print a separate side chart).
- Sentri: six-fighter flight state, four armour values, linked pair of light particle guns, and printed flight-level combat fractions.
- All tables are literal, inclusive source transcriptions. A PRIMARY result means roll again on the primary chart; this module does not yet resolve the secondary roll or allocate damage to specific system boxes.
- Tests ensure that each d20 table has exact coverage and correct boundaries.

**Verification requested before full SCS conversion:** The diagrammatic individual system armour/box groups, their positions and weapon arcs cannot be reliably established from plain-text extraction. In particular, confirm the Primus and Vorchan graphical system diagrams, the printed side-hit treatment for Vorchan, and Sentri armour orientation. Avoid inventing or inferring missing data.

**Not done:** The damage tracks have not been completely transcribed; no SCS is combat-ready, no fighter flight persistence or gameplay endpoint has been integrated, no host override audit, and no live deployment. The current header records are reference data only. The live D1 migration from stage 2B remains outstanding.
