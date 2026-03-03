# VESSEL Master Plan (Phased Execution)

This roadmap is organized for **serial execution** across phases so quality decisions compound correctly.

Execution rule:
- Complete phases in order unless an explicit dependency exception is approved.
- Parallel work is allowed only inside a phase when tasks are independent.
- Every phase must end with validation evidence before moving forward.

---

## Quality Pillars (Apply in Every Phase)

1. **Responsiveness**
   - Input-to-action latency target: < 50ms perceived delay.
   - Movement and shooting must feel immediate and deterministic.
2. **Combat Clarity Under Stress**
   - Every enemy attack telegraphed/readable in 150–400ms windows.
   - Damage source attribution always clear.
3. **Run Variety with Structural Reliability**
   - Procedural runs should be tactically distinct.
   - No unwinnable seeds.
4. **Performance Stability**
   - 60fps target on mid-range hardware.
   - Frame spikes > 22ms should be rare and diagnosable.
5. **Horror Cohesion**
   - Visual/audio/UI/text/progression all support oppressive tone.
   - Avoid tonal drift.

---

## Phase 0 — Foundation, Constraints, and Governance

### Goal
Lock down core vision, non-negotiables, and legal/deployment constraints before implementation scale-up.

### Scope
- Product vision: dread, attrition, moral compromise, possession.
- Engineering direction: modular architecture, deterministic simulation, maintainability-first.
- Tech freedom: no single-file and no vanilla-only restriction.
- Licensing guardrail: dependencies must be free to build with and free to deploy/use.

### Deliverables
- Canonical vision + architecture intent documented.
- Dependency/license policy documented and enforceable.
- Phase gates defined for all subsequent phases.
- Evidence policy for PR validation documented (UI screenshots, benchmark outputs, and non-UI verification artifacts).

### Agent Prompt (Phase 0)
"For Phase 0 (Foundation, Constraints, and Governance): act as Planner + Compliance agents and audit `README.md`, `SPEC.md`, `MEMORY.md`, and `AGENTS.md` for scope consistency. In `SPEC.md`, explicitly verify `Technical Direction (Revised)` and `Licensing & Deployment Policy (Free-Use Requirement)` against repo policy, then define reusable acceptance gates for later phases. Use `glob`/`rg`/`view` to ground findings and produce a dependency-policy checklist that is verifiable via PR evidence."

---

## Phase 1 — Core Feel Prototype Hardening

### Goal
Make minute-1 gameplay feel excellent while establishing the engine foundation early.

### Scope
- [ ] Establish initial engine base in `src/` (core/gameplay boundaries + fixed-step simulation skeleton) before broad feature expansion.
- [ ] Add acceleration/friction movement tuning profile options.
- [ ] Add coyote-style input grace for shot cadence consistency.
- [ ] Add hit-stop microfreeze (30–70ms) for impactful hits.
- [ ] Add optional aim-buffer queue (last directional shot intent).
- [ ] Expand tear variants (pierce, split, chain, DOT, aura, siphon).
- [ ] Phase 7 uplift (allowed in Phase 1): introduce a minimal `src/` runtime seam now (fixed-step loop + instrumentation hooks) when it directly improves feel iteration workflow.

### Exit Criteria
- Input and attack feedback are consistently responsive and readable.
- Feel regressions are measurable with baseline metrics.

### Agent Prompt (Phase 1)
"For Phase 1 (Core Feel Prototype Hardening): act as Gameplay + Engine + QA agents and establish a minimal engine base in `src/` first (core/gameplay boundaries + fixed-step simulation skeleton), then harden minute-1 feel with measurable responsiveness targets. In `SPEC.md`, use `Input Model`, `Player Systems`, `Combat Philosophy`, and `Engine/System Architecture Goals` as the baseline for movement/shot cadence behavior, deterministic flow, and hit readability. Instrument latency/cadence metrics, block objective regressions, and capture deterministic evidence via `bash` output + `report_progress` artifacts."

---

## Post-Phase 1 Baseline (Applies to Phases 2+)

- Phase 0 policy/acceptance gates and Phase 1 feel/runtime foundation are complete and should be treated as fixed inputs for later phases.
- Build new gameplay/system work in `src/` modules first (core/engine/gameplay separation); keep `index.html` as integration shell/prototype host, not the long-term source-of-truth architecture.
- Keep deterministic validation + PR evidence requirements active in every later phase.

---

## Phase 2 — Enemy and Encounter Design

### Goal
Create high-identity enemies and balanced encounter compositions.

### Scope
- [ ] Formalize behavior model: chase / charge / kite / summon / zone denial.
- [ ] Add explicit telegraph phases per attack.
- [ ] Build encounter composition rules (melee + ranged + area control pressure mix).
- [ ] Introduce elite modifiers (faster, armored, cursed, berserk).
- [ ] Add AI state debugging overlays for iteration mode.

