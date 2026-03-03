# Phase 8 Runtime Profile Evidence

## Scope

Phase 8 hotspot profiling and optimization pass for `src/` runtime modules:

- `src/gameplay/bossStateMachine.js`
- `src/gameplay/enemyContracts.js` (profiled, no retained optimization)
- `src/gameplay/bossHazards.js`
- `src/rendering/entityVisuals.js`
- `scripts/bench/phase8_runtime_profile.js` (new benchmark/stress workflow)

SPEC anchor: `SPEC.md` Performance Goals

- Target 60fps median with predictable frame pacing.
- Keep hot loops allocation-light.
- Use profiling/telemetry before optimization.

## Commands

```bash
node scripts/bench/phase8_runtime_profile.js
npm run check:replay
npm run check:phase3
```

## Baseline (Before Optimization)

Command:

```bash
node scripts/bench/phase8_runtime_profile.js
```

Output summary:

- `enemy_behavior_update`: median `0.0016ms`, p95 `0.0160ms`
- `boss_state_machine_update`: median `0.0103ms`, p95 `0.0296ms`
- `hazard_collision_checks`: median `0.0088ms`, p95 `0.0278ms`
- `rendering_pass`: median `0.0075ms`, p95 `0.0211ms`
- `combined_frame_pacing_estimate`: median `0.1419ms`, p95 `0.2195ms`, over20ms `0.00%`

Threshold evaluation:

- `pass_median=true`
- `pass_over20ms=true`

## Optimization Attempt Log

- Candidate A: pooled distance-vector objects in enemy behavior hot loop.

  - Result: rejected.
  - Evidence: microbench in `phase8_runtime_profile.js` shows pooled variant slower than legacy allocation pattern.
  - Latest measurement: `distance legacy=15.13ms pooled=16.48ms speedup=-8.90%`.

- Candidate B: pit boss delayed-position queue (`push/shift` object churn each tick).

  - Result: accepted.
  - Change: replaced array `push/shift` object queue with fixed-capacity ring buffer in `src/gameplay/bossStateMachine.js`.
  - Evidence: allocation microbench shows large improvement.
  - Latest measurement: `delayQueue legacy(push/shift)=55.36ms ringBuffer=5.42ms speedup=90.21%`.

## Final (After Optimization)

Command:

```bash
node scripts/bench/phase8_runtime_profile.js
```

Output summary:

- `enemy_behavior_update`: median `0.0016ms`, p95 `0.0153ms`
- `boss_state_machine_update`: median `0.0101ms`, p95 `0.0270ms`
- `hazard_collision_checks`: median `0.0093ms`, p95 `0.0329ms`
- `rendering_pass`: median `0.0068ms`, p95 `0.0199ms`
- `combined_frame_pacing_estimate`: median `0.1397ms`, p95 `0.2173ms`, over20ms `0.00%`
- `allocation_pattern_microbench`:
  - `distance legacy=15.13ms pooled=16.48ms speedup=-8.90%`
  - `delayQueue legacy(push/shift)=55.36ms ringBuffer=5.42ms speedup=90.21%`

Threshold evaluation:

- `pass_median=true`
- `pass_over20ms=true`

## Regression Safety / Determinism

Command:

```bash
npm run check:replay
```

Key output:

- `phase7_replay_status PASS`

Command:

```bash
npm run check:phase3
```

Key output:

- `phase3_boss_statemachine_status PASS` (`33 passed, 0 failed`)
- `phase3_boss_replay_status PASS` (`7 passed, 0 failed`)

## Conclusion

- Profiling was performed before optimization.
- Only measured optimization retained in runtime code (`pit` delay ring buffer).
- Non-beneficial optimization was reverted.
- SPEC performance thresholds are satisfied in benchmark output, and deterministic/replay behavior remains valid.
