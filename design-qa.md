# Design QA — Maya conference timer

## Comparison target

- Source visual truth: `/var/folders/04/5nbfcc4n4ng08jwbn0b1shnw0000gn/T/TemporaryItems/NSIRD_screencaptureui_gUxWgf/Screenshot 2026-08-04 at 9.33.33 PM.png`
- Source pixels: 4064 × 2324, including browser chrome.
- Implementation: `http://127.0.0.1:5173/`
- Implementation screenshot: `/tmp/agent-browser-smoke/standup-timer/conference-desktop-final.png`
- Implementation pixels and CSS viewport: 1440 × 956 at device scale factor 1.
- Mobile implementation screenshot: `/tmp/agent-browser-smoke/standup-timer/conference-mobile-final.png`, 390 × 844.
- State: idle, 1 minute 30 seconds, dark conference theme.
- Density normalization: the source was contained and centered into 1440 × 956 at `/tmp/agent-browser-smoke/standup-timer/meet-reference-normalized.png`. The screenshot is a directional metaphor reference rather than an app-owned 1:1 mock, so browser chrome and exact source tile dimensions were not treated as fidelity requirements.

## Evidence reviewed together

- Full-view comparison: `/tmp/agent-browser-smoke/standup-timer/conference-comparison.png`
- Focused call-control comparison: `/tmp/agent-browser-smoke/standup-timer/controls-comparison.png`
- Warning-state evidence: `/tmp/agent-browser-smoke/standup-timer/conference-warning-final.png`

The focused crop was required because the call-control metaphor, Set alignment, action ordering, and destructive hang-up separation are too small to judge confidently in the full-view comparison.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: the compact Avenir-style UI hierarchy and Impact manga dialogue remain distinct and legible. Seven-segment numerals are now purpose-built vector UI, large, tabular, and readable across desktop/mobile and warning states.
- Spacing and layout rhythm: the outer manga card border and hard shadow were removed. Maya is now the single bright 3:2 video tile in a dark room. Setup controls form one aligned tray and timer actions form a centered call dock. The Set button shares the input baseline at both checked breakpoints.
- Colors and tokens: the room, controls, muted text, green live state, and red hang-up action map coherently to the Meet reference while preserving the original orange/yellow manga accents.
- Image quality and asset fidelity: all six original 1536 × 1024 Maya assets remain full-resolution and correctly cropped. No placeholder imagery was introduced. The countdown uses per-art screen anchors and tilt values so it stays registered to the illustrated appliance during focused, warning, and celebration art.
- Copy and content: conference chrome is concise (`MAYA · LIVE`, `MAYA · CONNECTED`), setup labels remain understandable, and each call-dock action names the timer effect directly.
- Responsiveness: the complete tile, setup tray, and five-action dock remain visible at 390 × 844 without horizontal overflow or wrapped hang-up copy.
- Accessibility: automated audit scored 100/100. Focus rings, named inputs, named adjustment controls, selected preset state, reduced-motion behavior, and screen-reader timer output are present.

## Comparison history

1. Earlier P1 — countdown floated over the appliance and drifted during Maya motion.
   - Fix: matched the stage to the 3:2 assets, moved the countdown into the transformed scene, removed duplicate screen chrome, and added per-art screen rectangles.
   - Post-fix evidence: `conference-desktop-final.png` and `conference-warning-final.png`.
2. Earlier P1 — paper card border and stacked rectangular controls did not communicate a video-call experience.
   - Fix: moved the app to a full dark conference room, made Maya the borderless rounded video tile, and rebuilt runtime actions as a Meet-like dock.
   - Post-fix evidence: `conference-comparison.png` and `controls-comparison.png`.
3. Earlier P1 — Set button used a top-margin alignment hack and visibly missed the input baseline.
   - Fix: reordered field labels and used a shared end-aligned flex row with equal 42px control heights.
   - Post-fix evidence: `controls-comparison.png`.
4. Earlier P2 — the illustrated timer tilted while the digital display stayed level.
   - Fix: added per-art `--face-tilt` values and transitioned the whole display plane with the artwork.
   - Post-fix evidence: idle and warning captures.
5. Earlier P2 — mobile hang-up text wrapped.
   - Fix: applied a smaller fixed label size and no-wrap behavior while preserving the 48px touch target.
   - Post-fix evidence: `conference-mobile-final.png`.

## Interaction and runtime checks

- Preset selection: passed.
- Exact minute/second entry and Set time: passed.
- Start, pause, and resume: passed.
- Add and subtract 30 seconds: passed (`00:08 → 00:38 → 00:08`).
- Warning transition and red final display: passed.
- Hang up: passed; the automated browser window closed successfully.
- Browser console errors: none observed in the tested flow.
- Residual P3 test gap: the ended-call fallback is implemented for browsers that block `window.close()`, but the automated browser allowed closing, so that fallback was not visually captured in this run.

## Follow-up polish

- P3: replace the text labels with a purpose-selected icon library only if the team wants a more literal Meet clone. The current labels are intentionally clearer for a timer and avoid adding a dependency.

final result: passed
