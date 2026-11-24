-- Whole-battle command snapshots. D1 batch transactions persist state, mirrored
-- ship rows and the public event journal together. Failed revision checks abort.
CREATE TABLE battle_states (
 game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 state_json TEXT NOT NULL
);
CREATE TRIGGER battle_state_initial_revision BEFORE INSERT ON battle_states
BEGIN
 SELECT CASE WHEN NEW.revision != (SELECT revision+1 FROM games WHERE id=NEW.game_id)
 THEN RAISE(ABORT,'Battle revision conflict') END;
END;
CREATE TRIGGER battle_state_update_revision BEFORE UPDATE ON battle_states
BEGIN
 SELECT CASE WHEN NEW.revision != OLD.revision+1 OR OLD.revision != (SELECT revision FROM games WHERE id=NEW.game_id)
 THEN RAISE(ABORT,'Battle revision conflict') END;
END;
