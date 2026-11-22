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
