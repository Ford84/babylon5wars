# Vorchan Warship SCS source audit — corrected 22 November 2026

## Source identity and cross-check
Original **Centauri Vorchan Warship Version 3: 2E/SF** from `centauri_official(1).zip`; original extracted PDF SHA-256 `04d59dec44a446771c50aa5e617d90652ff96e758b7b4617c5e05d68a1e76af9`. Compared PDF text layer with rendered sheet, magnified damage diagram, icon-recognition legend, weapon datacards, and current game modules. **The screenshot showing +6 is headed Warscout, not Vorchan Warship.** Vorchan original shows **Extra Power 4**. The +6 Vorchan change was reverted.

## Directly verified printed statistics
Heavy Combat Vessel; in service 2160; points 360; ramming 135; jump delay 16; defences F/A 12 and P/S 14; engine efficiency 2/1; **extra power 4**; initiative +8; engine icon free thrust 10; turn cost 1/2 speed; turn delay 1/3 speed; accel/decel 2; pivot 2+2; roll 1+1. Printed turn-cost values speeds 1–12: 1,1,2,2,3,3,4,4,5,5,6,6. Printed turn-delay values: 1,1,1,2,2,2,3,3,3,4,4,4.

## Weapon verification
Plasma Accelerator: 1 mount, 5 power, 4d10+12 minus 1 per hex, range penalty -1/hex, fire control +3/+1/-4, ROF 1/3, alternative 1d10+4 once per turn or 2d10+8 once per two turns. Twin Array: **4 physical mounts**, 2 power each, 1d10+4, range penalty -2/hex, fire control +4/+5/+6, intercept -2, ROF twice per turn. Earlier extraction omitted both **nose Twin Arrays** and misidentified their six-square weapon tracks as forward thrusters. Total potentially switchable weapon power is 5+4×2=13 (only working systems can be deactivated). Weapon arcs remain **unverified** and are not assigned speculative 90°/270° values.

## Physical damage-track corrections (squares; armour in parentheses)
Retro 5 (4), nose Twin Array port 6 (3), nose Twin Array starboard 6 (3), forward Plasma 8 (4), forward structure 48 (5; independent recount pending), wing Twin Array port 10 (5), wing Twin Array starboard 10 (5), engine 11 (7; icon 10), reactor **20** (6; diamond 4), sensors 12 (7), command **12** (6), hangar **2** (6; icon 2), primary structure 28 (6), port and starboard side thrust 12 each (5), aft structure 44 (4; recount pending), aft port/starboard main thrust 8 each (4), jump engine 16 (6). Forward external thruster icons 2 and 3 are present but their separate damage tracks/armour and precise physical mapping remain **unverified**. Previous reactor 12, command 2, hangar 16, retro 10 and nose-thruster tracks were incorrect.

## Printed hit charts: verified as transcribed
Forward: 1–3 Retro; 4–5 Plasma; 6–9 Twin Array; 10–18 Forward Structure; 19–20 Primary. Aft: 1–5 Main Thrust; 6–9 Jump Engine; 10–18 Aft Structure; 19–20 Primary. Primary: 1–7 Structure; 8–10 Port/Stb Thrust; 11–12 Sensors; 13–15 Engine; 16–17 Hangar; 18–19 Reactor; 20 C&C. All charts cover 1–20 exactly once. Mapping generic hit outcomes to physical mounts remains an independent implementation task.

## Verification gate
The audit used **two extraction modalities** (PDF text and magnified visual inspection), icon-by-icon comparison, code-value comparison and new source-regression assertions. It did **not** include independent second-person counting of all structure rows, confirmation of weapon firing arcs, full external-thruster identification, automatic damage simulation, or a successful executed test suite. The library must remain `completeForAutomaticCombat:false`. See the user-facing detailed audit report for full findings.
