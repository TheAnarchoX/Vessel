# MEMORY

## Agentic Memory Notes

- Project direction is no longer restricted to single-file or vanilla-only implementation.
- Tech stack can evolve (including engines/frameworks) if dependencies remain free to build with and free to deploy.
- Master roadmap is now phase-driven (serial-first execution) with per-phase agent prompts in `PLAN.md`.
- Repository includes `AGENTS.md` with role guidance and a requirement to include screenshots for UI changes in PRs.
- PR evidence policy now requires non-UI validation artifacts, benchmark output for performance work, and ADRs under `docs/decisions` (Mermaid encouraged).
- Rendering target is Canvas `960x540` with crisp pixel rendering (`imageSmoothingEnabled = false`).
- Core loop is Isaac-like: title → floor progression with rooms → bosses → ending variants.
- Input is keyboard-first (WASD movement, arrows shoot, E interact, Tab overlay).
- The tone and palette must stay horror-forward, using near-black + crimson + bone/yellow accents.
- Procedural structure is room-grid based, not fixed handcrafted maps.

## Phase 4 Balancing Assumptions

### Item Taxonomy

- 25 items across 5 categories: offense (9), defense (5), utility (4), economy (3), corruption_tech (4).
- 3 boss-specific drops (shepherd, pit, choir) — not in general pool.
- Item definitions are data-driven in `src/gameplay/itemSystem.js` (no closures/apply functions).

### Balance Floors (Dead-Build Prevention)

- MIN_EFFECTIVE_DPS: 1.0 (damage × tears) — below this, rooms are unwinnable.
- MIN_SOUL_FLOOR: 2 (minimum maxSoul to survive at least 2 hits).
- MAX_DAMAGE_REDUCTION: 0.75 (cap to prevent invulnerability).
- MIN_DAMAGE: 0.5 (hard floor on tear damage after item effects).
- MIN_TEARS: 0.5 (hard floor on fire rate after item effects).
- DPS check accounts for chain/split multipliers (+30% per level) and corruption scaling (+20%/+12% at conservative 40% corruption estimate).

### Synergy Design Rules

- 14 pair synergies (2-item combos) and 7 triple synergies (3-item emergent combos).
- 100% of pool items participate in at least one synergy.
- Tag-based scaling bonuses activate at 3+ items sharing a tag (tear/unholy/holy/body/soul).
- Corruption-tech items scale with corruption level: corruptionDamageScale grants up to +50% damage at 100 corruption; corruptionTearBonus grants up to +30% tears at 100 corruption.

### Item Offering Rules

- Altar offers 2 items (category-diverse, no duplicates, excludes already-held).
- Reliquary offers 1 item (hidden until revealed).
- Boss drops are fixed per boss and applied automatically on kill.
- Offerings use deterministic RNG seeded per run for reproducibility.

### Simulation Validation (seed=42, 1000 runs, 6 items/run)

- 0 dead builds out of 1000.
- Item frequency skew: < 1.5x (min/max pick ratio).
- All 25 items appear at least once across simulated runs.
- Synergy hit rate: every defined synergy fires in simulation.

## Phase 5 Corruption System Assumptions

### Corruption Tiers

- 4 tiers: Unmarked (0–24), Tainted (25–49), Corrupted (50–74), Vessel Consumed (75–100).
- Each tier has distinct mechanical effects, visual palettes, and audio parameters.
- Tier transitions are tracked and trigger whisper/audio cues.

### Mechanical Effects by Tier

- Pure: no modifiers (baseline).
- Tainted: +10% damage, +5% tear rate, no soul decay.
- Corrupt: +25% damage, +10% tear rate, 0.02 soul/sec decay, 10% dodge window reduction.
- Consumed: +50% damage, +20% tear rate, 0.05 soul/sec decay, 20% dodge window reduction.
- Power scales with corruption, but soul decay creates attrition pressure—not power fantasy.

### Corruption Sources

- Item pickups: item-defined delta (varies per item, see Phase 4 data).
- Altar sacrifice: +8, confession yield: +12, confession resist: −5.
- Boss kill: +5, floor descent: +3, soul depletion: +2.
- Holy relics: −3 to −8. Dark relics: +12 to +18.

### Ending Conditions

- 5 endings: Liberation (low corruption, 3+ resists), Martyrdom (mid-low, 3+ boss kills, 2+ resists), Communion (mid-high, mixed confessions), Consumed (high corruption), Vessel Ascendant (very high, 3+ yields, 2+ dark relics).
- Endings are evaluated by priority; consumed is fallback.
- Each ending grants a meta-unlock affecting future runs.

### Whisper System

- Context pools: high_corruption (6 lines), low_soul (4), boss_approach (4), floor_descent (4).
- Tier transition whispers: 1 per tier boundary crossed.
- Confession whispers: 1 per resist/yield choice.
- Selection uses deterministic RNG for reproducibility.

### Floor Narratives

- 4 floors × 4 tiers = 16 narrative text variants.
- Text adapts to current corruption tier at floor entry.
- Horror tone maintained across all variants; no comedy.

### Relics

