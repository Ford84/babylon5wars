# Vorchan staged movement — authoritative server integration

Implemented:
- `shared/vorchan-stage-server.mjs`: accepts player intentions only (`speed`, `advance`, `turn`), retrieves turn costs/delays and acceleration costs from the versioned Vorchan trial library, tracks the current turn's remaining movement and thrust spent, rejects client-supplied limits, map overflow and occupied hexes.
- `POST /api/games/:id/trial-movement`: authenticated, owner-only, current ordered movement player only; requires expected game revision. Updates ship q/r/facing/speed and per-ship private movement record, increments game revision and writes an audit event in a D1 batch.
- UI movement panel: speed and extra-thrust purchase, advance N hexes, port and starboard turn; each action is separately committed and refreshed.
- Movement phase order cannot be locked until every owned trial ship has zero remaining mandatory movement.
- Unit tests for staged transitions, server-side cost derivation, occupied hexes and purchase limits.
- Fixed `stagedMove` bug: omitted optional `shortenBy` previously caused NaN thrust spending and bypassed the overspend guard.

**Safety limitations / not yet ready for production:**
- The original Vorchan SCS's **free engine thrust and individual thruster limits are not yet verified**. The trial adapter therefore conservatively allows only purchased thrust backed by its printed 4 extra reactor power at 2 power per thrust. This is a **restricted test budget**, not a claim that Vorchans have no free thrust. A ship may be unable to make otherwise legal moves.
- Turn thrust is not yet split and validated against separate printed aft/side thruster tracks; engine damage and overthrust are not handled.
- Terrain, ramming, collision resolution, turn-delay carry-over to the next turn, speed beyond the verified chart and multi-unit per-player ordering are incomplete.
- Existing phase ordering uses membership ranks, not yet automatically the individual rolled initiative results.
- Existing D1 batch uses conditional writes but needs real D1 concurrent-request tests before production deployment.
- No migration or production deployment was performed.

The stage is integrated in source and has unit tests. **Do not label it a rules-complete movement implementation** until the remaining SCS data and integration gates are resolved.
