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
- [ ] Expand generator with weighted templates and lock-key progression.
- [ ] Add pacing rules (intensity valleys/peaks across floor graph).
- [ ] Guarantee minimum economy/recovery opportunities per floor.
- [ ] Add path entropy metrics to prevent linear monotony.
- [ ] Add generator validator with fail-fast reroll.

### Exit Criteria
- No unwinnable seeds.
- Floor pacing naturally alternates pressure and recovery.

### Agent Prompt (Phase 6)
"For Phase 6 (Dungeon Generation and Room Pacing): act as Engine + QA agents and implement generator constraints/validators in `src/` before pacing polish. Use `SPEC.md` `Dungeon Generation Philosophy` plus room rules from `Core Gameplay Structure` as hard requirements, keep seeded validation utilities in `scripts/bench/` where applicable, and enforce reachability/economy guarantees. Reject failing seeds and include reproducible seed evidence in PR artifacts."

---

## Phase 7 — Engine Architecture and Toolchain Maturation

### Goal
Mature and enforce the early engine foundation into production-ready architecture/tooling.

### Scope
- [ ] Modular structure: core, gameplay, content, rendering, audio, UI.
- [ ] Separate data definitions from behavior logic.
- [ ] Add schema validation for content files.
- [ ] Enforce dependency boundaries and avoid cyclic coupling.
- [ ] Fixed-step simulation with interpolated rendering.
- [ ] Record/replay pipeline for deterministic repro.
- [ ] Event bus for combat/event telemetry.
- [ ] Formal game-state transition contracts.
- [ ] Save/resume versioning + migrations.
- [ ] Add linting, formatting, type checks, pre-commit hooks, CI gates.
- [ ] Add content validation CLI, balance simulation CLI, benchmark command.
- [ ] Add dependency/license auditing and THIRD_PARTY_NOTICES tracking.
- [ ] Document architecture decisions as ADRs in `docs/decisions` (Mermaid diagrams where useful).

### Exit Criteria
- Architecture supports fast iteration without systemic fragility.
- Tooling catches structural/content regressions early.

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

## Phase 11 — Release Management and Compliance

### Goal
Ship in controlled stages with legal confidence and operational readiness.

### Scope
- Alpha:
  - [ ] One polished floor + one boss.
  - [ ] Core systems validated (combat, rooms, items, HUD, corruption).
- Beta:
  - [ ] Full floor progression playable end-to-end.
  - [ ] Performance and balance pass complete.
  - [ ] Save/load + options + accessibility in place.
- 1.0:
  - [ ] Content complete.
  - [ ] QA sign-off.
  - [ ] Telemetry-informed final rebalance.
  - [ ] Documentation and contribution guide complete.
- Legal/license readiness:
  - [ ] Engine/framework/runtime allows free distribution.
  - [ ] Art/audio/font assets are original/licensed/public-domain.
  - [ ] No unintended copyleft contamination.
  - [ ] Attribution obligations satisfied.
  - [ ] Deployment platform terms compatible with dependencies.

### Exit Criteria
- Release artifacts, docs, and compliance checks are complete.
- Deployment can proceed without licensing or quality blockers.

### Agent Prompt (Phase 11)
"For Phase 11 (Release Management and Compliance): act as Planner + Compliance + QA agents and prepare alpha/beta/1.0 candidates with explicit quality gates, rollback criteria, and evidence bundles for the modularized `src/`-first architecture. Validate release readiness against `README.md` direction plus `SPEC.md` `Licensing & Deployment Policy (Free-Use Requirement)` and `Technical Direction (Revised)`, and ensure `MEMORY.md`/notices reflect final compliance decisions. Require QA outputs, telemetry-backed balance validation, and deployment-readiness checks before approval."

---

## Current Progress Snapshot

- [x] Initial playable prototype exists.
- [x] Baseline dungeon/combat/item/corruption loop implemented.
- [x] Initial design/spec/memory documentation present.
- [x] Phase 0 governance/policy constraints and acceptance gates completed.
- [x] Phase 1 core feel hardening and initial `src/` runtime foundation completed.
- [x] Phase 3 boss phase state machines, hazards, and replay completed.
- [x] Phase 4 item taxonomy, synergy matrix, dead-build safeguards, and simulation completed.
- [ ] Phase 2.5 entity visual identity and animation baseline pending.
- [ ] Architecture/toolchain maturation beyond initial foundation (Phase 7 scope) pending.
- [ ] Quality, performance, and production pipelines pending.
