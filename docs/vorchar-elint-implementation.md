# Vorchar And ELINT — 24 November 2026

The selectable Vorchar Warscout uses the supplied official Version 2: 2E/SF SCS: 500 points, 10 sensors, 7 sensor power, 6 spare power, and three numbered Twin Array mounts with two independent guns each. It has no plasma accelerator. Its forward hits chart is 1–4 retro thrust, 5–9 Twin Array, 10–18 forward structure and 19–20 primary. Other movement, defence, jump and shuttle values match the existing Vorchan.

All 281 damage squares were independently matched to the original PDF, including six nose weapon squares and 24 sensor squares. Run `python scripts/audit-vorchar-scs.py SOURCE.pdf` to repeat the original-vector comparison. Source SHA-256 is recorded in the profile. The SCS is a self-contained SVG with outlined lettering; automatic damage marks use the original box coordinates.

## ELINT In The Current Clear-Space Scenario

The supplied Second Edition Rules Compendium, ELINT Ships section, governs these functions:

| Function | Expenditure and benefit | Range |
| --- | --- | --- |
| Offensive support | Scout commits normal OEW: at least 1 to each friendly ship and at least 2 to the enemy. Receiver needs at least 2 own OEW on that enemy. Half the scout’s enemy OEW is loaned, rounded down; only the best scout applies. Scout retains its own OEW benefit. | Scout within 30 of both ships at allocation and firing. |
| Defensive support | Separately spend at least 2 per friendly recipient; each pair adds 1 DEW. Scouts may combine, but loans cannot lower the target’s profile below zero. | 50 at allocation and firing. |
| Disruption | Separately spend at least 3 per enemy ship; each triple cancels 1 of that ship’s own OEW. Scout owner chooses the affected allocations after reveal, before movement. Strongest scout applies; equal allocations use a persisted server random selection. | 30 at allocation and firing. |
| Blanket protection | Each 4 EW adds 1 DEW to all friendly units in range, including the scout. Best blanket only, combines with loans within the same profile cap. Cannot combine with other ELINT functions, but permits normal enemy OEW and self DEW. | 20 at firing only. |

Every expenditure shares the ship’s sensor pool. The engine rejects unsupported targets, illegal combinations, non-integer spending and over-budget commitments. Command damage retains ELINT allocations next turn, including reduced output and target losses. Disruption can break the receiver’s two-point lock or a scout’s friendly/enemy lock, removing offensive support. It cannot remove defensive or borrowed EW.

EW positions are saved at reveal. All hit calculations use the immutable pre-fire snapshot, so sensor damage incurred during simultaneous ship fire does not cancel support for return fire. The next turn derives sensor output from the damaged hull. To-hit results include separate loaned OEW, loaned DEW and disruption terms; selections and tie-breaks are recorded in the battle log.

Friendly shuttle groups can receive defensive loans and blanket protection. Current shuttles are unarmed, so no offensive support controls are offered for them. Their innate bonuses cannot be disrupted.

Current scenarios reveal ship identities at setup and contain no unidentified contacts, mines, ballistic weapons, terrain obstruction or jammers. Identification attempts, mine detection, ballistic identification and jammer penetration therefore have no player prompts here. These scenario systems must be implemented before claiming support for those broader ELINT capabilities. CCEW is also outside the current scenario’s implemented EW controls.

## Validation

The Node suite includes original Vorchan regressions, mixed-hull fleet points, all six Vorchar guns, SCS marks, nose weapon criticals, ELINT ratios/ranges/stacking/profile caps, lock disruption, hidden commitments, persisted choices, command-fixed support and simultaneous sensor destruction. Authenticated Worker tests exercise fleet creation, reloads, permissions and revision conflicts using SQLite. Browser checks exercised allocation, the disruption decision, phase progression, three weapon cards and the outlined SCS.

Existing users and battles are preserved. No database migration or reset is needed. A new fleet can select Vorchar directly from the catalogue.
