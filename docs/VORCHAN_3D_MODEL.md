# Vorchan 3D Model And Paint

The showcase and tactical board load the bundled Tyrel Lohr Attack Cruiser RC2 STL from `public/models/vorchan/centauri-vorchan-rc2.stl`. A local STL override uses the same paint. The procedural preview is used only while the real model loads or when loading fails.

The paint is a simple, uniform muted royal purple (`#643779`) with a satin finish. The material uses low metalness (0.12) and roughness 0.72. Real-time lighting provides highlights and underside shading. The previous grey/brown per-triangle patches and contrasting wing bands are removed. There is no projected concept art, invented panel pattern or additional texture download. The STL geometry is unchanged.

`src/vorchanMaterial.js` supplies the shared finish for the gallery, battlefield and fallback hulls. Old vertex colours are removed before applying it, including on cached geometry. Neutral dark engine fittings and small blue engine lights remain on the procedural fallback only.

The model is credited to Tyrel Lohr with its original [Cults3D listing](https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser). The old reimagination-palette credit has been removed because it no longer describes the paint.

The 3D board is visual only; saved hex positions, facing and movement remain authoritative server state.
