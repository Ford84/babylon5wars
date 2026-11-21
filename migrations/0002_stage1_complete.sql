CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON users(display_name COLLATE NOCASE);
ALTER TABLE memberships ADD COLUMN initiative_rank INTEGER NOT NULL DEFAULT 100;
CREATE TABLE IF NOT EXISTS invitations (token_hash TEXT PRIMARY KEY,game_id TEXT NOT NULL REFERENCES games(id),created_by TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL,used_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS login_limits (name TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,locked_until TEXT);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_game ON invitations(game_id);
CREATE TRIGGER IF NOT EXISTS orders_active_phase BEFORE INSERT ON orders
BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM games WHERE id=NEW.game_id AND turn=NEW.turn AND phase_id=NEW.phase_id AND status='active') THEN RAISE(ABORT,'Phase has changed') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM memberships WHERE game_id=NEW.game_id AND user_id=NEW.player_id) THEN RAISE(ABORT,'Player not in game') END;
END;