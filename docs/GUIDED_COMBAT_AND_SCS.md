# Guided Combat And SCS

Updated 24 November 2026.

Combat now saves each step on the server: attacker to-hit roll, result and OK; attacker hit-location roll, result and OK; a separate primary-chart roll when indicated; defender system selection where several eligible systems remain; attacker damage roll, armour and marked boxes, then OK. Both players see the current result. The phase ends after the final result is acknowledged. All dice remain server generated; players never enter numbers.

The firing player rolls hit location (Rules Compendium, “Determining What Was Hit”). The defender selects the actual system when the chart leaves multiple eligible systems. Twin Arrays contain two independently firing guns, each with its own attack and location roll; the supplied rules contain no same-target restriction. Each gun may be assigned independently, including offensive fire or interception. The current duel has one enemy ship.

Fire eligibility uses the frozen ship-fire snapshot. Damage marks are previewed against staged damage while the sequence runs, then the tier adjudicator commits damage and criticals. Destroyed weapons retain already-declared simultaneous return fire. Reloads retain dice and the pending actor; stale or repeated commands cannot roll again. Passive test opponents automatically acknowledge results and make eligible defender choices.

Idle saved battles adopt guided combat on their next command. Already-rolled legacy pending damage completes using its saved dice, then later turns use guided combat. No database migration or account reset is needed.

Movement is grouped under Movement and Manoeuvre. Speed determines total normal hex travel for the turn: accelerating from zero to one permits one hex, while speed three permits three. Subsequent normal segments cost no further thrust. The panel shows remaining hexes and explains when they are exhausted; manoeuvres retain their normal thrust costs and restrictions.

The original SCS PDF references fonts without embedding them. `scripts/build-scs-outlines.py` rebuilds the SVG lettering using supplied City font outlines, a City substitute for unavailable display faces and DejaVu Sans Mono for OCR labels. Character positions, ship geometry and all 281 damage-box coordinates are preserved. The SVG needs no installed fonts. Run with the original PDF path and output SVG path; dependencies are PyMuPDF, fontTools, repository City fonts and system DejaVu Sans Mono. Duplicate Weapon Mounts cards were removed from the SCS modal; the original sheet remains complete.

Validation: 251 engine/API/asset tests, production build, and browser checks of three consecutive normal hexes, exhausted movement, manoeuvre choices, the full guided hit/location/damage sequence, final acknowledgement, and legible SCS lettering with six damage marks. Existing rules/scenario exclusions still apply; this change is not a claim that every published weapon rule is implemented.
