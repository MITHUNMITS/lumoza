# Lumoza UI System

## Direction

Lumoza Studio should feel like premium creative desktop software: cinematic, calm, media-first, and local-first. The UI should support fast photo decisions without feeling like a dashboard or enterprise tool.

## Foundation

- Main background: cinematic dark surface with subtle blue and purple ambient light
- Panels: glassy dark cards with thin borders and soft shadows
- Typography: Inter for product UI, JetBrains Mono for compact technical values. Fonts should be bundled later; the app must not depend on external font loading.
- Motion: restrained fade, scale, hover lift, shimmer, and progress transitions
- Scrollbars: thin dark premium scrollbars through `.lumoza-scrollbar`
- Safety posture: original media remains read-only, and UI copy should reinforce local processing

## Core Tokens

- Theme variables live in `src/styles/theme.css`
- Tailwind extensions mirror the CSS variables in `tailwind.config.ts`
- Shared utility classes include `lumoza-surface`, `lumoza-panel`, `lumoza-card`, `lumoza-glass`, `lumoza-focus`, `lumoza-scrollbar`, and `lumoza-shimmer`

## Reusable Components

- `LumozaButton`: premium action buttons with primary, secondary, ghost, and danger variants
- `LumozaCard` / `GlassPanel`: reusable panel containers
- `StatusPill`: compact status and AI badges
- `MetricCard`: high-level product metrics
- `ProgressBlock`: consistent operation progress
- `EmptyState`: polished zero states
- `SkeletonLoader`: shimmer loading placeholders
- `ThumbnailCard`: media-first grid card for virtualized photo browsing
- `ActionPill`: compact future toolbar/filter actions

## Screen Rules

- Photos are the hero in workspace and review surfaces
- Home should feel like a memory hub, not an analytics dashboard
- Metrics should be compact, contextual, and mostly secondary
- Keep explanatory copy out of primary creative surfaces unless it directly guides action
- People, review, final selection, AI models, and exports can have visible slots, but future phase logic must not be implemented early
- Every async or empty state should provide guidance and preserve layout stability
- Accessibility requires visible focus states and readable contrast

## Current Scope

The primary UI/UX reference is now `layout_images_samples/Full_app_pages.png`. Phase 5 refactored the product toward one storyboard-driven adaptive desktop workspace shell while preserving Phase 1-4 functionality and avoiding premature Phase 6 model-download/export-runner behavior. Current UI coverage includes hub, guided creation, media analysis, people intelligence, memory understanding, intelligent curation, curated review, photo detail modal, finalization, export visualization, compare scaffolding, and compact settings.

## Studio Refinement

The second UI refinement reduces visible dashboard patterns: the sidebar is icon-first, the homepage removes metric-card emphasis, project cards become cinematic previews, and the workspace gives the photo grid the dominant surface with a compact AI rail.

## Viewport Workspace Rule

Primary surfaces should use fixed viewport regions instead of full-page scrolling. The app shell owns the window, the central media canvas owns the main focus, and side panels scroll independently as docked inspectors. Avoid stacked webpage composition on dashboard and workspace views.

## Reference Screenshot Adaptation

The uploaded `layout_images_samples` references define the active visual target: a Lumoza-branded dark shell, purple-accent navigation, cinematic memory previews, modal-based creation/import flows, splash-screen memory collage, and distinct page architecture for Home, All Photos, People, Places, Timeline, Compare, Import, Export, and Settings. Reference screenshots remain untracked and are not shipped as product assets.
