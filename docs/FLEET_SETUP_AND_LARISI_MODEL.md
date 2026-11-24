# Fleet Setup And Larisi Shuttle Model

24 November 2026.

## Fleet Setup

The host selects verified SCS catalogue entries for either player's fleet, up to twelve ships per side. Ship costs and fleet totals come from the authoritative catalogue, not client-supplied point values. The Vorchan remains the only enabled ship class pending the next vessel's verified rules and tracks. Its standard unarmed shuttles are included in its cost.

Free placement retains the starting-hex/facing preview and adds starting speed. Meeting Engagement is the named rules-based deployment option: opposing top/bottom map edges, separation of at least thirty hexes and starting speeds from zero to ten. The source is the supplied Second Edition Rules Compendium, Scenarios → Meeting Engagement / Combat Points. These are scenario guidelines, not a claim that all B5W scenarios use the same deployment. Free placement permits signed speeds −10 to 10. Multiple ships may share a hex, as elsewhere in the engine.

Fleet selection, deployment mode, coordinates, facing and speed persist together. Setup is host-only, validated again at battle start, revision protected and locked after start. A short transactional guard aborts stale concurrent draft saves. The save replaces only that battle's editable setup ships, leaving users and other battles intact. Unsaved edits disable the Start button.

The engine now collects power, EW, fire, jump and hangar decisions per ship; initiative and movement are per unit; defence is committed per player across all owned ships. Passive opponents process all their ships. A fleet remains in play while at least one ship survives or has not withdrawn. Points remain visible during play.

## First Uploaded Model

Archive: `centauri-larisi-assault-shuttle-fleet-scale20240130-62750-66i5dt.zip`.
Selected first entry: `tyrellohr/centauri-larisi-assault-shuttle-fleet-scale/CR-Larisi-RC1.stl` (the `-NH` version was not used). Creator: Tyrel Lohr. SHA-256 of the source STL: `2f8502e20eb2532bf08711083d06e7cc61227f7bffa4fb260d4c9e3b0c34cb5e`.

Reference: https://www.microshq.com/babylon-5 → Centauri Transport (BAB07), image https://static.wixstatic.com/media/f2c39d_f8e81bf3ea584e2a95c6f150e03097c3~mv2_d_1255_1255_s_2.jpg . The matching horseshoe-shaped transport has purple surfaces, muted gold edging and pale windows. The model creator's listing identifies this sculpt as a resized Centauri transport: https://cults3d.com/en/3d-model/game/centauri-larisi-assault-shuttle-fleet-scale . These are visual references; the in-game colour partitions are an interpretation, not a claim of exact screen texture reproduction.

The first STL is converted to embedded-buffer GLB with smooth normals, linear vertex colours (purple hull, gold trim, graphite recesses, pale windows), map nose aligned to −Z and the bottom at Y=0. A 0.01 mm vertex weld removes degenerate/sub-pixel triangles, retaining 114,618 triangles and 57,243 vertices from 124,656 source triangles. Gzip reduces the asset to approximately 1.3 MB. Modern browsers decompress the binary and load it with the existing GLTFLoader. The 2D icon remains distinct; a small 3D token remains the fallback if loading fails.

Rebuild using `python scripts/convert-larisi.py /path/to/original.zip` from the repository root (requires NumPy). The supplied sculpt replaces the visual token only. It does not change the unarmed shuttle statistics on the Vorchan SCS into assault-shuttle rules.

## Validation

Node tests cover catalogue point totals, deployment restrictions, host/revision/start locks, saved fleet reload, speed persistence, independent ship orders across multiple turns, passive fleets, surviving-fleet victory logic and GLB buffer/colour/axis integrity. Browser checks verified adding a third ship, updated 720/360 point totals, Meeting Engagement positions, save/start and acting-ship progression after power commitment. WebGL is unavailable in the automation browser; GLTFLoader parsing and model bounds/material attributes were checked directly, but final WebGL lighting still needs a visual check on a capable device.
