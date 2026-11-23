# Player-first rules and combat UI milestone

## Rulebook comparison

Compared against the supplied *Babylon 5 Wars Second Edition Rules Compendium* and *AOG Wars Kitchen Sink*, especially the tactical turn sequence, pre-turn power and EW, initiative, weapons fire, firing arcs, range modifiers, damage and hangar operations.

| Rules area | Rulebook expectation | Prototype change | Coverage |
| --- | --- | --- | --- |
| Turn sequence | Resolve only procedures that can apply to the units in play. | The current prototype has ship units but no fighter-flight entities. Fighter pivot and close-combat EW phases are automatic; fighter-only checklist items are marked not applicable for the known Vorchan trial. Ballistic-only steps are also skipped for that trial. | Accurate for the current ship-only trial; re-enable when flight or ballistic units are modelled. |
| Optional allocations | Ask for optional choices and reveal their inputs only after a Yes. | Power allocation now asks separately about extra thrust, bought EW and deactivating systems. EW allocation asks about defensive and offensive EW. A No sets that choice to zero; server-side budgets still validate submissions. | Enforced for Vorchan power/EW. Generic imported-ship power allocation remains unimplemented and is called out in the UI. |
| Initiative | Each ship rolls its own d20; the printed bonus and speed modifier determine its total. | An animated client die is rolled by the ship owner. The server validates 1–20, calculates the SCS modifiers, stores the result and prevents a second roll that turn. | Implemented for trial ships and imported SCS initiative actions. Tie roll-offs remain a broader game-flow gap. |
| Weapon declarations | Select a target, then declare eligible weapons and their firing order. | The fire panel now asks for a target before showing the mount cards. It filters out guns outside arc, destroyed/deactivated mounts and guns that are not ready. The server continues to validate ownership, target, arc and declaration format. | Implemented for the verified Vorchan mount set. |
| Weapon information | Players need the weapon’s fire control, range, damage and arc while choosing a target. | Each card shows the source-backed datacard, firing arc, target distance, range penalty, selected plasma charge and damage dice, target defence, revealed defensive EW and the current pre-interception hit number. Unknown target classes, missing EW reveals and unsupported SCS records no longer inherit Vorchan values. | Implemented for Vorchan versus Vorchan; terrain and interception can still block or modify final resolution. |
| Dice and log | Players roll and the result remains visible for adjudication. | The animation displays its final values only when it stops. Initiative, combat dice and overthrust checks are supplied by the player and recorded once. Combat-roll events are visible in the battle log and refreshes do not create another roll. | Implemented for dice paths currently automated by the prototype. Unsupported table rolls remain manual. |
| EW reveal | Secret EW commitments are revealed before fire. | The final EW lock emits the committed defensive and offensive allocations to the shared log, allowing target cards to show known EW modifiers before fire orders. | Implemented for current ship allocations. |
| Hit location and damage | Apply the correct chart, armour, damage boxes and critical effects. | No damage rule has been inferred from an incomplete system diagram. Unsupported results remain manual and are logged. | Not fully automated; see blockers below. |

## Remaining accuracy limits

- The supplied Vorchan record still lacks a complete verified system damage diagram and all critical effects. Automatic damage cannot safely cover every result until those source details are transcribed and checked.
- Terrain is confirmed by the host as blocking hexes rather than read from an authoritative map terrain layer.
- Automatic ship fire is limited to the verified Vorchan-versus-Vorchan trial. Other SCS targets are clearly marked unsupported and cannot receive guessed Vorchan defence or fire-control values.
- Combat rolls are grouped into one animated set per attack, including location and damage dice. Those extra dice are ignored for misses; a later pass could reveal them only after a hit.
- The browser creates the digital dice values. The server validates die ranges and preserves each result, but a modified browser can still submit a chosen legal number. Use physical dice and record the result in the manual ruling workflow if table-side trust is needed.
- Fighter, ballistic, marine and support-unit procedures remain unavailable because those unit types are not represented in the current trial. Their automatic/not-applicable handling must be revised when those entities are added.
- Imported SCS power budgets, full damage resolution, initiative tie roll-offs, ballistic launch and the remaining specialist phases are not complete.

## Fonts

City Regular is now the primary interface face; City Medium supplies heavier weights; the supplied Babylon 5 face is used for the main title. Font source and redistribution notes are in [FONT_SOURCES.md](./FONT_SOURCES.md).

## Next usability improvements

1. Add a turn timeline with per-player completion, next required action and a clear explanation of why a phase is waiting.
2. Build a combat breakdown panel that keeps the attack roll, hit number, interception modifier, location chart and damage result together for each attack.
3. Add a reversible damage preview showing shield/armour steps and which SCS boxes will be marked before the defender confirms the allocation.
4. Add contextual help for disabled controls so each one states the exact reason: out of arc, uncharged, deactivated, destroyed, missing EW lock-on or unresolved terrain.
5. Save named scenarios and per-ship custom loadouts once the prototype supports more than the fixed Vorchan trial.

## Database and release state

Migration `0005_player_rolled_dice.sql` adds persistent per-attack player rolls. Source is updated locally; no live database migration or deployment was performed. A production release should follow the repository's existing migration and multiplayer acceptance process.
