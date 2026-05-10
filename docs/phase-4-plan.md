# Phase 4 Plan

## Goal

Build the smart selection engine that turns Phase 2 technical scores and Phase 3 people priorities into a final memory collection, review queue, and refilterable album workflow.

Current phase status: in progress

Phase 4 progress: 35% complete
Full product progress: 69% overall

This first Phase 4 slice adds the durable selection model and runnable local engine. It does not yet complete the full review UX, relationship graph, event grouping, or advanced refiltering controls.

## Completed In This Slice

- Added `selection_runs`, `final_selection_items`, and `photo_selection_overrides`
- Added smart-selection task plumbing and progress state
- Added local smart-selection engine using quality, confidence, people priority, group diversity, and user override signals
- Added final/review/rejected buckets with explanations and coverage reasons
- Added final-selection summary and final-photo query commands
- Added workspace control to build the final album
- Added Rust tests for priority-people ranking and force-exclude behavior

## Remaining Phase 4 Work

- Review 1000 workspace with fast approve/reject controls
- Final 300 workspace with protected-photo controls surfaced directly on photo cards
- User override UI for protect, force include, and force exclude
- Dynamic final/review count controls
- Refiltering without rescanning
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
