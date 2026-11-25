# Primus Battlecruiser

Source: supplied `centauri primus battlecruiser.pdf`, Version 3: 2E/SF. Rules: supplied Second Edition Rules Compendium, Raking and Piercing (printed pp.41–42), Battle Laser, capital-ship damage, manoeuvres, shuttles and jump engines.

The 830-point capital ship is selectable for either fleet. It has four Battle Lasers, eight Twin Arrays (20 individual guns), defence16 forward/aft and17 port/starboard, sensors10 (5 power), no spare power, free thrust10, acceleration cost3, 2/3-speed turn cost and delay, pivot3+3 and roll2+2. The printed high-speed ratios continue beyond the12-column speed chart. All eight physical thruster outlets participate in legal movement allocations.

`scripts/audit-primus-scs.py` extracts507 unique system squares from the original vector PDF, excluding the separate shuttle inset. Five independent structural tracks and all31 system tracks drive the outlined, font-independent SCS. Port/starboard hits use their own charts, gun candidates and structural overkill. Section loss remains deferred with the existing simultaneous-fire rules. Sensor and reactor icons are individually identified: sensors20 boxes, armour7; reactor22 boxes, armour8.

Weapon arcs, measured clockwise from forward: lasers1/2 cover240→0; lasers3/4 cover0→120; arrays5–8 cover240→120; arrays9/10 cover180→60; arrays11/12 cover300→180. Battle Lasers cost6 power, roll4d10+12, lose1 accuracy per4 hexes (rounded up), have FC+4/+3/−3, and reload for3 turns. They cannot be intercepted.

## Laser resolution

- Raking: one damage roll, then separate locations for10-point sub-volleys and any remainder. Each struck system’s armour applies only once per laser shot, including structural overkill. Plasma Stream retains its exception:5-point groups, repeated half armour and immediate erosion.
- Piercing: a declared mode retained by the server; at least4 effective offensive EW required, −4 to hit, ships only. Capital hits divide across entry/primary/opposite sections. Heavy combat vessels use3 sections fore/aft and2 from a side, with defender selection on an ambiguous side bearing. Medium vessels take one volley with−2 damage per die (minimum1). The defender allocates leftover points to distinct sections. Primary redirects on outer charts are rerolled. No overkill; damage assigned to lost sections is discarded.
- All rolls use the existing animated d20/d10 components. Results require acknowledgement; defender choices have explicit actor ownership. The complete sub-volley journal is deterministically replayed before canonical damage is committed. Simultaneous return fire uses the original firing snapshot.

Primus shuttles retain their own3 thrust/1 armour through launch, movement and recovery. Jump-engine risk uses the actual25-box track. The hangar’s6 launch/recovery rate is connected. Its capacity for12 fighters is displayed in fleet setup, but this entry carries no fighters: fighter selection, flight movement and fighter combat remain separate work. Two unarmed shuttles are included.

The map uses a distinct Primus schematic counter in2D and3D. No detailed3D model was supplied; it does not reuse the Vorchan hull.

## Validation and deployment

Regression tests cover source data, all507 live damage positions, capital side damage, movement and all aft outlets,20-gun declarations, mode validation, interception rejection, Raking armour accounting, Piercing choices and rerolls, medium/heavy/capital damage, rearming, shuttle thrust, jump risk, and resuming older saved Plasma Stream resolutions. Production frontend build passes. Browser preview was unavailable in this session, so no visual browser validation is claimed. No database migration or battle/user reset is required.
