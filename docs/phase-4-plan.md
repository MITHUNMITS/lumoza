# Phase 4 Plan

## Goal

Build the smart selection engine that turns Phase 2 technical scores and Phase 3 people priorities into a final memory collection, review queue, and refilterable album workflow.

Current phase status: complete

Phase 4 progress: 100% complete
Full product progress: 90% overall

Phase 4 now has the durable selection model, runnable local engine, final/review/rejected browsing, target-count controls, user override controls, event coverage balancing, low-confidence review routing, keyboard review ergonomics, export handoff preview, and persistence/refilter tests.

## Completed So Far

- Added `selection_runs`, `final_selection_items`, and `photo_selection_overrides`
- Added smart-selection task plumbing and progress state
- Added local smart-selection engine using quality, confidence, people priority, group diversity, and user override signals
- Added final/review/rejected buckets with explanations and coverage reasons
- Added final-selection summary and final-photo query commands
- Added workspace control to build and refilter the final album
- Added final/review/rejected browsing in the workspace grid
- Added final/review target controls for rerunning selection without rescanning
- Added protect, force include, force exclude, and clear controls on photo cards
- Added override labels to native photo responses and frontend photo models
- Added Rust tests for priority-people ranking, force-exclude behavior, event coverage, low-confidence review routing, override persistence, and refilter replacement
- Added focused keyboard review controls for protect, include, exclude, clear, and next/previous navigation
- Added final/export handoff preview with copy-only safety messaging

## Remaining Phase 4 Work

None. Phase 4 is complete.

## Acceptance Criteria For Phase 4 Completion

- A project can generate a final selection after scan, quality analysis, and people analysis
- The final selection respects user-protected and force-included photos
- Force-excluded photos are kept out of final selection
- Priority people influence the final selection through explicit scoring
- Duplicate and burst groups are constrained without destroying meaningful people/group variations
- Review queue and final selection are queryable and visible in the app
- Users can adjust final/review counts and rerun selection without rescanning
- Low-confidence items are routed to review instead of being aggressively rejected
- Selection explanations are persisted for every final/review/rejected item
