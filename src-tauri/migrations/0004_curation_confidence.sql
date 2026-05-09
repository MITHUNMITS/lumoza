CREATE TABLE IF NOT EXISTS photo_curation_recommendations (
  photo_id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  confidence_label TEXT NOT NULL,
  album_candidate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
