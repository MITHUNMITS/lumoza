CREATE TABLE IF NOT EXISTS selection_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    engine TEXT NOT NULL,
    engine_version TEXT NOT NULL,
    final_count_target INTEGER NOT NULL,
    review_count_target INTEGER NOT NULL,
    photos_total INTEGER NOT NULL DEFAULT 0,
    selected_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    protected_count INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    ended_at TEXT
);

CREATE TABLE IF NOT EXISTS photo_selection_overrides (
    photo_id TEXT PRIMARY KEY,
    override_label TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS final_selection_items (
    run_id TEXT NOT NULL,
    photo_id TEXT NOT NULL,
    selection_bucket TEXT NOT NULL,
    final_rank INTEGER NOT NULL,
    selection_score REAL NOT NULL,
    quality_score REAL NOT NULL,
    people_score REAL NOT NULL,
    diversity_score REAL NOT NULL,
    confidence_score REAL NOT NULL,
    explanation TEXT NOT NULL,
    coverage_reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY(run_id, photo_id),
    FOREIGN KEY(run_id) REFERENCES selection_runs(id) ON DELETE CASCADE,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_final_selection_items_bucket_rank ON final_selection_items(selection_bucket, final_rank);
CREATE INDEX IF NOT EXISTS idx_final_selection_items_photo_id ON final_selection_items(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_selection_overrides_label ON photo_selection_overrides(override_label);
