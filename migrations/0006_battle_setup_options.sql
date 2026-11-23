ALTER TABLE games ADD COLUMN map_preset TEXT NOT NULL DEFAULT 'standard'
  CHECK (map_preset IN ('standard', 'outer', 'inner'));
ALTER TABLE games ADD COLUMN model_id TEXT NOT NULL DEFAULT 'attack-cruiser-rc2';