### Exit Criteria
- Encounters are readable but threatening.
- Difficulty rises through composition, not randomness alone.

### Agent Prompt (Phase 2)
"For Phase 2 (Enemy and Encounter Design): act as Gameplay + QA agents and implement enemy behavior contracts (chase/charge/kite/summon/zone) in `src/` on top of the Phase 1 runtime seam. Treat telegraph/read/recover windows and damage attribution as explicit, testable contracts aligned to `SPEC.md` `Combat Philosophy` and room intent from `Core Gameplay Structure`. Validate encounter composition under stress with debug overlays/logs and capture reproducible evidence for each attack path."

---

## Phase 2.5 — Entity Visual Identity and Animation Pass

### Goal
Make core entities (player, enemies, items, bosses) visually readable, stylistically cohesive, and production-ready before deeper boss/item/corruption expansion.

### Scope
- [ ] Define visual direction guardrails for sprites, silhouettes, and palette usage per entity category.
- [ ] Implement baseline sprite sets for player, enemy archetypes, item pickups, and boss shells.
- [ ] Add gameplay-critical animation states (idle, move, attack telegraph, hit, death/spawn) with readability-first timing.
- [ ] Add minimum VFX layering for shots, impacts, pickups, and boss cues without obscuring combat telegraphs.
- [ ] Add entity-readability review overlays/checklist captures for stress scenarios.

### Exit Criteria
- Combat-relevant entities are instantly distinguishable by silhouette/state under pressure.
- Visual quality baseline is established for later content phases without harming readability/performance targets.

### Agent Prompt (Phase 2.5)
"For Phase 2.5 (Entity Visual Identity and Animation Pass): act as Gameplay + Art Direction + QA collaborators and establish entity sprite/animation readability baselines in `src/` presentation boundaries before Phase 3 boss escalation and later content-heavy phases. Use `SPEC.md` `Technical Direction (Revised)`, `UI/HUD Philosophy`, and `Thematic Rules` as guardrails for pixel-art clarity and horror tone. Validate with before/after captures, animation-state checklists, and stress-scene readability evidence."

---

## Phase 3 — Bosses and Phase-State Combat

### Goal
Deliver memorable bosses with clear escalation and replayable skill tests.

### Scope
- [x] Convert boss scripts into explicit phase state machines.
- [x] Add phase ramps via health thresholds and timers.
- [x] Add boss-room hazards (pits, sigils, collapsing zones).
- [x] Add cinematic intro/outro windows with deliberate input locks.
- [x] Add boss replay mode for tuning.

### Exit Criteria
- Boss phases are distinct, understandable, and escalating.
- Boss outcomes correlate with mastery, not ambiguity.

### Progress
Phase 3 implementation complete. Three bosses (Shepherd, Pit, Choir) modeled as
deterministic phase state machines with explicit HP-threshold transition guards.
Full hazard system (arena confinement, damage sigils, collapsing zones), cinematic
intro/outro with input locks, and deterministic record/replay. F6 debug overlay
for live boss state inspection.

**New files:**
- `src/gameplay/bossStateMachine.js` — phase machine framework + 3 boss definitions
- `src/gameplay/bossHazards.js` — hazard lifecycle system
- `src/gameplay/bossReplay.js` — deterministic record/replay

**Modified:**
- `src/presentation/entityVisuals.js` — choir visuals, hazard rendering, phase flash
- `index.html` — boss wiring, F6 debug overlay

**Validation:** 33/33 state machine + 7/7 replay tests pass; Phases 1/2/2.5 regression-free.
**ADR:** `docs/decisions/0002-phase3-boss-state-machines.md`

### Agent Prompt (Phase 3)
"For Phase 3 (Bosses and Phase-State Combat): act as Gameplay + Engine agents and model bosses in `src/` as deterministic phase state machines with explicit transition guards (health, timers, triggers). Use `SPEC.md` `Combat Philosophy` (phase escalation) and `Engineering Philosophy` (deterministic simulation) as hard constraints, preserve Phase 1 loop determinism, and record architecture-impacting decisions in `docs/decisions/`. Validate all transition paths, telegraph timing, and hazard readability with replay-friendly evidence."

---

## Phase 4 — Itemization, Synergy, and Build Diversity

### Goal
Enable wide build expression without dead or broken outcomes.

### Scope
- [x] Define item taxonomy: offense, defense, utility, economy, corruption-tech.
- [x] Add synergy matrix for pairs/triples with explicit emergent behavior.
- [x] Add anti-synergy safeguards to avoid dead builds.
- [x] Add run-history item tracker for balancing.
- [x] Build deterministic seed simulation for item fairness.

