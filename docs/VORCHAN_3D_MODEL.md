# Vorchan 3D board asset status

The board now renders genuine Three.js meshes with static lighting, hex selection and camera zoom. The currently bundled Vorchan geometry is a **procedural coloured preview**, not a recovered television-production model. It uses a royal-purple hull, gold detailing and blue engine lights.

## External model candidates

1. BadQueenCreations, *Centauri Vorchan*, Cults3D (2020): https://cults3d.com/en/3d-model/game/centauri-vorchan — STL geometry attributed to Craig A. Clarke; STL has no colour or texture materials. Site's 3D-printing licence does not establish redistribution rights for this game.
2. Tyrel Lohr, *Centauri Vorchan Attack Cruiser*, Cults3D (2023, updated 2026): https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser — printable STL, not a textured real-time game model.
3. Chris Sapiano, *Centauri Vorchan-Class Cruiser*, historical 3D model index: https://www.ultradrive.com/b5_3d_index.htm — 3DS Max/DXF archive links are old and availability/redistribution rights are unconfirmed.

Do **not** copy any of these models into the public game repository without permission or a licence permitting redistribution. Once a properly licensed, colour-correct GLB is obtained, save it at `public/models/vorchan.glb`. The existing board automatically loads that model and falls back to the built-in purple preview if unavailable. Audit its forward axis and scale before enabling it for normal play.

The classic SVG map remains selectable. The 3D board is a visual-only feature; the server remains authoritative for hex positions, facing and movement.
