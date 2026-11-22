# SCS vector extraction integration plan (draft)

## Existing live architecture (verified 2026-11-22)
GitHub repository: `Ford84/babylon5wars`. Production Worker: `babylon5wars`; test Worker: `babylon5wars-movement-test`. Production D1: `b5w-private`; test D1: `b5w-movement-test`. Production R2: `b5w-ship-images`; test R2: `b5w-ship-images-test`.

Both databases already have:
- `scs_templates(id, faction, name, model, sheet_revision, source_publication, source_page, definition_json, created_by, created_at)` with a uniqueness constraint on faction/name/model/revision/publication.
- `ships(..., template_id, public_state_json, private_state_json)` for in-game ship instances.
- `games`, `memberships`, `orders`, `events`, and user/session tables.

Both `scs_templates` tables were empty when inspected. The existing `definition_json` format cannot be inferred from rows; **inspect the Worker and frontend code before importing or changing APIs**.

## Proposed canonical definition format (not yet deployed)
Use versioned JSON in `scs_templates.definition_json` rather than introducing a second independent ship catalogue. Keep published source values distinct from inferred costs.

```json
{
  "schemaVersion": "scs-vector-1",
  "identity": {"faction": "Centauri", "name": "", "model": "", "revision": ""},
  "source": {"publication": "", "page": "", "pdfSha256": "", "coordinateSystem": "pdf-points"},
  "published": {"combatPoints": null, "movement": {}, "defences": {}, "initiative": null, "specialRules": []},
  "sections": [
    {"id": "forward", "label": "Forward", "armour": null,
     "structureBoxes": [{"id": "forward:0001", "x": 0, "y": 0, "polygon": []}]}
  ],
  "components": [
    {"id": "weapon:001", "sectionId": "forward", "type": "weapon", "label": "",
     "weapon": {"type": "", "arc": null, "fireControl": null},
     "armour": null, "damageBoxes": [{"id": "weapon:001:0001", "x": 0, "y": 0, "polygon": []}],
     "geometry": {"bounds": null, "symbolRef": null}}
  ],
  "refits": [],
  "verification": {"status": "unverified", "reviewedAt": null, "issues": []}
}
```

The example is a **schema sketch**, not extracted official ship data. Coordinates, counts, armour and costs must be sourced and verified before publication. Keep the original source PDFs in restricted storage subject to licensing, not in the public GitHub repository.

## Import and validation rules
1. Extract vector subpaths, including overlapping damage squares in compound paths; use the labelled component legend to classify larger instances.
2. Record stable ship, section, component and damage-box IDs. Retain exact source coordinates and geometry.
3. Exclude the component legend, refit illustrations and shuttle reference diagrams from installed-system counts.
4. Reconcile the five pilot sheets (Balsavor, Varilon, Falenna, Nalor, Navask) against annotated diagrams; reject unresolved mismatches.
5. Validate unique IDs, section references, box geometry, no duplicate boxes, and source provenance.
6. Store gameplay damage **only** on `ships.public_state_json` / `private_state_json` (or a separately reviewed state table); never mutate the immutable template.
7. Support multiple published sheet revisions and variants without overwriting the original record.
8. Export a flattened component catalogue for Combat Point research; retain official CP separately from any estimated value.

## Rollout
- Phase A: inspect the current Worker routes and client template handling; document the actual existing `definition_json` contract.
- Phase B: add a backwards-compatible parser/validator and unit tests to GitHub; no database changes.
- Phase C: import five verified Centauri templates into the **test** D1 only, using a dedicated importer with dry-run and rollback.
- Phase D: test ship creation, template display, damage marking, game save/reload, and existing multiplayer flows.
- Phase E: review licensing and deployment; migrate production only after explicit approval.

**Safety:** no automatic migration of production D1, no direct deployment to either Worker, and no upload of official SCS PDFs to the public repository. The existing D1 database was provisioned outside Wrangler's migration tracker, so do not blindly apply migrations.
