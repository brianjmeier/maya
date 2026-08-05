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
  const FRAME_NAMES = ["focused", "blink", "glance", "nod", "warning", "celebrate"];
  // focused/blink/glance/nod share one composition, so blends between them read
  // as facial motion; warning and celebrate are deliberate manga panel cuts.
  const FRAME_GROUP = {
    focused: "aligned", blink: "aligned", glance: "aligned", nod: "aligned",
    warning: "warning", celebrate: "celebrate",
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
        color: #f1f3f4; font-size: 22px; font-weight: 750;
        font-variant-numeric: tabular-nums; letter-spacing: .04em;
      }
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
            <output class="stepper-time">01:30</output>
            <span class="stepper-hint">timebox · hold to repeat</span>
          </span>
          <button class="step-button" type="button" data-step-ms="15000" aria-label="Extend timebox by 15 seconds">+15s</button>
        </div>
      </div>

      <nav class="call-dock" aria-label="Timer controls">
        <span class="control-stack"><button class="call-control" type="button" data-action="subtract-30" aria-label="Subtract 30 seconds">−30</button><span class="control-caption">seconds</span></span>
        <span class="control-stack"><button class="call-control toggle" type="button" data-action="toggle" aria-label="Start timer"><span class="toggle-icon" aria-hidden="true">▶</span></button><span class="control-caption toggle-caption">start</span></span>
        <span class="control-stack"><button class="call-control" type="button" data-action="add-30" aria-label="Add 30 seconds">+30</button><span class="control-caption">seconds</span></span>
        <span class="control-stack"><button class="call-control" type="button" data-action="reset" aria-label="Reset timer">↺</button><span class="control-caption">reset</span></span>
        <span class="control-stack"><button class="call-control setup-toggle" type="button" aria-label="Set timer duration" aria-expanded="false" aria-controls="maya-timer-setup">⌚</button><span class="control-caption">set</span></span>
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
    image.addEventListener("load", () => {
      if (name === "focused") requestPaint();
    }, { signal: listeners.signal });
    image.src = chrome.runtime.getURL(`assets/maya-${name}.webp`);
    frames[name] = image;
  }

  // ---------------------------------------------------------------- time helpers
  function remaining(now = Date.now()) {
    if (!state) return 90_000;
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
    if (status === "done") return overtime(now) < 6_000 ? "celebrate" : "overtime";
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
    if (soundMuted) return null;
    try {
      audioContext ??= new AudioContext();
      if (audioContext.state === "suspended") void audioContext.resume();
      return audioContext.state === "running" ? audioContext : null;
    } catch {
      return null;
    }
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

  function audible() {
    return !soundMuted && document.visibilityState === "visible";
  }

  function playTick(secondsLeft) {
    const context = audible() && ensureAudio();
    if (!context) return;
    playNote(context, {
      frequency: 1020 + (10 - secondsLeft) * 42,
      type: "triangle",
      gain: 0.13,
      duration: 0.07,
    });
  }

  function playHeadsUp() {
    const context = audible() && ensureAudio();
    if (!context) return;
    playNote(context, { frequency: 660, gain: 0.1, duration: 0.11 });
    playNote(context, { frequency: 880, gain: 0.1, at: 0.12, duration: 0.16 });
  }

  function playChime() {
    const context = audible() && ensureAudio();
    if (!context) return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      playNote(context, { frequency, gain: 0.15, at: index * 0.13, duration: 0.55 });
      playNote(context, { frequency: frequency * 2, type: "triangle", gain: 0.05, at: index * 0.13, duration: 0.4 });
    });
    playNote(context, { frequency: 1046.5, gain: 0.09, at: 0.42, duration: 0.7 });
  }

  function playNag(level) {
    const context = audible() && ensureAudio();
    if (!context) return;
    const base = 580 + Math.min(level, 4) * 36;
    playNote(context, { frequency: base, type: "triangle", gain: 0.12, duration: 0.06 });
    playNote(context, { frequency: base, type: "triangle", gain: 0.12, at: 0.16, duration: 0.06 });
    if (level >= 3) {
      playNote(context, { frequency: base * 1.12, type: "triangle", gain: 0.11, at: 0.32, duration: 0.06 });
    }
  }

  // ---------------------------------------------------------------- captions
  const lastLineIndex = {};
  let captionTimeout = 0;
  let lastCaptionAt = 0;

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
    nodQueued: false,
  };

  function moodFor(phase) {
    if (phase === "final") return "panic";
    if (phase === "warning") return "urgent";
    if (phase === "half") return "skeptic";
    if (phase === "celebrate") return "celebrate";
    if (phase === "overtime") return "overtime";
    if (phase === "paused") return "paused";
    return "calm";
  }

  function baseFrameFor(mood) {
    if (mood === "panic" || mood === "urgent" || mood === "overtime") return "warning";
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

  function queueNod() {
    motion.nodQueued = true;
  }

  function scheduleMicro(now) {
    const mood = motion.mood;
    if (FRAME_GROUP[motion.baseFrame] !== "aligned") {
      motion.microNextAt = now + 900;
      return;
    }
    let frame;
    const roll = Math.random();
    if (motion.nodQueued) {
      frame = "nod";
      motion.nodQueued = false;
    } else if (mood === "paused") {
      frame = roll < 0.3 ? "blink" : roll < 0.85 ? "glance" : "nod";
    } else if (mood === "skeptic") {
      frame = roll < 0.42 ? "blink" : roll < 0.8 ? "glance" : "nod";
    } else {
      frame = roll < 0.55 ? "blink" : roll < 0.78 ? "glance" : "nod";
    }
    const isBlink = frame === "blink";
    motion.micro = {
      frame,
      phase: "in",
      startedAt: now,
      alpha: 0,
      inMs: isBlink ? 70 : 180,
      holdMs: isBlink ? 90 : frame === "glance" ? 950 + Math.random() * 700 : 700,
      outMs: isBlink ? 90 : 200,
    };
  }

  function advanceMicro(now) {
    const micro = motion.micro;
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

  function fillMappedPolygon(quad, points, offsetX, color, scaleX = 1, offsetY = 0) {
    sceneContext.beginPath();
    points.forEach(([x, y], index) => {
      const mapped = mapDisplayPoint(quad, x * scaleX + offsetX, y + offsetY);
      if (index === 0) sceneContext.moveTo(mapped.x, mapped.y);
      else sceneContext.lineTo(mapped.x, mapped.y);
    });
    sceneContext.closePath();
    sceneContext.fillStyle = color;
    sceneContext.fill();
  }

  function fillMappedCircle(quad, centerX, centerY, radius, color) {
    const points = Array.from({ length: 16 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 16;
      return [
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      ];
    });
    fillMappedPolygon(quad, points, 0, color);
  }

  function drawTimerDisplay(quad, value, isOvertime) {
    const colors = isOvertime ? DIGIT_COLORS.overtime : DIGIT_COLORS.normal;
    const digits = value.replace(":", "").split("");
    for (const [digitIndex, digit] of digits.entries()) {
      const activeSegments = DIGIT_SEGMENTS[digit] ?? "";
      for (const [segment, points] of SEGMENTS) {
        fillMappedPolygon(quad, points, DIGIT_OFFSETS[digitIndex], colors.ghost, DIGIT_SCALE_X, DIGIT_OFFSET_Y);
        if (activeSegments.includes(segment)) {
          fillMappedPolygon(quad, points, DIGIT_OFFSETS[digitIndex], colors.on, DIGIT_SCALE_X, DIGIT_OFFSET_Y);
        }
      }
    }

    // colon blinks once per second while the meeting runs long
    const colonVisible = !isOvertime || Math.floor(Date.now() / 500) % 2 === 0;
    if (colonVisible) {
      fillMappedCircle(quad, 110, 45, 3.5, colors.on);
      fillMappedCircle(quad, 110, 76, 3.5, colors.on);
    }
    if (isOvertime) {
      for (const points of PLUS_GLYPH) {
        fillMappedPolygon(quad, points, 0, colors.on);
      }
    }
  }

  function drawScene(nowPerf = performance.now()) {
    if (disposed || !sceneContext) return;
    const cssWidth = scene.getBoundingClientRect().width || overlay.offsetWidth || 360;
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
    // slight overdraw hides edge gaps introduced by the motion transform
    const pad = 8;

    const baseImage = frames[motion.baseFrame];
    if (baseImage?.complete && baseImage.naturalWidth > 0) {
      sceneContext.drawImage(baseImage, -pad, -pad, SCENE_SIZE.width + pad * 2, SCENE_SIZE.height + pad * 2);
    }
    if (!reduced && FRAME_GROUP[motion.baseFrame] === "aligned" && motion.micro.alpha > 0) {
      const microImage = frames[motion.micro.frame];
      if (microImage?.complete && microImage.naturalWidth > 0) {
        sceneContext.globalAlpha = motion.micro.alpha;
        sceneContext.drawImage(microImage, -pad, -pad, SCENE_SIZE.width + pad * 2, SCENE_SIZE.height + pad * 2);
        sceneContext.globalAlpha = 1;
      }
    }

    const quad = DISPLAY_QUADS[FRAME_GROUP[motion.baseFrame]];
    drawTimerDisplay(quad, displayedTime, displayedOvertime);
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

  const sceneResizeObserver = new ResizeObserver(() => requestPaint());
  sceneResizeObserver.observe(scene);

  // ---------------------------------------------------------------- render + transitions
  let prevStatus = null;
  let prevPhase = null;
  let prevSecond = null;
  let prevOvertimeMinute = -1;
  let lastAmbientAt = performance.now();
  const PHASE_RANK = { calm: 0, half: 1, warning: 2, final: 3 };

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

  function render() {
    if (disposed) return;
    const now = Date.now();
    const status = state?.status ?? "idle";
    const phase = currentPhase(now);
    const isOvertime = status === "done";
    const milliseconds = isOvertime ? overtime(now) : remaining(now);
    const shownMs = isOvertime
      ? Math.floor(milliseconds / 1000) * 1000
      : milliseconds;
    const formatted = formatTime(shownMs);
    const totalSeconds = Math.max(0, isOvertime ? Math.floor(milliseconds / 1000) : Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    displayedTime = formatted;
    displayedOvertime = isOvertime;
    if (prefersReducedMotion.matches || !animationFrame) requestPaint();

    timerReading.textContent = isOvertime
      ? `over by ${minutes} minutes ${seconds} seconds`
      : `${minutes} minutes ${seconds} seconds`;
    overlay.dataset.status = status;
    overlay.dataset.phase = phase;
    overlay.classList.toggle("is-urgent", status === "running" && remaining(now) <= 10_000);
    statusText.textContent =
      status === "idle" ? "Ready"
      : status === "running" ? "Live"
      : status === "paused" ? "Paused"
      : "Over";

    const toggleMode = status === "running" ? "pause" : status === "paused" ? "resume" : status === "done" ? "again" : "start";
    toggleIcon.textContent = status === "running" ? "Ⅱ" : "▶";
    toggleCaption.textContent = toggleMode;
    toggle.setAttribute("aria-label", `${toggleMode[0].toUpperCase()}${toggleMode.slice(1)} timer`);

    shadow.querySelectorAll(".preset").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.durationMs) === state?.durationMs));
    });
    if (!stepping) stepperTime.textContent = formatTime(state?.durationMs ?? 90_000);

    if (status === "running" && remaining(now) <= 0 && !expirationSent) {
      expirationSent = true;
      void sendTimerAction("expire");
    } else if (remaining(now) > 0) {
      expirationSent = false;
    }
  }

  function tick() {
    if (disposed) return;
    detectTransitions(Date.now());
    render();
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
      const saved = await chrome.storage.local.get("overlayPosition");
      if (disposed) return;
      const position = saved.overlayPosition ?? { right: 24, top: 24 };
      applyPosition(window.innerWidth - overlay.offsetWidth - position.right, position.top);
    } catch {
      applyPosition(window.innerWidth - overlay.offsetWidth - 24, 24);
    }
  }

  function persistPosition() {
    const rect = overlay.getBoundingClientRect();
    try {
      void chrome.storage.local.set({
        overlayPosition: {
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

  function keepVisible() {
    const rect = overlay.getBoundingClientRect();
    applyPosition(rect.left, rect.top);
    persistPosition();
  }

  // ---------------------------------------------------------------- setup tray
  let stepping = false;
  let pendingDurationMs = 90_000;
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
      pendingDurationMs = state?.durationMs ?? 90_000;
    }
    pendingDurationMs = Math.max(15_000, Math.min(5_999_000, pendingDurationMs + stepMs));
    stepperTime.textContent = formatTime(pendingDurationMs);
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
    if (isOpen) stepperTime.textContent = formatTime(state?.durationMs ?? 90_000);
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

  shadow.querySelectorAll("[data-duration-ms]").forEach((button) => {
    button.addEventListener("click", () => {
      void sendTimerAction("set-duration", Number(button.dataset.durationMs));
      showCaption("durationSet");
      queueNod();
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
      void chrome.storage.local.set({ soundMuted }).catch(() => {});
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
    if (changes.soundMuted && typeof changes.soundMuted.newValue === "boolean") {
      soundMuted = changes.soundMuted.newValue;
      paintSoundToggle();
    }
    if (changes.timerState?.newValue) {
      state = changes.timerState.newValue;
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
        queueNod();
      } else if (action === "add-30") {
        showCaption("added");
        queueNod();
      } else if (action === "subtract-30") {
        showCaption("subtracted");
        queueNod();
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
    chrome.storage.local.get("soundMuted").then((saved) => {
      if (disposed) return;
      soundMuted = saved.soundMuted === true;
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
