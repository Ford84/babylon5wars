-- W8: authoritative combat inputs and unique per-turn adjudication.
CREATE TABLE IF NOT EXISTS combat_terrain (
 game_id TEXT NOT NULL REFERENCES games(id),turn INTEGER NOT NULL,
 blocking_hexes_json TEXT NOT NULL,confirmed_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(game_id,turn)
);
CREATE TABLE IF NOT EXISTS combat_choices (
 game_id TEXT NOT NULL REFERENCES games(id),turn INTEGER NOT NULL,
 attack_id TEXT NOT NULL,defender_id TEXT NOT NULL REFERENCES users(id),
 choice_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(game_id,turn,attack_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_vorchan_fire_journal
 ON events(game_id,turn,event_type) WHERE event_type='vorchan_fire_roll_journal';
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_vorchan_damage_commit
 ON events(game_id,turn,event_type) WHERE event_type='vorchan_damage_committed';
