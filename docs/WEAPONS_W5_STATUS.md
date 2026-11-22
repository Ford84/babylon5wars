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
