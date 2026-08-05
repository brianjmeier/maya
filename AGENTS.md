# Prototype Instructions

## Durable product direction

- Keep the product radically simple: it is a timer, not a task board, analytics tool, or meeting database.
- The selected visual direction is a full-color retro manga panel based on Option 1: an original cartoon timekeeper physically holds an oversized orange kitchen timer and reacts to the remaining time and user actions.
- Humor should borrow universal Scrum/PM situations but use original copy and original artwork.
- There is no participant list in v1. Maya is the permanent timekeeper and the only
  product voice.
- Keep the preset times, allow exact minute/second entry, and support adding or
  subtracting time before and during a countdown.
- Maya must feel alive continuously, not only at state changes: irregular idle loops
  and interaction reactions sit beneath warning and celebration sequences.
- The Chrome extension is part of v1 and must show a draggable, synced overlay above the user’s current board without broad browsing permissions.
- A Google Meet integration is exploratory v2 work and must not bloat the v1 timer UI.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
