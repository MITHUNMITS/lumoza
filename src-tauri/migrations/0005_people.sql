CREATE TABLE IF NOT EXISTS face_analysis_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    engine TEXT NOT NULL,
    engine_version TEXT NOT NULL,
    photos_total INTEGER NOT NULL DEFAULT 0,
    photos_processed INTEGER NOT NULL DEFAULT 0,
    faces_detected INTEGER NOT NULL DEFAULT 0,
    people_clustered INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    ended_at TEXT
);

CREATE TABLE IF NOT EXISTS face_detections (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    analysis_run_id TEXT NOT NULL,
    bounding_box_x REAL NOT NULL,
    bounding_box_y REAL NOT NULL,
    bounding_box_width REAL NOT NULL,
    bounding_box_height REAL NOT NULL,
    detection_confidence REAL NOT NULL,
    quality_score REAL NOT NULL,
    crop_cache_path TEXT,
    embedding_model TEXT,
    embedding_vector_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY(analysis_run_id) REFERENCES face_analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS people_clusters (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    representative_face_id TEXT,
    face_count INTEGER NOT NULL DEFAULT 0,
    photo_count INTEGER NOT NULL DEFAULT 0,
    priority_label TEXT NOT NULL DEFAULT 'unassigned',
    is_hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(representative_face_id) REFERENCES face_detections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS person_faces (
    person_id TEXT NOT NULL,
    face_detection_id TEXT NOT NULL,
    cluster_confidence REAL NOT NULL,
    is_representative INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(person_id, face_detection_id),
    FOREIGN KEY(person_id) REFERENCES people_clusters(id) ON DELETE CASCADE,
    FOREIGN KEY(face_detection_id) REFERENCES face_detections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_face_detections_photo_id ON face_detections(photo_id);
CREATE INDEX IF NOT EXISTS idx_face_detections_analysis_run_id ON face_detections(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_people_clusters_priority ON people_clusters(priority_label, is_hidden);
CREATE INDEX IF NOT EXISTS idx_person_faces_face_detection_id ON person_faces(face_detection_id);
