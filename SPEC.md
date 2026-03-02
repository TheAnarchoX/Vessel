# VESSEL Specification & Design Philosophy

## Product Goal

Build **VESSEL** as a browser-based, top-down 2D roguelite in a **single HTML file** using vanilla JavaScript and Canvas only.

## Technical Direction (Revised)

- The project is no longer constrained to a single file.
- The implementation is no longer constrained to vanilla-only JavaScript.
- The current prototype is Canvas-based at `960x540`, but architecture should allow scaling, module separation, and tooling evolution.
- Pixel-art readability and horror atmosphere remain core visual constraints regardless of stack.

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
