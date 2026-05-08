# Phase 2 Plan

## Goal

Deliver the first real intelligence layer for Lumoza Studio: fast technical-quality analysis, duplicate/burst scaffolding, persisted scoring outputs, and score visibility inside the desktop workspace.

Current phase status: in progress

Phase 2 slice progress: early implementation
Full product progress: 31% overall

## Phase 2 Deliverables

- Technical quality analysis pipeline
- Blur / sharpness scoring
- Exposure scoring
- Contrast scoring
- Resolution scoring
- Persisted per-photo quality metrics
- Background analysis task orchestration
- Analysis progress visibility in workspace and operations
- Score badges and details in the photo browser
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

- Duplicate grouping implementation
- Burst grouping implementation
- First explainable ranking pass

## Acceptance Criteria For The First Phase 2 Slice

- A scanned project can start technical-quality analysis
- Each indexed photo can persist a quality score bundle
- The desktop UI can show analysis progress without freezing
- The photo browser can display an overall score for analyzed photos
- The database is ready for duplicate and burst expansion in the next slice