### Exit Criteria
- Multiple viable build archetypes per run.
- Item outcomes are exciting but controllable for balance.

### Progress
Phase 4 implementation complete. 25 items across 5 categories with 14 pair,
7 triple, and 5 tag-based synergies. Data-driven item definitions (no closures),
balance-floor enforcement, dead-build detection, run-history tracking, and
deterministic N-run simulation. F7 debug overlay for live item/synergy inspection.

**New files:**
- `src/gameplay/itemSystem.js` — item taxonomy, synergy matrix, simulation, run history
- `scripts/bench/phase4_item_synergy_check.js` — comprehensive validation (246 tests)

**Modified:**
- `index.html` — altar/reliquary/boss-drop wiring, F7 overlay, combat integration
- `MEMORY.md` — Phase 4 balancing assumptions documented

**Validation:** 246/246 tests pass; 0 dead builds in 1000-run simulation; browser-verified item pickup, synergy activation, corruption scaling, and overlay rendering.
**ADR:** `docs/decisions/0003-phase4-item-synergy-system.md`

### Agent Prompt (Phase 4)
"For Phase 4 (Itemization, Synergy, and Build Diversity): act as Gameplay + QA agents and define a concrete item taxonomy plus pair/triple synergy matrix implemented/tested from `src/` systems. Ground stat/effect assumptions in `SPEC.md` `Player Systems`, keep deterministic hooks compatible with the Phase 1 runtime seam, and document policy-impacting balancing assumptions in `MEMORY.md`. Use simulations and targeted checks to remove no-op rewards and dead-build outcomes before content expansion."

---

## Phase 5 — Corruption, Narrative, and Progression Identity

### Goal
Tie systems and story to spiritual erosion, not generic power fantasy.

### Scope
- [ ] Make corruption affect mechanics, visuals, audio, and events.
- [ ] Add context-aware whisper system (boss, low soul, high corruption).
- [ ] Add narrative beats after each floor.
- [ ] Add conditional endings (corruption + choices + relic path).
- [ ] Add progression tracking for discovered endings and meta-progression unlocks.
- [ ] Add unlock meta-progression linked to discovered endings.

### Exit Criteria
- Corruption feels mechanically meaningful and narratively present.
- Endings reflect player tradeoffs.

### Agent Prompt (Phase 5)
"For Phase 5 (Corruption, Narrative, and Progression Identity): act as Gameplay + Narrative + Audio/UX collaborators and bind corruption to mechanics, AV treatment, and branching outcomes through `src/` gameplay/presentation boundaries. In `SPEC.md`, explicitly align with `Thematic Rules`, `Audio Direction`, and `UI/HUD Philosophy`; keep high-level intent synchronized with `README.md` and `MEMORY.md` without regressing Phase 0 policy constraints. Validate corruption triggers and ending conditions using deterministic scenario checks and captured evidence."

---

## Phase 6 — Dungeon Generation and Room Pacing

### Goal
Make procedural floors reliable, varied, and intentionally paced.

### Scope
- [x] Expand generator with weighted templates and lock-key progression.
- [x] Add pacing rules (intensity valleys/peaks across floor graph).
- [x] Guarantee minimum economy/recovery opportunities per floor.
- [x] Add path entropy metrics to prevent linear monotony.
- [x] Add generator validator with fail-fast reroll.

### Exit Criteria
- No unwinnable seeds.
- Floor pacing naturally alternates pressure and recovery.

### Progress
Phase 6 implementation complete. Deterministic seeded dungeon generator with:
weighted room-role assignment per floor, lock-key progression (floors 2-3),
BFS reachability enforcement, economy guarantees (altar/rest/reliquary minimums),
path entropy to reject linear corridors, intensity-based pacing validation
(recovery rooms between start and boss), and fail-fast reroll (max 100 attempts).
Old `createDungeon` in index.html replaced by modular generator.

**New files:**
- `src/gameplay/dungeonGenerator.js` — deterministic generator, validator, analysis utils
- `scripts/bench/phase6_dungeon_gen_check.js` — comprehensive validation (105 tests)

**Modified:**
- `index.html` — wired to `VesselGameplay.generateValidDungeon`, old generator removed

**Validation:** 105/105 tests pass; 0 unwinnable seeds in 4000 dungeons (1000 seeds × 4 floors); max reroll attempts ≤ 60; economy guarantee holds across all seeds; Phases 1-5 regression-free (246/246 item, 169/169 corruption tests pass).
**ADR:** `docs/decisions/0004-phase6-dungeon-generation.md`

### Agent Prompt (Phase 6)
"For Phase 6 (Dungeon Generation and Room Pacing): act as Engine + QA agents and implement generator constraints/validators in `src/` before pacing polish. Use `SPEC.md` `Dungeon Generation Philosophy` plus room rules from `Core Gameplay Structure` as hard requirements, keep seeded validation utilities in `scripts/bench/` where applicable, and enforce reachability/economy guarantees. Reject failing seeds and include reproducible seed evidence in PR artifacts."

