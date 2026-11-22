# W7 — weapon acceptance and isolated staging

## Scope
W7 is a release gate, not an assumption that W4/W5 are finished. The current implementation remains a two-Vorchan **manual-adjudication** combat preview. This report distinguishes passing automated checks from the **minimum two-turn playable acceptance** defined in `WEAPONS_STAGE2_PREPARATION.md`.

## New acceptance coverage
- `tests/weapons-w7-acceptance.test.mjs`: exact one-plasma/two-forward-Twin-Array physical inventory (five individual guns); secret declarations, ownership, duplicate gun validation, defensive reservations, arc/LOS, same-hex previous position, range/fire control/EW, no-lock penalty, all plasma charge modes, armour and overkill, critical timing, deterministic immutable preflight and unverified-terrain/interception blockers.
- `scripts/staging-smoke.mjs`: in addition to the existing real two-account D1 game lifecycle and W3 secret/reveal/defence tests, checks that both authenticated clients see identical W4 preflight, unauthenticated access is denied, and a revealed fire declaration cannot be edited.
- The isolated deployment workflow runs `npm test`, `npm run build`, D1 migrations, Worker deployment and live two-account smoke. It must pass **at the latest commit** to claim deployment acceptance.

## Unmet minimum playable acceptance
**W7 cannot be marked complete as full live combat acceptance until W4 and W5 integration are completed.** The following acceptance cases are explicitly blocked:
1. Server generates and persists one immutable roll journal per attack and replaying a request cannot reroll or apply damage twice.
2. Defensive interception is fully adjudicated, including degradation.
3. Same-tier simultaneous firing and earlier-tier destruction are correctly resolved from frozen state.
4. Defender hit-sector and system choices persist and are reproducible on both clients.
5. All authoritative Vorchan SCS tracks and system criticals are verified; automatic damage and rearming carry through two full turns.
6. Live two-player smoke validates the *same persisted damage and journal on both clients* across two turns, rather than just the current manual phase progression.

## Ship confirmation
The player confirmed exactly **two** Twin Arrays, both in the forward hull section, distinguished as port and starboard references; one Plasma Accelerator is also forward. Primary and aft hull sections have no weapons. No additional wing weapons should be created.

## Deployment and release policy
Only `stage1-full-turn-multiplayer` and the isolated staging Worker may be modified. **Never merge to main or deploy production without explicit approval.** A green build, unit test or W3 staging smoke is not a substitute for an end-to-end two-turn damage test.
