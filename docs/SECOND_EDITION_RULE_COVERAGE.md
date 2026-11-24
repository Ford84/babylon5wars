# Second Edition rule coverage audit — 22 November 2026

Historical milestone. For the current playable scenario and automated rules, see [Automated Vorchan Battle](AUTOMATED_VORCHAN_BATTLE.md).

Authority: uploaded *Second Edition Rules Compendium* (Combat Sequence, Initiative, Allocation of EW Points, Movement & Maneuver), with *Kitchen Sink* as supplementary/optional procedures. This is a code coverage audit, not a claim of complete rules compliance.

| Rules domain | Code now present | Still required before playable compliance |
|---|---|---|
| Turn sequence | 23-phase registry, coordinator, fire tier lock | Resolve each phase authoritatively, simultaneously where required; post-turn state updates |
| Power | `preturn.mjs` calculations | Server power ledger, reactor/system critical effects, allocation locks |
| Initiative | `preturn.mjs`, `initiative-sequence.mjs` (per-unit speed/launch/voluntary penalties, opposing roll-off detection) | Server dice and tie roll-offs, damage modifiers, initiative-gated movement |
| EW | `preturn.mjs`, `ew-combat.mjs` (allocation, lock-on, doubled unlocked range penalty) | Validated sensor state, hidden allocation/reveal, special EW rules, attack integration |
| Movement | `movement-rules.mjs`, `movement-manoeuvres.mjs`, `orientation-manoeuvres.mjs`, `movement-executor.mjs`, `library-movement.mjs` | Complete manoeuvre integration, actual SCS thruster costs, collision/terrain, signed travel heading, persistence and simultaneous effects |
| Combat procedure | `fire-sequence.mjs` locks declarations and groups official resolution tiers | Weapon arcs, to-hit, firing restrictions, range, defence, anti-fighter fire, weapon effects, server execution |
| Damage | `damage-plan.mjs`, `hit-resolution.mjs`, `scs-diagram.mjs` | Verified armour/box grids for all systems, chart-to-section mapping, complete mode effects, automatic system state |
| Fighters | Sentri data and fighter state helpers | Flight-level manoeuvres, dropout, weapon fire, jinking, dogfights, fighter damage and hangars |
| Critical hits | `compendium-rules.mjs` eligibility | Full critical charts, effects, duration, repair, per-system application |
| Weapon technologies | Planning for raking/piercing | All published weapon datacards, modes, special rules, ammunition, firing cycle |
| Unit types | Generic SCS structure and partial Centauri | All supported hulls, fighters, bases, mines, satellites, special units |
| Miscellaneous | Phase placeholders | Jump point formation/closure, ramming, marine attacks, repairs, terrain, special manoeuvres |
| Scenarios | Map preset UI | Host-selectable server-enforced maps, deployments, victory, setup, scenario modifiers |
| Kitchen Sink optional/campaign | Phase registry and campaign map presets | Explicit opt-in rules, campaign systems, all scenario-specific procedures |

## Safety boundaries
- No rules code added in this batch has been connected to the live Cloudflare Worker or D1.
- All dice and validated characteristics must originate server-side.
- An SCS template is immutable; damage modifies the ship instance.
- Do not infer system strength reductions from the count of marked boxes.
- Do not auto-resolve a combat step if the complete necessary rule is missing.
- No production deployment or migration performed in this batch.

## This batch
- `shared/initiative-sequence.mjs`: per-unit initiative penalties, ordering, and detection of unresolved opposing ties.
- `shared/ew-combat.mjs`: pool validation, defensive/offensive modifiers, and lack-of-lock-on range-penalty doubling.
- `shared/fire-sequence.mjs`: simultaneous declaration locking and ballistic, ship, fighter-vs-fighter, fighter-vs-ship tiers.
- Unit tests added for all three modules.

The next integration gate is to make these modules operate on actual D1 game/ship state with source-verified SCS characteristics, a transactionally safe order lock, and authoritative dice.
