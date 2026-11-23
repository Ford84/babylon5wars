# W9 — Live Vorchan combat integration

## Implemented on development branch

1. **Verified board input.** Migration `0004_combat_executor.sql` introduces one immutable `combat_terrain` record per game/turn. The host must explicitly confirm all blocking hexes via `POST /api/games/:id/combat-terrain`; the server will not silently assume empty terrain. `GET /fire-resolution` reads the saved terrain and passes it into the real LOS/arc/EW calculation.
2. **Defender-only choices.** `POST /api/games/:id/combat-choice` checks the authenticated player owns the target, verifies the attack and server dice, validates geometric incoming direction and legal system chart candidates, and persists the choice. Boundary direction can be saved before a hit is determined, then completed with system allocation if required. Duplicate or cross-owner choices fail.
3. **Atomic ship-tier commit.** `POST /api/games/:id/combat-resolve` re-reads committed fire and defence orders, saved terrain, server dice, ship states and defender choices. It reruns authoritative targeting, blocks unresolved shots, uses the deterministic tier damage reducer, and batches all changed ship private states, per-gun last-fired history, one unique damage event and the game phase advance into a D1 transaction. A stale revision or duplicate event prevents a second commit.
4. **Interface.** The W6 weapon panel now offers explicit host terrain confirmation, defender hit-direction/system allocation, and final combat commit. It shows authoritative dice and blockers.
5. **Regression coverage.** `tests/combat-executor-integration.test.mjs` exercises ownership, illegal system choices, verified-hit preconditions, two-way simultaneous damage and deterministic replay. Existing tests cover W4 targeting, interception, W5 armour and critical eligibility.

## Rules and remaining acceptance limits

- This is the **ship-tier Vorchan** executor only: one forward Plasma Accelerator and two forward Twin Arrays, no primary/aft weapons. A ship's declared shot is not cancelled by same-tier damage.
- The original SCS transcription still has unverified system tracks. Damage into an unverified track is blocked rather than fabricated. Full critical-chart consequences are **deferred** to the critical phase and are not yet all implemented.
- Terrain is **host-confirmed**, not derived from a stored authoritative map terrain layer. That requires future map integration.
- The D1 transaction and pure reducers have automated coverage, but a **two-turn live offensive combat smoke test** and visual two-client defender-choice test remain required before claiming complete multiplayer acceptance.
- Combat is not automatically triggered on the last defender lock: after both players lock and terrain/choices are verified, the host explicitly presses **Resolve verified combat and advance**. This avoids premature phase advancement.
- Do not merge to main or deploy production without explicit approval.

## Acceptance checklist
- [x] Server rolls stored once after defensive locks
- [x] Interception affects hit threshold
- [x] Host-confirmed blocking terrain persists per turn
- [x] Defender direction and system decisions persist
- [x] Same-tier damage and per-gun readiness commit atomically with phase transition
- [x] Unique damage journal prevents duplicate commits
- [ ] Fully verified SCS and all system criticals
- [ ] Authoritative terrain automatically sourced from map state
- [ ] Two-turn live offensive combat smoke and manual two-browser acceptance
