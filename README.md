# Lumoza Studio — Master README + Codex Development Guide

## Repository Status

This repository now has:

- A master product and implementation guide in this `README`
- A product baseline in `docs/PRODUCT_FOUNDATION.md`
- Local git initialization and version history on `main`

Current full product progress: 56%
Current active phase progress: 20% (Phase 3)

Phase 1 status: 100% complete, including native Rust/Tauri compile and macOS app bundle validation.
Phase 2 status: 100% complete, with technical-quality scoring, connected-component duplicate grouping, burst grouping, grouping audit summaries, ranking confidence, project-wide album shortlist, review queue queries, and focused Rust tests in place.
Phase 3 status: 20% complete, with face/people persistence schema, summary plumbing, sidecar contracts, readiness UI, and a safe people-analysis task path that records waiting-for-model runs without pretending real detections exist. Cross-cutting premium UI redesign foundation is active across the current product surfaces.

Immediate repo priorities:

1. Preserve the phase-based build discipline defined below.
2. Use `docs/architecture.md` and `docs/phase-1-plan.md` as the implementation baseline.
3. Phase 3 has started. Keep implementation focused on local people intelligence foundations before final selection.

## Progress Model

Full product progress is tracked separately from phase completion.

Current weighted estimate: `56%` overall.

Basis:
- Phase 1 foundation: `100%` complete
- Phase 2 fast AI engine: `100%` complete
- Phase 3 face intelligence: `20%` complete
- Phase 4 smart selection engine: `0%` complete
- Phase 5 professional polish: `0%` complete
- Phase 6 production distribution and release hardening: `8%` complete
- Cross-cutting product work still open: research, licensing, monetization, QA depth, observability, security hardening, Windows validation, release operations

## Product Overview

Lumoza Studio is a professional offline-first AI-powered desktop application for intelligent photo curation and memory selection.

The product helps users:

* Select the best photos from thousands of images
* Remove blur photos
* Remove duplicates and burst junk
* Detect and prioritize important people
* Build story-driven albums
* Export curated memories locally
* Work completely offline after initial setup

This project is designed as a:

* Premium desktop creative software
* AI-assisted workflow platform
* Local-first media intelligence system

The app should feel similar to:

* Adobe Lightroom
* Adobe Photoshop
* Apple Photos
* Arc Browser
* Linear

The app should NOT feel like:

* Admin dashboard
* Cheap utility tool
* Basic file manager

---

# IMPORTANT DEVELOPMENT RULES

## CRITICAL

This project MUST be built phase-by-phase.

Codex must NEVER:

* Build all phases at once
* Skip architecture planning
* Mix future features into earlier phases unnecessarily
* Ignore performance/scalability
* Ignore UX quality
* Ignore safety rules

## DEVELOPMENT FLOW

Correct workflow:

```text
Master architecture
↓
Phase 1 implementation
↓
User confirmation
↓
Phase 2 implementation
↓
User confirmation
↓
Phase 3 implementation
```

Codex must STOP after completing the requested phase.

Codex must wait for:

```text
Continue Phase X
```

before implementing the next phase.

---

# BRANDING

## Final Product Name

Lumoza Studio

## Brand Name

Lumoza

## Product Identity

Lumoza Studio is a premium offline AI-powered creative desktop application for intelligent photo curation and memory selection.

The branding should feel:

* Cinematic
* Modern
* Premium
* Elegant
* AI-powered
* Creative-software quality
* Minimal
* Scalable beyond weddings

The brand must NOT feel:

* Cheap
* Generic
* Cartoonish
* Overly technical
* Wedding-only

## Recommended Tagline

```text
Curate memories intelligently.
```

Alternative taglines:

```text
Your memories, intelligently selected.
```

```text
AI-powered memory curation.
```

```text
Turn thousands of photos into meaningful memories.
```

## Branding Style

Logo direction:

* Minimal
* Dark premium
* Soft glow
* Cinematic
* Abstract light/aperture inspiration
* Modern creative software identity

Avoid:

* Generic camera icons
* Cartoon style
* Heavy rainbow gradients
* Generic AI brain icons

## Splash Screen Branding Example

```text
Lumoza Studio

Preparing AI Engine...
```

# CORE PRODUCT PRINCIPLES

## Safety

The app must NEVER:

* Delete original photos
* Move original photos
* Overwrite original photos
* Modify original photos

Original folders are READ-ONLY.

