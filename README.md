# VESSEL

VESSEL is a browser-based, top-down 2D roguelite with horror-first tone, deterministic simulation goals, and production-minded engineering standards.

The current game is a playable prototype at `960x540` with modular runtime/gameplay systems in `src/` and deterministic validation scripts in `scripts/bench/`.

## Vision

- Horror-forward atmosphere over power fantasy.
- Fast, readable combat with clear telegraphs.
- Deterministic and testable gameplay systems.
- Procedural variety without unwinnable seeds.
- Stack flexibility with free-use/free-deploy licensing constraints.

## Current State

Implemented and validated to Phase 6 scope:

- Phase 1: feel/runtime seam and fixed-step structure.
- Phase 2: enemy behavior contracts and telegraph windows.
- Phase 2.5: entity readability baselines and visual overlays.
- Phase 3: boss phase state machines, hazards, replay tooling.
- Phase 4: data-driven item taxonomy, synergy matrix, balance floors.
- Phase 5: corruption tiers, whispers, narratives, relics, endings, meta unlocks.
- Phase 6: deterministic dungeon generation with pacing/entropy/economy guarantees.

Planned future work continues in `PLAN.md` (Phases 7-11).

## Run The Prototype

Open `index.html` in a modern browser.

The integration shell loads runtime and systems from:

- `src/core/fixedStep.js`
- `src/engine/runtime.js`
- `src/gameplay/*.js`
- `src/content/*.js`
- `src/rendering/*.js`
- `src/audio/*.js`
- `src/ui/*.js`
- `src/presentation/*.js` (compatibility facade)

## Controls

- `W`, `A`, `S`, `D`: movement
- `Arrow keys`: shooting direction
- `E`: interaction (doors/items/room interactions)
- `Tab`: minimap/inventory overlay
- `F2`-`F7`: debug overlays/toggles used by implemented phase tooling

## Game Structure

Floor progression:

1. The Nave
2. The Catacombs
3. The Ossuary
4. The Pit

Room role mix includes:

- `start`
- `combat`
- `altar`
- `confession`
- `reliquary`
- `rest`
- `boss`

Combat rooms lock until clear; progression pressure alternates with recovery opportunities.

## Core Systems

### Combat + Feel

- Fixed-step update seam for deterministic simulation behavior.
- Shot cadence instrumentation and latency metrics.
- Hit-stop and cadence consistency tooling.
- Enemy behavior contracts for chase/charge/kite/summon/zone patterns.

Primary files:

- `src/core/fixedStep.js`
- `src/gameplay/feelMetrics.js`
- `src/gameplay/enemyContracts.js`

### Bosses

- Deterministic boss phase state machines.
- Health/timer-based phase transitions.
- Boss-room hazards (sigils, pits, collapses).
- Replay recording/verification path for tuning and regression checks.

Primary files:

- `src/gameplay/bossStateMachine.js`
- `src/gameplay/bossHazards.js`
- `src/gameplay/bossReplay.js`

### Itemization + Synergy

- 25 pool items across 5 categories:
  - offense
  - defense
  - utility
  - economy
  - corruption_tech
- 3 fixed boss drops.
- Pair/triple/tag synergies.
- Dead-build prevention floors and deterministic simulation checks.

Primary files:

- `src/gameplay/itemSystem.js`
- `scripts/bench/phase4_item_synergy_check.js`

### Corruption + Narrative Identity

- Corruption meter `0-100`.
- Four tiers:
  - Unmarked (`0-24`)
  - Tainted (`25-49`)
  - Corrupted (`50-74`)
  - Vessel Consumed (`75-100`)
- Tier-based mechanical modifiers (damage/tears/soul decay/dodge window).
- Context-aware whisper system.
- Floor narrative variants by tier.
- Relics and confession choices as corruption route anchors.
- Five conditional endings plus meta-unlock progression.

Primary files:

- `src/gameplay/corruptionSystem.js`
- `src/presentation/corruptionEffects.js`

Endings documentation:

- `docs/endings.md`

### Dungeon Generation + Pacing

- Deterministic seeded generation on a `5x5` grid.
- Guaranteed start-to-boss reachability.
- Weighted role assignment by floor.
- Economy guarantees (`altar/rest/reliquary` minimums).
- Path entropy checks to avoid linear monotony.
- Pacing validation for pressure/recovery rhythm.
- Fail-fast reroll with bounded attempts.

Primary files:

- `src/gameplay/dungeonGenerator.js`
- `scripts/bench/phase6_dungeon_gen_check.js`

## Architecture Snapshot

- `src/core/`: simulation timing primitives.
- `src/engine/`: runtime orchestration and integration seam.
- `src/gameplay/`: deterministic mechanics and state machines.
- `src/content/`: schema contracts for externalized data files.
- `src/rendering/`: render-layer visuals and readability primitives.
- `src/audio/`: audio parameter contracts and cue definitions.
- `src/ui/`: HUD and narrative overlay rendering.
- `src/presentation/`: compatibility facade during migration to strict layers.
- `index.html`: current integration shell + prototype wiring.

## Deterministic Validation

Run bench scripts from repo root:

```bash
node scripts/bench/phase1_feel_check.js
node scripts/bench/phase2_enemy_contracts_check.js
node scripts/bench/phase25_visual_readability_check.js
node scripts/bench/phase3_boss_statemachine_check.js
node scripts/bench/phase3_boss_replay_check.js
node scripts/bench/phase4_item_synergy_check.js
node scripts/bench/phase5_corruption_check.js
node scripts/bench/phase6_dungeon_gen_check.js
```

## Toolchain Validation (Phase 7)

Install and run full gates from repo root:

```bash
npm install
npm run validate
```

Individual gates:

- `npm run lint`
- `npm run typecheck`
- `npm run check:boundaries`
- `npm run check:content`
- `npm run check:replay`
- `npm run check:licenses`

## Documentation Map

- `SPEC.md`: game design, philosophy, and policy constraints.
- `PLAN.md`: serial phase roadmap and acceptance goals.
- `MEMORY.md`: persisted balancing/system assumptions.
- `AGENTS.md`: execution, evidence, and handoff guidance.
- `docs/decisions/`: ADRs for architecture-level decisions.
- `docs/endings.md`: ending meanings, requirements, and unlock paths.

## Policy Constraints

- Dependencies/tooling must be free to build with and free to deploy/use.
- Prefer permissive licenses.
- Keep changes phase-scoped unless a dependency exception is explicitly approved.
- For meaningful changes, include reproducible evidence in PRs.

## Contribution Notes

- Keep edits minimal and phase-aligned with `PLAN.md`.
- Preserve deterministic behavior where systems already depend on it.
- Update docs when policy, behavior, or architecture intent changes.
- For UI changes, include screenshots in PR evidence.
