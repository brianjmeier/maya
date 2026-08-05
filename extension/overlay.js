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

  // ---------------------------------------------------------------- seven-seg markup
  const DIGIT_SEGMENTS = {
    0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg",
    5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg",
  };
  const SEGMENT_POINTS = {
    a: "10,4 50,4 56,10 50,16 10,16 4,10",
    b: "50,18 56,12 60,18 60,44 54,50 48,44",
    c: "54,52 60,58 60,84 54,90 48,84 48,58",
    d: "10,84 50,84 56,90 50,96 10,96 4,90",
    e: "0,58 6,52 12,58 12,84 6,90 0,84",
    f: "0,18 6,12 12,18 12,44 6,50 0,44",
    g: "10,44 50,44 56,50 50,56 10,56 4,50",
  };
  const DIGIT_OFFSETS = [10, 62, 126, 178];

  const digitSlotsMarkup = DIGIT_OFFSETS.map((offset, slot) => {
    const polygons = Object.entries(SEGMENT_POINTS)
      .map(([name, points]) =>
        `<polygon class="seg" data-slot="${slot}" data-seg="${name}" points="${points}"/>`)
      .join("");
    return `<g transform="translate(${offset},10) scale(0.73,1)">${polygons}</g>`;
  }).join("");

  const displayMarkup = `
    <g id="display" transform="translate(392,166) scale(0.66)">
      <g id="plus-glyph" class="is-hidden">
        <rect x="-27" y="57" width="20" height="7" rx="2"/>
        <rect x="-20.5" y="50.5" width="7" height="20" rx="2"/>
      </g>
      ${digitSlotsMarkup}
      <circle class="colon-dot" cx="110" cy="55" r="5"/>
      <circle class="colon-dot" cx="110" cy="86" r="5"/>
    </g>`;

  // ---------------------------------------------------------------- Maya scene
  const sceneMarkup = `
  <svg class="scene" viewBox="0 0 640 427" role="img" aria-label="Maya, an original manga timekeeper, holding a large orange kitchen timer">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e9f0f9"/><stop offset="1" stop-color="#d3e4f4"/>
      </linearGradient>
      <linearGradient id="iris" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8a5a2e"/><stop offset="1" stop-color="#4a2c14"/>
      </linearGradient>
      <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.8" fill="#a9c4e2"/>
      </pattern>
      <clipPath id="eyeClipL"><path d="M 159,154 Q 174,141 190,152 Q 177,170 159,154 Z"/></clipPath>
      <clipPath id="eyeClipR"><path d="M 204,152 Q 220,141 235,154 Q 217,170 204,152 Z"/></clipPath>
    </defs>
    <rect width="640" height="427" fill="url(#sky)"/>
    <path d="M 0,80 Q 200,20 420,70 T 640,50 L 640,0 L 0,0 Z" fill="#f2e8d8" opacity=".55"/>
    <path d="M 0,360 Q 240,320 460,370 T 640,340 L 640,427 L 0,427 Z" fill="#c5d9ee" opacity=".5"/>
    <rect width="200" height="140" fill="url(#dots)" opacity=".35"/>
    <rect x="470" y="300" width="170" height="127" fill="url(#dots)" opacity=".35"/>
    <g id="speedlines" opacity="0">
      <g fill="#7fa8d9" opacity=".55">
        <polygon points="0,0 90,0 330,190"/><polygon points="640,10 640,90 400,200"/>
        <polygon points="0,427 100,427 330,250"/><polygon points="640,427 560,427 420,260"/>
        <polygon points="300,0 340,0 350,150"/>
      </g>
    </g>
    <g id="scene-inner">
      <ellipse cx="458" cy="356" rx="130" ry="12" fill="#b9cfe6" opacity=".5"/>
      <ellipse cx="200" cy="420" rx="120" ry="12" fill="#b9cfe6" opacity=".45"/>
      <g id="maya">
        <g id="torso">
          <path d="M 130,392 L 268,392 L 272,427 L 126,427 Z" fill="#28304a" stroke="#241812" stroke-width="3"/>
          <path d="M 150,238 Q 196,222 246,238 L 258,392 L 140,392 Z" fill="#f4f1ea" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 118,262 Q 122,238 152,230 Q 174,240 178,262 L 172,400 L 126,400 Q 114,330 118,262 Z" fill="#3d69ad" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 278,262 Q 274,238 244,230 Q 222,240 218,262 L 226,400 L 268,400 Q 282,330 278,262 Z" fill="#3d69ad" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 128,270 Q 126,330 130,392" fill="none" stroke="#24406e" stroke-width="1.8"/>
          <path d="M 268,270 Q 272,330 266,392" fill="none" stroke="#24406e" stroke-width="1.8"/>
          <path d="M 174,232 Q 197,246 222,232" fill="none" stroke="#ddd6c8" stroke-width="5"/>
          <path d="M 174,232 Q 197,246 222,232" fill="none" stroke="#241812" stroke-width="2.5"/>
          <path d="M 180,244 Q 197,260 214,244" fill="none" stroke="#d9a441" stroke-width="2.5"/>
          <circle cx="197" cy="262" r="5.5" fill="#e6b54d" stroke="#241812" stroke-width="2"/>
        </g>
        <g id="arm-support">
          <path d="M 240,238 Q 262,246 266,278 Q 268,300 262,316 L 236,308 Q 240,286 236,264 Q 232,246 228,240 Z" fill="#3d69ad" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 238,306 Q 280,322 336,330 L 336,352 Q 276,344 234,330 Z" fill="#3d69ad" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 306,322 Q 322,326 338,328 L 338,352 Q 320,350 302,346 Z" fill="#89aede" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 344,334 Q 366,326 386,336 Q 396,346 382,353 Q 358,358 342,350 Z" fill="#e9b585" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 352,338 Q 362,335 370,337 M 354,346 Q 364,344 372,346" stroke="#c98a5e" stroke-width="2" fill="none"/>
        </g>
        <path d="M 186,196 L 210,196 L 208,228 L 188,228 Z" fill="#e9b585" stroke="#241812" stroke-width="3"/>
        <path d="M 187,198 L 209,198 L 208,208 Q 198,213 188,208 Z" fill="#d99e6b" opacity=".85"/>
        <g id="head">
          <path d="M 152,148 Q 143,154 149,167 Q 155,174 161,165 Z" fill="#e9b585" stroke="#241812" stroke-width="3"/>
          <path d="M 242,148 Q 251,154 245,167 Q 239,174 233,165 Z" fill="#e9b585" stroke="#241812" stroke-width="3"/>
          <g id="earring-l"><circle cx="153" cy="177" r="6.5" fill="none" stroke="#d9a441" stroke-width="3"/></g>
          <g id="earring-r"><circle cx="241" cy="177" r="6.5" fill="none" stroke="#d9a441" stroke-width="3"/></g>
          <path d="M 156,124 Q 150,170 170,194 Q 186,210 197,210 Q 208,210 224,194 Q 244,170 238,124 Q 236,100 197,98 Q 158,100 156,124 Z" fill="#e9b585" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <ellipse cx="169" cy="174" rx="8" ry="4.5" fill="#e58b57" opacity=".28"/>
          <ellipse cx="225" cy="174" rx="8" ry="4.5" fill="#e58b57" opacity=".28"/>
          <path d="M 197,168 Q 201,173 197,177" fill="none" stroke="#b5765a" stroke-width="2.2" stroke-linecap="round"/>
          <g id="mouth">
            <path id="mouth-smile" d="M 184,189 Q 197,198 210,187" fill="none" stroke="#241812" stroke-width="3" stroke-linecap="round"/>
            <path id="mouth-talk-a" d="M 185,188 Q 197,186 209,188 Q 206,200 197,201 Q 188,200 185,188 Z" fill="#5a2c20" stroke="#241812" stroke-width="2.5" visibility="hidden"/>
            <path id="mouth-talk-b" d="M 188,190 Q 197,188 206,190 Q 204,196 197,197 Q 190,196 188,190 Z" fill="#5a2c20" stroke="#241812" stroke-width="2.5" visibility="hidden"/>
            <path id="mouth-worried" d="M 185,193 Q 197,187 209,193" fill="none" stroke="#241812" stroke-width="3" stroke-linecap="round" visibility="hidden"/>
            <path id="mouth-gasp" d="M 190,186 Q 197,183 204,186 Q 208,196 197,200 Q 186,196 190,186 Z" fill="#5a2c20" stroke="#241812" stroke-width="2.5" visibility="hidden"/>
            <path id="mouth-grin" d="M 181,186 Q 197,184 213,186 Q 210,203 197,204 Q 184,203 181,186 Z" fill="#5a2c20" stroke="#241812" stroke-width="2.5" visibility="hidden"/>
          </g>
          <g id="eyes-open">
            <g id="eye-l">
              <path d="M 159,154 Q 174,141 190,152 Q 177,170 159,154 Z" fill="#fdfcf8" stroke="#241812" stroke-width="2"/>
              <g clip-path="url(#eyeClipL)">
                <g id="pupil-l">
                  <circle cx="175" cy="156" r="9.5" fill="url(#iris)"/>
                  <circle cx="175" cy="156" r="4.4" fill="#1c0f08"/>
                  <circle cx="171.5" cy="152.5" r="3" fill="#fff"/>
                  <circle cx="179" cy="160" r="1.4" fill="#fff" opacity=".85"/>
                </g>
                <g id="lid-l" transform="translate(0,-24)">
                  <path d="M 156,154 Q 174,138 193,152 L 193,134 L 156,134 Z" fill="#e9b585"/>
                  <path d="M 156,154 Q 174,138 193,152" fill="none" stroke="#241812" stroke-width="2.5"/>
                </g>
              </g>
              <path d="M 158,153 Q 174,139 191,151" fill="none" stroke="#241812" stroke-width="4" stroke-linecap="round"/>
              <path d="M 158,153 L 152,149" stroke="#241812" stroke-width="3.5" stroke-linecap="round"/>
            </g>
            <g id="eye-r">
              <path d="M 204,152 Q 220,141 235,154 Q 217,170 204,152 Z" fill="#fdfcf8" stroke="#241812" stroke-width="2"/>
              <g clip-path="url(#eyeClipR)">
                <g id="pupil-r">
                  <circle cx="219" cy="156" r="9.5" fill="url(#iris)"/>
                  <circle cx="219" cy="156" r="4.4" fill="#1c0f08"/>
                  <circle cx="215.5" cy="152.5" r="3" fill="#fff"/>
                  <circle cx="223" cy="160" r="1.4" fill="#fff" opacity=".85"/>
                </g>
                <g id="lid-r" transform="translate(0,-24)">
                  <path d="M 201,154 Q 219,138 238,152 L 238,134 L 201,134 Z" fill="#e9b585"/>
                  <path d="M 201,154 Q 219,138 238,152" fill="none" stroke="#241812" stroke-width="2.5"/>
                </g>
              </g>
              <path d="M 203,151 Q 219,139 236,153" fill="none" stroke="#241812" stroke-width="4" stroke-linecap="round"/>
              <path d="M 236,153 L 242,149" stroke="#241812" stroke-width="3.5" stroke-linecap="round"/>
            </g>
          </g>
          <g id="eyes-happy" visibility="hidden">
            <path d="M 161,157 Q 175,146 189,157" fill="none" stroke="#241812" stroke-width="4" stroke-linecap="round"/>
            <path d="M 205,157 Q 219,146 233,157" fill="none" stroke="#241812" stroke-width="4" stroke-linecap="round"/>
          </g>
          <g id="brow-l"><path d="M 158,138 Q 173,130 190,136" fill="none" stroke="#241812" stroke-width="4.5" stroke-linecap="round"/></g>
          <g id="brow-r"><path d="M 204,136 Q 221,130 236,138" fill="none" stroke="#241812" stroke-width="4.5" stroke-linecap="round"/></g>
          <g id="hair-front">
            <path d="M 152,134 Q 148,96 197,92 Q 246,96 242,134 Q 238,114 220,109 Q 199,104 176,110 Q 158,115 152,134 Z" fill="#33241a" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
            <path d="M 168,112 Q 182,105 198,104" fill="none" stroke="#57402c" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M 208,105 Q 224,107 234,116" fill="none" stroke="#57402c" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M 156,146 Q 150,158 153,172" fill="none" stroke="#33241a" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M 238,146 Q 244,158 241,172" fill="none" stroke="#33241a" stroke-width="3.5" stroke-linecap="round"/>
          </g>
          <g id="bun">
            <ellipse cx="197" cy="72" rx="31" ry="23" fill="#33241a" stroke="#241812" stroke-width="3"/>
            <path d="M 175,78 Q 188,60 214,64" fill="none" stroke="#57402c" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M 180,88 Q 198,92 219,82" fill="none" stroke="#57402c" stroke-width="2.2" stroke-linecap="round"/>
          </g>
        </g>
      </g>
      <g id="timer-body">
        <g id="knob">
          <rect x="432" y="50" width="50" height="36" rx="8" fill="#d9a441" stroke="#241812" stroke-width="3.5"/>
          <line x1="444" y1="56" x2="444" y2="80" stroke="#a87a24" stroke-width="3"/>
          <line x1="457" y1="54" x2="457" y2="82" stroke="#a87a24" stroke-width="3"/>
          <line x1="470" y1="56" x2="470" y2="80" stroke="#a87a24" stroke-width="3"/>
          <rect x="424" y="82" width="66" height="14" rx="6" fill="#b3812c" stroke="#241812" stroke-width="3"/>
        </g>
        <rect x="392" y="342" width="30" height="14" rx="6" fill="#3a2a24" stroke="#241812" stroke-width="3"/>
        <rect x="496" y="342" width="30" height="14" rx="6" fill="#3a2a24" stroke="#241812" stroke-width="3"/>
        <rect x="338" y="92" width="240" height="256" rx="64" fill="#cf4f28" stroke="#241812" stroke-width="4"/>
        <rect x="348" y="102" width="220" height="236" rx="56" fill="none" stroke="#e06a3c" stroke-width="6" opacity=".85"/>
        <path d="M 356,300 Q 458,346 560,300 L 556,318 Q 458,356 360,318 Z" fill="#a83a1c" opacity=".6"/>
        <rect x="366" y="120" width="184" height="184" rx="42" fill="#f3e8cf" stroke="#241812" stroke-width="3.5"/>
        <path d="M 372,150 Q 380,128 402,126 L 512,126 Q 536,128 544,148 L 544,138 Q 536,124 512,122 L 402,122 Q 378,124 372,140 Z" fill="#fff" opacity=".5"/>
        ${displayMarkup}
        <g id="hand-grip">
          <path d="M 568,178 Q 587,182 588,198 Q 587,212 570,214 Q 561,214 558,206 L 558,186 Z" fill="#e9b585" stroke="#241812" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 561,188 Q 570,186 576,188 M 561,197 Q 571,195 578,197 M 561,206 Q 570,204 575,206" stroke="#c98a5e" stroke-width="2" fill="none"/>
        </g>
      </g>
      <g id="confetti" opacity="0">
        <g class="confetti-piece" fill="#e6b54d"><circle cx="330" cy="60" r="5"/></g>
        <g class="confetti-piece" fill="#7fa8d9"><rect x="560" y="70" width="9" height="9"/></g>
        <g class="confetti-piece" fill="#cf4f28"><circle cx="600" cy="150" r="4"/></g>
        <g class="confetti-piece" fill="#e6b54d"><rect x="300" y="120" width="8" height="8"/></g>
        <g class="confetti-piece" fill="#7fa8d9"><circle cx="80" cy="70" r="5"/></g>
        <g class="confetti-piece" fill="#cf4f28"><rect x="120" y="40" width="9" height="9"/></g>
        <g class="confetti-piece" fill="#e6b54d"><path d="M 280,40 l 3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1 Z"/></g>
        <g class="confetti-piece" fill="#e6b54d"><path d="M 590,100 l 3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1 Z"/></g>
      </g>
    </g>
  </svg>`;

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
      .video { position: relative; overflow: hidden; background: #d7e7f2; }
      .scene { display: block; width: 100%; height: auto; pointer-events: none; }
      .scene .seg { fill: #4a2717; opacity: .06; }
      .scene .seg.is-on { opacity: 1; }
      .scene .colon-dot, .scene #plus-glyph { fill: #4a2717; }
      .scene #plus-glyph.is-hidden { display: none; }
      .scene #display.is-overtime .seg, .scene #display.is-overtime .colon-dot,
      .scene #display.is-overtime #plus-glyph { fill: #b3261e; }
      .scene #display.is-overtime .colon-dot { animation: colon-blink 1s steps(2, jump-none) infinite; }
      #scene-inner, #maya, #head, #bun, #brow-l, #brow-r, #earring-l, #earring-r,
      #timer-body, #knob, #pupil-l, #pupil-r, #lid-l, #lid-r, .confetti-piece {
        transform-box: fill-box; transform-origin: 50% 50%;
      }
      #maya { transform-origin: 50% 100%; }
      #head { transform-origin: 50% 92%; }
      #bun { transform-origin: 50% 100%; }
      #earring-l, #earring-r { transform-origin: 50% 0%; }
      #timer-body { transform-origin: 50% 62%; }
      #knob { transform-origin: 50% 100%; }
      @keyframes colon-blink { 50% { opacity: .15; } }
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
        ${sceneMarkup}
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
  const display = shadow.querySelector("#display");
  const plusGlyph = shadow.querySelector("#plus-glyph");
  const digitSegments = [0, 1, 2, 3].map((slot) =>
    [...shadow.querySelectorAll(`.seg[data-slot="${slot}"]`)],
  );
  const rig = Object.fromEntries(
    [
      "scene-inner", "maya", "head", "bun", "brow-l", "brow-r", "earring-l",
      "earring-r", "pupil-l", "pupil-r", "lid-l", "lid-r", "eyes-open",
      "eyes-happy", "timer-body", "knob", "speedlines", "confetti",
    ].map((id) => [id, shadow.getElementById(id)]),
  );
  const mouthShapes = Object.fromEntries(
    ["smile", "talk-a", "talk-b", "worried", "gasp", "grin"].map((name) => [
      name,
      shadow.getElementById(`mouth-${name}`),
    ]),
  );
  const confettiPieces = [...shadow.querySelectorAll(".confetti-piece")];

  const listeners = new AbortController();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let state = null;
  let drag = null;
  let disposed = false;
  let expirationSent = false;
  let soundMuted = false;

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

  // ---------------------------------------------------------------- digits
  let lastDisplayed = "";
  let lastOvertimeShown = null;

  function paintDisplay(text, showOvertime) {
    if (text === lastDisplayed && showOvertime === lastOvertimeShown) return;
    lastDisplayed = text;
    lastOvertimeShown = showOvertime;
    display.classList.toggle("is-overtime", showOvertime);
    plusGlyph.classList.toggle("is-hidden", !showOvertime);
    const digits = text.replace(":", "");
    digitSegments.forEach((segments, slot) => {
      const active = DIGIT_SEGMENTS[digits[slot]] ?? "";
      for (const segment of segments) {
        segment.classList.toggle("is-on", active.includes(segment.dataset.seg));
      }
    });
  }

  // ---------------------------------------------------------------- animation engine
  const motion = {
    lastFrame: 0,
    pointer: { x: 0, y: 0 },
    pointerEased: { x: 0, y: 0 },
    blinkNextAt: performance.now() + 2_000,
    blinkPhase: null,
    blinkStartedAt: 0,
    doubleBlink: false,
    gaze: { x: 0, y: 0, targetX: 4, targetY: 1, nextAt: 0 },
    headTilt: 0,
    headTiltTarget: 0,
    headTiltNextAt: 0,
    nodPulse: 0,
    knobPulse: 0,
    bounce: 0,
    bounceVelocity: 0,
    speedlineOpacity: 0,
    confettiStartedAt: 0,
    mood: "calm",
    lastMouth: "smile",
  };

  function setMouth(name) {
    if (motion.lastMouth === name) return;
    motion.lastMouth = name;
    for (const [shapeName, node] of Object.entries(mouthShapes)) {
      node.setAttribute("visibility", shapeName === name ? "visible" : "hidden");
    }
  }

  function setHappyEyes(happy) {
    rig["eyes-open"].setAttribute("visibility", happy ? "hidden" : "visible");
    rig["eyes-happy"].setAttribute("visibility", happy ? "visible" : "hidden");
  }

  function moodFor(phase) {
    if (phase === "final") return "panic";
    if (phase === "warning") return "urgent";
    if (phase === "half") return "skeptic";
    if (phase === "celebrate") return "celebrate";
    if (phase === "overtime") return "overtime";
    if (phase === "paused") return "paused";
    return "calm";
  }

  function applyStaticPose(mood) {
    const browLift = { celebrate: -4, panic: -3, urgent: 1, skeptic: 0 }[mood] ?? 0;
    rig["brow-l"].style.transform = `translateY(${browLift}px)`;
    rig["brow-r"].style.transform = `translateY(${mood === "skeptic" ? -4 : browLift}px)`;
    setHappyEyes(mood === "celebrate");
    setMouth(
      mood === "celebrate" ? "grin"
      : mood === "panic" ? "gasp"
      : mood === "urgent" || mood === "overtime" ? "worried"
      : "smile",
    );
  }

  function scheduleGaze(now) {
    const mood = motion.mood;
    const roll = Math.random();
    let target;
    if (mood === "panic" || mood === "urgent") {
      target = roll < 0.7 ? [6, 1] : [0, 0];
    } else if (mood === "paused") {
      target = roll < 0.45 ? [-4, 2] : roll < 0.8 ? [0, 0] : [6, 1];
    } else {
      target =
        roll < 0.34 ? [6, 1]
        : roll < 0.6 ? [0, 0]
        : roll < 0.8 ? [motion.pointerEased.x * 1.4, motion.pointerEased.y]
        : [-3, 1];
    }
    motion.gaze.targetX = target[0];
    motion.gaze.targetY = target[1];
    motion.gaze.nextAt = now + 1_200 + Math.random() * (mood === "panic" ? 1_400 : 3_000);
  }

  function frame(now) {
    if (disposed) return;
    animationFrame = window.requestAnimationFrame(frame);
    if (now - motion.lastFrame < 33) return;
    motion.lastFrame = now;
    const seconds = now / 1000;
    const mood = motion.mood;

    // pointer parallax eases toward the latest pointer position
    motion.pointerEased.x += (motion.pointer.x - motion.pointerEased.x) * 0.08;
    motion.pointerEased.y += (motion.pointer.y - motion.pointerEased.y) * 0.08;

    // breathing: two irrational-ratio sines so the loop never visibly repeats
    const breath = Math.sin(seconds * 2.1) * 0.9 + Math.sin(seconds * 3.37) * 0.35;
    const sway = Math.sin(seconds * 0.47) * 0.7 + Math.sin(seconds * 0.203) * 0.5;

    // stochastic blinks with occasional double-blink
    if (motion.blinkPhase === null && now >= motion.blinkNextAt && mood !== "celebrate") {
      motion.blinkPhase = "closing";
      motion.blinkStartedAt = now;
      motion.doubleBlink = Math.random() < 0.18;
    }
    let lidProgress = 0;
    if (motion.blinkPhase === "closing") {
      lidProgress = Math.min(1, (now - motion.blinkStartedAt) / 90);
      if (lidProgress >= 1) { motion.blinkPhase = "hold"; motion.blinkStartedAt = now; }
    } else if (motion.blinkPhase === "hold") {
      lidProgress = 1;
      if (now - motion.blinkStartedAt > 70) { motion.blinkPhase = "opening"; motion.blinkStartedAt = now; }
    } else if (motion.blinkPhase === "opening") {
      lidProgress = 1 - Math.min(1, (now - motion.blinkStartedAt) / 110);
      if (lidProgress <= 0) {
        motion.blinkPhase = null;
        motion.blinkNextAt = motion.doubleBlink
          ? now + 260
          : now + 1_400 + Math.random() * 3_800;
        motion.doubleBlink = false;
      }
    }

    // gaze saccades
    if (now >= motion.gaze.nextAt) scheduleGaze(now);
    motion.gaze.x += (motion.gaze.targetX - motion.gaze.x) * 0.16;
    motion.gaze.y += (motion.gaze.targetY - motion.gaze.y) * 0.16;

    // head drift and nods
    if (now >= motion.headTiltNextAt) {
      motion.headTiltTarget = (Math.random() - 0.5) * (mood === "paused" ? 4.4 : 3.2);
      motion.headTiltNextAt = now + 2_600 + Math.random() * 4_200;
    }
    motion.headTilt += (motion.headTiltTarget - motion.headTilt) * 0.04;
    motion.nodPulse = Math.max(0, motion.nodPulse - 0.032);
    motion.knobPulse = Math.max(0, motion.knobPulse - 0.028);
    const nod = Math.sin(motion.nodPulse * Math.PI * 3) * motion.nodPulse * 5;

    // celebrate bounce spring
    if (mood === "celebrate") {
      motion.bounceVelocity += (1 - motion.bounce) * 0.16;
      motion.bounceVelocity *= 0.82;
      motion.bounce += motion.bounceVelocity;
    } else {
      motion.bounce = 0;
      motion.bounceVelocity = 0;
    }

    // urgency tremor on the timer itself: it is the thing that is upset
    const tremorMagnitude = mood === "panic" ? 1.5 : mood === "urgent" ? 0.55 : 0;
    const tremorX = (Math.random() - 0.5) * 2 * tremorMagnitude;
    const tremorY = (Math.random() - 0.5) * 2 * tremorMagnitude;

    // speedlines fade with mood
    const speedlineTarget = mood === "panic" ? 0.5 : mood === "urgent" ? 0.16 : 0;
    motion.speedlineOpacity += (speedlineTarget - motion.speedlineOpacity) * 0.1;
    rig.speedlines.setAttribute("opacity", motion.speedlineOpacity.toFixed(3));

    // confetti burst on celebrate entry
    if (motion.confettiStartedAt) {
      const elapsed = now - motion.confettiStartedAt;
      if (elapsed > 2_000) {
        motion.confettiStartedAt = 0;
        rig.confetti.setAttribute("opacity", "0");
      } else {
        rig.confetti.setAttribute("opacity", String(Math.max(0, 1 - elapsed / 1_800)));
        confettiPieces.forEach((piece, index) => {
          const fall = (elapsed / 1_800) * (26 + (index % 4) * 9);
          const spin = (elapsed / 1_000) * (60 + index * 17) * (index % 2 ? 1 : -1);
          piece.style.transform = `translateY(${fall}px) rotate(${spin}deg)`;
        });
      }
    }

    // mouth: talk flaps while a caption is on screen
    if (now < talkUntil) {
      setMouth(Math.floor(now / 115) % 3 === 2 ? "talk-b" : "talk-a");
    } else if (mood === "celebrate") {
      setMouth("grin");
    } else if (mood === "panic") {
      setMouth("gasp");
    } else if (mood === "urgent") {
      setMouth("worried");
    } else if (mood === "overtime") {
      setMouth(Math.sin(seconds * 0.55) > 0.4 ? "worried" : "smile");
    } else {
      setMouth("smile");
    }
    setHappyEyes(mood === "celebrate");

    // brows by mood
    const browTargets =
      mood === "skeptic" ? [[0, 0], [-4, -7]]
      : mood === "urgent" ? [[1.5, 9], [1.5, -9]]
      : mood === "panic" ? [[-3.5, 7], [-3.5, -7]]
      : mood === "celebrate" ? [[-4, 0], [-4, 0]]
      : [[0, 0], [0, 0]];
    rig["brow-l"].style.transform = `translateY(${browTargets[0][0]}px) rotate(${browTargets[0][1] * 0.35}deg)`;
    rig["brow-r"].style.transform = `translateY(${browTargets[1][0]}px) rotate(${browTargets[1][1] * 0.35}deg)`;

    // compose transforms
    rig["scene-inner"].style.transform =
      `translate(${(motion.pointerEased.x * 3).toFixed(2)}px, ${(motion.pointerEased.y * 2).toFixed(2)}px) rotate(${(motion.pointerEased.x * 0.22).toFixed(3)}deg)`;
    rig.maya.style.transform =
      `translate(${(sway * 1.1).toFixed(2)}px, ${(breath * 1.05).toFixed(2)}px)`;
    rig.head.style.transform =
      `rotate(${(motion.headTilt + sway * 0.5).toFixed(2)}deg) translateY(${(breath * 0.55 + nod).toFixed(2)}px)`;
    rig.bun.style.transform = `rotate(${(-motion.headTilt * 0.5).toFixed(2)}deg)`;
    const earringSwing = Math.sin(seconds * 3.05) * 1.6 + motion.headTilt * 2.4 + nod * 2.2;
    rig["earring-l"].style.transform = `rotate(${earringSwing.toFixed(2)}deg)`;
    rig["earring-r"].style.transform = `rotate(${(earringSwing * 0.9).toFixed(2)}deg)`;
    const pupilShift = `translate(${motion.gaze.x.toFixed(2)}px, ${motion.gaze.y.toFixed(2)}px)`;
    rig["pupil-l"].style.transform = pupilShift;
    rig["pupil-r"].style.transform = pupilShift;
    const lidShift = `translateY(${(24 * lidProgress - 24).toFixed(1)}px)`;
    rig["lid-l"].style.transform = lidShift;
    rig["lid-r"].style.transform = lidShift;
    const timerBob = Math.sin(seconds * 1.53 + 0.9) * 0.8;
    const bounceScale = 1 + motion.bounce * 0.05;
    rig["timer-body"].style.transform =
      `translate(${tremorX.toFixed(2)}px, ${(timerBob + tremorY).toFixed(2)}px) scale(${bounceScale.toFixed(4)}) rotate(${(tremorX * 0.3).toFixed(2)}deg)`;
    rig.knob.style.transform = `rotate(${(Math.sin(motion.knobPulse * Math.PI * 4) * motion.knobPulse * 14).toFixed(2)}deg)`;
  }

  let animationFrame = 0;

  function startMotion() {
    if (prefersReducedMotion.matches || disposed || animationFrame) return;
    motion.lastFrame = 0;
    animationFrame = window.requestAnimationFrame(frame);
  }

  function stopMotion() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  prefersReducedMotion.addEventListener("change", () => {
    if (prefersReducedMotion.matches) {
      stopMotion();
      for (const node of [
        rig["scene-inner"], rig.maya, rig.head, rig.bun, rig["earring-l"],
        rig["earring-r"], rig["pupil-l"], rig["pupil-r"], rig["timer-body"], rig.knob,
      ]) {
        node.style.transform = "";
      }
      rig["lid-l"].style.transform = "translateY(-24px)";
      rig["lid-r"].style.transform = "translateY(-24px)";
      rig.speedlines.setAttribute("opacity", "0");
      rig.confetti.setAttribute("opacity", "0");
      applyStaticPose(motion.mood);
    } else {
      startMotion();
    }
  }, { signal: listeners.signal });

  document.addEventListener("pointermove", (event) => {
    motion.pointer.x = Math.max(-1.4, Math.min(1.4, (event.clientX / window.innerWidth - 0.5) * 2.8));
    motion.pointer.y = Math.max(-1.4, Math.min(1.4, (event.clientY / window.innerHeight - 0.5) * 2.8));
  }, { passive: true, signal: listeners.signal });

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
      motion.confettiStartedAt = performance.now();
      motion.bounceVelocity = 0.5;
      showCaption("done");
    }

    if (status === "done") {
      const overtimeMinute = Math.floor(overtime(now) / 60_000);
      if (overtimeMinute > prevOvertimeMinute && overtimeMinute > 0) {
        playNag(overtimeMinute);
        showCaption(overtimeMinute >= 3 ? "overtimeDeep" : "overtime");
        motion.nodPulse = 0.9;
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
      motion.nodPulse = 0.7;
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
    motion.mood = moodFor(phase);
    if (prefersReducedMotion.matches) applyStaticPose(motion.mood);
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

    paintDisplay(formatted, isOvertime);
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
    motion.knobPulse = 0.8;
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
      motion.nodPulse = 0.9;
      motion.knobPulse = 1;
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
        motion.nodPulse = 0.9;
        motion.knobPulse = statusBefore === "running" ? 0.4 : 1;
      } else if (action === "add-30") {
        showCaption("added");
        motion.nodPulse = 0.7;
      } else if (action === "subtract-30") {
        showCaption("subtracted");
        motion.nodPulse = 0.7;
      } else if (action === "reset") {
        showCaption("reset");
        motion.knobPulse = 1;
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
    render();
    if (state.status === "idle") showCaption("idle", 5_200);
  });
  startMotion();
})();