Exports are COPY-ONLY.

---

## Offline-first

The app must:

* Work locally
* Process photos locally
* Store projects locally
* Work offline after setup

Cloud processing is NOT required.

---

## Performance-first

The app must support:

* 8,000 photos
* 10,000 photos
* Future 30,000+ photo projects

Must use:

* Background workers
* Lazy loading
* Virtualized grids
* Thumbnail caching
* Incremental scanning
* SQLite indexing
* Batch processing
* Resumable tasks

---

## AI-first UX

The app should:

* Do most work automatically
* Minimize manual work
* Ask user only for important decisions
* Hide complexity from normal users

---

## Premium UX

The app must feel:

* Cinematic
* Smooth
* Minimal
* Elegant
* Modern
* Native-desktop quality

---

# FINAL TECH STACK

## Desktop Framework

* Tauri v2
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion
* Lucide Icons

## State/Data

* Zustand
* TanStack Query if useful

## Large Photo Grids

* TanStack Virtual or equivalent virtualization

## Database

* SQLite
* One database per project

## AI Engine

Python sidecar engine.

Libraries:

* OpenCV
* Pillow
* imagehash
* InsightFace later
* ONNX Runtime later

Architecture:

* CPU mode first
* GPU-ready later

## Packaging

Later phases:

* Windows installer
* macOS application

---

# UI / UX DESIGN SYSTEM

## Theme Direction

Premium dark-first creative software UI.

Inspired by:

* Lightroom
* Photoshop
* Arc Browser
* Linear
* Apple Photos

---

## FINAL COLOR PALETTE

### Backgrounds

| Usage            | Color   |
| ---------------- | ------- |
| Main background  | #0F1115 |
| Secondary panels | #171A21 |
| Elevated cards   | #1E222B |
| Sidebar          | #13161C |
| Hover state      | #252A35 |

---

### Text Colors

| Usage          | Color   |
| -------------- | ------- |
| Primary text   | #F5F7FA |
| Secondary text | #B6BEC9 |
| Muted text     | #7E8794 |

---

### Accent Colors

| Usage          | Color   |
| -------------- | ------- |
| Primary accent | #4D8DFF |
| Success        | #3CCF91 |
| Warning        | #FFB84D |
| Error          | #FF5C7A |

---

## Typography

### Primary UI Font

Inter

### Technical/Metadata Font

JetBrains Mono

---

## UI Style Rules

* Rounded corners: 12px–16px
* Large thumbnails
* Smooth animations
* Soft shadows
* Minimal borders
* Subtle glass effects only where useful
* Fullscreen/maximized desktop feel

---

# SPLASH SCREEN / STARTUP EXPERIENCE

The app must open with a premium splash screen.

## Splash Requirements

* Borderless
* Centered
* Photoshop/Lightroom style
* Dark premium UI
* Rounded corners
* Logo/app name
* Loading progress bar
* Live initialization messages
* Smooth fade/scale animations
* Main app hidden until initialization completes

## Startup Flow

```text
Open app
↓
Splash screen
↓
Initialize components
↓
Check setup
↓
Check SQLite
↓
Check Python engine
↓
Check AI packs
↓
Open main app fullscreen/maximized
```

## First-Time Setup

If setup required:

```text
Downloading AI Components...
```

Must support:

* Download progress
* ETA
* Retry
* Resume
* Verification
* Clear errors

---

# INSTALLER + AI MODEL SYSTEM

## Installer Target Size

Target installer:

```text
Below 200 MB
```

Installer contains:

* UI
* Minimal runtime
* Setup engine
* SQLite
* Basic utilities

## First Launch Setup

Downloads required components.

### Required Packs

* Core Runtime Pack
* Core Vision Pack
* Face AI Pack

### Optional Packs

* Deep AI Pack
* RAW Support Pack
* Pro Export Pack

## Setup UX Text

```text
Setting up Lumoza Studio.
We are installing the required local AI components.
This is a one-time setup. After this, the app can work offline.
```

---

# PROJECT SYSTEM

The app must be project-based.

## Examples

* Mithun Wedding
* Dubai Trip
* Baby Photos
* Office Event

## Rules

* Multiple projects supported
* Only ONE active project at a time
* No background processing for inactive projects
* Switching projects must safely pause/stop work

## Project Dashboard Features

* Create New Project
* Open Existing Project
* Recent Projects
* Archived Projects
* Rename Project
* Backup Project
* Restore Project
* Archive Project
* Delete project metadata/cache only

