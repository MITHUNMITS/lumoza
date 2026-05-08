CREATE TABLE IF NOT EXISTS photo_curation_scores (
  photo_id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  ranking_score REAL NOT NULL,
  selection_label TEXT NOT NULL,
  selection_reason TEXT NOT NULL,
  duplicate_penalty REAL NOT NULL DEFAULT 0,
  burst_penalty REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
