# W6 — Vorchan graphical weapon interface

Implemented on `stage1-full-turn-multiplayer`, without production merge.

## Firing declaration
- `src/WeaponFirePanel.jsx` replaces the JSON editor during `fire_commit`.
- Only owned Vorchan ships are selectable. The verified SCS has exactly three **forward** mounts: Plasma Accelerator (90°), port Twin Array (270°), starboard Twin Array (270°). Port/starboard are mount identifiers, not hull sections.
- Select a physical gun (plasma: 1; Twin Array: 1 or 2), offensive target or defensive reserve, plasma charge interval (1, 2 or 3 turns), and firing order (1–100). Duplicate priorities for the same ship/target are prevented in the editor and checked by the server.
- The 2D relative bearing plot shows the mount's forward-centred angular coverage and clickable opposing ships. Arc selection uses the same `checkMountArc` helper as the server.
- The selected target displays geometric arc status and distance; a final hit chance is intentionally **not** asserted until LOS/terrain, EW and defensive choices are verified. The server remains authoritative.
- Review and remove individual gun orders before using the existing phase lock. The graphical editor emits the same `payload.fire` format validated by W3; no separate client-trusted API is introduced.

## Fire reveal and reactive defence
- After both players lock, `GET /fire-orders` reveals both fire lists; the interface presents each physical gun and target.
- Only guns reserved in the committed own fire declaration are shown as defensive allocation controls. Incoming attacks are filtered by defender ship and arc.
- Defensive choices emit the existing `payload.defence.assignments` format; the server revalidates each assignment.
- The existing `GET /fire-resolution` endpoint supplies per-shot blockers, which the UI displays. No dice, damage or critical results are invented.

## Outstanding integration
- W4 server roll journal and interception adjudication, W5 authoritative damage persistence and system criticals, and complete original SCS identification remain outstanding.
- Visual manual two-browser testing is recommended. CI/build and isolated staging deployment should be checked independently before claiming live acceptance.