---

## Phase 7 — Engine Architecture and Toolchain Maturation

### Goal
Mature and enforce the early engine foundation into production-ready architecture/tooling.

### Scope
- [x] Modular structure: core, gameplay, content, rendering, audio, UI.
- [x] Separate data definitions from behavior logic.
- [x] Add schema validation for content files.
- [x] Enforce dependency boundaries and avoid cyclic coupling.
- [x] Fixed-step simulation with interpolated rendering.
- [x] Record/replay pipeline for deterministic repro.
- [x] Event bus for combat/event telemetry.
- [x] Formal game-state transition contracts.
- [x] Save/resume versioning + migrations.
- [x] Add linting, formatting, type checks, pre-commit hooks, CI gates.
- [x] Add content validation CLI, balance simulation CLI, benchmark command.
- [x] Add dependency/license auditing and THIRD_PARTY_NOTICES tracking.
- [x] Document architecture decisions as ADRs in `docs/decisions` (Mermaid diagrams where useful).

### Exit Criteria
- Architecture supports fast iteration without systemic fragility.
- Tooling catches structural/content regressions early.

### Progress
Phase 7 implementation complete. Architecture now enforces explicit module boundaries
across `core/gameplay/content/rendering/audio/ui` with a compatibility facade in
`presentation` while integration migrates. Determinism and debuggability contracts
were expanded with simulation guards, event bus telemetry, formal game-state
transitions, and save migration versioning. Toolchain enforcement now includes
lint/type/boundary/schema/replay/license gates with CI + pre-commit integration.

**New files:**
- `src/core/eventBus.js` — deterministic event telemetry bus
- `src/core/simulationContracts.js` — fixed-step simulation contracts
- `src/engine/gameStateMachine.js` — explicit transition contract map
- `src/engine/saveMigrations.js` — save versioning + migration pipeline
- `src/content/schemas.js` + `content/*.json` + `content/schemas/*.json` — content-layer contracts/data
- `src/rendering/entityVisuals.js` — rendering layer module
- `src/ui/corruptionHud.js` — UI layer module
- `src/audio/corruptionAudio.js` — audio layer module
- `scripts/validate/check_boundaries.js` — boundary enforcement CLI
- `scripts/validate/validate_content_schema.js` — content/schema validation CLI
- `scripts/validate/replay_contract_check.js` — deterministic replay contract CLI
- `scripts/validate/license_audit.js` — dependency license audit + notices generation
- `docs/decisions/0005-phase7-architecture-toolchain.md` — Phase 7 ADR
- `.github/workflows/ci.yml`, `package.json`, `eslint.config.js`, `tsconfig.json`, `.husky/pre-commit`

**Modified:**
- `index.html` — new layer modules loaded before compatibility adapters
- `src/presentation/entityVisuals.js` — compatibility adapter to rendering layer
- `src/presentation/corruptionEffects.js` — compatibility adapter to UI/audio layers

**Validation:** `npm run validate` (lint, type, boundaries, schema, replay, license, and Phase 3/4/6 deterministic checks).
**ADR:** `docs/decisions/0005-phase7-architecture-toolchain.md`

### Agent Prompt (Phase 7)
"For Phase 7 (Engine Architecture and Toolchain Maturation): act as Engine + Planner agents and mature the established Phase 1+ `src/` foundation into strict module boundaries (core/gameplay/content/rendering/audio/UI) with deterministic simulation contracts and full toolchain enforcement. Follow `SPEC.md` `Engine/System Architecture Goals` and `Engineering Philosophy`, capture decisions in `docs/decisions/*.md` (Mermaid where useful), and wire validation tooling/CI gates for lint/type/content/schema/replay checks. Prioritize debuggability and boundary enforcement over short-term velocity."

---

## Phase 8 — Performance, Rendering, and Instrumentation

### Goal
Sustain stable frame pacing while increasing encounter and VFX complexity.

### Scope
- Runtime targets:
  - [ ] 60fps median; < 5% frames over 20ms.
  - [ ] Memory stability over 30-minute run.
  - [ ] No unbounded arrays or retained detached objects.
- Optimization tactics:
  - [ ] Object pooling (projectiles/particles/temp vectors).
  - [ ] Spatial partitioning for collision broadphase.
  - [ ] Batched draw calls and minimized state changes.
  - [ ] Allocation-light hot loops.
  - [ ] Lazy updates for off-screen/non-critical entities.
- Instrumentation:
  - [ ] In-game perf HUD (fps, frame ms, entity counts, draw calls).
  - [ ] Long-session stress mode.
  - [ ] Telemetry sampling for frame spikes and GC stalls.