## Project Storage Structure

```text
AIPhotoCurationStudio/
  projects/
    project_id/
      project.db
      project.json
      thumbnails/
      face_crops/
      cache/
      exports/
      reports/
      logs/
```

---

# PROJECT CREATION FLOW

## Step 1

User inputs:

* Project Name
* Project Mode
* Input Folder
* Output Folder
* Final Photo Count
* Review Photo Count
* Scan Mode

## Modes

* Wedding
* Family
* Travel
* General Cleanup
* Creator
* Photographer Pro later

Default:

```text
Wedding
```

## Final Photo Count

Default:

```text
300
```

User can change anytime later.

## Review Count

Default:

```text
1000
```

---

# SCAN MODES

## FAST MODE

Purpose:

* Very fast result
* Good-enough quality
* Minimal AI

Includes:

* File scan
* Thumbnail generation
* Basic analysis later

Target:

```text
10,000 photos in 15–45 minutes on good hardware
```

---

## NORMAL MODE

Purpose:

* Balanced speed + quality
* Default mode

Target:

```text
10,000 photos in 40–90 minutes
```

---

## DEEP MODE

Purpose:

* Maximum quality
* Professional-grade curation

Target:

```text
10,000 photos in 2–6 hours
```

---

# SYSTEM BENCHMARK + ETA

Before scan:

1. Count total photos
2. Check CPU/RAM/storage/GPU placeholder
3. Benchmark sample photos
4. Estimate times for Fast/Normal/Deep
5. Recommend mode

## Example

```text
Total photos: 10,000

Estimated time:
Fast   : 22–28 min
Normal : 48–65 min
Deep   : 2h 20m – 3h 10m

Recommended: Normal
```

ETA must update dynamically during processing.

---

# PROGRESS TRACKING

Every long operation must show:

* Overall progress
* Per-stage progress
* Current stage
* Current file
* Processed count
* Speed
* ETA
* Pause
* Resume
* Cancel

## Example

```text
Overall Progress: 42%
File Scan: 100%
Thumbnail Generation: 78%
Duplicate Detection: 92%
Face Detection: Pending
```

---

# SAFETY RULES

## CRITICAL RULES

The app must NEVER:

* Delete originals
* Move originals
* Overwrite originals
* Modify originals

## Export Rules

Export folders:

```text
final_300/
review_1000/
duplicate_review/
blur_review/
```

If export exists:

```text
final_300_v2
```

Never overwrite.

## Cancel Rules

* Save progress safely
* No corruption
* Allow resume

## Pause Rules

* Pause safely
* Resume exact stage

## Error Handling

Corrupt images must:

* Not crash app
* Go to issue reports

---

# SUPPORTED FILES

## Phase 1

* JPG
* JPEG
* PNG
* WEBP

## Later

* HEIC
* CR2
* NEF
* ARW
* RAF
* DNG
* TIFF

RAW support must be optional pack.

---

# DYNAMIC FINAL COUNT / REFILTERING

User can change final count anytime.

Examples:

```text
300 → 500
300 → 150
1000 → 300
```

Important:

Do NOT:

* Rescan photos
* Rerun AI from scratch
* Rebuild face engine

Use stored rankings/scores later.

## Flow

```text
Selection count changed.
The app will regenerate the final selection using existing AI rankings and priorities.
No rescan required.
Continue?
```

---

# REVIEW UX LATER

## Layout

Left:

* Filters
* Categories
* People
* Events

Center:

* Large photo viewer

Bottom:

* Filmstrip/timeline

Right:

* AI details
* Metadata
* Explanation panel

## Actions

* Approve
* Reject
* Replace
* Compare
* Zoom
* Fullscreen
* Favorite
* Protect photo

---

# PERFORMANCE REQUIREMENTS

Must support:

* 8,000 photos
* 10,000 photos
* Future 30,000+ photos

Must use:

* Background workers
* Lazy loading
* Virtualization
* Thumbnail caching
* Incremental scanning
* SQLite indexing
* Batch processing
* Resumable tasks

Minimum smooth hardware:

```text
16GB RAM + SSD
```

Recommended:

```text
32GB RAM + NVMe SSD
```

---

# ACTIVITY LOG

Must log:

* Project created
* Scan started
* Scan paused
* Scan resumed
* Scan cancelled
* Corrupt files skipped
* Export completed
* Errors

