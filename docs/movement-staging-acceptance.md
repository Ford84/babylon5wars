# Movement integration: staging acceptance gates

Source: Second Edition Rules Compendium, Movement and Maneuver; Centauri Vorchan Warship Version 3: 2E/SF SCS.

## Implemented in branch
- Vorchan +4 reactor surplus, engine free thrust 10, efficiency 2:1; 1 plasma + 4 Twin Arrays available for power deactivation.
- Signed speed changes and inertial movement; server-computed acceleration, turn, delay and slide costs; reverse heading and directional thruster allocation.
- Staged 60-degree turns, shortening, speed-zero and speed>12 fractional calculations, turn-delay carryover, slides, pivots, rolls, extended-turn deposits/completion/cancellation.
- Per-thruster 2x overthrust ceiling, engine-efficiency losses, deferred overthrust checks and persisted manoeuvre state.
- Server rejects forged costs, unknown thruster IDs, excess engine thrust, out-of-bounds paths and stale revisions. Movement phase completion requires remaining movement zero.
- Numeric per-thruster allocation panel replaces manual text prompt.

## Corrected in final integration pass
- Forward retro/port/starboard printed icon ratings **1/2/3** respectively (previously 1/3/3).
- Engine destruction no longer blocks compulsory inertial movement or involuntary extended-turn cancellation.
- Damage bridge accepts all five weapon mount IDs and rejects unverified SCS damage tracks, overfull marked-box counts, or premature destruction flags.
- Extra-power and mount-count regression checks.

## Must pass before Cloudflare testing release
1. **Execute** `node --test tests/*.test.mjs` on Node 22 and repair every failure. CI workflow is present but no successful run has been observed through available connector.
2. **Build** the Vite/Worker bundle with the repository's pinned package manager and ensure Worker module imports resolve.
3. Verify actual D1 trial-movement/phase-lock behaviour for two players, multiple ships, stale revision conflicts, reconnection and turn boundary pivot/roll updates.
4. Resolve forward-thruster damage-track identification before allowing damage to those components; retain `completeForAutomaticCombat:false`.
5. Confirm movement UI on mobile and desktop, including turn shortening, extended-turn cancellation and cleared allocations.
6. Deploy **only to an isolated Cloudflare preview/staging environment**; do not overwrite production Worker/D1 or bind staging to production data.
7. Test end-to-end with two authenticated accounts, then obtain user approval before promoting production.

**Current status:** committed development work, not a certified movement release. Do not claim Cloudflare updated until an actual deployment and smoke test are confirmed.