- Visual work:
  - [ ] Lighting pass for mood/readability separation.
  - [ ] Cost-aware shader/post processing.
  - [ ] Decal system with pooling.
  - [ ] Camera module (shake/recoil/impact zoom/dead-zone).
  - [ ] Palette scripting by floor + corruption tinting.

### Exit Criteria
- Performance remains stable under peak-content scenarios.
- Profiling tools explain bottlenecks.

### Agent Prompt (Phase 8)
"For Phase 8 (Performance, Rendering, and Instrumentation): act as Performance + Engine agents and profile `src/` runtime hotspots before optimization using benchmark/stress workflows (`scripts/bench/` where applicable). Use `SPEC.md` `Performance Goals` to define pass/fail thresholds, then target hot-loop allocations, collision/render bottlenecks, and frame pacing spikes without harming readability or determinism guarantees established earlier. Record benchmark commands/output in PR evidence and reject speculative changes without measured gains."

---

## Phase 9 — UX, Accessibility, and Audio Cohesion

### Goal
Improve readability, comfort, and emotional impact without diluting horror tone.

### Scope
- UX/UI:
  - [ ] Redesign HUD with scalable layout regions.
  - [ ] Add iconography for relic/status categories.
  - [ ] Add visual priority hierarchy for critical alerts.
  - [ ] Add minimap modes (minimal/tactical/full).
  - [ ] Add optional tutorialization layer.
- Accessibility:
  - [ ] Rebindable controls.
  - [ ] Colorblind-safe corruption indicators.
  - [ ] Screen shake intensity slider/disable.
  - [ ] Flash reduction toggle.
  - [ ] Subtitles and text scaling.
  - [ ] Audio intensity profile selector.
- Audio:
  - [ ] Layered adaptive soundtrack states.
  - [ ] Corruption-based reverb/low-pass dynamics.
  - [ ] Audio bus architecture (music/sfx/ui/voice/master).
  - [ ] Event-driven ducking for critical cues.
  - [ ] Silent/reduced-intensity mode.

### Exit Criteria
- Players can parse critical state quickly.
- Accessibility options reduce friction while preserving intent.

### Agent Prompt (Phase 9)
"For Phase 9 (UX, Accessibility, and Audio Cohesion): act as UX + Accessibility + Audio agents and improve HUD clarity, control comfort, and alert hierarchy through modular `src/` UI/audio systems without diluting tone. In `SPEC.md`, use `UI/HUD Philosophy`, `Audio Direction`, and `Thematic Rules` as review anchors while implementing options such as rebinds and intensity/flash/shake controls. Capture before/after UI evidence and verify critical cue readability under high action density."

---

## Phase 10 — QA, Balancing, and Content Production Readiness

### Goal
Make the game robust, tunable, and scalable for content growth.

### Scope
- Balancing/analytics:
  - [ ] Baseline run duration target (20–30 min).
  - [ ] Combat simulator for TTK/survivability curves.
  - [ ] Track floor death causes and win rates.
  - [ ] Tune drops, soul economy, corruption tradeoff.
  - [ ] Build movement/death heatmaps.
- Test strategy:
  - [ ] Generator tests (reachability/constraints/roles).
  - [ ] Combat math tests.
  - [ ] Item effect + stacking edge-case tests.
  - [ ] Save/load compatibility tests.
  - [ ] Determinism tests for seeded runs.
- Manual QA matrices:
  - [ ] Input device matrix.
  - [ ] Resolution/scaling matrix.
  - [ ] Browser compatibility matrix.
  - [ ] Accessibility checks.
- Bug triage:
  - [ ] Crash/progression block = P0.
  - [ ] Input/combat feel regression = P1.
  - [ ] Visual/audio polish issue = P2 unless readability-critical.
- Content pipeline:
  - [ ] Authoring templates for enemies/items/rooms/events.
  - [ ] Flavor-text tone consistency pass.
  - [ ] Build verification for missing IDs/assets.
  - [ ] Localization-ready text extraction.

### Exit Criteria
- Reliable quality gates are in place.
- Balance iteration is data-informed.

### Agent Prompt (Phase 10)
"For Phase 10 (QA, Balancing, and Content Production Readiness): act as QA/Balance + Engine agents and operationalize repeatable test/simulation loops for combat math, generation integrity, item stacking, determinism, and save compatibility across `src/` systems. Anchor checks to `SPEC.md` sections `Combat Philosophy`, `Dungeon Generation Philosophy`, and `Engineering Philosophy`; place automation in `tests/` with supporting scripts in `scripts/bench/`. Require telemetry-backed evidence for any balance/stability change before sign-off."

---

## Pre-Phase 11 - Ideation and Scope Distillation (Complete)

### Planning Clarifications Captured

