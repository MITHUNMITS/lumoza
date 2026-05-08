CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  analysis_type TEXT NOT NULL,
  status TEXT NOT NULL,
  engine TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  photos_total INTEGER NOT NULL DEFAULT 0,
  photos_processed INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS photo_quality_metrics (
  photo_id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  sharpness_score REAL NOT NULL,
  exposure_score REAL NOT NULL,
  contrast_score REAL NOT NULL,
  resolution_score REAL NOT NULL,
  overall_score REAL NOT NULL,
  analyzed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duplicate_groups (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  grouping_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duplicate_group_members (
  group_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  similarity_score REAL NOT NULL DEFAULT 0,
  rank_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, photo_id)
);
