# Architecture

## Objective

Phase 1 architecture defines the minimum production-grade foundation for Lumoza Studio: a premium offline-first desktop app for local photo ingestion, project management, scanning, thumbnail generation, metadata indexing, and progress tracking.

This architecture intentionally excludes advanced AI ranking, face intelligence, and smart selection logic. Those belong to later phases.

## Phase 1 Scope

Included in this architecture:

- Desktop shell and window lifecycle
- Splash/startup flow
- Multi-project workspace model
- Per-project SQLite database
- Recursive folder scanning
- Thumbnail generation pipeline
- Metadata indexing
- Progress tracking with pause, resume, and cancel
- Activity log and error reporting
- Python sidecar placeholder and healthcheck contract
- System status and cache placeholders

Explicitly excluded from Phase 1:

- Blur or quality scoring
- Duplicate or burst analysis
- Face detection or clustering
- Final selection engine
- Export intelligence
- Cloud sync or cloud AI

## Technology Decisions

### Desktop Shell

- Tauri v2
- Rust backend commands for native capabilities
- React + TypeScript renderer

Reasoning:

- Native desktop packaging with lower overhead than Electron
- Strong OS integration for file system access and window management
- Clear separation between UI and native operations

### UI Layer

- React
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide icons

### State and Data Access

- Zustand for app and workflow state
- TanStack Query only where async caching is genuinely helpful
- Tauri command bridge for native operations

### Data Storage

- SQLite
- One database per project
- Project registry stored in app-level config storage
- All writable project artifacts are stored under the application data directory, never inside the original photo source folders

### Python Sidecar

- Separate Python process reserved for later AI capabilities
- Phase 1 exposes healthcheck and process management only
- No advanced image scoring in Phase 1

## Runtime Topology

```text
Tauri Desktop Shell
  -> React Renderer
    -> Zustand Stores
    -> UI Components / Pages
    -> Tauri Command Client
  -> Rust Native Layer
    -> Project Registry
    -> Folder Access / Recursive Scan
    -> Thumbnail Queue
    -> SQLite Project DB Access
    -> Task / Progress Coordinator
    -> Activity / Error Logging
    -> Python Sidecar Supervisor
```

## Primary Runtime Boundaries

### React Renderer

Responsibilities:

- Present premium desktop UI
- Trigger project creation and scan workflows
- Show progress, activity logs, and project contents
- Render large photo grids using virtualization

Must not:

- Perform heavy recursive file IO
- Generate thumbnails directly for large batches
- Hold all photo metadata in memory at once

### Rust Native Layer

Responsibilities:

- Secure file system access
- Project database creation and migrations
- Background task scheduling
- Scan lifecycle control
- Thumbnail generation orchestration
- System health reporting

### Python Sidecar

Responsibilities in Phase 1:

- Start
- Stop
- Healthcheck

Deferred responsibilities:

- Quality analysis
- Duplicate analysis
- Face intelligence

## Project Structure

```text
lumoza/
  src-tauri/
    src/
      main.rs
      commands/
      windows/
      setup/
      services/
      state/
    tauri.conf.json

  src/
    app/
    components/
      layout/
      splash/
      project/
      photo-grid/
      progress/
      ui/
    pages/
      ProjectDashboard.tsx
      CreateProject.tsx
      ProjectWorkspace.tsx
      PhotosPage.tsx
      SettingsPage.tsx
    stores/
      appStore.ts
      projectStore.ts
      scanStore.ts
      settingsStore.ts
    services/
      tauriCommands.ts
      projectService.ts
      scanService.ts
      thumbnailService.ts
      systemStatusService.ts
    types/
    styles/
      globals.css

  python-engine/
    main.py
    healthcheck.py
    requirements.txt

  docs/
    PRODUCT_FOUNDATION.md
    architecture.md
    phase-1-plan.md
    roadmap.md
```

## Domain Model

### App-Level Entities

#### Project Registry Entry

Represents a known Lumoza project in the desktop app.

Suggested fields:

- `project_id`
- `name`
- `root_folder`
- `project_db_path`
- `thumbnail_cache_path`
- `created_at`
- `updated_at`
- `last_opened_at`
- `status`

### Per-Project Database Entities

#### projects

One row describing the active project metadata inside its own database.

#### source_folders

Tracks the folders included in the project scan.

Suggested fields:

- `id`
- `absolute_path`
- `scan_policy`
- `created_at`

#### scans

Represents a scan run or resumable scan session.

Suggested fields:

- `id`
- `status`
- `started_at`
- `ended_at`
- `files_discovered`
- `files_indexed`
- `files_failed`
- `pause_requested_at`
- `cancel_requested_at`

#### photos

Stores discovered image metadata.

Suggested fields:

- `id`
- `source_folder_id`
- `absolute_path`
- `filename`
- `extension`
- `file_size_bytes`
- `width`
- `height`
- `captured_at`
- `modified_at`
- `checksum_quick`
- `thumbnail_status`
- `ingest_status`

#### thumbnails

Tracks generated thumbnails and cache paths.

Suggested fields:

- `id`
- `photo_id`
- `cache_path`
- `width`
- `height`
- `generated_at`
- `generation_status`

#### tasks

Tracks long-running operations visible in the UI.

Suggested fields:

- `id`
- `task_type`
- `status`
- `progress_current`
- `progress_total`
- `message`
- `started_at`
- `updated_at`

#### activity_log

Append-only operational event log.

Suggested fields:

- `id`
- `event_type`
- `severity`
- `message`
- `payload_json`
- `created_at`

#### app_errors

Structured error capture for recoverable failures.

Suggested fields:

- `id`
- `error_code`
- `error_scope`
- `message`
- `details_json`
- `created_at`

