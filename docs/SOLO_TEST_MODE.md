# Solo Test Mode

Choose **Create Solo Test** in the battle lobby. The server adds a passive opponent automatically; no invitation or second login is needed. The initial setup places the ships nearby for weapon tests. Adjust starting hexes/facing if desired, assign the two Vorchans, and start.

The passive opponent buys no thrust or EW, uses zero EW, makes no voluntary manoeuvres, reserves no interceptors and holds all weapons. Required initiative rolls, boundary choices and defender damage allocations are completed by the server. Damage allocations choose the first currently eligible option deterministically. All commands still pass through normal phase, ownership and rules validation.

Damage and criticals still obey normal rules. If damage forces engine runaway or inertial movement, the opponent completes the mandatory straight movement automatically; it does not choose manoeuvres. Destroying the opponent ends the battle normally.

Each solo room has an internal per-battle passive identity with a disabled password, no session and no sign-in path. Solo rooms reject invitations and remain private to their human host. Deleting a solo battle also removes that internal identity. Existing two-player rooms retain their normal behaviour.

The snapshot, all automatic opponent actions, mirrored ship state and event journal are saved in the same revision-guarded transaction as the human command. The mode is explicitly opt-in and is not set from a caller-supplied opponent ID.

Verification covers authenticated setup, three turns with only human commands, stationary/hold-fire behaviour, automatic damage choices, outsider rejection, disabled sign-in, closed invitations and deletion cleanup, alongside the existing multiplayer suite.

Resetting live users/battles is a separate one-off maintenance operation, not an application endpoint or a migration. Deploying this mode does not delete existing user data.
