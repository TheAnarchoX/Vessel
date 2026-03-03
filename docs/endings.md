# VESSEL Endings Guide

This document explains each currently implemented ending in VESSEL, what it represents narratively, and how to unlock it in gameplay terms.

Source of truth for implementation: `src/gameplay/corruptionSystem.js` (`ENDINGS`, `evaluateEnding`, confession/relic trackers).

## How Ending Resolution Works

Ending selection is condition-based with priority ordering.

If multiple endings are valid at the same time, the highest priority ending wins.

Priority order (highest to lowest):

1. `VESSEL ASCENDANT`
2. `CONSUMED`
3. `COMMUNION`
4. `MARTYRDOM`
5. `LIBERATION`

Fallback behavior:

- If no explicit ending conditions match, the system falls back to `CONSUMED`.

## Endings At A Glance

| Ending | Meaning | Exact Unlock Conditions |
| --- | --- | --- |
| Liberation | The vessel breaks and empties; freedom through loss. | Final corruption `<= 24` and at least `3` confession `resist` choices. |
| Martyrdom | You purge corruption at mortal cost; the structure survives, you do not. | Final corruption `25-49`, at least `3` bosses killed, and at least `2` confession `resist` choices. |
| Communion | You stabilize between salvation and ruin; uneasy equilibrium. | Final corruption `50-74` and mixed confession path (`>=1 resist` and `>=1 yield`). |
| Consumed | Identity fully overtaken by corruption. | Final corruption `>= 75`. |
| Vessel Ascendant | Total surrender to the dark path; the vessel becomes its intended final form. | Final corruption `>= 90`, at least `3` confession `yield` choices, and at least `2` dark relics. |

## Detailed Unlock Paths

## Liberation

Narrative meaning:

- Liberation is not triumphant heroism.
- It reflects survival through refusal and restraint, but with emotional and spiritual emptiness.

How to get it reliably:

1. Keep corruption low for the entire run (`<= 24` by ending check).
2. Take confession rooms and choose `resist` at least `3` times.
3. Favor holy relics and low-corruption item choices.
4. Avoid repeated yield/sacrifice decisions that spike corruption.

## Martyrdom

Narrative meaning:

- Martyrdom is protective self-destruction.
- You maintain structure/order, but only by burning through yourself.

How to get it reliably:

1. Finish with corruption in the mid-low band (`25-49`).
2. Kill at least `3` bosses in the run.
3. Choose `resist` at confessions at least `2` times.
4. If corruption drops too low, take small corruption gains late; if too high, seek holy correction.

## Communion

Narrative meaning:

- Communion is balance without purity.
- You are neither fully redeemed nor fully lost.

How to get it reliably:

1. End in corruption band `50-74`.
2. Ensure confession history is mixed: at least one `resist` and one `yield`.
3. Use both holy and dark route decisions to stay in range.

## Consumed

Narrative meaning:

- Consumed represents identity collapse.
- The vessel no longer contains corruption; it is defined by it.

How to get it reliably:

1. End at corruption `>= 75`.
2. Dark relics, yields, and high-risk corruption-tech item paths all accelerate this.
3. Note that this ending also acts as the fallback if no other ending resolves.

## Vessel Ascendant

Narrative meaning:

- Ascendant is deliberate, complete alignment with the dark route.
- This is not accidental corruption; it is chosen transformation.

How to get it reliably:

1. Reach final corruption `>= 90`.
2. Choose `yield` at confession at least `3` times.
3. Collect at least `2` dark relics.
4. Because this has the highest priority, it overrides all lower endings when valid.

## Meta-Progression Unlocks

Each first-time ending discovery grants one unlock for future runs:

- Liberation: `holy_start` (`+1 MAX SOUL` start bonus)
- Martyrdom: `martyr_tears` (burning-stigmata pool unlock)
- Communion: `balanced_path` (more confession room frequency)
- Consumed: `void_start` (`+10` corruption and `VOID HEART` in pool)
- Vessel Ascendant: `true_vessel` (corruption-tech items start revealed)

Implementation reference: `META_UNLOCKS` in `src/gameplay/corruptionSystem.js`.

## Practical Routing Notes

- Confession choices are counted events, not just latest choice.
- Dark relic requirement for `VESSEL ASCENDANT` checks relic type tracking (`type === "dark"`).
- Ending checks use final corruption level at run end, not peak corruption.
- Because priorities are descending, a run eligible for both `CONSUMED` and `COMMUNION` will resolve to `CONSUMED`.
