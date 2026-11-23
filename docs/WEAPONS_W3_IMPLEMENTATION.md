# W3 implementation — secret fire declarations and reactive defensive assignment

Implemented on branch `stage1-full-turn-multiplayer`. No weapon attack rolls or damage are executed.

## Data and timing

- Existing `orders` table stores a player's immutable fire declaration under `phase_id=fire_commit`, `turn`, and `player_id`. The existing unique order constraint and revision gate protect duplicate locks and stale writes. No schema migration required.
- `POST /api/games/:id/orders` in `fire_commit` requires `payload.fire={shots:[...]}`, including explicit `shots:[]` for holding fire.
- Each shot identifies `shipId`, `mountId`, `gun` (1 or 2), `role` (offensive/defensive). Offensive shots require `targetId`, `order`, and plasma `chargeTurns` (1/2/3). Defensive reserves omit target and order.
- The first player's declaration remains secret; `GET /api/games/:id/fire-orders` during `fire_commit` returns **only the viewer's own order** and a list of players who have locked, not opposing declarations. The game-detail endpoint likewise returns only `myOrder`.
- After both players lock, the coordinator skips the automatic `fire_reveal` barrier and enters `fire_resolution`. The GET endpoint now reveals both declarations simultaneously.
- Each player then commits `payload.defence={assignments:[...]}` during `fire_resolution`. Each assignment specifies a unique previously reserved Twin Array gun and the incoming offensive attack identifier `shipId:mountId:gun`. The server checks that the incoming attack targets the defending ship, comes from an opponent, and is within the defender gun's confirmed firing arc. An empty array means no defensive interception.
- The current `fire_resolution` lock **records manual adjudication**, and then moves to the marine phase. It does **not** claim to resolve any shot, interceptor or damage. W4 must introduce a dedicated resolution substate/cursor **before** this phase transition, so the lock cannot bypass automatic combat when W4 is enabled.
- Fire declarations are excluded from the generic `orders_revealed` event to avoid premature or duplicate disclosure; they are revealed via the phase-gated endpoint only.

## Validations

Ownership, mount identity, per-gun uniqueness, offensive target ownership, verified arc, mode and ordered attack priority, plasma charge selection, basic deactivated/destroyed system flags, defensive reserve identity and inbound target are enforced server-side. Missing LOS terrain, per-gun arming/cooldown history, detailed system damage, weapon intercept modifiers, EW lock and simultaneous fire adjudication remain W4/W5 gates; a declaration is **not** a certificate that a shot can fire.

## User interface

The combat phase includes a functional secret declaration editor and post-reveal defensive assignment editor with visible committed-player counts and revealed orders. These use JSON input to preserve exact weapon/gun identifiers during W3. The graphical SCS gun selection, arc overlay, attack preview and intercept selector are scheduled for W6.

## Testing

`tests/fire-orders.test.mjs` covers ownership, invalid targets, duplicate guns, plasma role and charge, unique reserved intercepts, nonincoming shots, and pre-reveal confidentiality. `scripts/staging-smoke.mjs` exercises two authenticated accounts, private first lock, simultaneous reveal, invalid defence rejection, both defensive commitments and progression. Deployment and live smoke must be confirmed from CI before declaring staging validated.

## W4 handoff

Implement authoritative per-gun readiness and charging state, LOS/terrain and EW checks, server-side frozen declarations, defensive interception before rolling, roll journal and idempotent resolution, same-tier simultaneous fire, and persistent weapon usage. No production merge without explicit approval.