#### project_settings

Stores project-local preferences.

Suggested fields:

- `key`
- `value_json`
- `updated_at`

## Service Boundaries

### project service

Responsibilities:

- Create project
- Open project
- Update project metadata
- Maintain project registry

### database service

Responsibilities:

- Create project database
- Apply migrations
- Expose safe query helpers
- Validate database health

### scan service

Responsibilities:

- Walk source folders recursively
- Filter supported image types
- Emit progress events
- Handle pause, resume, and cancel
- Persist discovered metadata incrementally

### thumbnail service

Responsibilities:

- Schedule thumbnail jobs
- Generate thumbnails in bounded batches
- Persist cache metadata
- Retry transient failures

### task/progress service

Responsibilities:

- Track foreground and background tasks
- Publish progress state to the renderer
- Provide pause/resume/cancel controls

### setup service

Responsibilities:

- Bootstrap app directories
- Check Python sidecar availability
- Check writable cache locations
- Confirm database driver readiness

### settings service

Responsibilities:

- Manage app and project settings
- Persist UI preferences
- Persist scanning defaults

### system status service

Responsibilities:

- Report sidecar health
- Report database status
- Report cache status
- Report current background task status

## Phase 1 Core Workflows

### Startup Flow

```text
Launch app
-> Show splash screen
-> Initialize app directories
-> Check SQLite availability
-> Check Python sidecar placeholder
-> Load project registry
-> Open dashboard
```

### Create Project Flow

```text
User starts project creation
-> Choose name and root folder
-> Validate folder accessibility
-> Create project registry entry
-> Create project SQLite DB
-> Create thumbnail cache folder
-> Open project workspace
```

### Scan Flow

```text
User starts scan
-> Create scan task record
-> Walk folders recursively
-> Persist photo metadata incrementally
-> Queue thumbnail generation
-> Update progress UI
-> Write activity log entries
-> Finish with summary or recoverable errors
```

### Pause / Resume / Cancel Flow

```text
User pauses scan
-> Persist pause request
-> Worker reaches safe checkpoint
-> Task state becomes paused

User resumes scan
-> Load persisted checkpoint
-> Continue remaining file traversal and thumbnail queue

User cancels scan
-> Stop creating new work
-> Persist partial results already completed
-> Mark task cancelled
```

## Safety Model

Non-negotiable rules:

- Original files are read-only
- No delete, move, overwrite, or in-place modification operations
- Export features must use copy-only semantics
- Any future destructive operation must be impossible by default

## Performance Strategy

Phase 1 must be designed for 8,000 to 10,000 images without UI collapse.

Required tactics:

- Incremental file discovery
- Batched database writes
- Bounded thumbnail concurrency
- Virtualized photo grid rendering
- Lazy photo detail loading
- Background worker isolation from UI thread
- Cache directory separated from originals

## Current Implementation Note

The current implementation now includes a background scan task model that discovers supported images, indexes metadata into SQLite, generates bounded cached thumbnails in app-managed storage, updates project counts, exposes polled task state for pause, resume, and cancel requests, renders indexed media through a virtualized workspace browser with asset-backed thumbnail previews, surfaces dedicated operations views for session activity, incident reporting, and system health, and now passes native Rust compile plus macOS `.app` bundle validation. Richer event streaming remains a later refinement, but the core Phase 1 product surface is now real end-to-end.

## Failure Handling

Phase 1 should treat failures as operational events, not silent drops.

Required behaviors:

- Corrupt files are skipped and logged
- Unreadable folders surface recoverable errors
- Scan cancellation leaves the database consistent
- Thumbnail failures do not block metadata ingestion
- App restart can reopen project and continue safely

## Testing Strategy

Minimum expected test layers for Phase 1:

- Unit tests for project, scan, and database services
- Integration tests for SQLite migrations and scan persistence
- Smoke test for startup and project creation flow
- Manual performance check with a large local dataset

## Open Decisions

These are still unresolved and should be fixed before heavy implementation:

- Exact Tauri plugin set
- Rust crate selection for image metadata and thumbnail generation
- Registry storage location for app-level project index
- Licensing and activation strategy for premium desktop distribution
- Whether first packaging target is macOS, Windows, or both


## Phase 2 Extension Note

Phase 2 is complete as the first local intelligence layer on top of the Phase 1 photo index. It introduces persisted `analysis_runs`, `photo_quality_metrics`, duplicate/burst group tables, curation scores, confidence labels, album-candidate flags, and query indexes for the fast analysis workflow.

The native analyzer computes sharpness, exposure, contrast, resolution, and overall quality scores, then builds connected-component duplicate groups from perceptual-hash similarity plus file-size proximity. Burst groups use short capture-time windows with filename or visual affinity, and the ranking layer converts those signals into keep, review, reject, confidence, and album-candidate recommendations. Dedicated SQLite queries now support project-wide album shortlist, review queue, and grouping audit retrieval. This remains an intentionally fast local-first pass; face identity and final memory-selection intelligence stay in Phase 3 and Phase 4.


## Phase 3 Extension Note

Phase 3 has started with the people-intelligence foundation. The project database now includes face-analysis run tracking, face detections, people clusters, and face-to-person membership tables. Workspace and operations surfaces can query real persisted people-summary counts, while zero-state copy remains explicit that detection and clustering are not implemented yet. The native task layer can now prepare a people-analysis run, persist an honest `waiting_for_model` status, and report zero detections until a local face model is selected.

The Python sidecar contract now advertises face detection, people clustering, and people priority capabilities for the upcoming local AI worker. The next architectural decision is the actual detector and embedding runtime; it must remain offline-first, bounded, cache-only for derived crops, and must never mutate original photos.
