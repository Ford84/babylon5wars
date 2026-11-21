# Stage 2B — Centauri SCS catalogue (source-backed, no fabricated ship stats)

**Rules source:** *Babylon 5 Wars Second Edition Rules Compendium*, Control Sheets and SCS Recognition Guide (opening rules section). Ship datacards, revision, combat points, sections, system icons, armour, damage boxes, sensors, engines, weapons and weapon datacards, hangars, hit locations, firing arcs, turn chart and special notes are the original data sources.

## Implemented
- `shared/scs.mjs`: validated `schemaVersion:1` SCS definitions and initial per-system state.
- `migrations/0003_scs_templates.sql`: immutable, provenance-labelled catalogue rows.
- `GET /api/scs/templates`, `GET /api/scs/templates/:id`, `POST /api/scs/templates`. Authenticated; imports restricted to users hosting a game.
- No Centauri hull statistics have been invented or imported. A printed SCS must be transcribed and verified first.
- `tests/scs.test.mjs` includes synthetic schema fixtures, not historical ship specifications.
- Ship EW boost eligibility corrected for multiple sensor arrays.

## Deployment dependency
The live D1 database must have `0003_scs_templates.sql` applied before deploying these routes. The repository has NOT been deployed to Cloudflare in this stage. The existing live game remains unaffected.

## Not yet complete
The v1 model does not yet fully validate firing arc geometry, weapon-specific range and damage tables, turn-chart entries, critical tables or hit-location probabilities; these must be added to the schema before an SCS can be considered **combat-ready**. A stored template is not automatically attached to a game ship. Existing game `ships.template_id` must be linked to a catalogue row with server-side initial state and immutable revision; that connection and host override audit are next. No game rules should trust arbitrary player-supplied values.

## Centauri starting set
Begin with one original Centauri capital ship SCS (e.g. Primus), then a lighter vessel (e.g. Vorchan), then Sentri fighter control sheets (FCS requires a separate schema for flights). Those are **suggested import order**, not populated records. The rules compendium references these vessels but does not supply complete SCS data for them.
