# Built-in ship library is the sole specification authority

The canonical, versioned SCS template supplies every printed characteristic. An individual ship's battle state records only damage, deactivation, critical effects, allocations, current motion and other transient values. Damage never edits the shared template.

`shared/effective-scs.mjs` combines a validated template and an individual ship's SCS state, checking that system damage is within the printed box track. It exposes printed versus current operational condition and conservatively refuses to certify automatic thrust availability when engines have suffered damage or critical effects. Damage boxes alone are **not** a formula for thrust reduction.

Integration requirement: the server loads `ships.template_id` and `scs_templates.definition_json`, obtains the ship's private SCS condition, resolves critical modifiers and current power allocations, and computes movement limits. Client movement orders must contain intentions only (e.g. speed change and manoeuvres), never claimed thrust, efficiency, turn ratios or undamaged stats.

Current limitation: full diagram transcription and critical-effect modifiers remain incomplete. The existing movement executor is not yet connected to the database, and its `limits` argument must only be supplied by trusted server code. No deployment is warranted yet.