- Planning depth: balanced sub-phases (not excessively fragmented).
- Delivery preference: generated bosses/enemies/items are immediate Phase 11 build targets.
- Direction shift risk posture: moderate refactors are allowed when they materially improve readability, cohesion, or replay value.

### Ideation Output Targets

- 10 bosses.
- 20 enemy types.
- 50 items.
- 5 new mechanics/systems.
- 10 polish targets.
- 5 major direction shifts.

### Distilled Core Theme for Phase 11

- Add explicit corruption-route identity with two strategic paths:
  - Demonic Path (high corruption): volatile, high-risk/high-output power with oppressive AV treatment.
  - Ascetic Path (low corruption): disciplined survivability/control with cleaner AV language and delayed power spikes.
- Keep both paths within horror framing: neither is a "hero mode"; both are compromises with distinct costs.

### Pre-Phase 11 Deliverables

- `BACKLOG.md` created with categorized ideas and tags for post-Phase 11 pull-forward planning.
- `README.md`, `SPEC.md`, and `MEMORY.md` synchronized with Phase 11 planning intent.
- Phase 11 execution plan added below with sub-phases, acceptance gates, and PR evidence requirements.

### Agent Prompt (Pre-Phase 11)

"For the Pre-Phase 11 ideation and planning agent: act as a long-running Planner agent and generate a wide range of ideas for future content/systems expansion, graphics/sprite/UI/UX direction shifts, and polishing targets. Distill those ideas into concrete Phase 11 scope items with defined acceptance gates and PR evidence requirements, and produce a detailed execution plan for Phase 11 in `PLAN.md` that includes any necessary sub-phases. Create a `BACKLOG.md` file that organizes potential future work items by category (content, systems, polish, etc.) with descriptions and relevant tags. Review `README.md`, `SPEC.md`, and `MEMORY.md` to ensure consistency with the established vision and design principles, and document any necessary updates to those files as part of the Phase 11 planning process."

---

## Phase 11 — Content Expansion, Direction Shifts, and Release Management

### Phase 11 Goal

Ship a content-rich, route-distinct, production-ready build in controlled alpha/beta/1.0 stages with compliance confidence and telemetry-backed quality.

### Phase 11 Scope Items (Concrete)

1. **S11-01: Path Identity System (Demonic vs Ascetic)**
   - Gameplay impact: introduces route commitment, replayable tradeoffs, and differentiated risk envelopes layered on existing corruption, relic, confession, and ending systems.
   - Acceptance gates:
     - Path state machine and route triggers implemented in `src/gameplay/corruptionSystem.js` and integrated systems.
     - Path-specific modifiers, event hooks, and ending deltas defined as data contracts.
     - Deterministic scenario tests cover path entry, path lock-in, and path-switch prevention rules.
   - PR evidence:
     - Design note documenting route rules and tradeoffs.
     - Test output for deterministic path checks.
     - Short gameplay capture for one demonic run and one ascetic run.

2. **S11-02: Boss Expansion Pack (10 bosses)**
   - Gameplay impact: expands mastery checks with stronger phase identity, forcing build adaptation and route-aware target prioritization.
   - Acceptance gates:
     - 10 bosses implemented as deterministic phase state machines.
     - Every boss has telegraph/read/recover windows and at least one route-reactive behavior.
     - Replay contract checks cover all phase transitions and victory conditions.
   - PR evidence:
     - Boss design matrix (identity, hazards, route interactions).
     - `scripts/bench/phase3_boss_statemachine_check.js` and replay outputs for new bosses.
     - Video clips for intro, phase transitions, and failure states.

3. **S11-03: Enemy Roster Expansion (20 enemies)**
   - Gameplay impact: increases encounter variety and composition pressure while preserving readability under stress.
   - Acceptance gates:
     - 20 enemies implemented across behavior contracts (chase/charge/kite/summon/zone/support/disruptor).
     - Telegraph windows and damage attribution pass readability checks.
     - Encounter composition remains valid with pressure mix constraints.
   - PR evidence:
     - Enemy contract table with archetype and telegraph timing.
     - `scripts/bench/phase2_enemy_contracts_check.js` output.
     - Overlay screenshots showing stress-scene readability.

4. **S11-04: Itemization Expansion (50 items)**
   - Gameplay impact: unlocks broader build expression and path-specific archetypes without dead-build outcomes.
   - Acceptance gates:
     - 50 new items added with taxonomy alignment and schema validation.
     - Synergy matrix updated for pair/triple/tag interactions; anti-synergy safeguards retained.
     - Simulation demonstrates dead-build rate at or below existing thresholds.
   - PR evidence:
     - Item catalog with category tags and path affinity.
     - `scripts/bench/phase4_item_synergy_check.js` and simulation summaries.
     - Balance telemetry deltas vs previous baseline.

