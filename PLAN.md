# VESSEL Master Plan (Quality-First Work Log + Execution Roadmap)

This plan intentionally aims for **production-grade quality** across design, gameplay feel, architecture, tooling, performance, stability, and long-term maintainability.

---

## 0) Product Vision

Create a grim, emotionally coherent top-down roguelite where every system reinforces:

- dread,
- attrition,
- moral compromise,
- escalating possession.

Core principle: **moment-to-moment feel first**, then breadth.

---

## 1) Quality Pillars (Non-Negotiable)

1. **Responsiveness**
   - Input-to-action latency target: < 50ms perceived delay.
   - Movement and shooting must feel immediate and deterministic.

2. **Combat Clarity Under Stress**
   - Every enemy attack telegraphed and readable within 150–400ms windows.
   - Damage source attribution always clear (projectile, contact, AoE, trap).

3. **Run Variety with Structural Reliability**
   - Procedural generation should generate distinct tactical situations every run.
   - No unwinnable seeds.

4. **Performance Stability**
   - 60fps target on mid-range hardware.
   - Frame spikes > 22ms should be rare and explainable.

5. **Horror Cohesion**
   - Visual, audio, UI, text, and progression all reinforce a single oppressive tone.
   - Avoid tonal drift.

---

## 2) Design Backlog (By Discipline)

### 2.1 Core Combat Feel
- [ ] Add acceleration/friction movement tuning profile options.
- [ ] Add coyote-style “input grace” for shot cadence consistency.
- [ ] Add hit-stop microfreeze (30–70ms) for impactful hits.
- [ ] Add optional aim-buffer queue (last directional shot intent).
- [ ] Expand tear variants (pierce, split, chain, DOT, aura, siphon).

### 2.2 Enemy Design
- [ ] Formalize enemy behavior model: chase / charge / kite / summon / zone denial.
- [ ] Add explicit telegraph phases per enemy attack.
- [ ] Build encounter composition rules (mixed pressures: melee + ranged + area control).
- [ ] Introduce elite modifiers per floor (faster, armored, cursed, berserk).
- [ ] Add AI state debugging overlays for iteration mode.

### 2.3 Boss Design
- [ ] Convert boss scripts into explicit phase state machines.
- [ ] Add difficulty ramp per phase via health thresholds + timers.
- [ ] Add boss-specific room hazards (pits, sigils, collapsing zones).
- [ ] Add cinematic intro/outro micro-sequences with input lock windows.
- [ ] Add boss replay mode for tuning.

### 2.4 Items, Builds, and Synergy
- [ ] Define item taxonomy: offensive, defensive, utility, economy, corruption tech.
- [ ] Add synergy matrix (item pairs/triples with explicit emergent behaviors).
- [ ] Add anti-synergy safeguards to avoid dead builds.
- [ ] Add run-history item tracker for balancing.
- [ ] Build deterministic seed simulation for item fairness tests.

### 2.5 Corruption & Narrative Systems
- [ ] Make corruption affect mechanics, audiovisual identity, and room events.
- [ ] Add whisper system with context-aware lines (boss, low soul, high corruption).
- [ ] Add narrative beats after each floor clear.
- [ ] Add conditional endings based on corruption + key choices + relic path.
- [ ] Add unlock meta-progression tied to endings discovered.

### 2.6 Room & Dungeon Generation
- [ ] Expand generator to support weighted templates and lock-key progression.
- [ ] Add spatial pacing rules (intensity valleys/peaks across floor graph).
- [ ] Guarantee minimum economy/recovery opportunities per floor.
- [ ] Add path entropy metrics to prevent linear monotony.
- [ ] Add generator validator pass with fail-fast re-roll.

### 2.7 UX/UI/HUD
- [ ] Redesign HUD with scalable layout regions and accessibility options.
- [ ] Add iconography pass for relic categories and status effects.
- [ ] Add visual priority hierarchy for critical alerts.
- [ ] Add map readability modes (minimal / tactical / full reveal).
- [ ] Add tutorialization layer that can be disabled.

### 2.8 Audio
- [ ] Build layered adaptive soundtrack states (explore, combat, near death, boss).
- [ ] Add dynamic reverb/low-pass states based on corruption tier.
- [ ] Add audio bus architecture (music/sfx/ui/voice/master) with volume controls.
- [ ] Add audio ducking for key events (boss cues, item pickup stingers).
- [ ] Add silent mode / reduced intensity mode.

### 2.9 Visual Rendering
- [ ] Add lighting pass for mood and readability separation.
- [ ] Add animated shaders/post effects where cost-effective.
- [ ] Add decal system (blood, residue, corruption growth) with pooling.
- [ ] Add camera module (shake, recoil, impact zoom, dead-zone controls).
- [ ] Add palette scripting per floor + dynamic corruption tinting.

---

## 3) Engine & Architecture Plan

### 3.1 Codebase Structure
- [ ] Migrate to modular architecture (core, gameplay, content, rendering, audio, ui).
- [ ] Separate data definitions (items/enemies/floors) from behavior logic.
- [ ] Add schema validation for content files.
- [ ] Introduce dependency boundaries to avoid cyclic coupling.

