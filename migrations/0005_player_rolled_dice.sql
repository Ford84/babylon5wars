-- Store each player's combat dice separately so a refresh cannot reroll them.
CREATE TABLE IF NOT EXISTS combat_rolls (
 game_id TEXT NOT NULL REFERENCES games(id),
 turn INTEGER NOT NULL,
 attack_id TEXT NOT NULL,
 player_id TEXT NOT NULL REFERENCES users(id),
 rolls_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(game_id,turn,attack_id)
);

CREATE INDEX IF NOT EXISTS idx_combat_rolls_player
 ON combat_rolls(game_id,turn,player_id);
