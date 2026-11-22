# Two-player Vorchan trial — implementation and remaining blockers

## Source
The one-page official **Centauri Vorchan Warship**, Version 3: 2E/SF, supplied in `centauri_official.zip`, has been inspected directly. The source-backed record is `shared/vorchan-trial-library.mjs`.

Verified in that record: identity, class, service year, point value, ramming factor, jump delay, defence profiles, initiative bonus, extra power, engine efficiency 2/1, acceleration cost 2, pivot and roll costs, complete printed 12-speed turn cost/delay tables, hangar complement and shuttle characteristics, plasma accelerator and twin-array datacard text, and forward/aft/primary hit charts.

**Not yet verified or encoded:** every individual system's damage-box grid and armour value, precise weapon mount arcs and system IDs, sensor strength and free engine thrust, structural diagram placement, system-specific critical effects. This is **not** a complete SCS and is deliberately marked `completeForAutomaticCombat:false`. Do not fill missing values from inference.

## Setup
1. Create a new battle and invite a second player.
2. Before either player submits turn-one power orders, the host presses **Set up Vorchan trial**.
3. Server verifies exactly two game members, no ships, turn 1, power phase and current revision.
4. It creates two independent ship rows, one owned by each player, sharing the immutable Vorchan library ID. Initial hexes (3,10) facing 0 and (15,10) facing 3 are test deployment positions, **not** an official scenario.
5. Both players may inspect the ship's library record via authenticated `GET /api/games/:id/trial-ship?shipId=<id>`. This exposes the known fields and explicitly reports missing combat readiness.
6. The server computes a ship-specific power cost using `POST /api/games/:id/trial-thrust` with `{shipId,purchasedThrust}`. It does **not** spend reactor power or commit movement.
7. In the initiative phase each owner presses **Roll initiative for this ship**. Server rolls an unbiased d20, applies printed +8 and speed penalty, persists the roll for that ship and turn, increments revision and records a public audit event. The initiative phase cannot advance until all SCS/trial ships have rolled.

## Test boundary
The existing generic order/phase UI still accepts **notes**, not validated firing, movement or damage orders. Do not claim that a fully rules-resolved battle can be completed. Trial battle setup, library retrieval, individual initiative, persistent state, and power-cost previews are testable once deployed; movement and weapons fire remain manual/adjudicated.

## Next required steps
1. Finish the Vorchan's system diagram transcription, armour, sensor and engine icon values, weapon arcs and critical rules, then migrate the complete record to `scs_templates` and `initialSCSState`.
2. Connect engine/available reactor power, actual thruster groups, acceleration and manoeuvre spending, and server collision/map validation.
3. Resolve initiative tie roll-offs and derive actual movement ordering per ship rather than membership rank.
4. Connect simultaneous EW commitments, legal firing declarations, d20 attack resolution, armour and damage, critical hits, and end-of-turn effects.
5. Integration-test D1 transactions, cross-player privacy, and two-client concurrent actions.
6. Apply outstanding D1 migrations and deploy only after CI and smoke tests.

No live deployment was performed in this milestone.
