# VESSEL

A browser-based 2D top-down roguelite inspired by The Binding of Isaac, featuring procedurally generated dungeon floors, keyboard twin-stick-style combat, item builds, and escalating demonic horror themes.

Project direction supports modular architecture and flexible tech choices, with the requirement that tooling/dependencies remain free to build with and free to deploy/use.

## Repository Structure (Initial)

- `index.html` — current playable prototype.
- `docs/decisions/` — architecture decision records (use Mermaid where applicable).
- `src/` — gameplay/engine modules.
  - `src/core/` — fixed-step loop, runtime primitives.
  - `src/engine/` — engine runtime wrapper.
  - `src/gameplay/` — feel metrics, enemy contracts, boss state machines, boss hazards, boss replay, item system, corruption system.
  - `src/presentation/` — entity visuals, corruption AV effects.
- `scripts/bench/` — deterministic validation scripts.
- `tests/` — automated tests as infrastructure is introduced.
