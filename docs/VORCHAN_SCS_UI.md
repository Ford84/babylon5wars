# Vorchan SCS viewer

The ship-systems view pairs the supplied Version 3: 2E/SF SCS schematic with the canonical records in `shared/vorchan-trial-library.mjs` and `shared/vorchan-scs-identification.mjs`.

## Displayed information

- The schematic retains the original component placement and printed damage-box cells. CSS inverts the monochrome artwork for the game's dark interface.
- Weapon records are joined by weapon ID. Each physical mount is shown with its printed mount number, armour, box count, damage formula, range penalty and fire-control values.
- The two outer forward thruster icons show their printed values (2 and 3). Their damage boxes, armour and exact movement mapping remain explicitly unverified.
- The two wing-root 10-box tracks remain identified as jump-engine components in the current source audit; they are not labelled as forward thrusters.
- The expanded component register provides a text alternative for the schematic and shows which track data is verified.

The image is a static reference: it does not mark damage or represent a ship's live state. Automatic damage remains blocked while the forward-thruster tracks, full damage diagram and other verification gates are incomplete.

## Source verification notes

The original PDF and corrected vector-key audit agree on one Plasma Accelerator and two forward Twin Array mounts. Their catalogue IDs are `plasma_forward`, `twin_nose_port` and `twin_nose_starboard`; the displayed mount numbers are 1, 2 and 3. The record links each mount to its canonical weapon data rather than duplicating weapon formulas in the UI.

The extracted diagram is only a cropped ship schematic; it omits the rest of the SCS page. The supplied SCS page states photocopy permission for personal use. Confirm broader permission before distributing the extracted artwork through a public repository or deployment.
