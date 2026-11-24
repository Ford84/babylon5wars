-- Explicit opt-in testing mode. Existing multiplayer battles are unchanged.
ALTER TABLE games ADD COLUMN mode TEXT NOT NULL DEFAULT 'multiplayer'
 CHECK(mode IN ('multiplayer','solo-test'));
