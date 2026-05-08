# Product Foundation

## Purpose

This document exists to stop accidental product drift. It captures what is still unknown so we can make decisions in the right order.

## Current Truth

Lumoza has a project name, ambition, and a clean repository start. It does not yet have a locked product definition.

## Immediate Gaps

- No validated user problem
- No target customer segment
- No primary workflow
- No revenue or operating model
- No stack decision
- No data model
- No authentication strategy
- No release plan

## Risks If We Skip Definition

- Building features users do not need
- Rewriting architecture after early growth
- Weak security and privacy decisions
- Slow onboarding for future contributors
- Unclear priorities and constant scope change

## Required Product Decisions

### 1. Problem

- What specific pain does Lumoza solve?
- How often does the problem occur?
- Why are current alternatives not good enough?

### 2. User

- Who is the primary user?
- Who is the buyer, if different from the user?
- What is the user's current workaround?

### 3. Value

- What measurable improvement will Lumoza create?
- Why will users trust it?
- Why will users return?

### 4. Scope

- What is the single most important workflow in v1?
- What features are explicitly out of scope?
- What does success look like in the first 30 days after launch?

### 5. Architecture

- Web app, mobile app, desktop app, or multi-platform?
- Monolith first or service split?
- Relational or document database?
- First-party auth or third-party auth provider?

### 6. Quality

- Required uptime target
- Performance budget
- Test coverage expectations
- Monitoring and alerting baseline
- Backup and recovery approach

## Suggested Near-Term Deliverables

1. Product brief
2. User journey map
3. v1 feature list
4. System architecture draft
5. engineering roadmap
6. release checklist

## Definition Of Ready For Coding

Coding should accelerate only after the following are written and reviewed:

- Product brief approved
- v1 scope approved
- Technical stack selected
- Repository structure agreed
- Core entities identified
- Deployment target selected

## Suggestions

- Keep the first version narrow and complete, not broad and half-finished.
- Treat observability, auth, and backups as launch features.
- Avoid premature microservices.
- Write decisions down as ADRs once architecture work starts.