### 3.2 Simulation Model
- [ ] Move to fixed-step simulation (`dt` accumulator) for deterministic gameplay.
- [ ] Keep rendering interpolated for smoothness.
- [ ] Record/replay pipeline for deterministic bug repro.
- [ ] Add event bus for combat/event telemetry.

### 3.3 State Management
- [ ] Formalize game states with transition contracts.
- [ ] Add save/resume snapshot format versioning.
- [ ] Add migration handlers for content format changes.

### 3.4 Tooling
- [ ] Introduce linting, formatting, and type checking.
- [ ] Add pre-commit hooks and CI gates.
- [ ] Add content validation CLI and balance simulation CLI.
- [ ] Add performance benchmark command.

### 3.5 Tech Stack Freedom + Free-Use Guardrails
- [ ] Select stack based on quality/performance needs, not ideological constraints.
- [ ] Keep all critical dependencies free to use and free to deploy.
- [ ] Approve only dependencies with permissive or business-safe licenses.
- [ ] Add automated dependency/license auditing in CI.
- [ ] Maintain a `THIRD_PARTY_NOTICES` or license inventory document.

---

## 4) Performance & Optimization Plan

### 4.1 Runtime Targets
- [ ] 60fps median; < 5% frames over 20ms in normal play.
- [ ] Memory stability over 30-minute run.
- [ ] No unbounded arrays or retained detached objects.

### 4.2 Optimization Tactics
- [ ] Object pooling for projectiles/particles/temp vectors.
- [ ] Spatial partitioning for collision broadphase.
- [ ] Batched draw calls and minimized state changes.
- [ ] Avoid per-frame allocations in hot loops.
- [ ] Lazy update for off-screen/non-critical entities.

### 4.3 Instrumentation
- [ ] Build in-game perf HUD (fps, frame ms, entity counts, draw calls).
- [ ] Add long-session stress test mode.
- [ ] Add telemetry sampling for frame spikes and GC stalls.

---

## 5) Balancing & Analytics

- [ ] Define baseline run duration target (20–30 min).
- [ ] Build automated combat simulator for TTK and survivability curves.
- [ ] Track per-floor death causes and win rates.
- [ ] Tune drop rates, soul economy, and corruption trade-off tension.
- [ ] Use heatmaps for player movement and death density.

---

## 6) Stability, QA, and Testing

### 6.1 Automated Tests
- [ ] Generator tests (reachability, room constraints, role placement).
- [ ] Combat math tests (damage, invulnerability, resistances).
- [ ] Item effect tests and stacking edge cases.
- [ ] Save/load compatibility tests.
- [ ] Determinism tests for seeded runs.

### 6.2 Manual QA Matrices
- [ ] Input device matrix.
- [ ] Resolution/scaling matrix.
- [ ] Browser compatibility matrix.
- [ ] Accessibility checks (contrast, motion reduction options).

### 6.3 Bug Triage Rules
- [ ] Crash / progression block = P0.
- [ ] Input or combat feel regression = P1.
- [ ] Visual/audio polish bug = P2 unless readability impact.

---

## 7) Accessibility & Options

- [ ] Rebindable controls.
- [ ] Colorblind-safe corruption indicator mode.
- [ ] Screen shake intensity slider / disable toggle.
- [ ] Flash reduction toggle.
- [ ] Subtitles and text scaling options.
- [ ] Audio intensity profile selector.

---

## 8) Content Production Pipeline

- [ ] Content authoring templates for enemies/items/rooms/events.
- [ ] Flavor text review pass for tone consistency.
- [ ] Build verification checks for missing assets/content IDs.
- [ ] Localization-ready text extraction strategy.

---

## 9) Release Strategy

### Alpha
- [ ] One complete floor with polished feel and one boss.
- [ ] Core systems validated (combat, rooms, items, HUD, corruption).

### Beta
- [ ] All floors playable end-to-end.
- [ ] Performance and balance pass complete.
- [ ] Save/load + options + accessibility in place.

### 1.0
- [ ] Content complete.
- [ ] QA sign-off.
- [ ] Telemetry-informed final rebalance.
- [ ] Documentation and contribution guide complete.

---

## 10) Legal/License Readiness Checklist

- [ ] Confirm engine/framework/runtime license allows free distribution.
- [ ] Confirm art/audio/font assets are original, licensed, or public domain.
- [ ] Confirm no copyleft contamination in shipping bundle unless explicitly intended.
- [ ] Confirm attribution obligations are satisfied in credits or notices.
- [ ] Confirm deployment platform terms are compatible with selected dependencies.

---

## 11) Current Progress Snapshot

- [x] Initial playable prototype exists.
- [x] Baseline dungeon/combat/item/corruption loop implemented.
- [x] Initial design and memory documentation present.
- [ ] Architecture modernization (modularization/tooling) pending.
- [ ] Quality, performance, and production pipelines pending.
