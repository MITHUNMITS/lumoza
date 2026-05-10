# Phase 3 Plan

## Goal

Add local people intelligence to Lumoza Studio: face detection readiness, face persistence, person clustering, people review controls, and priority-person signals that can later improve final memory selection.

Current phase status: complete

Phase 3 progress: 100% complete
Full product progress: 77% overall

Phase 3 is complete as a local-first people intelligence workflow. It ships a CPU face-candidate detector, cache-only face crops, lightweight embeddings, deterministic people clustering, persisted people data, people review UI, rename, priority, hide, merge, and split controls. Production-grade Face AI Pack accuracy is still reserved for Phase 6 model distribution.

## Phase 3 Deliverables

- Face analysis run tracking
- Face detection persistence with bounding boxes, confidence, quality, crop path, and embedding metadata
- Person cluster persistence
- Face-to-person membership persistence
- People summary query path
- Workspace people intelligence panel
- Operations people intelligence metrics panel
- Python sidecar readiness declaration for face detection, people clustering, and people priority
- People-analysis task plumbing with local CPU execution
- Local CPU face-candidate detector
- Cache-only face crop generation
- Lightweight embedding persistence
- Deterministic clustering and merge/split workflow
- Priority-person marking for Phase 4 ranking handoff

## Out Of Scope After Phase 3

- Production Face AI Pack download and verification
- InsightFace/ONNX-grade identity accuracy
- Relationship graph and final selection ranking
- Storytelling and emotion scoring
- RAW/video people intelligence

## Recommended Build Order

### 1. Data Model

- Add `face_analysis_runs`, `face_detections`, `people_clusters`, and `person_faces`
- Keep original photos read-only and store crops only in app-managed cache
- Clear stale people data when a project is rescanned

### 2. Contracts

- Update Python sidecar capabilities for Phase 3 people intelligence
- Keep execution local-first and explicit
- Avoid cloud or network dependency

### 3. Product Surfaces

- Show people summary and review controls in workspace
- Show people-intelligence metrics in operations
- Keep zero-state copy honest when no faces are detected

### 4. Completed Implementation Slice

- Added local CPU face-candidate analysis
- Generated bounded face crops into app-managed cache
- Persisted face detections, embeddings, clusters, and memberships
- Added People workspace review controls
- Added tests for people summary and analyzer primitives

## Acceptance Criteria For Phase 3 Completion

- A project can run local face analysis after indexing
- Face detections are persisted with bounding boxes and confidence
- Face crops are cached without modifying original photos
- Embeddings are stored or referenced safely
- People clusters can be reviewed, renamed, merged, split, hidden, and prioritized
- Priority people influence the later final selection phase through explicit signals
- Operations can report face-analysis progress, failures, and summary counts
- The app remains offline-first and does not upload photos
