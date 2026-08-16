# PROJECT MASTER

## Objective

Transform the existing WorldMonitor codebase into a private, Indonesia-first market and geopolitical intelligence terminal.

WorldMonitor is the technical foundation, not the final product.

The final product may look completely different from the original WorldMonitor interface.

## Current Phase

PHASE 1 — UI TRANSFORMATION

Primary goal:

* Understand the existing frontend architecture.
* Preserve the working WorldMonitor backend and data systems.
* Redesign the visual interface substantially.
* Do not add major new backend systems yet.

Indonesia-specific intelligence, market intelligence, portfolio systems, and additional analytical engines will be implemented in later phases.

## Core Principle

PRESERVE WORKING WORLDMONITOR INFRASTRUCTURE.

Do not rewrite working infrastructure merely because another implementation appears cleaner or more modern.

Prefer:

* Extend over replace.
* Adapter over rewrite.
* New module over core modification.
* Existing API over duplicate API.
* Existing data pipeline over duplicate ingestion.
* Small targeted changes over repo-wide refactors.

## Frontend

The existing frontend may be radically redesigned.

Allowed changes include:

* Main dashboard layout.
* Navigation.
* Sidebar.
* Top bar.
* Panel system.
* Component hierarchy.
* Typography.
* Spacing.
* Visual hierarchy.
* Cards.
* Dashboard widgets.
* Map presentation.
* Map controls.
* Responsive behavior.
* Interaction design.
* Information density.
* Theme and styling.
* Page composition.

The final UI does not need to resemble WorldMonitor.

## Backend

Treat the existing backend as stable infrastructure unless proven otherwise.

Preserve:

* Existing ingestion systems.
* API contracts.
* Generated API interfaces.
* Existing data sources.
* Caching.
* Feed processing.
* Event processing.
* Server logic.
* Map data pipelines.
* Existing integrations.
* Existing working functionality.

Do not modify backend systems simply to support a visual redesign.

If backend modification is genuinely necessary:

1. Explain why the frontend cannot use the existing contract.
2. Identify every affected file.
3. Make the smallest possible change.
4. Preserve backward compatibility whenever practical.
5. Run relevant tests.
6. Document the change.

## Data Integrity

This system may later support financial and geopolitical analysis.

Data integrity is therefore more important than visual completeness.

NEVER fabricate data.

If data is:

* unavailable,
* missing,
* stale,
* degraded,
* incomplete,
* or uncertain,

the UI must represent that state honestly.

Acceptable examples:

* Data unavailable
* Source offline
* Stale data
* Unknown
* Awaiting update

Never invent placeholder market, macroeconomic, geopolitical, company, portfolio, or numerical values and present them as real data.

Mock data may only be used when explicitly requested for UI prototyping, and it must be clearly identified as mock data.

## Existing Features

Do not delete existing working functionality solely because the current UI does not need it.

Prefer hiding or deprioritizing unused functionality rather than removing the underlying implementation.

Existing capabilities may later become useful for:

* geopolitical analysis,
* shipping,
* aviation,
* energy,
* infrastructure,
* commodities,
* supply chains,
* market intelligence,
* or event convergence.

## Development Method

Before implementing any requested feature:

1. Read this file.
2. Inspect the relevant existing implementation.
3. Understand the current architecture.
4. Identify the smallest safe change.
5. Explain which files need modification.
6. Implement only the requested scope.
7. Run relevant type checks, tests, lint, or build checks.
8. Report what changed.
9. Report any known limitations.

Do not perform unrelated cleanup while implementing a feature.

## Refactoring Rules

Avoid repo-wide refactors unless explicitly requested.

Do not:

* rename large numbers of files without necessity,
* replace frameworks,
* replace map libraries,
* replace state management,
* replace API architecture,
* restructure backend folders,
* change working data contracts,
* remove integrations,
* modernize dependencies merely for cleanliness,
* or introduce a new architecture solely because it is preferred.

Any large architectural change requires explicit approval.

## Git Safety

The active development branch is intended for customization.

Do not automatically merge upstream changes.

Do not rewrite Git history.

Before large changes, understand the current Git state.

Keep changes logically scoped so they can be reverted independently.

## UI Direction

The target is a high-information-density intelligence command center.

General characteristics:

* Dark interface.
* Professional.
* Dense but readable.
* Operational rather than decorative.
* Map-aware but not map-dependent.
* Suitable for long monitoring sessions.
* Strong visual hierarchy.
* Modular panels.
* Fast scanning of important information.

Future product areas may include:

* Global intelligence.
* Indonesia intelligence.
* Markets.
* Macro.
* Themes.
* Companies.
* Portfolio.
* Alerts.
* Geopolitics.
* Commodities.
* Maritime intelligence.
* News intelligence.

These future modules should NOT all be implemented during Phase 1.

## AI Role

AI is an analytical assistant, not an autonomous decision maker.

Future AI functionality should:

* summarize,
* classify,
* extract entities,
* correlate signals,
* identify anomalies,
* explain evidence,
* and surface relevant context.

AI must not invent missing facts or silently substitute assumptions for missing evidence.

## Current Priority

1. Keep the original WorldMonitor application working.
2. Understand the frontend architecture.
3. Identify frontend/backend boundaries.
4. Identify the files controlling the main dashboard.
5. Redesign the UI safely.
6. Preserve existing functionality.
7. Add Indonesia-specific systems later.
8. Add market intelligence systems later.

## Communication

All agent reports, plans, code explanations, documentation updates, and user-facing output must be written in English unless explicitly instructed otherwise.
