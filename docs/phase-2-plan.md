# Phase 2 Plan

## Goal

Deliver the first real intelligence layer for Lumoza Studio: fast technical-quality analysis, duplicate/burst grouping, persisted scoring outputs, ranking confidence, and score visibility inside the desktop workspace.

Current phase status: complete

Phase 2 progress: 100% complete
Phase 2 slice progress: technical quality scoring complete, connected-component duplicate grouping complete, burst grouping complete, grouping audit summaries complete, ranking confidence complete, project-wide album shortlist complete, and review queue queries complete
Full product progress: 95% overall

Phase 2 is complete as a fast local-first intelligence pass. It produces explainable technical scores, duplicate and burst groups, keep/review/reject guidance, confidence labels, album-candidate recommendations, review queues, and project-wide grouping audit summaries. This is still not the final memory-selection engine; Phase 3 and Phase 4 remain responsible for face intelligence and final selection logic.

## Phase 2 Deliverables

- Technical quality analysis pipeline
- Blur / sharpness scoring
- Exposure scoring
- Contrast scoring
- Resolution scoring
- Persisted per-photo quality metrics
- Background analysis task orchestration
- Analysis progress visibility in workspace and operations
- Score, confidence, and recommendation badges in the photo browser
- Connected-component duplicate grouping based on perceptual similarity and file-size proximity
- Burst grouping based on capture-time windows plus filename or visual affinity
- Persisted duplicate and burst groups with ranked members
- Explainable curation scores with keep, review, reject, confidence, and album-candidate outputs
- Project-wide album shortlist query
- Project-wide review queue query
- Project-wide grouping audit summary query
- Python engine contract upgrade from placeholder heartbeat to analysis capability declaration
- Focused Rust tests for duplicate grouping, burst grouping, duplicate penalties, and confidence thresholds

## Out Of Scope For Phase 2

- Face detection or clustering
- Final memory ranking
- Storytelling or album generation
- Cloud execution
- Aesthetic or semantic scoring
- Production installer signing and release operations

## Completed Build Order

### 1. Data Model

- Added Phase 2 migrations for analysis runs, quality metrics, duplicate groups, curation scores, confidence, album candidates, and query indexes
- Reserved and populated duplicate/burst grouping tables for the first deterministic intelligence pass

### 2. Native Analysis Pipeline

- Loaded indexed project photos from SQLite
- Ran fast local quality heuristics in a background task
- Persisted analysis outputs and task state at completion

### 3. Python Engine Contract

- Kept the sidecar lightweight in this slice
- Exposed capabilities and mode so later AI slices can bind to a real sidecar process cleanly

### 4. Product Surfaces

- Added workspace control to start quality analysis
- Showed progress and latest score summary in operations
- Surfaced overall quality score, recommendation, confidence, shortlist, and review guidance in the photo grid
- Added album shortlist, review queue, and grouping audit panels

### 5. Verification

- TypeScript check passes
- Frontend production build passes
- Rust check passes
- Rust quality analyzer unit tests pass
- Python sidecar compile check passes
- Native macOS Tauri build is required as the final phase-boundary validation before push

## Acceptance Criteria

- A scanned project can start technical-quality analysis
- Each indexed photo can persist a quality score bundle
- The desktop UI can show analysis progress without freezing
- The photo browser can display overall scores, recommendations, confidence, shortlist, and review guidance for analyzed photos
- Duplicate and burst groups are persisted and queryable
- Project-wide album candidate, review queue, and grouping audit queries are available
- Grouping and ranking behavior has focused Rust unit coverage
