# W8 — Authoritative combat integration

## Implemented: mandatory server adjudication gate

The existing W3 fire-resolution phase used to advance automatically to marine when both players acknowledged their defensive orders, even if offensive shots were unresolved. This discarded the obligation to resolve actual attacks.

`shared/combat-advancement.mjs` now identifies committed offensive fire. The `POST /api/games/:id/orders` server route returns HTTP 409 for `fire_resolution` if any offensive shot is committed, regardless of client-supplied procedure outcomes or resolution claims. This prevents both players bypassing unresolved attacks. Defensive-only or empty declarations retain their original two-player advancement. `tests/combat-advancement.test.mjs` covers both paths and malformed input.

The W6 interface now explains that offensive attacks cannot advance until authoritative resolution exists.

## Not yet implemented — required before a playable firing phase

1. Persist a frozen attack snapshot and server-generated roll journal with unique keys per game, turn, tier and attack. A D1 transaction must atomically commit journal entries, any damage and a phase cursor; retries must replay the same outcome.
2. Validate terrain and line of sight from the game board, same-hex prior positions and defender boundary choices; do not substitute an empty obstacle array for verified terrain.
3. Adjudicate defensive Twin Array interception before offensive attack rolls, including published interception penalties.
4. Resolve hits in simultaneous tier snapshots, obtain/persist legal defender location choices, and apply verified W5 SCS damage, armour and overkill.
5. Implement all required system critical charts and per-turn arming updates. Preserve two Twin Arrays and one Plasma Accelerator, all in the forward section.
6. Complete two-turn live acceptance: both accounts must see identical durable rolls and damage after refresh, retries must not reroll, and later turns must respect damage and arming.

**Important:** This stage introduces a deliberately strict block: games in which players declare offensive shots will remain in `fire_resolution` until the above server adjudicator is implemented. This is safer than silently advancing, but it is not yet a fully playable automated battle. Empty-fire staging smoke continues to exercise normal phase progression.

Only `stage1-full-turn-multiplayer` and isolated staging are in scope. Never merge or deploy production without explicit approval.
