# Damage resolution milestone — ship-specific facing and firing-mode planning

Primary source: `2nd Edition Rules Compendium.pdf`, sections *Determining What Was Hit*, *Weapon Firing Modes*, *Raking Mode*, *Piercing Mode*.

Implemented in `shared/damage-plan.mjs`:
- Chart selection by attack arc and hull class, including heavy/medium forward or aft chart treatment for quarter attacks; unresolved exact side attacks return a target choice.
- Standard mode: one volley.
- Raking mode: split into 10-point sub-volleys by default, configurable per weapon; same-shot armour once per system is indicated for downstream damage application.
- Piercing: requires 4 offensive EW; -4 to hit; capital/base three-section path; heavy combat three volleys for forward/aft, two for side; medium/light per-die reduction pending actual dice; fighter/shuttle prohibition by applicable hull class; target chooses which distinct sections receive indivisible extra points.
- Flash, linked and pulse explicitly marked as requiring specialised downstream resolution, not incorrectly treated as fully resolved.
- Unit tests for representative scenarios.

**Integration status:** This is a pure planning module and tests only. No automatic hit-location dice, system choice, armour application, structure damage, criticals, server-authoritative attack-direction calculation or game-state mutation yet. It is not deployed. Section-specific special hull rules will require data from each ship's sheet. The live D1 SCS catalogue migration remains outstanding.
