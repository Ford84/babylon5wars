# Verified SCS vector importer

The production Worker uses `shared/scs.mjs` and `shared/scs-diagram.mjs`, with `schemaVersion: 1`. The frontend (`src/main.jsx`) currently has no generic SCS definition editor/viewer.

The existing POST `/api/scs/templates` accepts `{definition}` and calls `validateSCS`. The authenticated user must already host a game. A successful import inserts the JSON into `scs_templates.definition_json`; a duplicate publication/revision combination returns 409. GET `/api/scs/templates` lists metadata and GET `/api/scs/templates/:id` returns the definition. The server initialises per-ship condition from `systems[].damageBoxes` and `systems[].boxes`.

## Import adapter
`shared/scs-vector-import.mjs` exports:
- `validateVectorExtraction(raw)`: checks verified status, unique component and damage-box identifiers, armour provenance, geometry coordinates and source references.
- `importVerifiedVectorSCS(raw)`: converts reviewed extraction to the **existing** SCS v1 definition, validates it using `validateSCS`, and returns `{definition, geometry}`.

The existing Worker validator requires `schemaVersion:1`, `faction:'Centauri Republic'`, `name`, `model`, `class`, `source:{publication,sheetRevision,page}`, `stats:{combatPoints,initiativeBonus,extraPower,engineEfficiency,turnCost,turnDelay}`, `sections`, `systems`, `weaponCards`, `hitLocations`, and `notes`.

Each system must include `id`, `kind`, `section`, `armour`, `armourSource:'circled'|'legend'`, `boxes`, `damageBoxes:string[]`, and `sourceReference`. Sensor systems require `sensorStrength`; engines require `freeThrust`; weapons require a `weaponCardId` matching a card in `weaponCards`.

**Important:** `geometry` is deliberately a separate sidecar. The current Worker does not use geometry coordinates, and the existing v1 validator expects damage-box **string IDs**, not box objects. Do not replace `definition_json` with the earlier proposed `scs-vector-1` schema. A future geometry storage/API change requires separate review.

This module does not import to D1, bypass authentication, alter the frontend, or deploy a Worker. It also does not fill unknown values. The five Centauri pilot extractions remain unverified/incomplete and must not be promoted to live ship templates.

Run tests with `npm test`.