5. **S11-05: New Systems Pack (5 mechanics/systems)**
   - Gameplay impact: adds mid-run decision depth and pacing variation while reinforcing horror cohesion.
   - Acceptance gates:
     - Five systems implemented and documented with deterministic contracts.
     - Each system integrates with at least two existing modules (combat/generation/corruption/UI/audio).
     - New systems include fail-safe validation scripts or tests.
   - PR evidence:
     - System specs and integration diagrams.
     - Test/bench command output proving contract validity.
     - Before/after pacing telemetry where relevant.

6. **S11-06: Direction Shifts Pack (5 major shifts)**
   - Gameplay impact: improves readability, tone depth, and long-session comfort without violating horror identity.
   - Acceptance gates:
     - Five approved shifts implemented with rationale and rollback strategy.
     - UI/layout/audio/visual changes pass readability and comfort checks.
     - Any architecture-impacting shift is documented in `docs/decisions/`.
   - PR evidence:
     - Rationale documents per shift.
     - Before/after screenshots and audio comparisons.
     - ADRs for refactor-heavy shifts.

7. **S11-07: Polish Pack (10 targets)**
   - Gameplay impact: raises perceived quality through clearer telegraphs, smoother feedback, and better frame pacing consistency.
   - Acceptance gates:
     - 10 polish targets implemented with measurable criteria.
     - Targets include combat readability, animation smoothness, and perf spike reduction.
     - No regressions in deterministic checks.
   - PR evidence:
     - Polish checklist with measured metrics.
     - Bench output (`scripts/bench/phase8_runtime_profile.js`, relevant phase checks).
     - Capture set showing improved feedback moments.

8. **S11-08: Candidate Release + Compliance Bundle**
   - Gameplay impact: converts expanded content into ship-ready candidates with explicit rollback and legal safety.
   - Acceptance gates:
     - Alpha/Beta/1.0 candidate gates defined and met.
     - License audit and notice updates complete.
     - QA sign-off and telemetry-backed rebalance complete.
   - PR evidence:
     - Candidate checklists, QA reports, and telemetry summary.
     - `npm run validate` and compliance command outputs.
     - Updated `THIRD_PARTY_NOTICES.md` and release notes.

### Phase 11 Sub-Phases (Balanced Execution)

#### Phase 11A - Route Foundation + Systems Contracts

##### 11A Scope

- Implement S11-01 (path identity) foundation.
- Implement first 2 of 5 systems from S11-05.
- Add content schemas/contracts for path-affinity tagging (boss/enemy/item).

##### 11A Exit Criteria

- Path rules are deterministic and replay-safe.
- Route-aware data contracts validate in CI.

##### 11A PR Evidence Requirements

- Deterministic route tests and replay logs.
- Schema validation output.
- Design note for path tradeoffs and anti-exploit rules.

##### 11A Agent Prompt

"For Phase 11A (Route Foundation + Systems Contracts): act as Planner + Gameplay + Engine collaborators and implement the demonic/ascetic route foundation in `src/gameplay` with deterministic route-entry and lock-in rules tied to confession/relic/corruption triggers. Enforce schema-backed path-affinity tagging for bosses/enemies/items, preserve replay determinism, and capture evidence with deterministic route tests, replay logs, and schema-validation output. Execute the approved 11A scope end-to-end in full before handoff; do not stop at partial implementation."

#### Phase 11B - Combat Content Expansion (Bosses + Enemies)

##### 11B Scope

- Deliver 10 bosses (S11-02) and 20 enemies (S11-03).
- Integrate route-reactive abilities and telegraph standards.

##### 11B Exit Criteria

- Boss and enemy roster reaches target counts.
- Readability and encounter composition contracts pass under stress.

##### 11B PR Evidence Requirements

- Boss/enemy matrix docs.
- Bench outputs for boss/enemy checks.
- Debug overlay captures from high-density encounters.

##### 11B Agent Prompt

"For Phase 11B (Combat Content Expansion): act as Gameplay + QA agents and deliver the 10-boss/20-enemy expansion using deterministic behavior and boss phase-state contracts in `src/gameplay`. Preserve telegraph/read/recover readability and encounter pressure-mix guarantees under stress, and require reproducible `scripts/bench` outputs plus overlay captures for validation. Execute the approved 11B scope end-to-end in full before handoff; do not stop at partial implementation."

#### Phase 11C - Item and Build Ecosystem Expansion

##### 11C Scope

- Deliver 50-item pack (S11-04).
- Complete remaining 3 systems from S11-05 where item-linked.
- Extend synergy simulation and balance instrumentation.

##### 11C Exit Criteria

- Item roster and synergy matrix complete.
- Dead-build and exploit checks remain within policy thresholds.

##### 11C PR Evidence Requirements

