# Phase 3 Plan

## Goal

Add local people intelligence to Lumoza Studio: face detection readiness, face persistence, person clustering, people review controls, and priority-person signals that can later improve final memory selection.

Current phase status: in progress

Phase 3 progress: 10% complete
Full product progress: 55% overall

This first Phase 3 slice is foundation-only. It adds schema, summary plumbing, sidecar capability contracts, and product visibility without pretending that real face detection or clustering has shipped.

## Phase 3 Deliverables

- Face analysis run tracking
- Face detection persistence with bounding boxes, confidence, quality, crop path, and embedding metadata
- Person cluster persistence
- Face-to-person membership persistence
- People summary query path
- Workspace people intelligence readiness panel
- Operations people intelligence metrics panel
- Python sidecar contract for face detection, people clustering, and people priority
- Later: local detector integration
- Later: embedding extraction
- Later: clustering and merge/split workflow
- Later: priority-person marking and ranking handoff

## Out Of Scope For This First Slice

- Real face detection execution
- Face crop generation
- Embedding model download or runtime selection
- Automatic clustering
- Merge/split UI
- Person naming UI
- Priority-person ranking influence

## Recommended Build Order

### 1. Data Model

- Add `face_analysis_runs`, `face_detections`, `people_clusters`, and `person_faces`
- Keep original photos read-only and store crops only in app-managed cache later
- Clear stale people data when a project is rescanned

### 2. Contracts

- Update Python sidecar capabilities for Phase 3 people intelligence
- Keep execution local-first and explicit
- Avoid cloud or network dependency

### 3. Product Surfaces

- Show people-readiness summary in workspace
- Show people-intelligence metrics in operations
- Keep zero-state copy honest until real detection exists

### 4. Next Implementation Slice

- Add a native/Python face-analysis task model parallel to quality analysis
- Generate bounded face crops into app cache
- Persist deterministic placeholder-free detection results only after a real detector is selected
- Add tests for people summary queries and scan cleanup

## Acceptance Criteria For Phase 3 Completion

- A project can run local face analysis after indexing
- Face detections are persisted with bounding boxes and confidence
- Face crops are cached without modifying original photos
- Embeddings are stored or referenced safely
- People clusters can be reviewed, renamed, merged, split, hidden, and prioritized
- Priority people influence the later final selection phase through explicit signals
- Operations can report face-analysis progress, failures, and summary counts
- The app remains offline-first and does not upload photos
