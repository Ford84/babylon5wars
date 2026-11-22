# Vorchan original SCS vector audit and manual gameplay state

Source inspected: `vorchan_source.pdf`, *Centauri Vorchan Warship*, Version 3: 2E/SF, page 1, 612×792 PDF points.

The PDF drawing stream contains **602** 6.75×6.75-point drawing objects representing **301 distinct box positions** (filled/stroked duplicates). Twenty are in the separate shuttle reference diagram at x=405–472, y=208–224. The remaining **281** are in the ship diagram.

`shared/vorchan-vector-geometry.mjs` records the original PDF box origins by diagram region; `tests/vorchan-vector-geometry.test.mjs` checks counts, uniqueness and bounds. The silhouette in the frontend is traced from the PDF's two filled Bezier outline paths, not a hand-drawn approximation.

## Corrections to earlier transcription
- Ship hangar track: **20** vector boxes (previous inventory said 16).
- Reactor: **28** vector boxes (previous inventory said 12).
- Port/starboard thrusters: **15** boxes each (previous inventory said 12).
- Forward structure: **48** individually located boxes.
- Aft structure: **44** individually located boxes.
- A separate primary-structure track: **12** individually located boxes.
These values are **vector-rectangle counts**, not a declaration that every associated game rule has been verified. Resolve differences against printed armour/section boundaries before enabling automatic damage.

## Gameplay integration
The `POST /api/games/:id/trial-scs-mark` endpoint:
- Requires authentication and game membership, ship ownership or host privileges.
- Validates a box against the exact source-derived diagram inventory, excluding shuttle reference material.
- Saves marks in `ships.public_state_json.scsAnnotations.marks`, with `damageBySystem` counts.
- Mirrors those counts to `ships.private_state_json.trial.systemDamage` for subsequent rules development.
- Uses conditional compare-and-swap on the ship state and game revision and emits an audit event.
- Does **not** advance turn/phase or apply damage-dependent combat modifiers.

These are persistent **manual damage records**, not yet verified authoritative automatic damage. No automatic destruction, thrust loss, reactor shutdown, weapon disablement, hit allocation, or damage reversal rules should be inferred from marked boxes alone.

## Outstanding before production
1. Reconcile every box grouping, armour number, printed weapon mount, firing arc and hit chart against the original source.
2. Define damage resolution and destroyed-system rules for the Vorchan, with tests for concurrent updates, multiplayer visibility and reloading.
3. Run all CI tests and build, review on the test Worker and test D1, then approve production deployment.
