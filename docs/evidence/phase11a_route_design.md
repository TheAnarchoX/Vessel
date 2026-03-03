# Phase 11A Route Foundation Design Note

## Route Entry Rules

- `demonic` entry candidate when at least one of these is true:
  - corruption `>= 55`
  - confession `yield` count `>= 2`
  - dark relic count `>= 2`
- `ascetic` entry candidate when at least one of these is true:
  - corruption `<= 35`
  - confession `resist` count `>= 2`
  - holy relic count `>= 2`
- Candidate resolution is deterministic:
  - Higher signal strength wins.
  - Ties keep existing route if already set.
  - First tie with no route resolves by corruption midpoint (`>= 50` => `demonic`, else `ascetic`).

## Route Lock-In Rules

- `demonic` locks when any of the following is true:
  - corruption `>= 75`
  - confession `yield` count `>= 3`
  - dark relic count `>= 3`
- `ascetic` locks when any of the following is true:
  - corruption `<= 20`
  - confession `resist` count `>= 3`
  - holy relic count `>= 3`

## Anti-Exploit Guard

- Locked routes cannot switch.
- Any attempted post-lock switch increments `preventedSwitches` and is logged in route history as `blocked_switch`.
- Route history captures deterministic `entry`, `switch`, and `lock` events with trigger and tick.

## Trigger Sources

Route evaluation is invoked from corruption events tied to:

- confessions (`confession_resist`, `confession_yield`)
- relic pickups (`holy_relic`, `dark_relic`)
- corruption progression (`item_pickup`, `altar_sacrifice`, `boss_kill`, `floor_descent`)
