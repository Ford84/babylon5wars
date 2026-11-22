# Vorchan SCS verification and movement edge-case audit

Source: supplied original **Centauri Vorchan Warship, Version 3: 2E/SF**, one-page control sheet; checked against supplied **Second Edition Rules Compendium**, Movement & Maneuver.

## Directly legible on original SCS

- Combat points **360**; heavy combat vessel; service **2160**; initiative **+8**.
- Free engine thrust **10**, printed in engine icon; engine efficiency **2 power per 1 thrust**; extra reactor power **4**.
- Acceleration/deceleration **2 thrust per speed point**; pivot **2+2**; roll **1+1**.
- Turn cost **1/2 speed** (minimum 1); turn delay **1/3 speed**; printed speeds 1–12 match the library's twelve values.
- Defence **12 forward/aft**, **14 port/starboard**; jump delay **16**.
- Plasma Accelerator card power **5**; Twin Array card power **2**; diagram shows one forward plasma mount and two forward-side Twin Array mounts.
- Primary hit chart: **1–7 primary structure; 8–10 port/starboard thrust; 11–12 sensors; 13–15 engine; 16–17 hangar; 18–19 reactor; 20 C&C**.
- Forward chart: **1–3 retro thrust; 4–5 plasma accelerator; 6–9 Twin Array; 10–18 forward structure; 19–20 primary**.
- Aft chart: **1–5 main thrust; 6–9 jump engine; 10–18 aft structure; 19–20 primary**.

## Not certified

- **Forward-port and forward-starboard thruster mapping** in the existing identification table is ambiguous: the six-box nose-adjacent symbols and the nearby numbered symbols must not be assumed to be 3-rated forward thrusters without a second visual transcription. These entries are now marked unverified in the identification data.
- Exact box counts, armour and icon semantics of **all 19 systems** require a diagram-by-diagram independent count before automatic combat. Previous code marked every track verified; this is not justified by the available audit. The completeness flags have been reset accordingly.
- The movement adapter still uses provisional forward-thruster ratings; **do not enable fully automatic damage or competitive adjudication** until these are reconciled with the source image.
- Sensor strength and several power-system effects are not proven by the diagram alone.

## Movement rules checked against Compendium

- Extended turn: at least 25% paid on first turn; remainder before movement next turn; no acceleration or other manoeuvres meanwhile; involuntary cancellation only if physically impossible.
- Pivot: 60-degree facing change on start and each following turn while active; halt requires opposing pair; cannot start a second pivot in the same turn; halted pivoted ship may roll, slide or pivot. **Exception:** a ship pivoted by only one hexside may turn into its motion heading, cancelling pivot. Added this exception to staged movement.
- Roll: flip at beginning of subsequent movement turns; halt not permitted on starting turn.
- Reverse: travel heading is opposite facing; reverse side-thruster eligibility checked.

## Test execution

Added regression cases for reverse slides, pivot pair validation, pivot-to-motion exception, roll turn boundary, slide intervals and voluntary extended-turn cancellation. The GitHub Actions workflow was added on the development branch; no successful run has yet been observed. Local container cannot reach the private GitHub repository, so **no claim of executed test success** is made.
