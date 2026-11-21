# Centauri SCS stage 2C — source-backed initial hull records and attachment

## Completed
- Inspected original PDFs from `centauri_official.zip`: `Ships of the Fleet/centauri primus battlecruiser.pdf`, `centauri vorchan warship.pdf`, `centauri sentri medium fighters.pdf`, each marked Version 3: 2E/SF.
- `shared/centauri-headers.mjs`: exact transcribed source identifiers and selected printed header data (defences, initiative, power, turn charts, hangar, thrust). These are **partial reference records**, not SCS templates. The engine deliberately rejects them as full SCS records.
- `POST /api/games/:id/attach-scs`: host-only, requires an existing validated full SCS template and an unlinked ship; creates initial system damage/power/EW state; logs an attachment event; prevents mid-game and repeated attachment.
- Automated tests check the source headers and that they cannot be imported as combat-ready templates.
- Existing `migrations/0003_scs_templates.sql` must be applied before deploying Stage 2B/2C routes.

## Incomplete / blockers
- Printed damage box grids, armour facings, firing arcs, hit-location charts, sensor track cells, weapon mount locations and special rules are visually encoded and are not fully transcribed. The Sentri sheet is a **fighter flight control sheet**, not a capital-ship SCS; its flight model must be distinct.
- The current `shared/scs.mjs` schema is a structural prototype; it does not yet faithfully encode the complete printed control sheet. Do not bypass validation with fabricated systems or import headers as full templates.
- The attachment route requires integration tests on a disposable D1 database before live deployment; an audit of transaction failure and state privacy is needed. Host overrides are not yet implemented.
- No live D1 migration or Cloudflare deployment was made as part of this stage. Live game remains on the tested release.

## Next
1. Fully transcribe the Primus's physical boxes and hit charts from the original diagram, then Vorchan.
2. Build FCS flight schema for Sentri.
3. Add source coordinate references and independent diagram verification.
4. Extend combat-ready SCS validator and perform a staging deployment with D1 migration.
