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
7. In the initiative phase each owner rolls an animated d20 in the browser. The server validates the submitted result, applies printed +8 and the speed penalty, persists the result for that ship and turn, increments revision and records a public audit event. The initiative phase cannot advance until all SCS/trial ships have rolled.

## Test boundary
The trial is not fully rules-resolved. Power, EW, initiative, movement and fire declarations have partial authoritative paths. Initiative, combat and overthrust dice are player-rolled and saved; the server validates their ranges and uses the saved results. The full SCS and several phase rules remain incomplete. Manual ship-tier fire records each attack and any assigned interception but does not alter the digital damage tracks. Do not claim that all combat and damage are automated.

## Next required steps
1. Finish the Vorchan's system diagram transcription, armour, sensor and engine icon values, weapon arcs and critical rules, then migrate the complete record to `scs_templates` and `initialSCSState`.
2. Complete server checks for engine/available reactor power, thruster groups, manoeuvre spending and map collisions; movement remains limited to the Vorchan trial path.
3. Resolve initiative tie roll-offs and derive actual movement ordering per ship rather than membership rank.
4. Extend automated combat through verified SCS damage, interceptions, critical hits and end-of-turn effects. The current source can record ship-tier fire manually, but does not apply its damage digitally.
5. Integration-test D1 transactions, cross-player privacy, and two-client concurrent actions.
6. Apply outstanding D1 migrations and deploy only after CI and smoke tests.

No live deployment was performed in this milestone.

## Saved two-player battle milestone — implemented in source

The source now supports a complete, persistent two-player **trial battle record** through a turn, while keeping unresolved tabletop rulings explicit:

- Every player is asked whether each applicable procedure was resolved. “No” and manual rulings require an explanation; the server validates and saves these records with the order. Fighter-only phases and checklist items are skipped for the current ship-only trial.
- After both players lock a phase, the relevant procedure records appear in a shared battle log. Fire declaration notes stay hidden until fire resolution has been recorded.
- If ship-tier fire cannot use the automatic damage path, the host can record a written result for every declared offensive attack and every assigned defensive interception. The record includes the attacking player's saved dice, consumes each used gun's readiness for the turn, and advances the battle.
- Manual fire records explicitly do **not** mark the digital damage tracks. Players must update the printed Vorchan SCS, and the saved log states that damage was not applied to digital tracks.
- The UI displays the shared phase sequence, but automatically skips fighter-only pivot and close-combat EW phases while the trial has no fighter-flight entities. Weapon selection is target-first and includes weapon data, range and hit modifiers.

This milestone is implemented in the local source only. The Node test suite passes; a production build could not run because Vite is not installed in this workspace. It has not been run through a two-browser acceptance session or deployed. Migration `0005_player_rolled_dice.sql` must be applied before player combat rolls can persist on a deployed database. The fixed Vorchan deployment remains a test setup, not a published scenario.
