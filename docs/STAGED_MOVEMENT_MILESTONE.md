# Player-committed staged movement — rules and implementation

The player chooses **how many hexes** of remaining movement to spend, commits, and the game moves the ship that many hexes along its current facing. It then stops and awaits the player's next action. The player can choose a legal 60-degree turn; the turn executes in the current hex without consuming a movement hex, costs thrust, starts a turn-delay count, and the player can then commit another movement segment. Repeating this cycle is permitted until the mandatory speed movement is exhausted.

The *Second Edition Rules Compendium* (Movement and Speed, Acceleration/Deceleration, Normal Motion, Turning, Turn Cost and Turn Delay) confirms:
- Speed is a **mandatory** number of hexes per combat turn; it is not a freely spendable pool that may be left unused.
- Speed changes occur **first**, before any movement or other manoeuvre.
- Moving at constant speed costs **no thrust**.
- A 60-degree turn occurs in the current hex, before further movement.
- A turn spends thrust based on speed; thrust is split between the appropriate aft and opposite-side thrusters (swapped in reverse), with an odd point assigned to either.
- Turn delay is counted in **hexes actually moved**, including across combat turns. Shortening costs extra thrust **at the moment of turning**, not later.
- A new speed may change an outstanding turn-delay requirement in the following combat turn.

Implemented `shared/staged-movement.mjs` as a pure state transition model: `newStagedMovement`, `stagedMove` for `speed`, `advance` and `turn`, and `turnCostAtSpeed` for verified 1–12 speed chart values. Includes unit tests for staged commits, remaining movement, turn delay, speed-change timing, and overspending.

**Integration gates**: This module is **not yet called by the Worker**. In particular the `turn` action currently accepts calculated `cost` and `delay` inputs: these must be replaced by server-derived SCS values before a client can submit an authoritative turn. Engine free thrust and individual thruster availability, overthrust, collisions, terrain, speed-chart extrapolation, turn delay carry-over, and phase order are not yet integrated. The module must not be exposed directly to untrusted clients. Until then, there is no persistent staged-movement route and no live manual movement UI. This is an intermediate implementation, not a playable movement feature.
