# W5 — Vorchan damage engine status

Primary references inspected directly: **2nd Edition Rules Compendium**, Damage Resolution / Determining What Was Hit / Subtracting for Armor / Subtracting for Shields / Marking the Damage / Overkill / Destroyed Structure; **Centauri Vorchan Warship Version 3: 2E/SF**, page 1 (hit charts and system diagram). The Compendium is authoritative over the unofficial Kitchen Sink.

## Implemented and tested

`shared/vorchan-damage.mjs` implements pure, immutable **standard volley** calculations:
- Vorchan forward/aft/primary d20 hit charts; a primary token triggers a separate d20; port/starboard incoming directions require a forward/aft chart decision for this heavy combat vessel.
- Defender selects among undestroyed eligible physical mounts; absent choices return explicit requirements.
- Plasma Accelerator's three printed charge/damage dice options, range damage falloff, Twin Array damage dice.
- Separate non-ablative armour deduction for each volley, with plasma halving armour and rounding down.
- Damage marks on verified SCS tracks; damaged-system critical candidate list (no premature critical roll).
- Overkill transfers to local forward/aft/primary structure with another armour deduction; destroyed systems cannot absorb future damage; primary structure destruction immediately destroys the ship.
- End-of-turn section-loss helper, conservatively blocked if the section includes unverified tracks.

`tests/vorchan-damage.test.mjs` tests charts, dice, armour, plasma, overkill, defender choice, immediate primary destruction and the incomplete-SCS safety gate.

## Outstanding W5 blockers — automatic damage is NOT yet enabled

1. **Incomplete original SCS**: `forward_port_thrust` and `forward_starboard_thrust` are unverified. Exact box and armour values must be checked from the original diagram. `main_thrust` and `jump_drive` selection also requires definitive system mapping.
2. **Server W4 roll journal**: W4 does not yet generate and persist real to-hit, damage or location dice. Therefore this module is not connected to the live firing phase, and cannot safely mutate authoritative ship damage.
3. **Defender choice persistence**: System selection and forward/aft chart decisions must be committed to D1 as server-validated defender responses, with a resolution cursor for retries.
4. **Critical effects**: Eligible systems are queued; individual critical check tables, modifiers, consequences and timing must be implemented before a full end-turn adjudication.
5. **Other weapon modes and special cases**: This engine intentionally supports standard Vorchan ship volleys only; special shield/adaptive armour interactions, raking/piercing/flash and fighter rules are not fabricated.
6. **Same-tier simultaneous fire**: W4 needs frozen fire snapshots and journal replay so a weapon destroyed during its own tier still fires.

No main/production merge. A passing test for the pure module is not equivalent to end-to-end combat acceptance.

## Follow-up: criticals implemented for verified weapons only

Added `shared/vorchan-criticals.mjs` and `tests/vorchan-criticals.test.mjs`: single end-of-fire check for each surviving non-structure system damaged this turn, d20 + total marked boxes, printed Basic Weapon Critical ranges, cumulative range degradation and per-die damage reduction (minimum 1). The Compendium's printed Basic Weapon Critical chart jumps from **1–12** to **14–18**, omitting **13**. Result 13 is explicitly marked for rule clarification; no invented effect is applied. Other system-specific critical tables remain to be encoded and tested.

### Source discrepancy requiring reconciliation

The separately supplied `Vorchan_SCS_Full_Audit.md` states the original SCS contains **four Twin Array mounts** (two nose, two wing), whereas the current development library and W1–W5 implementation contain **two**. That audit also notes unresolved forward external thruster tracks. The two sources are not reconciled, so it would be unsafe to claim full W5 damage integration or force a destructive database migration. Confirm the physical mount count and wing armour/box counts against the rendered original SCS and reconcile weapon inventory, power budget, arcs, firing declarations and damage routing as one atomic change. Do not invent wing arcs.

**The remaining user-requested requirements are not complete**: authoritative W4 rolls and journal, persisted defender choices, system critical tables and full SCS verification still block end-to-end automatic damage.
