ALTER TABLE games ADD COLUMN deployment_mode TEXT NOT NULL DEFAULT 'free' CHECK(deployment_mode IN ('free','meeting'));
CREATE TABLE fleet_setup_guards(game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,expected_revision INTEGER NOT NULL);
CREATE TRIGGER fleet_setup_revision BEFORE INSERT ON fleet_setup_guards
BEGIN
 SELECT CASE WHEN NEW.expected_revision != (SELECT revision FROM games WHERE id=NEW.game_id)
 THEN RAISE(ABORT,'Battle revision conflict') END;
END;
