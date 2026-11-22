# Movement milestone: implementation boundary and acceptance checklist

Authoritative source: uploaded *2nd Edition Rules Compendium.pdf*, Movement & Maneuver, especially Rolls and Pivots (printed pages surrounding the Slides, Rolls, Pivots and Emergency Rolls headings).

## Implemented as isolated functions
- `shared/movement-rules.mjs`: acceleration, turn cost/delay, shortened and agile snap turns, axial hex stepping.
- `shared/movement-manoeuvres.mjs`: slides and extended-turn bookkeeping.
- `shared/orientation-manoeuvres.mjs`: standard/agile pivots, pivot thruster pair choices, odd thrust split, continuing pivots, standard/agile rolls, flip timing, halt costs, weapon and hangar penalties.
- Tests in `tests/orientation-manoeuvres.test.mjs`.

## Important gaps — milestone NOT COMPLETE
1. Validate all calculation details against source examples, particularly movement vectors, reverse motion, thrust cost modifiers, acceleration and movement rounding.
2. Add authoritative movement orders and a server-side state machine, including movement sequencing by initiative and the full per-turn distance budget.
3. Allocate costs to **individual, undestroyed thrusters**; handle thruster damage, available power, extra thrust, overthrust, and odd-point choice.
4. Persist movement direction separately from ship facing, as pivots change facing without changing travel direction.
5. Apply rolling/pivoting at the start of the Movement Step, outside initiative order; apply start/stop rules, manoeuvre locks, fire penalties, launch/landing restrictions and gravitic exceptions.
6. Handle emergency rolls (C&C critical, initiative penalty for two turns), special agile and gravitic-drive rules, speed-zero manoeuvres, movement into occupied hexes, terrain, collisions, ramming and scenario boundaries.
7. Host-authorised override with audit trail; conditional multiplayer orders and collision-safe atomic D1 updates.
8. Integration tests with two players and multiple ships, complete turn wrap, order secrecy, races and phase transitions.
9. Ship-specific data extraction and verification; no complete Centauri SCS movement tracks are yet attached in the live database.
10. Stage/test/deploy only after the above pass.

No deployment has been performed. Isolated unit tests do not establish end-to-end rules correctness.
