# VESSEL Specification & Design Philosophy

## Product Goal

Build **VESSEL** as a browser-based, top-down 2D roguelite in a **single HTML file** using vanilla JavaScript and Canvas only.

## Technical Constraints

- One-file architecture (`index.html`).
- Canvas resolution: `960x540`, scaled to viewport.
- No external libraries, frameworks, spritesheets, or build pipeline.
- Pixel-art visuals with `ctx.imageSmoothingEnabled = false`.

## Core Gameplay Structure

1. Title screen and run start.
2. Multi-floor progression:
   - Floor 1: The Nave
   - Floor 2: The Catacombs
   - Floor 3: The Ossuary
   - Floor 4: The Pit
3. Room types include combat, altar, confession, reliquary, and boss rooms.
4. Doors lock on combat and unlock on clear.

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
