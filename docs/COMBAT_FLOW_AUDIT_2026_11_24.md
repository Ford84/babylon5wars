# Combat Flow Audit — 24 November 2026

Scope: the current two-Vorchan, clear-space scenario. Checked the active UI, authoritative command reducer, authenticated persistence, damage allocation and live SCS against the supplied Second Edition Rules Compendium and the corrected Vorchan v3 SCS. This is not a claim that every unit, optional rule or scenario in the compendium is implemented.

## Findings And Changes

| Area | Finding before this audit | Result |
| --- | --- | --- |
| Movement commitment | Selecting acceleration changed speed, but moving the first hex required another command. | The manoeuvre panel now includes the immediate straight travel segment (one hex by default where possible). Commit Thrust And Move applies both atomically and shows the actual destination. The player can choose a longer segment or zero to manoeuvre in place. Slides already move a hex; no second move is added to slides. Extended-turn starts can include travel while completion retains its required staged sequence. |
| Movement validation | Legal thrust distributions and costs were enforced. | Retained; automatic travel must fit remaining movement and satisfy the same movement reducer. A failed combined action applies neither thrust nor movement. |
| To-hit then damage | Attack, location and damage dice were generated together, even for misses. | All ship attacks now resolve to-hit first, including interception. Only successful hits receive location and damage dice. Misses explicitly show No Damage Roll. |
| Weapon modes | Declarations accepted only Standard, matching both weapons on this Vorchan. | Standard is now explicit in the damage dispatch, event records and weapon cards. Plasma charge intervals use their own verified dice and range falloff; plasma halves armour, rounded down. Unsupported modes remain rejected. |
| Simultaneous fire | Attack eligibility and modifiers already used an immutable ship-fire snapshot. | Preserved and regression-tested even when both reactors are destroyed. Damage does not cancel weapons already allocated in the same ship-fire step. This is simultaneous within a resolution step, not immunity to every earlier event in the whole turn. |
| Damage allocation | Defender choices, repeated armour and section loss were tracked. | Fixed excess damage being lost when system overkill also destroyed its attached structural block. Surviving excess now continues to primary structure, with primary armour applied. Destroying the reactor also marks the target destroyed during damage allocation. |
| SCS | Canonical damage already drove individual box crosses. | Verified every one of the 281 vector boxes maps once; tested partial system damage and a browser shot marking 38 boxes. The SCS is read-only; damage comes from the engine. |
| Player decisions | Power, EW, manoeuvres, charge, attack order, interception, boundary aspects and eligible damage allocations were captured by phase-validated commands. | Retained. Authenticated integration tests confirm combined movement writes one revision, event and matching ship position. Existing tests cover private commitments, stale/concurrent commands and persistent defender choices without rerolls. |
| Weapon animation | None. | Saved firing/target hexes now drive plasma and particle pulses in the 2D and 3D maps. Only hits show an impact. Latest attack/damage results are available to both clients, with replay. Replaying never rolls dice or changes state. |

## Rule Basis

The compendium's Combat Sequence and Weapons Fire Resolution sections establish simultaneous declarations and firing within a combat resolution step. Its Marking the Damage section explicitly preserves a weapon's shot when destroyed in that same step. Overkill continues into the attached structural block, and then primary structure when appropriate; each applicable structural armour value is checked. Destroyed attached systems are removed after weapons fire, while hits to a structural block already destroyed during this step go to primary structure.

The Weapon Firing Modes section defines Standard as one damage volley. Both the printed Vorchan plasma accelerator and twin arrays use Standard; the plasma accelerator's one-, two- and three-turn charge levels are firing intervals, not Raking or Pulse damage modes. An animated pulse does not turn a Standard-mode weapon into a Pulse-mode rules weapon.

## Remaining Unsupported Rules

The active scenario still excludes other ship types and imported-SCS combat, fighter flights, ballistic launches and their separate resolution step, jumping, boarding/marines, ramming, shuttle operations, terrain/obstacles and associated environmental rules. Called shots and optional voluntary initiative penalties are not offered. Those operations have no misleading manual-entry prompts.

Raking, Piercing, Sustained, Flash, Pulse and Linked damage allocation are not implemented for general weapons. They must be added with their relevant weapon data and tests before ships requiring those modes become playable. The present Vorchan weapons do not require those modes.

The supplied basic weapon-critical chart omits modified result 13. The existing disclosed scenario interpretation remains no additional effect. This is not an official erratum. General repair, crew-quality, scenario and optional special-ability systems are not modelled by this duel.

## Verification Limits

Automated coverage includes real authenticated Worker requests and SQLite transactions, both players' commitments, movement, hit-only damage dice, modes, armour/overkill, mutually destroyed reactors, choices, criticals, SCS box mapping and animation timing/endpoints. The browser fixture used the production panels and reducers to commit thrust and move, declare a plasma attack, display its hit/damage result, replay a 2D pulse and inspect the target's 38 damage markers. The fixture avoids production test accounts. A live 3D visual check is unavailable because the cloud browser lacks WebGL; the 3D implementation shares the tested timing and saved hex endpoints.

Existing automated battles can continue. Already-rolled pending battles retain their original saved dice instead of rerolling during deployment. Earlier manual-version battles remain historical records and still require a new battle for automation.
