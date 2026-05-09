# Phase 2 Plan

## Goal

Deliver the first real intelligence layer for Lumoza Studio: fast technical-quality analysis, duplicate/burst scaffolding, persisted scoring outputs, and score visibility inside the desktop workspace.

Current phase status: in progress

Phase 2 progress: 68% complete
Phase 2 slice progress: technical quality scoring complete, duplicate and burst grouping active, ranking confidence, project-wide album shortlist, and review queue queries active
Full product progress: 44% overall

Duplicate and burst grouping now persist into the Phase 2 analysis model, and ranking now produces keep, review, reject, confidence, album shortlist, and review queue recommendations with project-wide query paths.

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
- Duplicate and burst schema scaffold
- Python engine contract upgrade from placeholder heartbeat to analysis capability declaration

## Out Of Scope For This Slice

- Face detection or clustering
- Final memory ranking
- Storytelling or album generation
- Cloud execution
- Aesthetic or semantic scoring

## Recommended Build Order

### 1. Data Model

- Add Phase 2 migrations for analysis runs and quality metrics
- Reserve tables for duplicate grouping even if the first slice does not fully populate them

### 2. Native Analysis Pipeline

- Load indexed project photos from SQLite
- Run fast local quality heuristics in a background task
- Persist results incrementally or at task completion

### 3. Python Engine Contract

- Keep the sidecar lightweight in this slice
- Expose capabilities and mode so later AI slices can bind to a real sidecar process cleanly

### 4. Product Surfaces

- Add a workspace control to start quality analysis
- Show progress and latest score summary in operations
- Surface overall quality score in the photo grid

### 5. Phase 2 Next Steps After This Slice

- Refine duplicate grouping beyond the first deterministic pass
- Refine burst grouping beyond the first deterministic pass
- Validate ranking confidence, shortlist quality, and review queue quality against larger real projects

## Acceptance Criteria For The First Phase 2 Slice

- A scanned project can start technical-quality analysis
- Each indexed photo can persist a quality score bundle
- The desktop UI can show analysis progress without freezing
- The photo browser can display an overall score for analyzed photos
- The database is ready for duplicate and burst expansion in the next slice