- 3 holy relics (saints_finger, blessed_water, prophets_eye): corruption −3 to −8.
- 3 dark relics (bone_idol, black_scripture, worm_heart): corruption +12 to +18.
- Relic acquisition is tracked for ending evaluation.

### Simulation Validation (seed=42, 500 runs)

- All 5 endings must be reachable across the scenario space.
- Tier transitions fire for tainted/corrupt/consumed.
- Soul decay triggers in corrupt and consumed tiers.
- Whispers and narratives fire in every simulated run.

## Phase 6 Dungeon Generation Assumptions

### Grid Layout

- 5×5 grid, start fixed at center (2,2), boss at edge with manhattan distance ≥ 3.
- Altar always adjacent to start (distance 1).
- Guaranteed path carved from start to boss before expansion.

### Floor Configurations

- Floor 0 (Nave): 6–8 rooms, 2+ combat, no confession, 1+ recovery, no lock-key.
- Floor 1 (Catacombs): 7–10 rooms, 3+ combat, confession required, 2+ recovery, no lock-key.
- Floor 2 (Ossuary): 8–12 rooms, 4+ combat, confession required, 2+ recovery, lock-key enabled.
- Floor 3 (Pit): 5–7 rooms, 2+ combat, confession required, 1+ recovery, lock-key enabled.

### Room Types

- start, boss, combat, altar, confession, reliquary, rest.
- "rest" is a new recovery room type (economy guarantee filler) — not yet visually/mechanically implemented in prototype shell.
- Max per dungeon: 1 confession, 2 reliquary, 2 rest.

### Weighted Role Assignment

- Unassigned combat rooms are probabilistically reassigned using per-floor weight tables.
- Mandatory roles (confession, reliquary, rest for economy) are placed first; weights only apply to remaining surplus combat slots.

### Lock-Key Progression

- Active on floors 2 and 3.
- Locked room placed adjacent to boss; key room placed in first half of BFS traversal from start.
- Key must be reachable without passing through the locked room.

### Validation Constraints

- All rooms reachable from start (BFS, ignoring locks).
- Economy: recovery rooms ≥ floor minimum.
- Path entropy ≥ 0.05 for 6+ room dungeons (rejects purely linear corridors).
- Pacing: at least one room with intensity ≤ 3 between start and boss.
- Lock-key: key reachable without crossing lock.

### Pacing Intensity Scores

- start: 0, altar: 1, rest: 1, confession: 2, reliquary: 3, combat: 6, boss: 10.

### Fail-Fast Reroll

- Validator rejects invalid seeds; generator increments seed and retries (max 100 attempts).
- In 4000-seed sweep (1000 seeds × 4 floors), max attempts observed: 60, typical: 1–3.

## Phase 10 QA/Balancing Readiness Assumptions

### Operationalized Telemetry Gates

- Phase 10 readiness is enforced by `node scripts/bench/phase10_qa_balance_check.js` plus `node --test tests/phase10/qa_balance_loops.test.js`.
- Bench run writes evidence artifacts at `docs/evidence/phase10_qa_balance_telemetry.json` and `docs/evidence/phase10_qa_balance_telemetry.md`.
- Telemetry is anchored to `SPEC.md` sections `Combat Philosophy`, `Dungeon Generation Philosophy`, and `Engineering Philosophy`.

### Gate Thresholds

- Combat baseline survivability floor: >= 2.8s for baseline player assumptions.
- Encounter pressure mix contract must remain valid (melee + ranged + area).
- Generation sweep must have 0 unwinnable seeds and remain within `MAX_REROLL_ATTEMPTS`.
- Item stacking must preserve DR cap (<= 0.75), corruption bounds [0,100], and dead-build rate <= 8% in duplicate-stacking stress builds.
- Determinism requires zero dungeon signature mismatches and deterministic boss replay sequence for identical input logs.
- Save compatibility requires migration to `SAVE_VERSION`, idempotent re-migration, and preservation of discovered endings.

### Sign-off Policy

- Balance/stability changes require updated Phase 10 telemetry artifacts in PR evidence before approval.

## Pre-Phase 11 Planning Assumptions

### Route Identity Direction

- Phase 11 expansion is planned around two explicit corruption routes:
  - Demonic path: high-corruption, high-volatility power spikes, aggressive horror AV treatment.
  - Ascetic path: low-corruption, disciplined survivability/control, restrained ritual AV treatment.
- Route commitment is intended to be replayability-positive and ending-impactful, not cosmetic.

### Ideation Output Counts

- Planning targets captured in `PLAN.md` and `BACKLOG.md`:
  - 10 bosses
  - 20 enemy types
  - 50 items
  - 5 mechanics/systems
  - 10 polish targets
  - 5 major direction shifts

### Evidence and Acceptance Expectations

- Every Phase 11 scope item should include explicit acceptance gates (design contract, implementation target, tests/sims, balance/readability verification).
- PR evidence should include deterministic test output and telemetry deltas for systems/content changes, plus visual/audio before/after captures for direction-shift and polish work.
- Architecture-impacting direction shifts require ADR updates in `docs/decisions/`.
