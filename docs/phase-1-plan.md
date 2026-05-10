# Phase 1 Plan

## Goal

Deliver a stable, premium-feeling desktop foundation for local project creation, photo ingestion, scanning, indexing, thumbnails, and progress tracking.

Phase 1 progress: 100% complete

Full product progress: 85% overall

## Phase 1 Deliverables

- Tauri v2 application shell
- React + TypeScript frontend
- Premium dark base layout
- Splash screen and startup checks
- Project dashboard
- Create Project flow
- Multi-project registry
- Per-project SQLite database initialization
- Recursive photo scan pipeline
- Real recursive indexing for supported image discovery and SQLite photo ingestion
- Background scan task orchestration with polled status updates
- Bounded cached thumbnail generation with persisted thumbnail records
- Workspace photo query path with real indexed media records
- Thumbnail generation pipeline
- Photo grid page with virtualization
- Progress controls for pause, resume, and cancel
- Activity log and error report views
- Python sidecar placeholder and status reporting

## Out Of Scope

- Photo quality scoring
- Duplicate and burst logic
- Face detection or people clustering
- Smart selection engine
- Export intelligence
- Cloud features
- GPU optimization

## Recommended Build Order

### 1. Repository Scaffolding

- Create Tauri + React project structure
- Set up TypeScript, Tailwind, and base UI tokens
- Add linting, formatting, and basic scripts

### 2. Native Foundation

- Configure Tauri window behavior
- Add startup bootstrap pipeline
- Implement app directory setup
- Implement project registry storage

### 3. Data Layer

- Create SQLite migration strategy
- Implement per-project database creation
- Define core tables for projects, scans, photos, thumbnails, tasks, and logs

### 4. Project Workflows

- Build dashboard and project creation wizard
- Add folder picker and validation
- Open project workspace after creation

### 5. Scan Engine

- Implement recursive folder scanning
- Persist metadata incrementally
- Add pause, resume, and cancel checkpoints
- Publish progress events to UI

### 6. Thumbnail Pipeline

- Generate thumbnails in bounded worker batches
- Persist thumbnail status and cache paths
- Surface thumbnail failures without blocking scans

### 7. Browsing Experience

- Build photo grid page
- Use virtualization for large datasets
- Add basic metadata side panel or info region

### 8. Operational UX

- Add activity log view
- Add error report view
- Add dedicated system status and operations review surface
- Add Python sidecar placeholder status

## Acceptance Criteria

Phase 1 is complete only when all of the following are true:

- A user can create and reopen multiple projects
- Each project has its own SQLite database and thumbnail cache
- A user can scan a large folder recursively without freezing the UI
- Progress is visible and accurate enough for long operations
- Pause, resume, and cancel work without corrupting project state
- Photo thumbnails and metadata appear in a virtualized grid
- Errors are visible and logged instead of silently ignored
- Original files are never modified

## Primary Risks

- Tauri command boundaries becoming too coarse or too chatty
- Thumbnail generation overwhelming CPU or IO
- SQLite write contention during heavy scans
- UI memory growth when browsing large datasets
- Overbuilding future AI hooks before Phase 1 is stable

## Suggested First Coding Slice

The first implementation slice should be:

1. App shell and dark design tokens
2. Startup checks and splash screen
3. Project registry and Create Project flow
4. SQLite initialization for one project

That sequence yields a vertical slice without prematurely mixing in scanning complexity.
