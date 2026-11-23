# W8 — Persistent server combat executor progress

## Implemented in development
- Both players' offensive fire declarations are committed secretly and revealed only after both commit.
- Defensive assignments are validated against reserved individual guns before dice. `shared/weapon-interception.mjs` applies the Vorchan Twin Array's **−2** intercept rating to one incoming attack per gun; the second gun on the same incoming attack degrades to **−1**, and later contributions cannot become positive. `shared/weapon-resolution.mjs` includes this modifier in the effective hit threshold.
- The **last defensive lock** atomically writes an immutable `vorchan_fire_roll_journal` event in the same D1 batch as the last defensive order. Each offensive gun gets its own server-generated hit d20, location d20, primary d20 and correctly sized d10 damage dice. Dice use rejection sampling to avoid modulo bias. The journal is only created once because each player may lock once; refresh reads the stored journal, not new dice.
- `GET /api/games/:id/fire-resolution` exposes the stored journal only in the revealed fire phase, alongside the targeting preflight. The W6 panel displays it.
- `shared/vorchan-tier-adjudicator.mjs` is a deterministic, immutable ship-tier damage reducer: uses recorded dice, fires from the original tier snapshot, honours declared per-target shot order, applies W5 armour and overkill and pauses at the first unresolved defender direction/system choice. Pure unit tests cover repeatability and choices.
- Offensive fire remains **phase-blocked** after both defensive locks: no silent advance to marine and no false `damageApplied` claim. Empty-fire games continue through normal phases.

## Not yet implemented / blockers to full automatic combat
- **No authoritative verified terrain/LOS snapshot** is currently persisted, so the live W4 preflight correctly marks attacks blocked. The server has not automatically established hits.
- **No authenticated defender-choice endpoint** persists boundary, side chart or system selection, so the pure damage reducer is not yet wired to the Worker.
- **No atomic SCS damage commit** has been added to ship rows; damage is not yet persisted and the phase remains blocked.
- Full SCS identification, all system-specific critical consequences, and two-turn live damage/arming acceptance remain outstanding.
- The current roll journal stores location and damage dice even for attacks that may miss. These are server rolls but are **not** evidence of a hit or damage.

## Security and rules
Source: *Second Edition Rules Compendium*, Defensive Fire and Weapons Fire Resolution; original Vorchan Version 3 SCS. Exactly one forward Plasma Accelerator and two forward Twin Array mounts. Port/starboard distinguish mounts, not hull sections. Primary and aft have no weapons. The Compendium states defensive assignments must precede attack and damage dice, and each gun may intercept only one incoming shot.

This is an **incremental persistent dice executor and pure damage adjudicator**, **not** a completed live automatic damage executor. Do not remove the phase guard or claim end-to-end combat until the remaining requirements are implemented and live tested. No production merge.
