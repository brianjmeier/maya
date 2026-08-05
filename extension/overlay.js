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

  const mayaImageUrl = chrome.runtime.getURL("assets/maya-timer.webp");
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
      }
      .preset[aria-pressed="true"] { color: #202124; background: #a8c7fa; }
      .exact-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
        align-items: end; gap: 7px;
        margin-top: 10px;
      }
      .time-field { display: grid; gap: 4px; }
      .time-field span {
        color: #bdc1c6; font-size: 9px; font-weight: 750;
        letter-spacing: .09em; text-transform: uppercase;
      }
      .time-field input {
        width: 100%; height: 38px; padding: 0 8px;
        color: #f1f3f4; background: #202124;
        border: 1px solid #5f6368; border-radius: 8px;
        font-size: 15px; font-variant-numeric: tabular-nums; text-align: center;
      }
      .separator { padding-bottom: 8px; color: #9aa0a6; font-weight: 800; }
      .set-button {
        height: 38px; padding: 0 15px;
        color: #202124; background: #a8c7fa;
        border: 0; border-radius: 8px; cursor: pointer; font-weight: 750;
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
        <canvas class="scene" width="640" height="427" aria-hidden="true"></canvas>
        <div class="drag-strip">
          <button class="drag-handle" type="button" aria-label="Move timer window. Drag or use arrow keys">•••</button>
        </div>
        <span class="live-pill"><span class="live-dot"></span><span class="status-text">Ready</span></span>
        <output class="sr-only timer-reading" aria-live="off">01 minutes 30 seconds</output>
        <span class="participant-name">Maya · Timekeeper</span>
      </div>

      <div class="setup" id="maya-timer-setup">
        <div class="presets" aria-label="Timer presets">
          <button class="preset" type="button" data-duration-ms="60000">1 min</button>
          <button class="preset" type="button" data-duration-ms="90000">1.5 min</button>
          <button class="preset" type="button" data-duration-ms="120000">2 min</button>
        </div>
        <form class="exact-form">
          <label class="time-field"><span>Minutes</span><input name="minutes" type="number" min="0" max="99" inputmode="numeric" value="1" aria-label="Minutes"></label>
          <span class="separator" aria-hidden="true">:</span>
          <label class="time-field"><span>Seconds</span><input name="seconds" type="number" min="0" max="59" inputmode="numeric" value="30" aria-label="Seconds"></label>
          <button class="set-button" type="submit">Set</button>
        </form>
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
  const SCENE_SIZE = { width: 640, height: 427 };
  const DISPLAY_LAYOUT = { width: 220, height: 120 };
  const DIGIT_OFFSETS = [7, 57, 119, 169];
  const DIGIT_SCALE_X = 44 / 60;
  const DIGIT_OFFSET_Y = 10;
  const DISPLAY_QUAD = {
    topLeft: { x: 347, y: 133 },
    topRight: { x: 525, y: 119 },
    bottomRight: { x: 519, y: 247 },
    bottomLeft: { x: 353, y: 257 },
  };

  const overlay = shadow.querySelector(".overlay");
  const dragStrip = shadow.querySelector(".drag-strip");
  const dragHandle = shadow.querySelector(".drag-handle");
  const statusText = shadow.querySelector(".status-text");
  const timerReading = shadow.querySelector(".timer-reading");
  const scene = shadow.querySelector(".scene");
  const sceneContext = scene.getContext("2d", { alpha: false });
  const toggle = shadow.querySelector(".toggle");
  const toggleIcon = shadow.querySelector(".toggle-icon");
  const toggleCaption = shadow.querySelector(".toggle-caption");
  const setup = shadow.querySelector(".setup");
  const setupToggle = shadow.querySelector(".setup-toggle");
  const exactForm = shadow.querySelector(".exact-form");
  const minutesInput = exactForm.elements.namedItem("minutes");
  const secondsInput = exactForm.elements.namedItem("seconds");
  const connectionMessage = shadow.querySelector(".connection-message");
  const listeners = new AbortController();
  let state = null;
  let drag = null;
  let disposed = false;
  let expirationSent = false;
  let displayedTime = "01:30";
  let mayaImageReady = false;

  const mayaImage = new Image();
  const sceneResizeObserver = new ResizeObserver(() => drawScene());

  function remaining(now = Date.now()) {
    if (!state) return 90_000;
    if (state.status === "running" && state.deadlineEpochMs) {
      return Math.max(0, state.deadlineEpochMs - now);
    }
    return Math.max(0, state.pausedRemainingMs ?? state.durationMs ?? 0);
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function mapDisplayPoint(x, y) {
    const u = x / DISPLAY_LAYOUT.width;
    const v = y / DISPLAY_LAYOUT.height;
    const topX = DISPLAY_QUAD.topLeft.x + (DISPLAY_QUAD.topRight.x - DISPLAY_QUAD.topLeft.x) * u;
    const topY = DISPLAY_QUAD.topLeft.y + (DISPLAY_QUAD.topRight.y - DISPLAY_QUAD.topLeft.y) * u;
    const bottomX = DISPLAY_QUAD.bottomLeft.x + (DISPLAY_QUAD.bottomRight.x - DISPLAY_QUAD.bottomLeft.x) * u;
    const bottomY = DISPLAY_QUAD.bottomLeft.y + (DISPLAY_QUAD.bottomRight.y - DISPLAY_QUAD.bottomLeft.y) * u;
    return {
      x: topX + (bottomX - topX) * v,
      y: topY + (bottomY - topY) * v,
    };
  }

  function fillMappedPolygon(
    points,
    offsetX,
    color,
    scaleX = 1,
    offsetY = 0,
  ) {
    sceneContext.beginPath();
    points.forEach(([x, y], index) => {
      const mapped = mapDisplayPoint(x * scaleX + offsetX, y + offsetY);
      if (index === 0) sceneContext.moveTo(mapped.x, mapped.y);
      else sceneContext.lineTo(mapped.x, mapped.y);
    });
    sceneContext.closePath();
    sceneContext.fillStyle = color;
    sceneContext.fill();
  }

  function fillMappedCircle(centerX, centerY, radius, color) {
    const points = Array.from({ length: 16 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 16;
      return [
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      ];
    });
    fillMappedPolygon(points, 0, color);
  }

  function drawTimerDisplay(value) {
    const digits = value.replace(":", "").split("");
    for (const [digitIndex, digit] of digits.entries()) {
      const activeSegments = DIGIT_SEGMENTS[digit] ?? "";
      for (const [segment, points] of SEGMENTS) {
        fillMappedPolygon(
          points,
          DIGIT_OFFSETS[digitIndex],
          "rgba(74, 39, 23, .075)",
          DIGIT_SCALE_X,
          DIGIT_OFFSET_Y,
        );
        if (activeSegments.includes(segment)) {
          fillMappedPolygon(
            points,
            DIGIT_OFFSETS[digitIndex],
            "#4a2717",
            DIGIT_SCALE_X,
            DIGIT_OFFSET_Y,
          );
        }
      }
    }

    fillMappedCircle(110, 45, 3.5, "#4a2717");
    fillMappedCircle(110, 76, 3.5, "#4a2717");
  }

  function drawScene() {
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
      targetWidth / SCENE_SIZE.width,
      0,
      0,
      targetHeight / SCENE_SIZE.height,
      0,
      0,
    );
    sceneContext.fillStyle = "#d7e7f2";
    sceneContext.fillRect(0, 0, SCENE_SIZE.width, SCENE_SIZE.height);

    if (mayaImageReady) {
      sceneContext.drawImage(
        mayaImage,
        0,
        0,
        SCENE_SIZE.width,
        SCENE_SIZE.height,
      );
      drawTimerDisplay(displayedTime);
    }
  }

  function render() {
    if (disposed) return;
    const milliseconds = remaining();
    const formatted = formatTime(milliseconds);
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const status = state?.status ?? "idle";

    displayedTime = formatted;
    drawScene();
    timerReading.textContent = `${minutes} minutes ${seconds} seconds`;
    overlay.dataset.status = status;
    overlay.classList.toggle("is-urgent", status === "running" && milliseconds <= 10_000);
    statusText.textContent = status === "idle" ? "Ready" : status === "done" ? "Time" : status;

    const toggleMode = status === "running" ? "pause" : status === "paused" ? "resume" : status === "done" ? "again" : "start";
    toggleIcon.textContent = status === "running" ? "Ⅱ" : "▶";
    toggleCaption.textContent = toggleMode;
    toggle.setAttribute("aria-label", `${toggleMode[0].toUpperCase()}${toggleMode.slice(1)} timer`);

    shadow.querySelectorAll(".preset").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.durationMs) === state?.durationMs));
    });

    if (status === "running" && milliseconds <= 0 && !expirationSent) {
      expirationSent = true;
      void sendTimerAction("expire");
    } else if (milliseconds > 0) {
      expirationSent = false;
    }
  }

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
    render();
  }

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

  function populateExactFields() {
    const durationSeconds = Math.floor((state?.durationMs ?? 90_000) / 1000);
    minutesInput.value = String(Math.floor(durationSeconds / 60));
    secondsInput.value = String(durationSeconds % 60);
  }

  function toggleSetup() {
    const isOpen = !setup.classList.contains("is-open");
    setup.classList.toggle("is-open", isOpen);
    setupToggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) populateExactFields();
    window.requestAnimationFrame(keepVisible);
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.clearInterval(intervalId);
    sceneResizeObserver.disconnect();
    listeners.abort();
    try {
      chrome.storage.local.onChanged.removeListener(receiveStorageChange);
    } finally {
      host.remove();
    }
  }

  function receiveStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes.timerState?.newValue || disposed) return;
    state = changes.timerState.newValue;
    render();
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
    button.addEventListener("click", () => void sendTimerAction(button.dataset.action), { signal: listeners.signal });
  });
  shadow.querySelectorAll("[data-duration-ms]").forEach((button) => {
    button.addEventListener("click", () => {
      const durationMs = Number(button.dataset.durationMs);
      const durationSeconds = durationMs / 1000;
      minutesInput.value = String(Math.floor(durationSeconds / 60));
      secondsInput.value = String(durationSeconds % 60);
      void sendTimerAction("set-duration", durationMs);
    }, { signal: listeners.signal });
  });
  exactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(exactForm);
    const minutes = Math.max(0, Math.min(99, Number.parseInt(data.get("minutes"), 10) || 0));
    const seconds = Math.max(0, Math.min(59, Number.parseInt(data.get("seconds"), 10) || 0));
    void sendTimerAction("set-duration", Math.max(1, minutes * 60 + seconds) * 1000);
    setup.classList.remove("is-open");
    setupToggle.setAttribute("aria-expanded", "false");
    window.requestAnimationFrame(keepVisible);
  }, { signal: listeners.signal });

  mayaImage.addEventListener("load", () => {
    mayaImageReady = true;
    drawScene();
  }, { signal: listeners.signal });
  mayaImage.src = mayaImageUrl;
  sceneResizeObserver.observe(scene);
  drawScene();

  const intervalId = window.setInterval(() => {
    if (state?.status === "running") render();
  }, 250);

  host.__mayaTimerCleanup = cleanup;
  chrome.storage.local.onChanged.addListener(receiveStorageChange);
  void restorePosition();
  request({ type: "MAYA_TIMER_GET_STATE" }).then((response) => {
    if (disposed) return;
    if (!response?.ok || !response.state) {
      showDisconnected();
      return;
    }
    state = response.state;
    render();
  });
})();
