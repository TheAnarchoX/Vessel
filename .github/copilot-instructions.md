# Copilot Instructions for VESSEL

## Repository scope

- Current repository is prototype-first.
- `index.html` contains the current playable prototype.
- Planning and direction are defined in `PLAN.md`, `SPEC.md`, `README.md`, and `MEMORY.md`.

## Core constraints

1. Stack is not constrained to single-file or vanilla-only implementations.
2. Tooling and dependencies must be free to build with and free to deploy/use.
3. Execute work according to phased serial order in `PLAN.md` unless a dependency exception is explicitly approved.
4. Keep edits minimal and strictly in scope for the active task.

## Delivery expectations

- Run targeted validation for changed behavior before handoff.
- Keep documentation synchronized when direction changes.
- Provide PR evidence:
  - UI changes: screenshots.
  - Non-UI changes: relevant test/lint/run output.
  - Performance changes: benchmark command and output summary.
  - Architecture changes: ADR in `docs/decisions/*.md` (Mermaid preferred when it improves clarity).
