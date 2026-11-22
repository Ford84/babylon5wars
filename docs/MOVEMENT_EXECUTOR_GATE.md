# Authoritative movement executor — integration gate

Source: *2nd Edition Rules Compendium*, Movement and Speed, Acceleration and Deceleration, Moving in Reverse, Normal Motion, and Initiative / Simultaneous Movement.

Implemented: `shared/movement-executor.mjs` pure reducer and tests. Acceleration/deceleration occurs before motion; speed determines mandatory travelled hexes; negative speed reverses travel direction; coordinate bounds and thrust limits are checked; stale ship versions rejected.

**Not yet authoritative in a live battle:** The reducer has no D1 persistence endpoint, no ship-version column, no independently verified SCS thrust budget, and no integration with phase/initiative ordering. The result carries `requiresTerrainAndCollisionCheck:true` and MUST NOT be committed to a battle until those checks run. No client-supplied thrust budget may be trusted by the server.

Required before integration:
1. Derive available thrust from validated SCS systems, power allocation, existing damage and overthrust restrictions; validate acceleration uses the correct directional thrusters, including reverse.
2. Expand the reducer to verified turning, slides, pivots, rolls, extended turns and inter-turn delay.
3. Persist travel direction independently of facing (pivoting), signed speed, distance travelled, thrust spent and manoeuvre state.
4. Implement map terrain, occupied hex, scenario edge, ramming and special effects.
5. Implement a server-authoritative movement-phase route: member/ship ownership checks; initiative/turn gating; D1 optimistic concurrency; public event log and hidden order boundaries.
6. Test multi-player and tied-initiative simultaneous moves; staged deployment after source validation.

This milestone is **partial**, not a completed movement phase. The new reducer is safe to use as an isolated straight-line calculation but not yet to mutate game state.
