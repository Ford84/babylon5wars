# Milestone 3 — verified-hit groundwork and audited host corrections

**Source inspection:** Directly extracted original `Ships of the Fleet/centauri primus battlecruiser.pdf`, `centauri vorchan warship.pdf` and `centauri sentri medium fighters.pdf` from `centauri_official.zip`, Version 3: 2E/SF. The Primus and Vorchan each have a printed PRIMARY chart; the Vorchan does not have a SIDE chart. The Sentri has six fighters per flight and eight flight grids per printed page (eight flights, not eight fighter slots).

## Implemented
- `shared/hit-resolution.mjs`: unbiased server-side d20 generator, individual hit chart lookup, bounded primary-chart reroll, multi-volley location planning, and damage application **only to a verified system ID with a known armour value and damage-box capacity**. Damage over the remaining boxes is returned explicitly, not silently applied to another system.
- `shared/scs.mjs`: initial private SCS system state now retains armour and box capacity, not only damage counters.
- `POST /api/games/:id/host-damage-override`: host-only correction to an attached SCS's system damage, requires 8+ character explanation, enforces damage-box bounds, synchronises public/private states, increments revision, and logs the old/new values and reason. It is deliberately a manual correction, not an automated attack resolution.
- Tests cover the primary reroll, per-volley chart rolls, armour, excess damage and unbiased dice.
- **No live deployment**. SCS migration `0003_scs_templates.sql` is a prerequisite.

## Remaining before a combat-ready Centauri battle
1. Visually transcribe **all** Primus and Vorchan system mounts, individual armour values, damage-box grids, and arcs. Text extraction alone is insufficient; verify each against the actual diagrams.
2. Correct the schema to distinguish SCS sections from chart labels (e.g. a ship may have one SIDE chart covering multiple physical facings).
3. Encode legal firing arcs, target defence, weapon datacard rules, EW modifiers and full hit-location system-choice rules.
4. Resolve standard/raking/piercing damage with armour-once-per-system and special mode exceptions, then criticals, overkill and structure collapse. Current `damage-plan.mjs` is a **planning aid**, not a certified interpretation of all exceptions.
5. Add an atomic, server-generated combat-resolution endpoint, transaction/concurrency tests, and battle-log visibility checks.
6. Integrate fighter-flight persistence and rules into games.
7. Apply D1 migration in staging, test two accounts and secret orders, then deploy deliberately.

**Source ambiguity for user verification:** The printed diagram uses numeric labels without a text legend for every number. Please verify the armour/box distinction for individual mounts before they are treated as canonical. Avoid inferring values from the positions of numbers alone.

## Deployment note
GitHub commits are development-only. Do not assume a passing Node unit test certifies source interpretation or database concurrency.
