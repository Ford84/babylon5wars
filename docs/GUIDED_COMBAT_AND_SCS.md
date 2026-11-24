# Guided Combat And SCS

Updated 24 November 2026.

Combat now saves each step on the server: attacker to-hit roll, result and OK; attacker hit-location roll, result and OK; a separate primary-chart roll when indicated; defender system selection where several eligible systems remain; attacker damage roll, armour and marked boxes, then OK. Both players see the current result. The phase ends after the final result is acknowledged. All dice remain server generated; players never enter numbers.

The firing player rolls hit location (Rules Compendium, “Determining What Was Hit”). The defender selects the actual system when the chart leaves multiple eligible systems. Twin Arrays contain two independently firing guns, each with its own attack and location roll; the supplied rules contain no same-target restriction. Each gun may be assigned independently, including offensive fire or interception. The current duel has one enemy ship.

Fire eligibility uses the frozen ship-fire snapshot. Damage marks are previewed against staged damage while the sequence runs, then the tier adjudicator commits damage and criticals. Destroyed weapons retain already-declared simultaneous return fire. Reloads retain dice and the pending actor; stale or repeated commands cannot roll again. Passive test opponents automatically acknowledge results and make eligible defender choices.

Idle saved battles adopt guided combat on their next command. Already-rolled legacy pending damage completes using its saved dice, then later turns use guided combat. No database migration or account reset is needed.

Movement is grouped under Movement and Manoeuvre. Speed determines total normal hex travel for the turn: accelerating from zero to one permits one hex, while speed three permits three. Subsequent normal segments cost no further thrust. The panel shows remaining hexes and explains when they are exhausted; manoeuvres retain their normal thrust costs and restrictions.

The original SCS PDF references fonts without embedding them. `scripts/build-scs-outlines.py` rebuilds the SVG lettering using supplied City font outlines, a City substitute for unavailable display faces and DejaVu Sans Mono for OCR labels. Character positions, ship geometry and all 281 damage-box coordinates are preserved. The SVG needs no installed fonts. Run with the original PDF path and output SVG path; dependencies are PyMuPDF, fontTools, repository City fonts and system DejaVu Sans Mono. Duplicate Weapon Mounts cards were removed from the SCS modal; the original sheet remains complete.

Validation: 251 engine/API/asset tests, production build, and browser checks of three consecutive normal hexes, exhausted movement, manoeuvre choices, the full guided hit/location/damage sequence, final acknowledgement, and legible SCS lettering with six damage marks. Existing rules/scenario exclusions still apply; this change is not a claim that every published weapon rule is implemented.

## Labels And Map Navigation Follow-up

System labels now use Plasma Accelerator (Mount 1), Twin Array (Mount 2/Port and Mount 3/Starboard), Jump Engine, Command And Control and explicit thruster names. Saved internal IDs are unchanged, so historical log records display the corrected names too. Critical-effect identifiers are displayed as words.

Both map views provide zoom, pan, Show Whole Map and Find buttons for each ship. Zoom anchors to a ship and focus follows its current position; pan offsets persist until refocusing or resetting. The 3D camera reads current view state instead of a stale zoom closure and fits the board to the viewport aspect ratio. The 2D SVG fits the visible map panel so a centred ship cannot be hidden below a clipped SVG. Log numbering and padding sit inside each entry border, including on narrow screens.

Validation: 253 tests and production build; browser checks of power labels, narrow log cards, 2D find/pan/zoom and the 3D controls. WebGL rendering is unavailable in the test browser, so the 3D renderer itself was not visually verified in this follow-up.

## Facing, Thrust And Dice Presentation

Ship summaries show the named facing. The setup preview and 2D map share the six facing labels/angles; the 3D model yaw now matches the movement engine's edge-centred axial directions. The source STL's nose axis is normalised before applying ship facing. Saved facing values and movement rules are unchanged.

Power shows the current thrust total (condition-adjusted free thrust plus the selected extra purchase) beside Extra Thrust. Roll Initiative opens a modal with a roll for the player's ship, a tumbling d20, and the saved roll, modifiers and total. The modal persists when the engine advances to EW and waits for OK. This remains the supported one-Vorchan-per-player scenario.

Attack results use the same animated d20 and reveal Hit/Miss and OK after it settles. Cosmetic intermediate faces do not determine the outcome: all final values come from existing server-generated saved rolls. Miss weapon effects are held until the attack die settles. Reduced-motion preferences skip tumbling and reveal the saved value immediately. Reloading never submits another roll.

