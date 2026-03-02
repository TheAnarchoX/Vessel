# VESSEL Specification & Design Philosophy

## Product Goal

Build **VESSEL** as a browser-based, top-down 2D roguelite with a strong horror identity, high gameplay quality, and production-ready engineering.

## Technical Direction (Revised)

- The project is no longer constrained to a single file.
- The implementation is no longer constrained to vanilla-only JavaScript.
- The current prototype is Canvas-based at `960x540`, but architecture should allow scaling, module separation, and tooling evolution.
- Pixel-art readability and horror atmosphere remain core visual constraints regardless of stack.

## Licensing & Deployment Policy (Free-Use Requirement)

- Any selected engine, framework, or toolchain must be free to use for development and free deployment.
- Prefer permissive licenses (MIT, BSD, Apache-2.0, Zlib, ISC).
- Avoid dependencies with viral or restrictive commercial clauses that could complicate free deployment.
- Track dependency licenses in a machine-readable manifest and verify during CI.
- Avoid proprietary lock-in for core runtime systems.

## Phase 0 Policy Verification (Planner + Compliance Audit)

### Technical Direction (Revised) Verification

- **Verified** against `README.md` project direction: modular architecture and flexible stack are allowed.
- **Verified** against `AGENTS.md` Core Policy Constraints: stack freedom explicitly removes single-file/vanilla-only limits.
- **Verified** against `MEMORY.md` Agentic Memory Notes: open-stack direction is retained as active project memory.

### Licensing & Deployment Policy Verification

- **Verified** against `README.md` and `AGENTS.md`: dependencies/tooling must remain free to build with and free to deploy/use.
- **Verified** against `MEMORY.md`: compliance memory tracks the same free-use and free-deploy rule.
- **Verified** against `PLAN.md` Phase 0 and Phase 11 prompts: license/deployment readiness must be enforced with evidence before release approval.

## Reusable Phase Acceptance Gates

Every phase change should pass all gates below before handoff:

1. **Scope Gate**: change maps to the active phase prompt in `PLAN.md` and does not bypass serial phase order without explicit exception.
2. **Policy Gate**: work remains consistent with this spec's Technical Direction (Revised) and Licensing & Deployment Policy.
3. **Validation Gate**: changed behavior is validated with reproducible evidence (test output, command logs, traces, seed runs, or equivalent).
4. **PR Evidence Gate**: evidence format follows `AGENTS.md` (UI screenshots, non-UI verification artifacts, benchmark output for performance changes, ADR for architecture changes).
5. **Documentation Gate**: policy/architecture direction changes are synchronized in `README.md`, `SPEC.md`, and `MEMORY.md` as applicable.

## Dependency-Policy Checklist (PR-Verifiable)

Use this checklist for any dependency/tooling introduction or update:

- [ ] Dependency/tool is free for development use and free for deployment/distribution use.
- [ ] License is permissive or otherwise business-safe for free deployment; no restrictive commercial clause blocks release.
- [ ] License decision and version are recorded in a machine-readable manifest.
- [ ] CI or scripted checks validate license policy compliance for the changed dependency set.
- [ ] PR includes compliance evidence (command/log output and, when needed, notices/ADR updates).

## Core Gameplay Structure

1. Title screen and run start.
2. Multi-floor progression:
   - Floor 1: The Nave
   - Floor 2: The Catacombs
   - Floor 3: The Ossuary
   - Floor 4: The Pit
3. Room types include combat, altar, confession, reliquary, and boss rooms.
4. Doors lock on combat and unlock on clear.

## Engineering Philosophy

- Build for maintainability first: modular systems, testable logic, and data-driven content.
- Separate simulation from presentation so combat remains deterministic under rendering fluctuations.
- Use tooling and frameworks pragmatically where they improve reliability, performance, or developer velocity.
- Keep content pipelines explicit (schema-validated enemy/item/room definitions).
- Favor instrumentation and profiling over guesswork for optimization decisions.

## Engine/System Architecture Goals

- **Core loop layer**: state machine, fixed-step simulation, transitions, save/load.
- **Gameplay layer**: entities, combat, AI, items, corruption, progression.
- **World layer**: dungeon generation, room rules, events, encounter composition.
- **Presentation layer**: rendering, camera, VFX, UI/HUD, accessibility options.
- **Audio layer**: adaptive music states, SFX buses, dynamic intensity controls.
- **Content layer**: externalized data definitions and balance tables.

## Performance Goals

- Target 60fps median with predictable frame pacing.
- Keep hot loops allocation-light and data-oriented.
- Use pooling, culling, and broadphase collision techniques as needed.
- Include in-game performance telemetry for real hardware validation.

## Input Model

- `WASD` movement
- Arrow keys shooting in 4 directions
- `E` interaction
- `Tab` inventory/map overlay

## Player Systems

- Soul as HP
- Corruption meter (0–100)
- Tear combat stats (rate, damage, range, speed)
- Corruption-based tear color progression (white → yellow → red → black)

## Combat Philosophy

- Fast readability over complex simulation.
- Small number of high-identity enemies with distinct movement patterns.
- Bosses are phase-based and must escalate pressure.

## Dungeon Generation Philosophy

- 5x5 grid with guaranteed start-to-boss path.
- Start fixed at center.
- Boss at edge.
- Altar near start.
- Remaining rooms procedurally populated with weighted role assignment.

## UI/HUD Philosophy

- Gothic/church panel framing.
- Constant visibility for Soul, Corruption, floor identity, passive inventory, and minimap.
- High-contrast readability under dark palette.

## Audio Direction

- Procedural Web Audio cues for fire, hit, damage, unlock, pickup, boss entry, and death.
- Horror-driven tonal choices: low drones, distorted lows, tense blips.

## Thematic Rules

- Horror tone only; no comedy framing.
- The player is the vessel, not a heroic chosen one.
- Progression should feel like spiritual erosion, not power fantasy alone.
