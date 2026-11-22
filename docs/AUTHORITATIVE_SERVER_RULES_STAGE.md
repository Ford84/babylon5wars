# Authoritative server rules bridge — implementation and deployment gate

New route: authenticated `POST /api/games/:id/ship-rules`. It requires a game member, an owned ship (or host), a linked versioned SCS template, the correct game phase and the current game revision.

Request for initiative:
```json
{"action":"roll-initiative","shipId":"<uuid>","expectedRevision":0}
```
The Worker rolls a cryptographically random unbiased d20 and derives the unit's printed initiative bonus and current speed from the ship and its library SCS. It persists the result to the individual ship's `private_state_json.scs.initiative`, stamped with the game turn. Duplicate same-turn rolls are rejected. It refuses automatic resolution of unhandled critical modifiers.

Request for EW:
```json
{"action":"allocate-ew","shipId":"<uuid>","expectedRevision":0,"order":{"defensive":3,"offensive":{"<enemy ship uuid>":2}}}
```
The Worker derives available EW from the strongest intact sensor in the linked SCS, validates enemy ship IDs, and saves allocation privately. It does not expose hidden EW orders through the public event log. Duplicate same-turn allocations are rejected. Damaged sensors and unresolved critical effects are blocked pending rule adjudication.

The new route uses a D1 batch of conditional ship update, game revision increment and event insert. The event is inserted only when the game revision advanced. **Concurrency correctness still requires integration/race tests**; this is not a substitute for a fully tested transactional state machine.

`shared/server-rules.mjs` provides the library-derived calculation layer. `shared/effective-scs.mjs` supplies undamaged engine thrust but is not yet wired to a persistent movement endpoint.

Important remaining gaps:
- This route does **not** advance game phases, resolve tied initiatives, or resolve attacks.
- Current `orders` route remains notes-oriented and does not call this route automatically.
- EW allocation is stored per ship, not automatically revealed/locked for all ships.
- Individual sensor effects, fighter sensor rules, extra EW, special EW, all critical modifiers, power, weapon damage and movement still require verified rules and integration.
- `migrations/0003_scs_templates.sql` must be applied before this route can run in production. No deployment performed.
- Before deployment, add integration tests against D1, multi-ship same-turn tests, privacy checks, and ensure no competing stale writes are committed.

Status: **first persistent SCS-based initiative/EW endpoints implemented in source; not production-ready**.