Validation: 254 engine/API/geometry tests and production build; browser checks of thrust purchase totals, facing labels, initiative modal ready/rolling/result states and attack ready/rolling/result states. Both dice settled on the fixture's saved value of 7 before the corresponding results appeared. Tests verify all six 2D/3D nose vectors against actual forward movement. WebGL rendering remains unavailable in the test browser.

## All Attack Dice And Plasma Charge Clarity

The shared animated dice tray now supports d20 location rolls (including a separate primary roll) and all d10 damage dice, in addition to initiative and to-hit rolls. Each new result and its OK button appear after that set of dice settles; previous confirmed results remain visible below the tray. Server rolls, saved prompts and combat mathematics are unchanged.

The plasma card shows the available strength out of three, its last firing/reactivation turn, and the reset timing. Charge is derived from authoritative per-gun lastFiredTurn and lastActivatedTurn, capped at three turns; there is no manually entered charge counter. The scenario starts fully charged. Firing or shutdown resets rearming. After firing on turn N, strength one is available on N+1 (1d10+4 minus range), strength two on N+2 if held (2d10+8 minus range), and strength three on N+3 if held (4d10+12 minus range). Holding longer retains full strength. A three-turn shot does not impose a three-turn firing lock; a one-turn shot can be fired next turn. It does not protect the mount from incoming damage. Basis: supplied Rules Compendium, Plasma Accelerator, and Kitchen Sink §8.4.4.

Validation: 256 passing tests and production build, including explicit charge-cycle/reactivation regressions. Browser checks exercised animated to-hit, forward-chart, primary-chart and four-d10 damage results, with results below the settled dice and no early OK button.

## Visible End-Of-Turn Criticals And Movement Review

A seventh phase, Critical Checks, now follows all weapon fire and damage whenever checks are due. The damaged ship's owner rolls its server-generated d20 and acknowledges the animated result before the next check or next turn. Both players see the current check, modifiers and possible outcomes. The supplied critical section specifies timing and modifiers but does not explicitly assign a roller; using the owning player is the simulator's convention. Passive opponents roll automatically and leave their results for the human player to acknowledge. Engine shorts request their own unmodified follow-up d20. Damage and overthrust checks remain separate; overthrust adds both marked damage and excess thrust. Saved stages, rolls, revisions and effects survive reload without duplicate application. Finished historical checks are not rerolled.

The Twin Array special critical now overrides the basic chart at modified 20+: one gun is lost, then the mount on the next such critical. Gun 2 is removed first to leave gun 1 consistently available; the guns have identical statistics. Readiness and fire validation enforce those losses. Critical summaries use the applicable system chart, while location summaries show the actual Forward/Aft/Primary d20 ranges. The rolled row is highlighted. The printed basic weapon chart's missing result 13 remains explicitly identified as a scenario interpretation.

The d10 now uses distinct pointed, kite-faceted artwork rather than the d20 silhouette. Damage dice retain their saved values and results below the animation.

Movement review against the supplied Compendium (Acceleration And Deceleration, Normal Motion, Rolls and Pivots): speed changes are optional, but must precede all travel and manoeuvres. Starting travel or a manoeuvre means retaining current speed and closes later acceleration/deceleration. A pivot may precede normal travel; choosing zero travel after the action keeps the ship in its hex. Hull facing and inertial direction remain separate. The movement panel explains these choices, and both ship summaries expose the server-derived travel direction (Stationary at speed zero). Normal travel and reverse movement use the same authoritative heading function; a pivot cannot redirect travel. A normal turn or legal slide follows its published movement rules. Rolling can begin during a pivot; while rolling, other manoeuvres remain unavailable until the roll is halted. The previous restriction incorrectly blocking that roll start has been corrected. Existing turn-delay, thruster, extended-turn and pivot restrictions remain validated by the movement engine.

Validation: 265 tests pass, including Worker API defender permissions, stale revisions, saved critical results, engine follow-up, passive result review, independent overthrust checks, Twin Array gun losses, pivot-before-travel, speed-order enforcement, reverse travel and public inertial direction. Browser checks confirmed critical/table animations, final acknowledgement before turn advance, distinct d10 artwork, location summaries and zero-travel pivot choices.
