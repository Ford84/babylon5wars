# Vorchan combat engine — preparation and stage gates

Status: **preparation only**. This document does not claim that targeting, damage, critical hits or end-turn rules are implemented. Reference: *Babylon 5 Wars 2nd Edition Rules Compendium*, combat chapter (EW, Fire Control, Range Penalty, Determining What Was Hit, Armour, Marking Damage); *Kitchen Sink* Appendix A (23-phase turn sequence). Ship source: Centauri Vorchan Warship SCS Version 3: 2E/SF.

## Fixed trial scope
- Two players, one Centauri Vorchan Warship each; one Plasma Accelerator (forward 90°) and two Twin Arrays (270°, excluding aft 90°) per ship.
- The SCS's three weapon datacards/mounts are not interchangeable with the number of damageable forward thrusters. Power diamonds are costs, **not mount counts**.
- The ship data has per-component armour and damage-box counts. A missing maximum range means **no arbitrary maximum range**; to-hit penalties increase with distance.
- Keep manual adjudication available until all combat rules have been verified and tested. No unverified result should silently change authoritative battle state.

## Blocking data integrity checks (must complete before Stage 1)
1. Reconcile `VORCHAN_LIBRARY_RECORD.damageDiagram` (still says incomplete) with `VORCHAN_SCS_IDENTIFICATION.systems` (19 verified tracks); select a single canonical source for component armour, box count and per-box state. Preserve diagram geometry and source evidence separately.
2. Hit chart tokens do not currently map one-to-one to component IDs: `retro_thrust` versus `retro`, `plasma_accelerator` versus `plasma_forward`, `twin_array` versus two specific mounts, `main_thrust` versus aft thrusters, `side_thrust` versus port/starboard, and `command` etc. Add a target-class-to-eligible-components mapping with defender selection; **do not** automatically pick the first matching system. Verify chart numbers against original sheet.
3. Standardise weapon IDs (hyphenated library IDs versus underscored SCS weaponCardIds). Ensure one weapon definition per type and one unique mount ID per physical weapon.
4. Verify whether the current stored plasma weapon power value, fire-rate alternatives and damage reduction exactly match the SCS; confirm any power-diamond interpretation separately from mounting.
5. Verify orientation and boundary conventions for 90° forward and 270° forward arcs against the actual hex grid and the Compendium's firing arc edge cases. Record inclusive boundaries and tie behaviour.
6. Distinguish **unknown/not applicable** sensor strength and free thrust from numerical zero. Avoid treating blank allocation worksheets as printed sensor ratings.

## Stage 1 — targeting and hit resolution (do not start until checks above pass)
- Define pure, deterministic input/output contract: shooter position/facing, target position/facing, ship size category, selected mount, current EW allocations, lock-on status, terrain/defence modifiers, declared fire, and deterministic d20 roll.
- Validate mount exists, belongs to shooter, is powered and operational, has not exceeded its firing allowance, and target is within firing arc.
- Determine defender facing by hex bearing. Rules Compendium: on exact dividing line, target chooses the direction; this choice affects **all** fire from that attacking ship in the combat turn.
- Base to-hit from defence facing; add offensive EW, subtract defensive EW (with applicable fighter exceptions); add Fire Control for capital/heavy, medium/light, or fighter/shuttle category.
- Range penalty: round fractions **up** where a weapon uses a per-N-hex penalty; without offensive EW lock-on, **double the penalty**, not distance. Apply special defence modifiers and terrain only if their rule is supported.
- A d20 is rolled **at or below** the final to-hit number to hit. Verify any automatic-hit/miss or natural-roll exceptions before coding them.
- Return a transparent breakdown and immutable declaration/result record. Stage 1 must **not** apply damage.
- Acceptance tests: forward/side/aft bearings, exact boundary, 90° vs 270° arcs, target class FC, range 0 and non-multiple range steps, with/without lock-on, EW, disabled/unpowered mounts, no fabricated maximum range, deterministic hit/miss.

## Stage 2 — damage and hit locations
- Use the correct forward/aft/primary hit chart. Primary is a **second d20 roll**.
- When a result names multiple candidate systems, **defender chooses** an eligible system on the struck side; bearing weapons/shields preferred where rules require, destroyed systems excluded. If none, redirect to structure under the documented rule.
- Resolve one weapon volley at a time; subtract non-ablative armour per volley, shields before armour when applicable; distinguish to-hit range penalty from plasma damage falloff.
- Record box damage with owner choices where order matters; overflow, armour degradation and structural destruction must be verified before auto-resolution.
- Tests: chart coverage, secondary primary roll, choice/side restrictions, repeated volleys with fresh armour each time, overflow, simultaneous fire.

## Stage 3 — damage effects and criticals
- Track per-system operational state, damage this turn, destruction, power availability, sensor and engine degradation, weapon disablement, critical eligibility, critical roll and effect persistence.
- Criticals happen in their designated turn step, not on arbitrary receipt of damage. Do not invent unverified Vorchan-specific thresholds.
- Tests: first box damaged, zero damage after armour, destroyed weapon, reactor/engine/sensor effects, repeat hits, simultaneous fire and critical ordering.

## Stage 4 — cross-turn lifecycle
- Enforce power reassignment, firing cooldowns and alternative modes, EW reset/reallocation, repair and persistent critical effects, turn-boundary state reset and repeatable server-side replay.
- Tests: two full turns, 1/2/3-turn weapon cooldowns, repeated orders/idempotency, concurrent players, reconnect/reload, secrecy of uncommitted orders, no premature phase advance.

## Non-goals for the four-stage Vorchan trial
Fighters, ballistics, ramming, marine combat, jump-point physics, terrain variants, tractor beams, and hangar operations remain separately tracked manual phases. They are not silently counted as implemented by the four-stage ship-versus-ship milestone.

## Current known risk
`tests/ship-catalog.test.mjs` contained stale 4-mount / 18-system expectations from the earlier incorrect weapon transcription; this preparation pass updates those assertions and adds mount-to-system integrity checks. **CI execution and live multiplayer testing have not yet been verified.**
