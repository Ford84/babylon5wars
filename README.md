# Babylon 5 RPG — Space Combat (Quick Combat prototype)

A **separate Cloudflare Worker and D1 database** derived from the asynchronous multiplayer approach of `Ford84/babylon5wars`. This tree deliberately removes all B5 Wars rules, SCS and hex-movement modules. The app uses a one-minute-round initiative/order structure, three RPG range bands, and a subset of the 2006 Babylon 5 RPG Second Edition Quick Space Combat procedures (Core Rules, pages 180–209, particularly pages 183, 186–190 and 194–199).

## Implemented
* Login, accounts, private games and invitation-based membership.
* Persistent ships owned by individual players; hosts input ship statistics from their lawful source (no copyrighted ship tables are bundled).
* Server-side d20 Sensor initiative; one ship acts in initiative order at a time, with a configurable published order allowance of 1–5.
* Close For Battle, Pull Back, All Hands…Fire At Will!, Extreme Measures! (Quick-mode stress ignored), and pass/finish.
* Quick-combat weapon attack checks, simplified total offence and armour versus structure; server-generated unbiased dice, persisted action ledger.
* Stale-revision protection with an operation-ID gate in atomic D1 batches. Refresh resumes play.

## Incomplete / known limitations
* This is a playable **subset**, not full 2e rules compliance. Ship characteristics, sensors and weapons must be manually verified. All ships are assumed mutually aware at setup; hidden sensor detection is not automated.
* Fleet/wing logic, crew roles, targeting locks, linked modes, defence systems, all specialist weapon traits, full structural location/impairment rules, responses, hit-location GM decisions and scenario victory are NOT implemented.
* RPG Quick Combat ignores special weapon qualities; this app applies that simplification. The engine's attack and damage results are not suitable for full combat campaigns.
* Initiative ties are re-rolled in this prototype, a temporary procedural simplification requiring review.
* Prototype login lacks production security review, rate limits, account recovery, password reset, email verification or 2FA. Keep deployment private until reviewed.
* R2 image bucket is provisioned but no upload UI is provided yet.

## Deployment
This is a zero-dependency Worker; `npx wrangler deploy` with `wrangler.jsonc` publishes it. The D1 schema is in `migrations/0001_init.sql` and has already been applied separately to the isolated database. Do **not** reapply the live schema without checking migration history. `node --check worker/index.mjs` checks JavaScript syntax.

## Repository creation
The connected GitHub integration lacks a create-repository action; this source is temporarily held as a CLEAN, separate `rpg/space-combat` branch of the original GitHub repo. It does not alter the source repo's main or existing staging branches. Transfer this branch to a new repository when that action becomes available.

## Ship presets (Core Rules + Tri-Star)
The battle-setup screen now includes a **Preloaded ship** drop-down with **29 spacecraft** from the *Babylon 5 RPG, Second Edition Core Rules* (printed pp. 216–230), and the **Tri-Star Superiority Fighter** from Clark's Second Edition character sheet. The catalogue endpoint is `GET /api/ship-presets`; ships are grouped by faction in the selector. Selecting a ship fills the ship name and the editable stats JSON field. Manual custom ships are still supported.

The source catalogue preserves structural areas, individual weapon mounts, special traits and the page or character-sheet reference. The Quick Space Combat implementation currently resolves only basic weapon damage and ignores many special weapon modes, shields, defensive interceptors, fire restrictions, and specialised orders. Special-effect-only guns are deliberately **not fired automatically**. Clark's Tri-Star uses published **Defence 40**, **Armour 27 with shields** (14 otherwise), **Sensors +7** crew-capped (+21 installed), **Stealth 48 with equipment** (38 otherwise), **52 current structural spaces** (60 maximum), and the sheet's listed front weapons and turret shield systems. The optional rear Photonic Mine Layer is mentioned but not enabled.

**Source issue:** The Core Rules appear to print Minbari warrior-caste crew values for the Narn Frazi fighter. This discrepancy is annotated rather than silently changed.

## Enhanced weapons experiment (2026-11-22)

A per-attack **Enhanced weapons** mode has been added without removing the published Quick Space Combat choice. The mode uses the source's **Rapid Fire X** extra attack rolls at -5, **critical-hit confirmation**, **half-Offence subsequent hits** in a barrage, **Beam XdX** armour erosion, **Electro-Pulse** checks and **Interceptor** reductions. The following new orders are selectable: **Fire Interceptors!**, **Lock Weapons!** and **Shake The Lock!**. The latter two currently use provisional simplified checks; they must be corrected against the full printed orders before rules-compliant release. Targeting computer bonuses are parsed from preset features and apply only to locked non-Array guns.

