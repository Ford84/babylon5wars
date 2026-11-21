# Rules milestone 2A — pre-turn calculation layer

Source: *Babylon 5 Wars Second Edition Rules Compendium*, chapters **Pre-Turn Activities**, **Ship Power**, **Initiative**, **Electronic Warfare**.

Implemented in `shared/preturn.mjs`:
- Power shortage and system deactivation arithmetic; destroyed systems cannot be used to recover power; undeactivatable systems cannot be switched off.
- Sensor EW production, offensive/defensive/close-combat EW allocation totals, and extra EW purchase costs using the sensor's **original** rating.
- Per-unit d20 initiative with SCS initiative bonus, speed-below-five penalty, immobile exception, voluntary reduction (maximum 20), and supplied situational modifiers.
- Ascending movement order and explicit unresolved initiative ties.
- Authenticated `POST /api/rules/preturn` read-only calculator, operations `power`, `ew`, `initiative`, `initiative-order`. Returns `authoritative:false` until the ship sheet is verified and values persisted.

**Not yet implemented or claimed complete:** SCS schema and import; reactor and sensor damage state persistence; power expenditures across extra thrust/EW/weapons; actual initiative dice rolled and stored server-side; tied-unit roll-offs; ship movement and turn costs; secret EW validation against enemy unit IDs; CCEW 10-hex target eligibility; firing, combat and damage. Existing generic phase orders remain placeholders and do not invoke these calculators automatically. No database migration or live deployment in this milestone.

**Host overrides:** design agreed, but not yet implemented. Must be audited, restricted to host, and distinguish manual exceptions from computed results.

Before integration: design the canonical SCS schema, ensure all numerical values are server-authoritative, add atomic phase resolution, and create rulebook comparison tests. Avoid accepting player-supplied initiative die rolls in live games.