- Item catalog and synergy map.
- Item simulation output and telemetry diff reports.
- Regression-free validation logs.

##### 11C Agent Prompt

"For Phase 11C (Item and Build Ecosystem Expansion): act as Gameplay + QA + Balance agents and implement the 50-item expansion with taxonomy consistency, path-affinity hooks, and synergy matrix updates in deterministic `src/` systems. Validate dead-build prevention, anti-synergy safeguards, and balance floors via simulation/telemetry evidence, and block sign-off on any regression in existing deterministic checks. Execute the approved 11C scope end-to-end in full before handoff; do not stop at partial implementation."

#### Phase 11D - Direction Shift Implementation

##### 11D Scope

- Implement 5 major direction shifts (S11-06) including moderate refactors where justified.
- Ensure AV/UI changes preserve horror cohesion and readability contracts.

##### 11D Exit Criteria

- All direction shifts pass rationale, accessibility, and readability reviews.
- Architecture-impacting changes are ADR-documented.

##### 11D PR Evidence Requirements

- Before/after screenshots and short clips.
- Audio A/B snapshots and cue priority notes.
- ADRs and rollback notes.

##### 11D Agent Prompt

"For Phase 11D (Direction Shift Implementation): act as UX + Audio + Art Direction + Engine collaborators and execute the 5 approved direction shifts, allowing moderate refactors when they improve readability and horror cohesion. Keep deterministic simulation boundaries intact, produce before/after AV evidence, and document architecture-impacting refactors in `docs/decisions/*.md` with rollback notes. Execute the approved 11D scope end-to-end in full before handoff; do not stop at partial implementation."

#### Phase 11E - Polish, Performance, and QA Hardening

##### 11E Scope

- Execute 10 polish targets (S11-07).
- Run performance and long-session stability checks.
- Finalize telemetry dashboards and triage thresholds.

##### 11E Exit Criteria

- Polish targets complete with measurable wins.
- Performance and determinism gates pass on expanded content.

##### 11E PR Evidence Requirements

- Perf benchmark command output and summary.
- QA matrix results for controls/resolutions/browser/accessibility.
- Deterministic and save-compat outputs.

##### 11E Agent Prompt

"For Phase 11E (Polish, Performance, and QA Hardening): act as Performance + QA + Engine agents and execute the 10 polish targets with measurable wins across readability, responsiveness, and frame pacing. Use benchmark/stress workflows for evidence, keep save/determinism contracts green, and reject speculative polish changes that do not produce measurable quality or stability gains. Execute the approved 11E scope end-to-end in full before handoff; do not stop at partial implementation."

#### Phase 11F - Release Candidates and Compliance

##### 11F Scope

- Execute S11-08 candidate bundle.
- Group release gates by candidate:
  - Alpha candidate: one floor slice with one route-complete boss set and full core loop validation.
  - Beta candidate: full floor progression, route parity checks, save/options/accessibility locked.
  - 1.0 candidate: content complete, QA sign-off, telemetry-informed rebalance, docs and notices final.

##### 11F Exit Criteria

- Candidate checklists complete with no unresolved P0/P1 blockers.
- Compliance evidence complete for dependencies and assets.

##### 11F PR Evidence Requirements

- Candidate gate checklist artifacts.
- QA and telemetry bundles.
- Final compliance logs and notice updates.

##### 11F Agent Prompt

"For Phase 11F (Release Candidates and Compliance): act as Planner + Compliance + QA agents and operationalize alpha/beta/1.0 candidate gates with explicit rollback criteria, blocker thresholds, and evidence bundles. Validate release readiness against `README.md` direction and `SPEC.md` licensing/technical policy constraints, require telemetry-backed QA sign-off before advancement, and ensure final notices/compliance artifacts are complete. Execute the approved 11F scope end-to-end in full before handoff; do not stop at partial implementation."

---

## Current Progress Snapshot

- [x] Initial playable prototype exists.
- [x] Baseline dungeon/combat/item/corruption loop implemented.
- [x] Initial design/spec/memory documentation present.
- [x] Phase 0 governance/policy constraints and acceptance gates completed.
- [x] Phase 1 core feel hardening and initial `src/` runtime foundation completed.
- [x] Phase 3 boss phase state machines, hazards, and replay completed.
- [x] Phase 4 item taxonomy, synergy matrix, dead-build safeguards, and simulation completed.
- [x] Phase 5 corruption identity, endings, and meta-progression completed.
- [x] Phase 6 dungeon generation constraints, validators, pacing, and economy guarantees completed.
- [x] Phase 2.5 entity visual identity and animation baseline completed.
- [x] Phase 7 architecture/toolchain maturation completed.
- [x] Phase 10 QA/balance telemetry and gate automation established.
- [ ] Phase 8/9/11 implementation and release candidate execution pending.