**Not yet rules-compliant:** the interception implementation uses a single automatically selected available interceptor and a Training check rather than the full player-choice/Operations (gunnery) process. Beam damage is applied as a simplified per-hit armour erosion, not yet reconciled with every printed timing interaction. Electro-Pulse counts lost control spaces but does not impair control systems or enforce all associated penalties. The game does not yet distinguish solo-pilot versus full-crew skill modifiers, and it does not model persistent damage to individual mounts, lock range/sensor detection, fleet support, fire selection by mount, or response orders. The UI labels this mode **Enhanced** and the event log marks it **enhanced-experimental**; it is not a complete full-combat rules mode.

### Remaining rules assessment (Space Combat chapter, Core Rules 2e pp. 180–209)

These are **implementation work packages**, not a count of every printed paragraph or rule:

1. **Detection and stealth** — sensors, visibility, detection state, countermeasures, special stealth.
2. **Initiative and turn structure** — initiative ties, command timing, multiple actions and held orders.
3. **Full response-order engine** — interrupt windows, opposed Tactics, ordering, target restrictions, async policy.
4. **Shipboard crew skills** — solo/crew distinctions, Operations specialties, proficiency, crew stations.
5. **Full movement and positioning** — range-band relative centre, pivots, arcs, retreat, positioning exceptions.
6. **Offensive order catalogue** — Broadsides, Concentrate, linked tactics, Fire Main Gun and other full orders.
7. **Defensive order catalogue** — Defensive Position, Fire Interceptors details, screens, lock shaking.
8. **Tactical order catalogue** — Pivot, boarding, repairs, launch, jump, and remaining printed orders.
9. **Weapons targeting** — locks, targeting computers, stealth, legal mount selection, fire restrictions.
10. **Special weapon qualities** — complete Array, Beam, Electro-Pulse, Rapid Fire, interceptors and all exceptions.
11. **Structural location damage** — 2d6 damage table, spillover, random weapon arcs, player allocation.
12. **Damage consequences** — impairment checks, destroyed areas, crew casualties, special features, armour.
13. **Stress and technical checks** — failures, recovery, environmental effects.
14. **Fighters, wings and fleets** — squadron mechanics, fighter screens, launching and coordination.
15. **Boarding, repairs and post-battle resolution** — related actions, adjudication, persistence.
16. **Nonstandard ship abilities** — adaptive armour, shields, jamming, self-repair, biological/advanced drives.
17. **Battle lifecycle and victory** — objectives, neutralisation versus destruction, disengagement, GM choice.
18. **Verification and multiplayer hardening** — official example fixtures, regression tests, async concurrency, permissions.

This is a **conservative 18-work-package backlog**, not 18 missing rules. The first version implements portions of several packages but fully closes none of the advanced packages.

## Structural damage milestone (2026-11-22)

Enhanced mode now creates a persistent per-ship `damageState` inside `stats_json` when the first structural hit occurs. It reads initial Engines, Control, Crew, Cargo, Hangar and Weapons totals from the preset's `structuralAreas` string; each incoming barrage rolls 2d6 on the printed Random Craft Damage table (Core Rules 2e pp. 190–193), records losses and carries excess damage to lower table entries. A roll of 12 can disable a special feature and absorb 1d4 damage. Weapons locations use the printed d10 fore/port/starboard/aft/turret distribution. Impairment checks are tracked, with destroyed systems and disabled weapon mounts persisted; ship panels show remaining area spaces.

**Rules compliance and testing limitations:** This is an **experimental structural damage implementation** and NOT complete damage adjudication. The source catalogue lacks per-weapon structural-space costs, so the engine currently disables one weapon mount when an affected arc is struck rather than allowing the defending player to allocate individual weapon spaces. Impairment uses provisional ship Training as a substitute for the appropriate Technical (engineering/electronics/mechanical) checks; their exact bonuses and player choices are not yet modelled. The detailed cargo/hangar outcomes, drifting restrictions, destroyed control/crew penalties, special-feature removal consequences, and destroyed armour/explosion rules need completion. Current aggregate structure and location totals can diverge on custom craft or a previously damaged ship; a migration/normalisation pass is required. The server deployment and initial page rendering have been checked, but full two-player damage-path regression tests have **not** been executed successfully. Do not treat enhanced results as definitive campaign adjudication without GM review.

## Defender-controlled weapon allocation (2026-11-22)

When an Enhanced Weapons attack reaches a weapons location, the defender receives an **asynchronous pending allocation**. The current game pauses further ship orders until that craft's owner distributes the indicated number of weapon spaces among mounts in the affected arc and confirms. The server checks ownership, revision, unique pending allocation ID, each mount's remaining capacity and the exact total. A second weapons hit or overflow can create a new pending allocation. These decisions and rolls are stored in the battle log and D1 ship state.

