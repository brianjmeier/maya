(() => {
  const HOST_ID = `maya-standup-timer-${chrome.runtime.id}`;
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    if (typeof existing.__mayaTimerCleanup === "function") {
      existing.__mayaTimerCleanup();
    } else {
      existing.remove();
    }
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  // ---------------------------------------------------------------- Maya's voice
  const LINES = {
    idle: [
      "Timebox armed. Bring your crispest update.",
      "I guard the clock so you can guard the roadmap.",
      "Ready when you are. The clock is stretching.",
      "Today's forecast: zero percent chance of quick tangents.",
    ],
    start: [
      "Timer's rolling. Yesterday, today, blockers — go!",
      "Clock is live. Impress me.",
      "And we're timing. This is my favorite part.",
      "Go! Headline first, footnotes never.",
      "Timebox open. Make it sparkle.",
    ],
    calm: [
      "Plenty of runway. Suspiciously smooth.",
      "Green status. I'm cautiously delighted.",
      "Nice pace. The clock and I are impressed.",
      "Still on schedule. Someone write this down.",
    ],
    half: [
      "Halfway. Is this still the quick part?",
      "Half the box is gone. Land the headline.",
      "Fifty percent spent. Plot twist: the context has context.",
      "Midpoint! Start steering toward a verb.",
    ],
    warning: [
      "We've entered the one-last-thing arc.",
      "Quarter left. Deep dives go to the parking lot.",
      "This is the friendly nudge. The next one is less friendly.",
      "Wrap-up posture, please.",
      "Final quarter. Verbs only.",
    ],
    final: [
      "Ten seconds! Acceptance criteria later!",
      "Land it. Land it now.",
      "Final panel! One sentence!",
      "Seconds left. I believe in you. Mostly.",
    ],
    paused: [
      "Blocker detected: reality.",
      "Paused. The drama, however, continues.",
      "I'll hold the clock. You hold the thought.",
      "Take your moment. I'm timing the moment.",
    ],
    resumed: [
      "Unpaused. Where were we? Everywhere?",
      "The clock forgives. The clock resumes.",
      "Back on. Momentum, meet update.",
      "Resuming. The timebox missed you.",
    ],
    done: [
      "Time! Beautifully spent, mostly.",
      "That's the box. Applause, then next topic.",
      "Zero! Definition of Done achieved.",
      "Time. I say this with love and a stopwatch.",
    ],
    overtime: [
      "We're in overtime. I'm smiling. Noticeably.",
      "Still going? Bold. The clock noticed.",
      "Overtime minute logged. The parking lot has valet.",
      "I'm not saying wrap up. I'm just glowing red.",
      "The next topic sends its regards.",
      "This is important, I can tell. So is the agenda.",
    ],
    overtimeDeep: [
      "At this point we're a workshop.",
      "Shall I book this as its own meeting?",
      "The timebox is now a timesuitcase.",
    ],
    added: [
      "One small +30. Famous last words.",
      "Scope acquired a second season.",
      "Thirty more seconds of glory.",
      "Extension granted. My eyebrow is on record.",
    ],
    subtracted: [
      "Scope cut! The rarest agile ceremony.",
      "Thirty seconds returned to the team. Heroic.",
      "Shorter box, sharper update.",
    ],
    reset: [
      "Fresh box. Clean slate. Go again.",
      "Rewound. The clock remembers nothing. I remember everything.",
      "Reset. Optimism restored to factory settings.",
    ],
    durationSet: [
      "New timebox. Memorized it already.",
      "Noted. I'll defend it with my life.",
      "Set. The clock and I have an understanding.",
    ],
    muted: ["Muted. I'll express myself through interpretive blinking."],
    unmuted: ["Sound is back. My favorite instrument: the tick."],
  };

  // ---------------------------------------------------------------- artwork + display geometry
  const FRAME_NAMES = [
    "focused", "blink", "glance", "nod", "talk-a", "talk-b", "skeptic", "wink",
    "yawn", "pleading", "sigh", "warning", "celebrate",
  ];
  // the aligned frames share one composition, so blends between them read as
  // facial motion; warning and celebrate are deliberate manga panel cuts.
  const FRAME_GROUP = {
    focused: "aligned", blink: "aligned", glance: "aligned", nod: "aligned",
    "talk-a": "aligned", "talk-b": "aligned", skeptic: "aligned", wink: "aligned",
    yawn: "aligned", pleading: "aligned", sigh: "aligned",
    warning: "warning", celebrate: "celebrate",
  };
  // relative weights for ambient micro-expressions, per mood
  const MICRO_POOLS = {
    paused: [["blink", 25], ["glance", 30], ["pleading", 25], ["nod", 20]],
    skeptic: [["blink", 30], ["glance", 20], ["skeptic", 28], ["pleading", 12], ["nod", 10]],
    idle: [["blink", 38], ["glance", 20], ["yawn", 14], ["skeptic", 10], ["nod", 12], ["wink", 6]],
    overtimeSettled: [["blink", 20], ["sigh", 30], ["glance", 20], ["skeptic", 15], ["pleading", 15]],
    default: [["blink", 50], ["glance", 20], ["skeptic", 8], ["nod", 14], ["wink", 8]],
  };
  const MICRO_TIMING = {
    blink: { inMs: 70, holdMs: () => 90, outMs: 90 },
    glance: { inMs: 180, holdMs: () => 950 + Math.random() * 700, outMs: 200 },
    nod: { inMs: 180, holdMs: () => 700, outMs: 200 },
    skeptic: { inMs: 200, holdMs: () => 1_300 + Math.random() * 900, outMs: 220 },
    wink: { inMs: 80, holdMs: () => 600, outMs: 120 },
    yawn: { inMs: 240, holdMs: () => 1_300 + Math.random() * 400, outMs: 260 },
    pleading: { inMs: 200, holdMs: () => 1_100 + Math.random() * 600, outMs: 220 },
    sigh: { inMs: 220, holdMs: () => 1_500 + Math.random() * 500, outMs: 260 },
  };
  const DIGIT_SEGMENTS = {
    0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg",
    5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg",
  };
  const SEGMENTS = [
    ["a", [[10, 4], [50, 4], [56, 10], [50, 16], [10, 16], [4, 10]]],
    ["b", [[50, 18], [56, 12], [60, 18], [60, 44], [54, 50], [48, 44]]],
    ["c", [[54, 52], [60, 58], [60, 84], [54, 90], [48, 84], [48, 58]]],
    ["d", [[10, 84], [50, 84], [56, 90], [50, 96], [10, 96], [4, 90]]],
    ["e", [[0, 58], [6, 52], [12, 58], [12, 84], [6, 90], [0, 84]]],
    ["f", [[0, 18], [6, 12], [12, 18], [12, 44], [6, 50], [0, 44]]],
    ["g", [[10, 44], [50, 44], [56, 50], [50, 56], [10, 56], [4, 50]]],
  ];
  const PLUS_GLYPH = [
    [[-28, 56], [-8, 56], [-8, 63], [-28, 63]],
    [[-21.5, 49], [-14.5, 49], [-14.5, 70], [-21.5, 70]],
  ];
  // the glyph hangs left of the digit layout, on the illustrated display face;
  // the celebrate panel's window leaves less cream there, so the glyph tucks in
  // tighter and slightly smaller to stay inside the bezel
  const PLUS_PLACEMENT = {
    aligned: { shiftX: 0, scale: 1 },
    warning: { shiftX: 0, scale: 1 },
    celebrate: { shiftX: 15, scale: 0.85 },
  };
  const SCENE_SIZE = { width: 640, height: 427 };
  const DISPLAY_LAYOUT = { width: 220, height: 120 };
  const DIGIT_OFFSETS = [7, 57, 119, 169];
  const DIGIT_SCALE_X = 44 / 60;
  const DIGIT_OFFSET_Y = 10;
  const DISPLAY_QUADS = {
    aligned: {
      topLeft: { x: 347, y: 133 },
      topRight: { x: 525, y: 119 },
      bottomRight: { x: 519, y: 247 },
      bottomLeft: { x: 353, y: 257 },
    },
    warning: {
      topLeft: { x: 340, y: 164 },
      topRight: { x: 534, y: 156 },
      bottomRight: { x: 534, y: 268 },
      bottomLeft: { x: 340, y: 276 },
    },
    celebrate: {
      topLeft: { x: 370, y: 136 },
      topRight: { x: 550, y: 146 },
      bottomRight: { x: 544, y: 244 },
      bottomLeft: { x: 364, y: 234 },
    },
  };
  const DIGIT_COLORS = {
    normal: { on: "#4a2717", ghost: "rgba(74, 39, 23, .075)" },
    overtime: { on: "#a8241a", ghost: "rgba(168, 36, 26, .08)" },
  };

  // ---------------------------------------------------------------- shared constants
  // mirrored from extension/timer-state.js and service-worker.js, which this
  // classic script cannot import
  const TIMER_STATE_KEY = "timerState";
  const OVERLAY_POSITION_KEY = "overlayPosition";
  const SOUND_MUTED_KEY = "soundMuted";
  const DEFAULT_POSITION = { right: 24, top: 24 };
  const DEFAULT_DURATION_MS = 90_000;
  const MAX_DURATION_MS = 5_999_000;
  const STEP_MIN_MS = 15_000;
  const TYPED_MIN_MS = 5_000;

  shadow.innerHTML = String.raw`
    <style>
      :host { all: initial; color-scheme: dark; }
      *, *::before, *::after { box-sizing: border-box; }
      button, input { font: inherit; }
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
      }
      .overlay {
        --accent: #8ab4f8;
        position: fixed;
        z-index: 2147483647;
        width: min(360px, calc(100vw - 16px));
        overflow: hidden;
        color: #f1f3f4;
        background: #202124;
        border-radius: 18px;
        box-shadow: 0 18px 54px rgba(0, 0, 0, .46), 0 3px 10px rgba(0, 0, 0, .36);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        user-select: none;
      }
      .overlay[data-status="paused"] { --accent: #fdd663; }
      .overlay[data-status="done"], .overlay.is-urgent { --accent: #f28b82; }
      .video {
        position: relative;
        aspect-ratio: 3 / 2;
        overflow: hidden;
        background: #d7e7f2;
      }
      .scene {
        display: block;
        width: 100%; height: auto;
        aspect-ratio: 640 / 427;
        pointer-events: none;
      }
      .drag-strip {
        position: absolute; inset: 0 0 auto; height: 42px;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 7px;
        background: linear-gradient(rgba(15, 16, 18, .44), transparent);
        cursor: grab; touch-action: none;
      }
      .drag-strip:active { cursor: grabbing; }
      .drag-handle {
        width: 46px; height: 22px; padding: 0;
        display: grid; place-items: center;
        color: rgba(255,255,255,.82); background: rgba(25,26,29,.55);
        border: 0; border-radius: 999px; cursor: inherit;
        font-size: 17px; line-height: 1; letter-spacing: 2px;
      }
      .drag-handle:focus-visible, button:focus-visible, input:focus-visible {
        outline: 3px solid #a8c7fa; outline-offset: 2px;
      }
      .live-pill {
        position: absolute; top: 10px; left: 10px;
        display: flex; align-items: center; gap: 6px;
        padding: 5px 8px;
        border-radius: 999px;
        color: #fff; background: rgba(20, 21, 24, .72);
        font-size: 10px; font-weight: 750; letter-spacing: .08em;
        text-transform: uppercase;
        backdrop-filter: blur(8px);
      }
      .live-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--accent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent);
        animation: live-pulse 2.4s ease-out infinite;
      }
      .sound-toggle {
        position: absolute; top: 8px; right: 10px;
        width: 30px; height: 30px; padding: 0;
        display: grid; place-items: center;
        color: #fff; background: rgba(20,21,24,.72);
        border: 0; border-radius: 50%; cursor: pointer;
        backdrop-filter: blur(8px);
      }
      .sound-toggle svg { width: 16px; height: 16px; fill: currentColor; }
      .sound-toggle .icon-muted { display: none; }
      .sound-toggle[aria-pressed="true"] .icon-muted { display: block; }
      .sound-toggle[aria-pressed="true"] .icon-sound { display: none; }
      .sound-toggle[aria-pressed="true"] { color: #f28b82; }
      .caption {
        position: absolute; left: 12px; right: 12px; bottom: 42px;
        display: flex; justify-content: center;
        pointer-events: none;
      }
      .caption-text {
        max-width: 100%;
        padding: 6px 11px;
        color: #fff; background: rgba(15,16,18,.78);
        border-radius: 9px;
        font-size: 12.5px; font-weight: 600; line-height: 1.35; text-align: center;
        backdrop-filter: blur(6px);
        opacity: 0; translate: 0 5px;
        transition: opacity .18s ease, translate .18s ease;
      }
      .caption.is-visible .caption-text { opacity: 1; translate: 0 0; }
      .participant-name {
        position: absolute; left: 10px; bottom: 9px;
        max-width: calc(100% - 20px);
        padding: 5px 9px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        border-radius: 7px;
        color: #fff; background: rgba(20,21,24,.72);
        font-size: 12px; font-weight: 650;
        backdrop-filter: blur(8px);
      }
      .setup {
        display: none;
        padding: 12px 14px 13px;
        background: #292a2d;
        border-bottom: 1px solid #3c4043;
      }
      .setup.is-open { display: block; }
      .presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
      .preset {
        min-height: 34px; padding: 0 10px;
        color: #e8eaed; background: #3c4043;
        border: 0; border-radius: 999px; cursor: pointer;
        font-size: 12px; font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .preset[aria-pressed="true"] { color: #202124; background: #a8c7fa; }
      .stepper {
        display: grid; grid-template-columns: auto 1fr auto;
        align-items: center; gap: 10px;
        margin-top: 11px;
      }
      .step-button {
        width: 52px; height: 40px;
        color: #e8eaed; background: #3c4043;
        border: 0; border-radius: 10px; cursor: pointer;
        font-size: 13px; font-weight: 750;
        touch-action: none;
      }
      .step-button:active { background: #4a4d51; }
      .stepper-readout { display: grid; justify-items: center; gap: 2px; }
      .stepper-time {
        width: 100%; padding: 2px 0; text-align: center;
        color: #f1f3f4; background: transparent; border: 0; border-radius: 8px;
        font-size: 22px; font-weight: 750;
        font-variant-numeric: tabular-nums; letter-spacing: .04em;
        caret-color: #a8c7fa;
      }
      .stepper-time:hover { background: rgba(255,255,255,.05); }
      .stepper-time:focus { background: rgba(255,255,255,.08); outline: 2px solid #a8c7fa; outline-offset: -2px; }
      .stepper-hint {
        color: #9aa0a6; font-size: 9px; font-weight: 700;
        letter-spacing: .09em; text-transform: uppercase;
      }
      .call-dock {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        min-height: 72px; padding: 11px 12px;
        background: #202124;
      }
      .call-control {
        width: 44px; height: 44px; padding: 0;
        display: grid; place-items: center;
        color: #f1f3f4; background: #3c4043;
        border: 0; border-radius: 50%; cursor: pointer;
        font-size: 13px; font-weight: 750; line-height: 1;
        transition: background-color 120ms ease, transform 120ms ease;
      }
      .call-control:hover { background: #4a4d51; }
      .call-control:active { transform: scale(.94); }
      .call-control.toggle { color: #202124; background: var(--accent); font-size: 18px; }
      .call-control.setup-toggle svg { width: 20px; height: 20px; fill: currentColor; }
      .call-control.setup-toggle[aria-expanded="true"] { color: #202124; background: #a8c7fa; }
      .call-control.hangup { width: 58px; border-radius: 999px; background: #d93025; font-size: 21px; }
      .call-control.hangup svg { width: 24px; height: 24px; fill: currentColor; }
      .call-control.hangup:hover { background: #b3261e; }
      .control-stack { display: grid; justify-items: center; gap: 4px; }
      .control-caption { color: #bdc1c6; font-size: 8px; line-height: 1; }
      .connection-message {
        display: none; padding: 7px 12px;
        color: #fce8e6; background: #5c1815;
        font-size: 11px; text-align: center;
      }
      .connection-message.is-visible { display: block; }
      @keyframes live-pulse {
        0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
        65%, 100% { box-shadow: 0 0 0 7px transparent; }
      }
      @media (max-width: 420px) {
        .overlay { border-radius: 14px; }
        .call-dock { gap: 6px; }
        .call-control { width: 41px; height: 41px; }
        .call-control.hangup { width: 54px; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; }
      }
    </style>
    <section class="overlay" data-status="idle" aria-label="Maya Standup Timer">
      <div class="video">
        <canvas class="scene" width="640" height="427" role="img" aria-label="Maya, an original manga timekeeper, holding a large orange kitchen timer"></canvas>
        <div class="drag-strip">
          <button class="drag-handle" type="button" aria-label="Move timer window. Drag or use arrow keys">•••</button>
        </div>
        <span class="live-pill"><span class="live-dot"></span><span class="status-text">Ready</span></span>
        <button class="sound-toggle" type="button" aria-label="Mute Maya's sounds" aria-pressed="false">
          <svg class="icon-sound" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4Zm12.5 3a3.5 3.5 0 0 0-2-3.15v6.3a3.5 3.5 0 0 0 2-3.15Zm-2-7.6v2.06A6 6 0 0 1 18.5 12a6 6 0 0 1-4 5.54v2.06A8 8 0 0 0 20.5 12a8 8 0 0 0-6-7.6Z"/></svg>
          <svg class="icon-muted" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4Zm12.2 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4Z"/></svg>
        </button>
        <output class="sr-only timer-reading" aria-live="off">01 minutes 30 seconds</output>
        <div class="caption"><span class="caption-text" role="status"></span></div>
        <span class="participant-name">Maya · Timekeeper</span>
      </div>

      <div class="setup" id="maya-timer-setup">
        <div class="presets" aria-label="Timer presets">
          <button class="preset" type="button" data-duration-ms="60000">1:00</button>
          <button class="preset" type="button" data-duration-ms="90000">1:30</button>
          <button class="preset" type="button" data-duration-ms="120000">2:00</button>
        </div>
        <div class="stepper" aria-label="Adjust timer duration">
          <button class="step-button" type="button" data-step-ms="-15000" aria-label="Shorten timebox by 15 seconds">−15s</button>
          <span class="stepper-readout">
            <input class="stepper-time" inputmode="numeric" autocomplete="off" value="01:30" aria-label="Timebox duration. Type a time like 2:30, or 230, then press Enter">
            <span class="stepper-hint">type a time · hold to repeat</span>
          </span>
          <button class="step-button" type="button" data-step-ms="15000" aria-label="Extend timebox by 15 seconds">+15s</button>
        </div>
      </div>

      <nav class="call-dock" aria-label="Timer controls">
        <span class="control-stack"><button class="call-control" type="button" data-action="subtract-30" aria-label="Subtract 30 seconds">−30</button><span class="control-caption">seconds</span></span>
        <span class="control-stack"><button class="call-control toggle" type="button" data-action="toggle" aria-label="Start timer"><span class="toggle-icon" aria-hidden="true">▶</span></button><span class="control-caption toggle-caption">start</span></span>
        <span class="control-stack"><button class="call-control" type="button" data-action="add-30" aria-label="Add 30 seconds">+30</button><span class="control-caption">seconds</span></span>
        <span class="control-stack"><button class="call-control" type="button" data-action="reset" aria-label="Reset timer">↺</button><span class="control-caption">reset</span></span>
        <span class="control-stack"><button class="call-control setup-toggle" type="button" aria-label="Set timer duration" aria-expanded="false" aria-controls="maya-timer-setup"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 1H9v2h6V1Zm-4 13h2V8h-2v6Zm8.03-6.61 1.42-1.42-1.41-1.41-1.42 1.42A8.96 8.96 0 0 0 12 4a9 9 0 1 0 9 9c0-2.12-.74-4.07-1.97-5.61ZM12 20a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/></svg></button><span class="control-caption">set</span></span>
        <span class="control-stack"><button class="call-control hangup" type="button" aria-label="Hang up and close timer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 16.2 2.7 14.4c-.7-.7-.6-1.9.2-2.5a14.9 14.9 0 0 1 18.2 0c.8.6.9 1.8.2 2.5l-1.8 1.8a1.7 1.7 0 0 1-2 .3l-2.3-1.2a1.7 1.7 0 0 1-.9-1.5v-1.1a10.6 10.6 0 0 0-4.6 0v1.1c0 .6-.3 1.2-.9 1.5l-2.3 1.2a1.7 1.7 0 0 1-2-.3Z"/></svg></button><span class="control-caption">hang up</span></span>
      </nav>
      <div class="connection-message" role="status">Reload this page to reconnect Maya after updating the extension.</div>
    </section>
  `;

  // ---------------------------------------------------------------- element refs
  const overlay = shadow.querySelector(".overlay");
  const dragStrip = shadow.querySelector(".drag-strip");
  const dragHandle = shadow.querySelector(".drag-handle");
  const statusText = shadow.querySelector(".status-text");
  const timerReading = shadow.querySelector(".timer-reading");
  const soundToggle = shadow.querySelector(".sound-toggle");
  const captionBox = shadow.querySelector(".caption");
  const captionText = shadow.querySelector(".caption-text");
  const toggle = shadow.querySelector(".toggle");
  const toggleIcon = shadow.querySelector(".toggle-icon");
  const toggleCaption = shadow.querySelector(".toggle-caption");
  const setup = shadow.querySelector(".setup");
  const setupToggle = shadow.querySelector(".setup-toggle");
  const stepperTime = shadow.querySelector(".stepper-time");
  const presetButtons = [...shadow.querySelectorAll(".preset")];
  const connectionMessage = shadow.querySelector(".connection-message");
  const scene = shadow.querySelector(".scene");
  const sceneContext = scene.getContext("2d", { alpha: false });

  const listeners = new AbortController();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state = null;
  let drag = null;
  let disposed = false;
  let expirationSent = false;
  let soundMuted = false;

  // ---------------------------------------------------------------- frame images
  const frames = {};
  for (const name of FRAME_NAMES) {
    const image = new Image();
    image.src = chrome.runtime.getURL(`assets/maya-${name}.webp`);
    frames[name] = image;
  }
  frames.focused.addEventListener("load", () => requestPaint(), {
    signal: listeners.signal,
  });

  // ---------------------------------------------------------------- time helpers
  function remaining(now = Date.now()) {
    if (!state) return DEFAULT_DURATION_MS;
    if (state.status === "running" && state.deadlineEpochMs) {
      return Math.max(0, state.deadlineEpochMs - now);
    }
    return Math.max(0, state.pausedRemainingMs ?? state.durationMs ?? 0);
  }

  function overtime(now = Date.now()) {
    if (state?.status !== "done" || !Number.isFinite(state.doneAtEpochMs)) return 0;
    return Math.max(0, now - state.doneAtEpochMs);
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.min(99, Math.floor(totalSeconds / 60))).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function currentPhase(now = Date.now()) {
    const status = state?.status ?? "idle";
    if (status === "idle") return "idle";
    if (status === "paused") return "paused";
    if (status === "done") {
      const overtimeMs = overtime(now);
      if (overtimeMs < 6_000) return "celebrate";
      return overtimeMs < 66_000 ? "overtime" : "overtimeSettled";
    }
    const milliseconds = remaining(now);
    if (milliseconds <= 10_000) return "final";
    const progress = state.durationMs ? milliseconds / state.durationMs : 0;
    if (progress <= 0.25) return "warning";
    if (progress <= 0.55) return "half";
    return "calm";
  }

  // ---------------------------------------------------------------- sound engine
  let audioContext = null;

  function ensureAudio() {
    try {
      audioContext ??= new AudioContext();
      if (audioContext.state === "suspended") void audioContext.resume();
      return audioContext.state === "running" ? audioContext : null;
    } catch {
      return null;
    }
  }

  function withAudio(play) {
    if (soundMuted || document.visibilityState !== "visible") return;
    const context = ensureAudio();
    if (context) play(context);
  }

  function envelope(context, gainValue, start, duration) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(context.destination);
    return gain;
  }

  function playNote(context, { frequency, type = "sine", gain = 0.12, at = 0, duration = 0.2 }) {
    const start = context.currentTime + at;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.connect(envelope(context, gain, start, duration));
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function playTick(secondsLeft) {
    withAudio((context) => {
      playNote(context, {
        frequency: 1020 + (10 - secondsLeft) * 42,
        type: "triangle",
        gain: 0.13,
        duration: 0.07,
      });
    });
  }

  function playHeadsUp() {
    withAudio((context) => {
      playNote(context, { frequency: 660, gain: 0.1, duration: 0.11 });
      playNote(context, { frequency: 880, gain: 0.1, at: 0.12, duration: 0.16 });
    });
  }

  function playChime() {
    withAudio((context) => {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((frequency, index) => {
        playNote(context, { frequency, gain: 0.15, at: index * 0.13, duration: 0.55 });
        playNote(context, { frequency: frequency * 2, type: "triangle", gain: 0.05, at: index * 0.13, duration: 0.4 });
      });
      playNote(context, { frequency: 1046.5, gain: 0.09, at: 0.42, duration: 0.7 });
    });
  }

  function playNag(level) {
    withAudio((context) => {
      const base = 580 + Math.min(level, 4) * 36;
      playNote(context, { frequency: base, type: "triangle", gain: 0.12, duration: 0.06 });
      playNote(context, { frequency: base, type: "triangle", gain: 0.12, at: 0.16, duration: 0.06 });
      if (level >= 3) {
        playNote(context, { frequency: base * 1.12, type: "triangle", gain: 0.11, at: 0.32, duration: 0.06 });
      }
    });
  }

  // ---------------------------------------------------------------- captions
  const lastLineIndex = {};
  let captionTimeout = 0;
  let lastCaptionAt = 0;
  let talkUntil = 0;

  function pickLine(key) {
    const pool = LINES[key] ?? [];
    if (pool.length === 0) return "";
    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && index === lastLineIndex[key]) {
      index = (index + 1) % pool.length;
    }
    lastLineIndex[key] = index;
    return pool[index];
  }

  function showCaption(key, holdMs = 4_600) {
    if (disposed) return;
    const line = pickLine(key);
    if (!line) return;
    captionText.textContent = line;
    captionBox.classList.add("is-visible");
    lastCaptionAt = performance.now();
    talkUntil = performance.now() + Math.min(holdMs - 1_200, 700 + line.length * 42);
    window.clearTimeout(captionTimeout);
    captionTimeout = window.setTimeout(() => {
      captionBox.classList.remove("is-visible");
    }, holdMs);
  }

  // ---------------------------------------------------------------- sprite animation engine
  const motion = {
    mood: "calm",
    lastFrame: 0,
    pointer: { x: 0, y: 0 },
    pointerEased: { x: 0, y: 0 },
    // ambient micro-expressions within the aligned frame set
    micro: { frame: "focused", phase: "idle", startedAt: 0, alpha: 0, holdMs: 0, outMs: 150, inMs: 130 },
    microNextAt: performance.now() + 1_800,
    // panel-cut transition between frame groups
    baseFrame: "focused",
    flashAlpha: 0,
    punch: 0,
    bounce: 0,
    bounceVelocity: 0,
    nagPulse: 0,
    queuedMicro: null,
  };

  // moods match phases except where Maya dramatizes
  const MOOD_BY_PHASE = { final: "panic", warning: "urgent", half: "skeptic" };

  function moodFor(phase) {
    return MOOD_BY_PHASE[phase] ?? phase;
  }

  function baseFrameFor(mood) {
    if (mood === "panic" || mood === "urgent" || mood === "overtime") return "warning";
    // settled overtime returns to the aligned base: resignation, not panic
    if (mood === "celebrate") return "celebrate";
    return "focused";
  }

  function setMood(mood) {
    if (motion.mood === mood) return;
    motion.mood = mood;
    const nextBase = baseFrameFor(mood);
    if (FRAME_GROUP[nextBase] !== FRAME_GROUP[motion.baseFrame]) {
      // manga panel cut: white flash + zoom punch instead of a crossfade
      motion.flashAlpha = 0.75;
      motion.punch = 1;
      motion.micro = { ...motion.micro, phase: "idle", alpha: 0, frame: "focused" };
      if (mood === "celebrate") motion.bounceVelocity = 0.5;
    }
    motion.baseFrame = nextBase;
  }

  function queueMicro(frame) {
    motion.queuedMicro = frame;
  }

  function queueAcknowledgement() {
    queueMicro(Math.random() < 0.4 ? "wink" : "nod");
  }

  function pickWeighted(pool) {
    const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [frame, weight] of pool) {
      roll -= weight;
      if (roll < 0) return frame;
    }
    return pool[pool.length - 1][0];
  }

  function scheduleMicro(now) {
    if (FRAME_GROUP[motion.baseFrame] !== "aligned") {
      motion.microNextAt = now + 900;
      return;
    }
    let frame =
      motion.queuedMicro ??
      pickWeighted(MICRO_POOLS[motion.mood] ?? MICRO_POOLS.default);
    motion.queuedMicro = null;
    if (!frames[frame]?.naturalWidth) frame = "blink";
    const timing = MICRO_TIMING[frame];
    motion.micro = {
      frame,
      phase: "in",
      startedAt: now,
      alpha: 0,
      inMs: timing.inMs,
      holdMs: timing.holdMs(),
      outMs: timing.outMs,
    };
  }

  function advanceMicro(now) {
    const micro = motion.micro;
    if (now < talkUntil) {
      // talking suspends ambient micro-expressions; the mouth has the floor
      micro.phase = "idle";
      micro.alpha = 0;
      motion.microNextAt = Math.max(motion.microNextAt, talkUntil + 500);
      return;
    }
    if (micro.phase === "idle") {
      if (now >= motion.microNextAt) scheduleMicro(now);
      return;
    }
    const elapsed = now - micro.startedAt;
    if (micro.phase === "in") {
      micro.alpha = Math.min(1, elapsed / micro.inMs);
      if (micro.alpha >= 1) { micro.phase = "hold"; micro.startedAt = now; }
    } else if (micro.phase === "hold") {
      micro.alpha = 1;
      if (elapsed >= micro.holdMs) { micro.phase = "out"; micro.startedAt = now; }
    } else if (micro.phase === "out") {
      micro.alpha = Math.max(0, 1 - elapsed / micro.outMs);
      if (micro.alpha <= 0) {
        micro.phase = "idle";
        const paceMood = motion.mood;
        const gap = micro.frame === "blink" && Math.random() < 0.16
          ? 240
          : paceMood === "paused" ? 2_600 + Math.random() * 4_200 : 1_900 + Math.random() * 3_600;
        motion.microNextAt = now + gap;
      }
    }
  }

  // ---------------------------------------------------------------- canvas painting
  let displayedTime = "01:30";
  let displayedOvertime = false;

  function mapDisplayPoint(quad, x, y) {
    const u = x / DISPLAY_LAYOUT.width;
    const v = y / DISPLAY_LAYOUT.height;
    const topX = quad.topLeft.x + (quad.topRight.x - quad.topLeft.x) * u;
    const topY = quad.topLeft.y + (quad.topRight.y - quad.topLeft.y) * u;
    const bottomX = quad.bottomLeft.x + (quad.bottomRight.x - quad.bottomLeft.x) * u;
    const bottomY = quad.bottomLeft.y + (quad.bottomRight.y - quad.bottomLeft.y) * u;
    return {
      x: topX + (bottomX - topX) * v,
      y: topY + (bottomY - topY) * v,
    };
  }

  function circlePoints(centerX, centerY, radius) {
    return Array.from({ length: 16 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 16;
      return [
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      ];
    });
  }

  // the display geometry is static per frame group, so the perspective mapping
  // runs once here instead of on every animation frame
  const displayGeometryCache = new Map();

  function displayGeometry(group) {
    const cached = displayGeometryCache.get(group);
    if (cached) return cached;

    const quad = DISPLAY_QUADS[group];
    const plus = PLUS_PLACEMENT[group];
    const mapPolygon = (points, offsetX = 0, scaleX = 1, offsetY = 0) =>
      points.map(([x, y]) => mapDisplayPoint(quad, x * scaleX + offsetX, y + offsetY));
    const geometry = {
      digitSlots: DIGIT_OFFSETS.map((offsetX) =>
        SEGMENTS.map(([segment, points]) => [
          segment,
          mapPolygon(points, offsetX, DIGIT_SCALE_X, DIGIT_OFFSET_Y),
        ]),
      ),
      colonDots: [circlePoints(110, 45, 3.5), circlePoints(110, 76, 3.5)].map(
        (points) => mapPolygon(points),
      ),
      // -18 / 59.5 is the plus glyph's center in layout space
      plusGlyph: PLUS_GLYPH.map((points) =>
        mapPolygon(points.map(([x, y]) => [
          (x + 18) * plus.scale - 18 + plus.shiftX,
          (y - 59.5) * plus.scale + 59.5,
        ])),
      ),
    };
    displayGeometryCache.set(group, geometry);
    return geometry;
  }

  function fillPolygon(points, color) {
    sceneContext.beginPath();
    points.forEach((point, index) => {
      if (index === 0) sceneContext.moveTo(point.x, point.y);
      else sceneContext.lineTo(point.x, point.y);
    });
    sceneContext.closePath();
    sceneContext.fillStyle = color;
    sceneContext.fill();
  }

  function drawTimerDisplay(group, value, isOvertime) {
    const colors = isOvertime ? DIGIT_COLORS.overtime : DIGIT_COLORS.normal;
    const geometry = displayGeometry(group);
    const digits = value.replace(":", "").split("");
    for (const [digitIndex, digit] of digits.entries()) {
      const activeSegments = DIGIT_SEGMENTS[digit] ?? "";
      for (const [segment, points] of geometry.digitSlots[digitIndex]) {
        fillPolygon(
          points,
          activeSegments.includes(segment) ? colors.on : colors.ghost,
        );
      }
    }

    // colon blinks once per second while the meeting runs long
    const colonVisible = !isOvertime || Math.floor(Date.now() / 500) % 2 === 0;
    if (colonVisible) {
      for (const dot of geometry.colonDots) fillPolygon(dot, colors.on);
    }
    if (isOvertime) {
      for (const points of geometry.plusGlyph) fillPolygon(points, colors.on);
    }
  }

  // updated by the ResizeObserver below so drawScene never forces page layout
  let sceneCssWidth = 0;

  // slight overdraw hides edge gaps introduced by the motion transform
  const FRAME_OVERDRAW = 8;

  function drawFrame(image, alpha = 1) {
    if (!image?.complete || !image.naturalWidth) return;
    sceneContext.globalAlpha = alpha;
    sceneContext.drawImage(
      image,
      -FRAME_OVERDRAW,
      -FRAME_OVERDRAW,
      SCENE_SIZE.width + FRAME_OVERDRAW * 2,
      SCENE_SIZE.height + FRAME_OVERDRAW * 2,
    );
    sceneContext.globalAlpha = 1;
  }

  function drawScene(nowPerf = performance.now()) {
    if (disposed || !sceneContext) return;
    const cssWidth = sceneCssWidth || overlay.offsetWidth || 360;
    const cssHeight = cssWidth * (SCENE_SIZE.height / SCENE_SIZE.width);
    const pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const targetWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
    const targetHeight = Math.max(1, Math.round(cssHeight * pixelRatio));

    if (scene.width !== targetWidth || scene.height !== targetHeight) {
      scene.width = targetWidth;
      scene.height = targetHeight;
    }

    sceneContext.setTransform(
      targetWidth / SCENE_SIZE.width, 0, 0,
      targetHeight / SCENE_SIZE.height, 0, 0,
    );
    sceneContext.fillStyle = "#d7e7f2";
    sceneContext.fillRect(0, 0, SCENE_SIZE.width, SCENE_SIZE.height);

    const reduced = prefersReducedMotion.matches;
    const seconds = nowPerf / 1000;
    const mood = motion.mood;

    // continuous life: breathing + sway + parallax + tremor, never at rest
    let dx = 0;
    let dy = 0;
    let rotate = 0;
    let scale = 1;
    if (!reduced) {
      motion.pointerEased.x += (motion.pointer.x - motion.pointerEased.x) * 0.08;
      motion.pointerEased.y += (motion.pointer.y - motion.pointerEased.y) * 0.08;
      const breath = Math.sin(seconds * 2.1) * 1.1 + Math.sin(seconds * 3.37) * 0.45;
      const sway = Math.sin(seconds * 0.47) * 1.4 + Math.sin(seconds * 0.203) * 0.9;
      const tremorMagnitude =
        mood === "panic" ? 1.6
        : mood === "urgent" ? 0.55
        : mood === "overtime" ? motion.nagPulse * 1.2
        : mood === "overtimeSettled" ? motion.nagPulse * 0.7
        : 0;
      dx = sway + motion.pointerEased.x * 3.4 + (Math.random() - 0.5) * 2 * tremorMagnitude;
      dy = breath + motion.pointerEased.y * 2.2 + (Math.random() - 0.5) * 2 * tremorMagnitude;
      rotate = (sway * 0.06 + motion.pointerEased.x * 0.18) * (Math.PI / 180);

      if (mood === "celebrate") {
        motion.bounceVelocity += (1 - motion.bounce) * 0.16;
        motion.bounceVelocity *= 0.82;
        motion.bounce += motion.bounceVelocity;
      } else {
        motion.bounce = 0;
        motion.bounceVelocity = 0;
      }
      motion.punch = Math.max(0, motion.punch - 0.09);
      motion.nagPulse = Math.max(0, motion.nagPulse - 0.02);
      scale = 1 + motion.bounce * 0.028 + motion.punch * motion.punch * 0.05;
    }

    const centerX = SCENE_SIZE.width / 2;
    const centerY = SCENE_SIZE.height / 2 + 20;
    sceneContext.save();
    sceneContext.translate(centerX + dx, centerY + dy);
    sceneContext.rotate(rotate);
    sceneContext.scale(scale, scale);
    sceneContext.translate(-centerX, -centerY);

    drawFrame(frames[motion.baseFrame]);
    if (!reduced && FRAME_GROUP[motion.baseFrame] === "aligned") {
      if (nowPerf < talkUntil) {
        // mouth flaps: hard swaps through talk-a / talk-b / closed, like anime
        const beat = Math.floor(nowPerf / 130) % 3;
        if (beat < 2) drawFrame(frames[beat === 0 ? "talk-a" : "talk-b"]);
      } else if (motion.micro.alpha > 0) {
        drawFrame(frames[motion.micro.frame], motion.micro.alpha);
      }
    }

    drawTimerDisplay(FRAME_GROUP[motion.baseFrame], displayedTime, displayedOvertime);
    sceneContext.restore();

    if (!reduced && motion.flashAlpha > 0.01) {
      sceneContext.globalAlpha = motion.flashAlpha;
      sceneContext.fillStyle = "#fff";
      sceneContext.fillRect(0, 0, SCENE_SIZE.width, SCENE_SIZE.height);
      sceneContext.globalAlpha = 1;
      motion.flashAlpha *= 0.78;
    }
  }

  let animationFrame = 0;
  let paintQueued = false;

  function requestPaint() {
    if (paintQueued || disposed) return;
    paintQueued = true;
    window.requestAnimationFrame((now) => {
      paintQueued = false;
      drawScene(now);
    });
  }

  function frameLoop(now) {
    if (disposed) return;
    animationFrame = window.requestAnimationFrame(frameLoop);
    if (now - motion.lastFrame < 33) return;
    motion.lastFrame = now;
    advanceMicro(now);
    drawScene(now);
  }

  function startMotion() {
    if (prefersReducedMotion.matches || disposed || animationFrame) return;
    motion.lastFrame = 0;
    animationFrame = window.requestAnimationFrame(frameLoop);
  }

  function stopMotion() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  prefersReducedMotion.addEventListener("change", () => {
    if (prefersReducedMotion.matches) stopMotion();
    else startMotion();
    requestPaint();
  }, { signal: listeners.signal });

  document.addEventListener("pointermove", (event) => {
    motion.pointer.x = Math.max(-1.4, Math.min(1.4, (event.clientX / window.innerWidth - 0.5) * 2.8));
    motion.pointer.y = Math.max(-1.4, Math.min(1.4, (event.clientY / window.innerHeight - 0.5) * 2.8));
  }, { passive: true, signal: listeners.signal });

  const sceneResizeObserver = new ResizeObserver((entries) => {
    sceneCssWidth = entries[entries.length - 1].contentRect.width;
    requestPaint();
  });
  sceneResizeObserver.observe(scene);

  // ---------------------------------------------------------------- render + transitions
  let prevStatus = null;
  let prevPhase = null;
  let prevSecond = null;
  let prevOvertimeMinute = -1;
  let lastAmbientAt = performance.now();
  const PHASE_RANK = { calm: 0, half: 1, warning: 2, final: 3 };
  const STATUS_LABELS = { idle: "Ready", running: "Live", paused: "Paused", done: "Over" };
  const TOGGLE_MODES = { idle: "start", running: "pause", paused: "resume", done: "again" };

  function detectTransitions(now) {
    const status = state?.status ?? "idle";
    const phase = currentPhase(now);
    const milliseconds = remaining(now);
    const wholeSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

    if (status === "running") {
      if (prevSecond !== null && wholeSeconds < prevSecond) {
        if (wholeSeconds > 0 && wholeSeconds <= 10) playTick(wholeSeconds);
        if (wholeSeconds === 30 && state.durationMs >= 45_000) playHeadsUp();
      }
      prevSecond = wholeSeconds;
    } else {
      prevSecond = null;
    }

    if (status === "done" && prevStatus !== "done" && prevStatus !== null) {
      playChime();
      showCaption("done");
    }

    if (status === "done") {
      const overtimeMinute = Math.floor(overtime(now) / 60_000);
      if (overtimeMinute > prevOvertimeMinute && overtimeMinute > 0) {
        playNag(overtimeMinute);
        showCaption(overtimeMinute >= 3 ? "overtimeDeep" : "overtime");
        motion.nagPulse = 1;
        if (overtimeMinute >= 2) queueMicro("sigh");
      }
      prevOvertimeMinute = overtimeMinute;
    } else {
      prevOvertimeMinute = -1;
    }

    if (
      status === "running" && prevPhase !== null && phase !== prevPhase &&
      PHASE_RANK[phase] !== undefined &&
      (PHASE_RANK[prevPhase] === undefined || PHASE_RANK[phase] > PHASE_RANK[prevPhase])
    ) {
      // a just-spoken action line (start, +30, ...) keeps priority over phase talk
      if (phase !== "calm" && performance.now() - lastCaptionAt > 1_500) {
        showCaption(phase);
      }
    }

    // occasional unprompted commentary so Maya never feels asleep
    const ambientGap = performance.now() - Math.max(lastCaptionAt, lastAmbientAt);
    if (status === "running" && phase === "calm" && ambientGap > 24_000 && Math.random() < 0.12) {
      lastAmbientAt = performance.now();
      showCaption("calm");
    } else if (status === "paused" && ambientGap > 30_000 && Math.random() < 0.1) {
      lastAmbientAt = performance.now();
      showCaption("paused");
    }

    prevStatus = status;
    prevPhase = phase;
    setMood(moodFor(phase));
  }

  function durationText() {
    return formatTime(state?.durationMs ?? DEFAULT_DURATION_MS);
  }

  function paintChrome(now, status, phase, isOvertime, milliseconds) {
    const totalSeconds = Math.max(0, isOvertime ? Math.floor(milliseconds / 1000) : Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    timerReading.textContent = isOvertime
      ? `over by ${minutes} minutes ${seconds} seconds`
      : `${minutes} minutes ${seconds} seconds`;
    overlay.dataset.status = status;
    overlay.dataset.phase = phase;
    overlay.classList.toggle("is-urgent", status === "running" && remaining(now) <= 10_000);
    statusText.textContent = STATUS_LABELS[status] ?? "Ready";

    const toggleMode = TOGGLE_MODES[status] ?? "start";
    toggleIcon.textContent = status === "running" ? "Ⅱ" : "▶";
    toggleCaption.textContent = toggleMode;
    toggle.setAttribute("aria-label", `${toggleMode[0].toUpperCase()}${toggleMode.slice(1)} timer`);

    for (const button of presetButtons) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.durationMs) === state?.durationMs));
    }
    if (!stepping && shadow.activeElement !== stepperTime) {
      stepperTime.value = durationText();
    }
  }

  let paintedChromeKey = "";

  function render(now = Date.now()) {
    if (disposed) return;
    const status = state?.status ?? "idle";
    const phase = currentPhase(now);
    const isOvertime = status === "done";
    const milliseconds = isOvertime ? overtime(now) : remaining(now);

    displayedTime = formatTime(
      isOvertime ? Math.floor(milliseconds / 1000) * 1000 : milliseconds,
    );
    displayedOvertime = isOvertime;
    if (prefersReducedMotion.matches || !animationFrame) requestPaint();

    // the visible chrome only changes when one of these changes
    const chromeKey = `${status}|${phase}|${displayedTime}|${state?.durationMs}`;
    if (chromeKey !== paintedChromeKey) {
      paintedChromeKey = chromeKey;
      paintChrome(now, status, phase, isOvertime, milliseconds);
    }

    if (status === "running" && remaining(now) <= 0 && !expirationSent) {
      expirationSent = true;
      void sendTimerAction("expire");
    } else if (remaining(now) > 0) {
      expirationSent = false;
    }
  }

  function tick() {
    if (disposed) return;
    const now = Date.now();
    detectTransitions(now);
    render(now);
  }

  // ---------------------------------------------------------------- messaging
  function request(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function showDisconnected() {
    if (disposed) return;
    connectionMessage.classList.add("is-visible");
    shadow.querySelectorAll("button, input").forEach((control) => {
      if (!control.classList.contains("hangup")) control.disabled = true;
    });
  }

  async function sendTimerAction(action, durationMs) {
    const response = await request({
      type: "MAYA_TIMER_ACTION",
      action,
      ...(Number.isFinite(durationMs) ? { durationMs } : {}),
    });
    if (disposed) return;
    if (!response?.ok || !response.state) {
      showDisconnected();
      return;
    }
    state = response.state;
    tick();
  }

  // ---------------------------------------------------------------- position + drag
  function clampPosition(left, top) {
    return {
      left: Math.max(8, Math.min(window.innerWidth - overlay.offsetWidth - 8, left)),
      top: Math.max(8, Math.min(window.innerHeight - overlay.offsetHeight - 8, top)),
    };
  }

  function applyPosition(left, top) {
    const position = clampPosition(left, top);
    overlay.style.left = `${position.left}px`;
    overlay.style.top = `${position.top}px`;
  }

  async function restorePosition() {
    try {
      const saved = await chrome.storage.local.get(OVERLAY_POSITION_KEY);
      if (disposed) return;
      const position = saved[OVERLAY_POSITION_KEY] ?? DEFAULT_POSITION;
      applyPosition(window.innerWidth - overlay.offsetWidth - position.right, position.top);
    } catch {
      applyPosition(
        window.innerWidth - overlay.offsetWidth - DEFAULT_POSITION.right,
        DEFAULT_POSITION.top,
      );
    }
  }

  function persistPosition() {
    const rect = overlay.getBoundingClientRect();
    try {
      void chrome.storage.local.set({
        [OVERLAY_POSITION_KEY]: {
          right: Math.max(8, window.innerWidth - rect.right),
          top: rect.top,
        },
      }).catch(showDisconnected);
    } catch {
      showDisconnected();
    }
  }

  function beginDrag(event) {
    const rect = overlay.getBoundingClientRect();
    drag = { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragStrip.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    applyPosition(event.clientX - drag.x, event.clientY - drag.y);
  }

  function endDrag(event) {
    if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;
    drag = null;
    persistPosition();
  }

  function moveWithKeyboard(event) {
    const movement = event.shiftKey ? 40 : 10;
    const offsets = {
      ArrowLeft: [-movement, 0], ArrowRight: [movement, 0],
      ArrowUp: [0, -movement], ArrowDown: [0, movement],
    };
    if (!offsets[event.key]) return;
    event.preventDefault();
    const rect = overlay.getBoundingClientRect();
    applyPosition(rect.left + offsets[event.key][0], rect.top + offsets[event.key][1]);
    persistPosition();
  }

  // resize storms fire this dozens of times; reposition now, persist once
  let persistTimeout = 0;

  function keepVisible() {
    const rect = overlay.getBoundingClientRect();
    applyPosition(rect.left, rect.top);
    window.clearTimeout(persistTimeout);
    persistTimeout = window.setTimeout(persistPosition, 200);
  }

  // ---------------------------------------------------------------- setup tray
  let stepping = false;
  let pendingDurationMs = DEFAULT_DURATION_MS;
  let stepCommitTimeout = 0;
  let stepRepeatTimeout = 0;
  let stepRepeatInterval = 0;
  let suppressStepClick = false;

  function commitPendingDuration() {
    stepping = false;
    void sendTimerAction("set-duration", pendingDurationMs);
  }

  function applyStep(stepMs) {
    if (!stepping) {
      stepping = true;
      pendingDurationMs = state?.durationMs ?? DEFAULT_DURATION_MS;
    }
    pendingDurationMs = Math.max(STEP_MIN_MS, Math.min(MAX_DURATION_MS, pendingDurationMs + stepMs));
    stepperTime.value = formatTime(pendingDurationMs);
    window.clearTimeout(stepCommitTimeout);
    stepCommitTimeout = window.setTimeout(commitPendingDuration, 350);
  }

  function stopStepRepeat() {
    window.clearTimeout(stepRepeatTimeout);
    window.clearInterval(stepRepeatInterval);
    stepRepeatTimeout = 0;
    stepRepeatInterval = 0;
  }

  function toggleSetup() {
    const isOpen = !setup.classList.contains("is-open");
    setup.classList.toggle("is-open", isOpen);
    setupToggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) stepperTime.value = durationText();
    window.requestAnimationFrame(keepVisible);
  }

  shadow.querySelectorAll(".step-button").forEach((button) => {
    const stepMs = Number(button.dataset.stepMs);
    button.addEventListener("pointerdown", (event) => {
      if (button.disabled) return;
      event.preventDefault();
      suppressStepClick = true;
      applyStep(stepMs);
      stopStepRepeat();
      stepRepeatTimeout = window.setTimeout(() => {
        stepRepeatInterval = window.setInterval(() => applyStep(stepMs), 110);
      }, 450);
    }, { signal: listeners.signal });
    for (const type of ["pointerup", "pointerleave", "pointercancel"]) {
      button.addEventListener(type, stopStepRepeat, { signal: listeners.signal });
    }
    button.addEventListener("click", () => {
      if (suppressStepClick) {
        suppressStepClick = false;
        return;
      }
      applyStep(stepMs);
    }, { signal: listeners.signal });
  });

  // typed time entry: "2:30", "230", or "90" all work, microwave-style
  const stepperHint = shadow.querySelector(".stepper-hint");
  const STEPPER_HINT_DEFAULT = stepperHint.textContent;

  function parseTypedDuration(text) {
    const cleaned = text.trim().replace(/[^0-9:.\s]/g, "");
    if (!cleaned) return null;
    const parts = cleaned.split(/[:.\s]+/).filter(Boolean);
    let minutes = 0;
    let seconds = 0;
    if (parts.length >= 2) {
      minutes = Number.parseInt(parts[0], 10) || 0;
      seconds = Number.parseInt(parts[1], 10) || 0;
    } else {
      const digits = parts[0];
      if (digits.length === 1) {
        minutes = Number.parseInt(digits, 10) || 0;
      } else if (digits.length === 2) {
        seconds = Number.parseInt(digits, 10) || 0;
      } else {
        minutes = Number.parseInt(digits.slice(0, -2), 10) || 0;
        seconds = Number.parseInt(digits.slice(-2), 10) || 0;
      }
    }
    const totalSeconds = minutes * 60 + seconds;
    if (!totalSeconds) return null;
    return Math.max(TYPED_MIN_MS, Math.min(MAX_DURATION_MS, totalSeconds * 1000));
  }

  function applyDuration(durationMs) {
    void sendTimerAction("set-duration", durationMs);
    showCaption("durationSet");
    queueAcknowledgement();
  }

  function commitTypedDuration() {
    const parsed = parseTypedDuration(stepperTime.value);
    stepperHint.textContent = STEPPER_HINT_DEFAULT;
    if (parsed === null || parsed === state?.durationMs) {
      stepperTime.value = durationText();
      return;
    }
    stepperTime.value = formatTime(parsed);
    applyDuration(parsed);
  }

  stepperTime.addEventListener("focus", () => stepperTime.select(), { signal: listeners.signal });
  stepperTime.addEventListener("input", () => {
    const parsed = parseTypedDuration(stepperTime.value);
    stepperHint.textContent = parsed === null
      ? STEPPER_HINT_DEFAULT
      : `enter sets ${formatTime(parsed)}`;
  }, { signal: listeners.signal });
  stepperTime.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTypedDuration();
      stepperTime.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      stepperTime.value = durationText();
      stepperHint.textContent = STEPPER_HINT_DEFAULT;
      stepperTime.blur();
    }
  }, { signal: listeners.signal });
  stepperTime.addEventListener("blur", commitTypedDuration, { signal: listeners.signal });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyDuration(Number(button.dataset.durationMs));
    }, { signal: listeners.signal });
  });

  // ---------------------------------------------------------------- sound toggle
  function paintSoundToggle() {
    soundToggle.setAttribute("aria-pressed", String(soundMuted));
    soundToggle.setAttribute("aria-label", soundMuted ? "Unmute Maya's sounds" : "Mute Maya's sounds");
  }

  soundToggle.addEventListener("click", () => {
    soundMuted = !soundMuted;
    paintSoundToggle();
    showCaption(soundMuted ? "muted" : "unmuted", 3_200);
    try {
      void chrome.storage.local.set({ [SOUND_MUTED_KEY]: soundMuted }).catch(() => {});
    } catch {}
  }, { signal: listeners.signal });

  // unlock audio on any interaction inside the overlay
  shadow.addEventListener("pointerdown", () => {
    if (!soundMuted) ensureAudio();
  }, { capture: true, signal: listeners.signal });

  // ---------------------------------------------------------------- lifecycle
  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.clearInterval(intervalId);
    window.clearTimeout(captionTimeout);
    window.clearTimeout(stepCommitTimeout);
    window.clearTimeout(persistTimeout);
    stopStepRepeat();
    stopMotion();
    sceneResizeObserver.disconnect();
    listeners.abort();
    if (audioContext) void audioContext.close().catch(() => {});
    try {
      chrome.storage.local.onChanged.removeListener(receiveStorageChange);
    } finally {
      host.remove();
    }
  }

  function receiveStorageChange(changes, areaName) {
    if (areaName !== "local" || disposed) return;
    const mutedChange = changes[SOUND_MUTED_KEY];
    if (mutedChange && typeof mutedChange.newValue === "boolean") {
      soundMuted = mutedChange.newValue;
      paintSoundToggle();
    }
    if (changes[TIMER_STATE_KEY]?.newValue) {
      state = changes[TIMER_STATE_KEY].newValue;
      tick();
    }
  }

  dragStrip.addEventListener("pointerdown", beginDrag, { signal: listeners.signal });
  dragStrip.addEventListener("pointermove", moveDrag, { signal: listeners.signal });
  dragStrip.addEventListener("pointerup", endDrag, { signal: listeners.signal });
  dragStrip.addEventListener("pointercancel", endDrag, { signal: listeners.signal });
  dragStrip.addEventListener("lostpointercapture", endDrag, { signal: listeners.signal });
  dragHandle.addEventListener("keydown", moveWithKeyboard, { signal: listeners.signal });
  window.addEventListener("resize", keepVisible, { signal: listeners.signal });
  setupToggle.addEventListener("click", toggleSetup, { signal: listeners.signal });
  shadow.querySelector(".hangup").addEventListener("click", cleanup, { signal: listeners.signal });

  shadow.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const statusBefore = state?.status ?? "idle";
      void sendTimerAction(action);
      if (action === "toggle") {
        if (statusBefore === "running") showCaption("paused");
        else if (statusBefore === "paused") showCaption("resumed");
        else showCaption("start");
        queueAcknowledgement();
      } else if (action === "add-30") {
        showCaption("added");
        queueAcknowledgement();
      } else if (action === "subtract-30") {
        showCaption("subtracted");
        queueAcknowledgement();
      } else if (action === "reset") {
        showCaption("reset");
      }
    }, { signal: listeners.signal });
  });

  const intervalId = window.setInterval(tick, 250);

  host.__mayaTimerCleanup = cleanup;
  chrome.storage.local.onChanged.addListener(receiveStorageChange);
  void restorePosition();
  try {
    chrome.storage.local.get(SOUND_MUTED_KEY).then((saved) => {
      if (disposed) return;
      soundMuted = saved[SOUND_MUTED_KEY] === true;
      paintSoundToggle();
    }).catch(() => {});
  } catch {}
  request({ type: "MAYA_TIMER_GET_STATE" }).then((response) => {
    if (disposed) return;
    if (!response?.ok || !response.state) {
      showDisconnected();
      return;
    }
    state = response.state;
    prevStatus = state.status;
    prevPhase = currentPhase();
    motion.mood = moodFor(prevPhase);
    motion.baseFrame = baseFrameFor(motion.mood);
    render();
    if (state.status === "idle") showCaption("idle", 5_200);
  });
  startMotion();
  requestPaint();
})();
