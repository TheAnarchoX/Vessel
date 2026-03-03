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
