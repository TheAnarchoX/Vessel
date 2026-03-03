# AGENTS Guide for VESSEL

This file provides repository-specific execution guidance for human/AI agents working on VESSEL.

## Repository Scope

- Current repo is minimal and prototype-first.
- `index.html` contains the playable prototype at present.
- Planning and direction are primarily defined in:
  - `PLAN.md`
  - `SPEC.md`
  - `README.md`
  - `MEMORY.md`

## Core Policy Constraints

1. **Stack freedom**: not constrained to single-file or vanilla-only implementation.
2. **License safety**: tooling/dependencies must be free to build with and free to deploy/use.
3. **Quality-first execution**: follow phased, serial plan from `PLAN.md`.
4. **Minimal-scope edits**: change only what is required for the active task.

## Preferred Working Model

- Execute phases mostly in serial (Phase N before N+1).
- Within a phase, parallelize only independent tasks.
- Require validation evidence before phase handoff.
- Prefer Mermaid diagrams in documentation when they improve clarity (flows, state machines, architecture, timelines).

## Agent Roles

### 1) Planner Agent
- Maintains phase order, acceptance criteria, and dependency map.
- Keeps tasks aligned to quality pillars and release goals.

### 2) Gameplay Agent
- Implements feel, combat, enemies, bosses, items, and corruption systems.
- Protects responsiveness and combat readability metrics.

### 3) Engine Agent
- Owns architecture boundaries, deterministic simulation, state flow, save/load.
- Introduces tooling, validation, and CI quality gates.

### 4) Performance Agent
- Profiles hotspots and improves frame pacing/memory stability.
- Adds instrumentation and stress-test workflows.

### 5) QA/Balance Agent
- Builds deterministic tests and simulation harnesses.
- Maintains balancing telemetry and triage policy.

### 6) Compliance Agent
- Verifies dependency and asset licenses.
- Maintains notices/attribution and deployment compatibility checks.

## Phase Prompts (Use with `PLAN.md`)

### Phase 0 Prompt
"Audit docs for open-stack + free-deploy consistency. Finalize policy constraints and acceptance gates."

### Phase 1 Prompt
"Establish the initial engine base first, then tune core movement/shooting feel with measurable latency/cadence metrics and no readability regressions."

### Phase 2 Prompt
"Implement enemy telegraphs and encounter composition contracts; verify with AI debug overlays."

### Phase 2.5 Prompt
"Establish player/enemy/item/boss sprite and animation readability baselines before boss/item/corruption content expansion."

### Phase 3 Prompt
"Build deterministic boss phase machines and validate all transitions/hazard readability."

### Phase 4 Prompt
"Implement item taxonomy + synergy matrix and remove no-op rewards via simulation checks."

### Phase 5 Prompt
"Bind corruption to mechanics, AV identity, and branching outcomes with testable triggers."

### Phase 6 Prompt
"Enforce generator constraints first, then tune pacing with seeded-batch validation."

### Phase 7 Prompt
"Mature the Phase 1 engine base into modular deterministic architecture with tooling and CI enforcement."

### Phase 8 Prompt
"Profile-first optimization: stabilize frame pacing, eliminate hot-loop allocations, improve observability."

### Phase 9 Prompt
"Improve HUD readability/accessibility and adaptive audio hierarchy without tone drift."

### Phase 10 Prompt
"Operationalize QA/balance loops using deterministic tests, simulators, and telemetry metrics."

### Phase 11 Prompt
"Prepare alpha/beta/1.0 candidates with QA evidence and complete license compliance checks."

## Handoff Checklist (Every Meaningful Change)

- Confirm which phase the change belongs to.
- Confirm acceptance criteria impact.
- Run targeted validation for changed behavior.
- Document any policy or architecture implications.
- Keep docs synchronized when direction shifts.
- If the change includes UI work, include screenshots in the pull request.
- If the change is non-UI, include concrete evidence in the pull request (test output, command logs, traces, or equivalent artifacts).
- If the change is performance-related, include benchmark evidence (script/command used + captured output).
- Record architecture decisions in `docs/decisions/*.md`, using Mermaid where helpful.

## Evidence Expectations (PRs)

- **UI changes**: screenshots (or short capture) showing before/after impact.
- **Logic/bugfix changes**: relevant test/lint/run output.
- **Performance changes**: benchmark script/command + output summary.
- **Architecture changes**: ADR in `docs/decisions` with rationale, alternatives, and impact.
