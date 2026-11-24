# Automated Vorchan Battle

Implemented 24 November 2026. This replaces the former manual trial workflow for newly created battles.

## Connected condition and rules

`shared/ship-condition.mjs` owns the damage and critical-effect record. Movement limits, physical thruster ratings, power availability, sensor output, initiative, weapon readiness, range penalties and damage penalties derive from that record. The saved state is the source of truth; editable condition fields and host damage overrides are retired.

Damage uses the corrected original Vorchan v3 2E/SF identification and all 281 individually extracted vector boxes. Ship fire is simultaneous: weapons eligible at the frozen fire snapshot still resolve even when destroyed by another shot that turn. Eligible defender choices are processed against the damage accumulated so far, without rerolling. Armour, overkill, section loss and critical effects are applied by the engine. Ordinary damage and overthrust criticals are independent and are each resolved once when due. Engine shorts, command restrictions and containment risk carry into the following turn.

A reactor breach permits shutdown to avoid the recorded per-turn containment risk. Engine runaway acceleration is applied at movement start. Ships leaving the selected board withdraw; loss of both ships yields a draw. Weapon deactivation releases only verified system power; destroyed systems do not release power. Reactivation restarts weapon arming.

## Removed manual workflows

The active scenario exposes six phases: ship power, initiative, EW, movement, weapon orders, defence and damage. Initiative and opposing tie rolls, attack/location/damage dice, critical rolls and upkeep use server-generated dice. The engine advances after all required decisions; it skips empty defence, unavailable fire, inactive sensors and completed movement with no remaining manoeuvre.

Players choose power allocations, EW, legal manoeuvres and physical thruster distributions, gun roles, charge intervals, attack order, reserved interception and eligible defender allocations. They do not enter dice, hit numbers, damage totals, critical effects, initiative ranks, terrain JSON, free-form rulings or completion checklists. Legacy outcome-writing routes return HTTP 410. Imported templates cannot enter this scenario.

EW and weapon commitments are hidden from the opponent until reveal. Commands require membership, ownership, the current revision and the correct phase. A D1 revision trigger and batch transaction protect the authoritative snapshot, ship mirrors and event journal against concurrent or duplicate submission. Dice and legitimate pending damage choices survive reload.

## Simplified presentation

The current-action panel shows tracked choices and their costs. The phase strip, map, concise ship status and battle log show the resulting state. The live SCS uses its original colours and crosses individual boxes directly from the saved damage tracks; weapon mounts and the component register remain available on demand. Starting hexes are chosen on the minimap, with facing selected alongside them.

## Explicit scenario limits

Only two corrected Vorchans in clear space are supported. Fighters, ballistic units, jump operations, ramming, boarding, shuttle operations and terrain effects are not enabled. Their untracked procedures are absent from the player flow. Jump-engine deactivation is available because its verified power expenditure affects the ship budget, even though jumping is not a scenario action. Hangar damage is recorded; no hangar-operation prompts are presented.

Both supplied printed basic weapon-critical charts omit modified result 13. This scenario explicitly treats 13 as **no additional effect**. That is a deterministic scenario interpretation, not a verified official erratum. The scenario rules and any affected critical journal entry disclose it. All weapons begin fully armed.

Existing active battles remain preserved as earlier-version records. Create new ships and a new battle for automation rather than guessing how to migrate manual historical outcomes.

## Verification

The suite covers authenticated two-player setup and complete turns against SQLite, private commitments, secure server dice, simultaneous damage, defender-choice persistence, criticals, independent overthrust checks, command failure, reactor shutdown and containment, runaway engines, weapon reactivation, interception, withdrawal and duplicate/concurrent revision transactions. Existing geometry, arming, damage-chart and movement tests remain in the suite.

Browser checks used a local fixture composed from the production action panels and reducers: power, initiative, EW, legal acceleration and movement, weapon presentation and the live SCS with three marked retro-thruster boxes. Real authentication and persistence were checked through the Worker API integration tests; the browser fixture did not use production accounts.
