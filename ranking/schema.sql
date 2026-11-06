CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  z INTEGER NOT NULL,
  time_sec INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores (score DESC, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_scores_uuid ON scores (uuid);
