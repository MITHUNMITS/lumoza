# Phase 4 Plan

## Goal

Build the smart selection engine that turns Phase 2 technical scores and Phase 3 people priorities into a final memory collection, review queue, and refilterable album workflow.

Current phase status: in progress

Phase 4 progress: 60% complete
Full product progress: 73% overall

Phase 4 now has the durable selection model, runnable local engine, final/review/rejected browsing, target-count controls, and user override controls. It does not yet complete the relationship graph, event grouping, low-confidence review depth, or final Phase 4 persistence hardening.

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
- Added Rust tests for priority-people ranking and force-exclude behavior

## Remaining Phase 4 Work

- Review workspace fast keyboard approve/reject flow
- Final workspace batch review and export handoff polish
- Relationship coverage model beyond simple people priority counts
- Event/time grouping and album section balancing
- Low-confidence review page
- Stronger tests around persistence, refiltering, and override behavior

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
