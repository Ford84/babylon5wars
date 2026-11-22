# W4 combat resolution — implementation status

## Source authority
The *Babylon 5 Wars Second Edition Rules Compendium*, Combat Sequence / Weapons Fire Step / Weapons Fire Resolution / Rolling To-Hit, specifies: simultaneous declarations; ballistic attacks first, ship fire second, fighter-versus-fighter third, fighter-versus-ship last; defensive fire resolves during the incoming attack's tier; attacks in the same tier still fire if destroyed by that tier; base defence by incoming section, offensive and defensive EW, fire-control class modifier, range penalty (doubled without lock-on), additional verified defence modifiers; d20 at or below target number hits. The defender selects the direction for exact sector boundaries and must use the same choice for all fire from one source in that turn.

## Implemented
- `shared/weapon-resolution.mjs`: deterministic, non-mutating ship-tier Vorchan hit calculation from immutable declarations, defensive reservations, authoritative trial weapon histories, committed EW and verified terrain. It reports every blocked shot rather than rolling with invented data. `initialWeaponHistory` sets per-gun state for newly created Vorchan trial ships.
- `GET /api/games/:id/fire-resolution`: authenticated, phase-gated W4 preflight. It deliberately returns **no random rolls**, because terrain verification, defensive interception and persistent roll execution are not complete.
- `src/main.jsx`: renders W4 per-shot preflight and blockers during fire resolution.
- `tests/weapon-resolution.test.mjs`: repeatability, arming, plasma charge, terrain and interception fail-closed tests.

## Not implemented; W4 remains open
1. Server-authoritative, verified terrain and LOS source; same-hex previous positions; defender sector-boundary choice persisted per source/turn.
2. Per-gun arming advancement on completed turns and correct activation/deactivation reset semantics; migration or conservative blocking of legacy trial ships without history.
3. Defensive interception attack rolls and verified modifiers/weapon interactions, including how intercepts modify the incoming shot.
4. Atomic, idempotent server-side RNG and persistent roll journal with unique turn/tier/attack keys, allowing safe retry.
5. Tier-by-tier simultaneous snapshots and frozen attack sets, so same-tier destruction cannot suppress a declared shot.
6. Separate damage engine: SCS armour, system hit charts, structure tracks and criticals are not yet fully verified. Do not fabricate these or apply damage prematurely.
7. Block automatic fire-resolution phase completion until all required attacks are adjudicated; current W3 manual/unavailable procedural lock still advances.

No production merge is authorised. Staging CI must be checked separately before describing live acceptance as successful.
