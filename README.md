# Standup Timer

A deliberately small standup timer with a reactive manga timekeeper and a synced,
draggable Chrome overlay.

## What is in v1

- Deadline-based countdowns with 1, 1.5, and 2 minute presets
- Exact minute/second entry plus live minus/plus 30-second adjustments
- Pause, reset, and resume controls
- Maya as a single, consistent timekeeper and voice
- Continuous idle life: irregular blinks, glances, nods, breathing, pointer attention,
  and interaction reactions
- Urgency and celebration art that layers on top of Maya’s continuous behavior
- Original Scrum humor that changes with the timer state
- Local persistence and cross-tab synchronization
- Manifest V3 Chrome overlay using only active-tab, scripting, and storage permissions
- Responsive layout and reduced-motion support

There are no accounts, participant lists, boards, analytics, task fields, meeting
histories, or other dashboard features.

## Local development

From this directory:

    npm run dev -- --host 0.0.0.0 --port 4173
    npm test
    npm run build

The Chrome overlay installation steps are in extension/README.md. The Google Meet
direction is documented in docs/google-meet-v2.md.

## Chrome Web Store release package

Create the production unpacked directory and the versioned upload ZIP with:

    npm run extension:package

The command validates Manifest V3 metadata, all manifest references, exact icon
dimensions, development origins, remotely hosted executable code, and release-file
hygiene before writing anything. Outputs are generated under `release/`:

- `release/standup-timer-extension/` is the clean unpacked build for local Chrome
  testing.
- `release/standup-timer-extension-<version>.zip` has `manifest.json` at its root and
  is the Chrome Web Store upload artifact.
- The adjacent `.report.json` records the exact sorted file list and SHA-256 digest.

Run `npm run extension:verify` when only a source validation gate is needed. This
workflow follows Chrome's official [extension preparation](https://developer.chrome.com/docs/webstore/prepare)
and [Manifest V3 remotely hosted code](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
guidance.

## State model

Running countdowns persist a deadline timestamp instead of decrementing a counter.
Every renderer derives the remaining time from that timestamp, so background-tab
throttling does not make the app and extension drift apart.