---

# PHASE STRUCTURE

# PHASE 1 — FOUNDATION

## Goal

Build stable desktop application foundation.

## Includes

* Tauri v2 setup
* React + TypeScript
* Tailwind CSS
* shadcn/ui
* Premium dark UI
* Splash screen
* Fullscreen/maximized app
* Project Dashboard
* Create Project wizard
* Multi-project system
* SQLite setup
* Per-project DB
* Folder picker
* Recursive photo scan
* Thumbnail generation
* Metadata storage
* Photo grid page
* Virtualized grid
* Progress tracking
* Pause/resume/cancel
* Activity log
* Error report
* Python sidecar placeholder
* Cache placeholder
* System status placeholder

## IMPORTANT

Build ONLY Phase 1.
Do NOT implement advanced AI yet.

---

# PHASE 2 — FAST AI ENGINE

## Includes

* Blur detection
* Exposure scoring
* Contrast scoring
* Resolution scoring
* Duplicate hashing
* Burst grouping
* Best-frame selection
* Fast ranking
* Incremental analysis
* Store scores in SQLite

---

# PHASE 3 — FACE INTELLIGENCE

## Includes

* Face detection
* Face embeddings
* Face clustering
* People page
* Merge/split people
* Rename people
* Priority marking

Priority levels:

* P1 = Bride/Groom
* P2 = Parents
* P3 = Siblings
* P4 = Close family/friends
* P5 = Guests

---

# PHASE 4 — SMART SELECTION ENGINE

## Includes

* Final ranking engine
* Dynamic final count
* Smart refiltering
* Group-photo protection
* Extra-person protection
* Coverage engine
* Album diversity
* Relationship balancing
* Event grouping
* AI confidence system
* Review 1000
* Final 300
* Low-confidence review

---

# PHASE 5 — PROFESSIONAL POLISH

## Includes

* Storytelling engine
* Emotion scoring
* Smile detection
* Eye-open detection
* Aesthetic scoring
* Timeline flow
* AI explanation panel
* Fullscreen review
* Keyboard shortcuts
* Advanced filters
* Manual overrides

---

# PHASE 6 — PRODUCTION / DISTRIBUTION

## Includes

* Windows packaging
* macOS packaging
* AI model manager
* Optional model packs
* RAW support pack
* Cache cleanup
* GPU optimization
* Crash recovery improvements
* Portable projects
* Export improvements

---

# OPTIONAL PHASE 7 — FUTURE ECOSYSTEM

Optional later:

* Video support
* Mobile companion
* Cloud sync optional
* Lightroom integration
* Creator tools
* Travel mode
* Family mode
* Sports mode
* AI memory timeline

---

# CODING QUALITY RULES

Code must be:

* Clean
* Modular
* Strongly typed
* Production-ready
* Easy to extend
* Phase-based
* Well organized

Avoid:

* Hardcoded paths
* Blocking UI
* Loading all images into memory
* Modifying original files
* Monolithic architecture
* Mixing future phases into earlier phases

---

# REQUIRED MODULES

Create clear services/modules:

* project service
* scan service
* thumbnail service
* database service
* task/progress service
* setup service
* settings service
* system status service

---

# EXPECTED PROJECT STRUCTURE

```text
ai-photo-curation-studio/
  src-tauri/
    src/
      main.rs
      commands/
      windows/
      setup/
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
      projectStore.ts
      scanStore.ts
    services/
      tauriCommands.ts
      projectService.ts
    styles/
      globals.css

  python-engine/
    main.py
    healthcheck.py
    requirements.txt

  docs/
    architecture.md
    roadmap.md
```

---

# HOW CODEX SHOULD WORK

For every phase:

1. Explain implementation plan briefly.
2. Implement ONLY requested phase.
3. Keep architecture extensible.
4. Run checks/tests if possible.
5. Summarize completed work.
6. List remaining work.
7. STOP and wait for user confirmation.

Codex must NEVER automatically continue future phases.

---

# PHASE CONTINUATION COMMANDS

User commands:

```text
Continue Phase 2
Continue Phase 3
Continue Phase 4
Continue Phase 5
Continue Phase 6
```

Codex must obey strictly.

---

# FINAL IMPORTANT RULE

This project is startup-scale software.

Architecture quality, UX quality, performance, and maintainability are more important than quickly generating features.

The app must feel like a premium professional creative AI desktop application.
