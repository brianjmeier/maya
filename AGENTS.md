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
- The illustrated clock and digital countdown must read as one physical object at every viewport and throughout Maya's motion; avoid floating HTML chrome over the artwork.
- In the Chrome extension, Maya is an inline SVG rig animated procedurally (breathing, blinks, saccades, brow/mouth poses, tremor, confetti), not swapped raster frames. Raster frame-swapping was explicitly rejected as an animation strategy; Lottie was rejected because it needs authored JSON plus a bundled player. The web app still uses the six raster frames.
- Hitting zero never dismisses the timer. `done` is an overtime state: the display turns red and counts up from `+00:00`, Maya celebrates for ~6 seconds and then nags once per overtime minute. Only Hang up removes the overlay. During overtime, `+30` grants 30 seconds and resumes the countdown; `subtract-30` is a no-op.
- Sound is synthesized with the Web Audio API only (no audio files, keeps the no-remote-resources release gate): 30-second heads-up ping, rising ticks through the final 10 seconds, three-note chime at zero, knock per overtime minute. Mute is a speaker chip on the video tile, persisted in `chrome.storage.local`, and sounds only play in visible tabs.
- The set UI is presets plus a ±15s hold-to-repeat stepper that applies immediately (debounced commit). The minutes/seconds number-input form with a Set button was rejected.
- Maya speaks via Meet-style caption lines: randomized non-repeating pools per phase and per action, plus occasional ambient lines. Action lines take priority over phase-transition lines for 1.5 seconds. All copy is original Scrum humor in Maya's voice; never include URLs in extension source (release gate).
- For major frontend refinement, combine independent visual critique with a code-quality pass, preserving the timer's radical simplicity.
- The app chrome should evoke a dark video-conference room: Maya is the single live tile and timer actions replace the usual call-control dock.
- The digital display must inherit each illustrated timer's tilt, and the red hang-up control should close the window when possible with a reversible ended-call fallback.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
