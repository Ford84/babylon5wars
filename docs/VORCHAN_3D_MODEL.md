# Vorchan 3D Model And Paint

The showcase and tactical board load the bundled Tyrel Lohr Attack Cruiser RC2 STL from `public/models/vorchan/centauri-vorchan-rc2.stl`. A local STL override uses the same paint. The procedural preview is used only while the real model loads or when loading fails.

The hull retains its muted royal-purple base (`#643779`) with restrained component detailing:

- Dark plum (`#302039`) in concave joints, recessed central machinery and engine vents.
- Soft lavender (`#9271a5`) on convex armour edges and raised ribs.
- Thin muted brass (`#99815b`) collars on the paired engine pods and circular weapon fittings.
- Broad colour variation of at most 1.6%, mirrored across the ship, without speckles or per-triangle camouflage.

The STL has no UVs. `src/vorchanMaterial.js` analyses shared vertex positions and local curvature to paint real recesses and edges, with narrow symmetric component masks for the collars. It writes continuous vertex colours while retaining the original positions, indices and flat normals. Paint is cached on the geometry so polling/redrawing the board does not repeat the analysis. There is no extra texture download.

The showcase, tactical STL and local STL override use the same detailed paint and satin material (metalness 0.16, roughness 0.68). The procedural fallback retains a plain purple hull, neutral engine fittings and blue engine lights.

The model is credited to Tyrel Lohr with its original [Cults3D listing](https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser). The old reimagination-palette credit has been removed because it no longer describes the paint.

The 3D board is visual only; saved hex positions, facing and movement remain authoritative server state.