Individual mounts can be **impaired** (Technical (electronics) DC 25, with +1 per ten surviving spaces and natural 1/20 rules) or **destroyed**. Impaired mounts have half Offence, and destroyed mounts cannot fire. Damage penalties now include Engines (−2 Handling), Control (−2 Handling, −4 Sensors, −2 attacks/skill checks), Crew (−2 Training and BAB), and their corresponding destroyed-state penalties. Destroyed Engines or Control set drifting restrictions. Engineering/electronics/mechanical skill bonuses can be supplied in `stats.technicalSkills` at ship setup.

**Important remaining gaps:** The catalogue lacks verified *per-weapon structural-space costs* for most craft. Missing `spaces` values currently default to **1** and are labelled as estimates in the allocation interface. Users can enter actual values in each weapon's `spaces` field before adding the craft. When a specialised Technical skill bonus is not provided, a **provisional Training fallback** is used and labelled in the combat log. The complete drifting order catalogue (Brace For Impact, Get Those Systems Back Online, Hold Her Together, Route Control Through This Panel), repair workflow, special-feature effects, auxiliary craft cargo/hangar consequences, and full stress system remain outstanding. Structural damage is still experimental until those are finished. Deployment and page loading are verified; a two-player end-to-end combat test is not yet confirmed.

## Core Rules weapon-space completion and damage-control orders (2026-11-22)

All **30** preloaded craft now include **125** individually sourced weapon-mount space costs (total **287** weapon spaces), cross-checked against each craft's Weapons structural-space total in the *Second Edition Core Rules* pp. 216–230 and the Clark character-sheet Tri-Star entry. The existing preloaded ships are hydrated with verified missing costs by source ID and exact mount name/arc. Custom craft require explicit per-mount values for enhanced damage; the former one-space estimate has been removed.

Added four damage-control orders from the *Core Rules* pp. 196, 202 and 204:
- **Brace For Impact**: Operations (systems) DC 10, once per round, +2 to structural impairment checks and one space protected per damaged structural area during the round.
- **Get Those Systems Back Online**: Technical (engineering/mechanical/electronics) DC 20; restore a destroyed Engine/Hangar/Control or individual weapon mount by one space, or restore a lost special feature (subject to the GM's ruling on its skill).
- **Hold Her Together**: Technical DC 15; restore one space or clear impairment on surviving Engines, Hangar, Control or weapon mounts; no repeated repair on the same system in the round; failed attempt has a 25% chance of exhausting materials for that system.
- **Route Control Through This Panel**: Technical (electronics) DC 25, only with Control fully destroyed, once per round; restores one Control space, leaving Control impaired.

**No invented crew bonuses:** The published spacecraft entries list broad crew BAB and Training, not individual Chief Engineer/Technician/Mechanic Technical modifiers or Operations (systems) bonuses. The application now requires actual crew skill values in `technicalSkills: {engineering, electronics, mechanical}` and `operationsSystems` for those orders and Enhanced mode damage adjudication. Enter them in the ship's editable statistics JSON during setup. The source does not justify a universal default. The application does not yet provide a dedicated crew-sheet editor or in-battle GM correction screen.

**Caveats:** Damage-location handling, repairs, special-feature effects and Brace timing remain under rules-validation. Brace is currently a selectable ship order, rather than a full asynchronous defensive response/interrupt. The complete stress, repair materials replenishment, fighter/hangar/cargo consequences, and rules for permanently lost structural systems are not fully implemented. Cloudflare deployment/page rendering can be verified independently of end-to-end multiplayer play; full integration tests are still needed.

## Asynchronous defensive response windows (2026-11-22)

Enhanced Weapons mode now supports **held defensive responses** and an asynchronous, server-persisted interruption window before an incoming Fire At Will! barrage. A player uses **Hold a response order** during their turn (consuming an order and reserving a defensive response); the defender later chooses **Decline**, **Brace For Impact**, **Fire Interceptors!**, or **Extreme Measures!** when an opponent attacks. The attack is not rolled until that choice is saved. Response windows persist in D1, are limited to the defending ship's owner, and require matching game revision; the attacker's ordinary orders are blocked while the response is unresolved. Once resolved, the attack resumes with the appropriate mitigation and logs the decision.

This applies to Enhanced Weapons mode only: *Core Rules 2e* p.195 explicitly excludes response orders from Quick Space Combat. Current implementation is a **subset** of the full rules: no opposed Knowledge (tactics) checks, offensive/tactical response categories, response-vs-response precedence, specialised trigger orders, or interruption windows for other exclamation-mark orders. The full response sequence is **not yet rules-complete**. The defender's Operations (piloting) modifier is required for Extreme Measures!; where unavailable, that response is rejected rather than guessed. End-to-end multiplayer validation is outstanding.
