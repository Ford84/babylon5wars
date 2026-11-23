# W1 SCS verification and W2 targeting implementation — 22 November 2026

## Original sources actually inspected
- `vorchan_original.pdf`, original single-page **Centauri Vorchan Warship Version 3: 2E/SF** SCS, visually inspected at high resolution and extracted as text. This is the primary ship-specific authority.
- `Vorchan_SCS_Vector_Key_Corrected_Checklist.pdf`, page 1 original SCS and pages 2–3 identification review. Its own status says aft thrust and firing arcs are **not certified**.
- `2nd Edition Rules Compendium.pdf`, combat chapter: Firing Arcs, Line of Sight, Weapons Fire Resolution, Determining Direction, Base Chance, EW, Fire Control, Range Penalty, Defence Bonuses.
- `aogwarskitchensink.pdf`, combat and Appendix A cross-check.

## W1 verified
- SCS datacards: Plasma Accelerator (one mount), class Plasma, power diamond 5, damage 4d10+12 minus 1 per hex, range penalty -1/hex, fire control +3/+1/-4, intercept n/a, 1/3 turn default; alternative 1/1 at 1d10+4 minus 1/hex and 1/2 at 2d10+8 minus 1/hex.
- SCS datacards: Twin Array (two physical mounts), class Particle, power diamond 2 **per mount**, damage 1d10+4, range penalty -2/hex, fire control +4/+5/+6, intercept -2, rate of fire 2 per turn (two individual guns).
- Weapon damage tracks: one eight-box central Plasma Accelerator with circled armour 4; two six-box forward Twin Arrays with circled armour 3 each. The two six-box units are **weapons**, not forward thrusters.
- Vorchan printed defence 12 forward/aft, 14 port/starboard; heavy combat vessel class; forward/aft/primary hit charts on original sheet match the existing `centauri-combat-data.mjs` transcription.
- **Crucial:** The small outline graphics beside the weapon datacards are the **weapon icon recognition symbols**, not the 90°/270° firing-arc diagrams. The original supplied SCS does not provide independently readable mount arcs in these weapon cards. A 90°/270° arc claim in an earlier planning note is **not verified by this SCS**. All mount `arc:null` values remain unverified and the targeting engine refuses to authorise a shot until a separately verified mount arc is provided.
- Other unverified ship SCS elements: forward outer thruster damage boxes, aft propulsion versus jump-engine interpretation and full damage diagram. No fabricated values are added.

## W2 implemented
- `shared/weapon-targeting.mjs`: pure axial hex bearing aligned to `movement-rules.mjs` facing 0 NE, 1 E, 2 SE, 3 SW, 4 W, 5 NW; explicit forward 60°, port/starboard 120°, aft 60° receiving sectors and defender boundary choices; fail-closed same-hex prior-position requirement; verified-mount arc gate; geometric LOS blocking for terrain hexes, including boundary contact; hex range and round-up range penalties; EW/no-lock double penalty; three target-class fire-control categories; full d20 hit-number breakdown and deterministic roll.
- `shared/weapon-readiness.mjs`: canonical inventory and verification audit; per-gun power/destroyed/arming/cooldown preflight. Absent authoritative weapon arming history is a blocker, not assumed ready.
- `tests/weapon-targeting.test.mjs`: geometry, arc boundary, missing arc, LOS, range, EW, FC, d20, inventory and arming blockers.
- No fire API, damage executor, fake rolls, weapon state mutation or production merge in this work package.

## Remaining W1 gating requirements
1. Obtain authoritative arc diagram / original ship-specific rules clarifying the Plasma Accelerator and each Twin Array's arcs; encode each as verified angle or exact hex-edge mask with evidence. Do not use earlier unsupported forward 90° / 270° assumption.
2. Finish complete SCS damage diagram audit, especially unverified forward thruster tracks and aft propulsion; preserve armour and individual box geometry. This is necessary for automatic **damage**, even though preliminary targeting can be tested independently.
3. Verify the initial arming state and plasma 1/2/3-turn charge/cooldown transitions in the official rulebook; build a persistent server per-gun history before allowing real fire.
4. Add authoritative server-derived modifier and terrain input to the preview; do not trust client-supplied arcs, EW or defence values. Resolve same-hex history and defender edge choice as explicit authoritative game state.
5. Extend W2 geometry test coverage with half-hex edge contact and actual map blocker fixtures; confirm UI hex orientation and arc visualisation in-browser.

**Gate status:** W1 inventory and printed weapon data verified; W1 arc verification **blocked by missing authoritative arc evidence**. W2 pure targeting/readiness implementation complete for test use, but intentionally not enabled as automatic combat.

## 22 November 2026 — player-confirmed firing arcs
The user explicitly confirmed Plasma Accelerator **forward 90°**, port Twin Array **forward 270°**, and starboard Twin Array **forward 270°**. Canonical mount arcs in `shared/vorchan-trial-library.mjs` now use forward-centred angular intervals [315°,45°] and [225°,135°], respectively, inclusive of boundaries. This confirmation supersedes the earlier unresolved arc status; it is a user-provided ship-specific rule, not a claim that the original SCS diagram was independently legible. `shared/weapon-targeting.mjs` now consumes these arcs by default. The remaining full-ship damage diagram and per-gun arming history are separate blockers to automatic fire.


## 23 November 2026 — SCS viewer integration

The SCS viewer now pairs the source schematic with the canonical weapon records and a text component register. The three forward weapons display mount numbers 1–3 and reference the stored weapon records for damage and targeting values. The external forward thruster icon values 2 and 3 are shown, but their damage-box and armour fields remain unverified. The wing-root 10-box components remain jump-engine tracks according to the corrected vector-key audit. The vector is static and does not mark current ship damage; automatic damage remains gated. See `docs/VORCHAN_SCS_UI.md`.
