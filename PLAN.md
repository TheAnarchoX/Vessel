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

### Agent Prompt (Phase 0)
"Audit all docs for scope consistency. Enforce open-stack policy (not single-file/vanilla-only) and free-use/free-deploy licensing constraints. Produce a clean dependency policy and acceptance checklist."

---

## Phase 1 — Core Feel Prototype Hardening

### Goal
Make minute-1 gameplay feel excellent before broad content expansion.

### Scope
- [ ] Add acceleration/friction movement tuning profile options.
- [ ] Add coyote-style input grace for shot cadence consistency.
- [ ] Add hit-stop microfreeze (30–70ms) for impactful hits.
- [ ] Add optional aim-buffer queue (last directional shot intent).
- [ ] Expand tear variants (pierce, split, chain, DOT, aura, siphon).

### Exit Criteria
- Input and attack feedback are consistently responsive and readable.
- Feel regressions are measurable with baseline metrics.

### Agent Prompt (Phase 1)
"Tune movement/shooting responsiveness and impact feedback first. Instrument input latency and cadence consistency; reject changes that feel better subjectively but regress objective frame/input metrics."

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
"Implement enemies with explicit telegraph windows and test compositions under stress scenarios. Use AI overlays and logs to verify behavior contracts."

---

## Phase 3 — Bosses and Phase-State Combat

### Goal
Deliver memorable bosses with clear escalation and replayable skill tests.

### Scope
- [ ] Convert boss scripts into explicit phase state machines.
- [ ] Add phase ramps via health thresholds and timers.
- [ ] Add boss-room hazards (pits, sigils, collapsing zones).
- [ ] Add cinematic intro/outro windows with deliberate input locks.
- [ ] Add boss replay mode for tuning.

### Exit Criteria
- Boss phases are distinct, understandable, and escalating.
- Boss outcomes correlate with mastery, not ambiguity.

### Agent Prompt (Phase 3)
"Build deterministic boss phase state machines and validate each transition path. Ensure telegraphs, hazard readability, and damage accountability in every phase."

---

## Phase 4 — Itemization, Synergy, and Build Diversity

### Goal
Enable wide build expression without dead or broken outcomes.

### Scope
- [ ] Define item taxonomy: offense, defense, utility, economy, corruption-tech.
- [ ] Add synergy matrix for pairs/triples with explicit emergent behavior.
- [ ] Add anti-synergy safeguards to avoid dead builds.
- [ ] Add run-history item tracker for balancing.
- [ ] Build deterministic seed simulation for item fairness.

### Exit Criteria
- Multiple viable build archetypes per run.
- Item outcomes are exciting but controllable for balance.

### Agent Prompt (Phase 4)
"Implement item taxonomy + synergy matrix with simulation-driven balancing. Detect and prevent no-op rewards and dead synergies before content expansion."

---

## Phase 5 — Corruption, Narrative, and Progression Identity

### Goal
Tie systems and story to spiritual erosion, not generic power fantasy.

### Scope
- [ ] Make corruption affect mechanics, visuals, audio, and events.
- [ ] Add context-aware whisper system (boss, low soul, high corruption).
- [ ] Add narrative beats after each floor.
- [ ] Add conditional endings (corruption + choices + relic path).
- [ ] Add unlock meta-progression linked to discovered endings.

### Exit Criteria
- Corruption feels mechanically meaningful and narratively present.
- Endings reflect player tradeoffs.

### Agent Prompt (Phase 5)
"Connect corruption to gameplay, AV feedback, and narrative branches. Validate that progression and endings feel earned by player decisions."

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
"Implement generation constraints and validator passes first, then tune pacing metrics using large seeded batches. Reject seeds that violate reachability/economy constraints."

---

## Phase 7 — Engine Architecture and Toolchain Maturation

### Goal
Migrate from prototype shape to production-ready architecture.

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

### Exit Criteria
- Architecture supports fast iteration without systemic fragility.
- Tooling catches structural/content regressions early.

### Agent Prompt (Phase 7)
"Refactor into strict module boundaries with deterministic simulation and validation tooling. Prioritize debuggability, replayability, and CI-enforced quality gates over short-term velocity."

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
"Profile before optimizing. Eliminate hotspot allocations, stabilize frame pacing, and keep rendering readability-first under heavy combat load."

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
"Prioritize HUD readability and accessibility toggles that preserve game tone. Validate audio/visual alert hierarchy under high action density."

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
"Build repeatable QA and balancing loops with deterministic tests + simulation data. Require measurable evidence for balance and stability changes."

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
"Prepare staged release candidates with QA evidence, telemetry-backed balance, and full license/compliance verification for free deployment."

---

## Current Progress Snapshot

- [x] Initial playable prototype exists.
- [x] Baseline dungeon/combat/item/corruption loop implemented.
- [x] Initial design/spec/memory documentation present.
- [ ] Architecture modernization (modularization/tooling) pending.
- [ ] Quality, performance, and production pipelines pending.
