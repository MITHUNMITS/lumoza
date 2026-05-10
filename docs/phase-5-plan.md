# Phase 5 Plan

## Goal

Refactor Lumoza Studio into a storyboard-driven professional desktop creative workflow while preserving the Phase 1-4 local engine behavior.

Current phase status: in progress

Phase 5 progress: 65% complete
Full product progress: 90% overall

The primary visual and UX reference is `layout_images_samples/Full_app_pages.png`. The product direction is now one adaptive desktop workspace shell, not a dashboard or multi-page SaaS layout.

## Completed So Far

- Adopted the storyboard image as the primary UI reference
- Replaced the old permanent sidebar shell with a compact workflow rail and bottom workflow stepper
- Added a 12-stage workflow model: initialize, hub, create, source, configure, analyze, people, understand, curate, review, finalize, export
- Reworked Workspace Hub into a visual, media-first workspace continuation surface
- Added guided workspace creation flow with type selection, source selection, intelligence configuration, and review/create summary
- Replaced the operations dashboard with a dedicated Media Analysis workflow screen using progress ring, stage rows, live preview strip, and compact system inspector
- Reworked Settings into a compact storyboard-style settings surface with theme/accent controls and clean package/cache/performance sections
- Upgraded People Intelligence into a circular cinematic face-cluster workspace with priority badges, merge, split, and naming controls
- Added Memory Understanding as a visual timeline/moments stage with cinematic memory thumbnails
- Added Curated Review and Final Curation stage treatments while preserving keyboard review and refilter controls
- Added Memory Export visual workflow with progress ring, ETA/speed summary, and copy-only safety messaging
- Added Compare-style review surface and contextual photo-details inspector scaffolding

## Remaining Phase 5 Work

- Tighten Studio Workspace center/inspector ergonomics and reduce remaining boxed dashboard feel
- Add richer modal/detail architecture for photo viewer, compare review, and settings dialogs
- Refine Intelligent Curation collection summaries against the storyboard reference
- Add focused UI regression documentation and final build validation
- Complete final Phase 5 pass without implementing Phase 6 model-download/export-copy behavior early

## Acceptance Criteria For Phase 5 Completion

- The app feels like one persistent professional workspace shell
- The hub is visual and media-first, not a dashboard
- Workspace creation is guided and stage-based
- Media analysis feels active and intelligent, not script-like
- People, moments, curation, review, finalize, and export stages match the storyboard direction
- Existing scan, analysis, people, smart selection, override, and refilter functionality remains working
- No real Phase 6 model download/export-copy behavior is shipped prematurely
