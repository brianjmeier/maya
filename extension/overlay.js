(() => {
  const EXISTING_ID = "standup-timer-overlay-host";
  const existing = document.getElementById(EXISTING_ID);
  if (existing) {
    existing.__standupTimerCleanup?.();
    return;
  }

  const host = document.createElement("div");
  host.id = EXISTING_ID;
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  root.innerHTML = String.raw`
    <style>
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      .overlay {
        position: fixed;
        z-index: 2147483647;
        width: 282px;
        color: #18191d;
        background: #fff9eb;
        border: 3px solid #18191d;
        border-radius: 10px;
        box-shadow: 7px 8px 0 rgba(24,25,29,.9);
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        overflow: hidden;
        user-select: none;
      }
      .dragbar {
        min-height: 35px;
        padding: 7px 9px 6px 11px;
        display: flex;
        align-items: center;
        gap: 7px;
        background: #5e8eb9;
        color: white;
        border-bottom: 3px solid #18191d;
        cursor: grab;
        touch-action: none;
      }
      .dragbar:active { cursor: grabbing; }
      .dot { width: 9px; height: 9px; border-radius: 50%; background: #f0c84b; border: 2px solid #18191d; }
      .title { flex: 1; font-size: 10px; font-weight: 950; letter-spacing: .13em; }
      .close {
        width: 24px; height: 24px; padding: 0; border: 2px solid #18191d;
        background: #fff9eb; color: #18191d; font-size: 17px; line-height: 18px;
        font-weight: 900; cursor: pointer;
      }
      .body {
        padding: 12px;
        display: grid;
        grid-template-columns: 64px 1fr;
        gap: 11px;
        background: radial-gradient(#a7b6c4 .7px, transparent .7px), #dce8ef;
        background-size: 6px 6px;
      }
      .face {
        width: 64px; height: 64px; display: grid; place-items: center;
        border: 3px solid #18191d; border-radius: 50%; background: #f0c84b;
        font-size: 25px; font-weight: 950;
      }
      .copy { min-width: 0; }
      .timekeeper {
        display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-size: 11px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase;
      }
      output {
        display: block; margin-top: 2px;
        font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
        font-size: 45px; line-height: .96; letter-spacing: .04em;
        font-variant-numeric: tabular-nums;
      }
      .progress {
        height: 7px; margin-top: 5px; border: 2px solid #18191d; border-radius: 8px;
        overflow: hidden; background: #dfd4bc;
      }
      .progress span { display: block; height: 100%; background: #ed6c2f; }
      .controls {
        display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 6px;
        padding: 9px; border-top: 3px solid #18191d;
      }
      button {
        min-height: 34px; border: 2px solid #18191d; border-radius: 5px;
        background: white; color: #18191d;
        font: 800 11px Inter, ui-sans-serif, system-ui, sans-serif;
        cursor: pointer; box-shadow: 2px 2px 0 #18191d;
      }
      button:hover { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #18191d; }
      .toggle { background: #ed6c2f; color: white; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>
    <section class="overlay" aria-label="Standup Timer overlay">
      <div class="dragbar">
        <span class="dot"></span>
        <span class="title">STANDUP TIMER · DRAG ME</span>
        <button class="close" aria-label="Close overlay">×</button>
      </div>
      <div class="body">
        <div class="face" aria-hidden="true">M</div>
        <div class="copy">
          <span class="timekeeper">Maya · Timekeeper</span>
          <output>01:30</output>
          <div class="progress"><span style="width:100%"></span></div>
        </div>
      </div>
      <div class="controls">
        <button data-action="subtract-30">−30s</button>
        <button class="toggle" data-action="toggle">Start</button>
        <button data-action="add-30">+30s</button>
      </div>
    </section>
  `;

  const overlay = root.querySelector(".overlay");
  const dragbar = root.querySelector(".dragbar");
  const close = root.querySelector(".close");
  const output = root.querySelector("output");
  const progress = root.querySelector(".progress span");
  const toggle = root.querySelector(".toggle");
  let state = null;
  let drag = null;

  function remaining(now = Date.now()) {
    if (!state) return 90_000;
    if (state.status === "running" && state.deadlineEpochMs) {
      return Math.max(0, state.deadlineEpochMs - now);
    }
    return Math.max(0, state.pausedRemainingMs ?? state.durationMs ?? 0);
  }

  function format(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return (
      String(Math.floor(seconds / 60)).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0")
    );
  }

  function render() {
    const left = remaining();
    output.textContent = format(left);
    const ratio = state?.durationMs ? Math.min(1, left / state.durationMs) : 1;
    progress.style.width = ratio * 100 + "%";
    progress.style.background = ratio <= .25 ? "#d94435" : "#ed6c2f";
    toggle.textContent =
      state?.status === "running"
        ? "Pause"
        : state?.status === "paused"
          ? "Resume"
          : state?.status === "done"
            ? "Again"
            : "Start";
  }

  async function positionFromStorage() {
    const saved = await chrome.storage.local.get([
      "overlayPosition",
      "timerState",
    ]);
    state = saved.timerState ?? null;
    const position = saved.overlayPosition ?? { right: 24, top: 24 };
    overlay.style.left =
      Math.max(
        8,
        Math.min(
          window.innerWidth - overlay.offsetWidth - 8,
          window.innerWidth - position.right - overlay.offsetWidth,
        ),
      ) + "px";
    overlay.style.top =
      Math.max(8, Math.min(window.innerHeight - 80, position.top)) + "px";
    render();
  }

  function beginDrag(event) {
    if (event.target.closest("button")) return;
    const rect = overlay.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragbar.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag) return;
    const left = Math.max(
      8,
      Math.min(
        window.innerWidth - overlay.offsetWidth - 8,
        event.clientX - drag.x,
      ),
    );
    const top = Math.max(
      8,
      Math.min(
        window.innerHeight - overlay.offsetHeight - 8,
        event.clientY - drag.y,
      ),
    );
    overlay.style.left = left + "px";
    overlay.style.top = top + "px";
  }

  function endDrag() {
    if (!drag) return;
    drag = null;
    const rect = overlay.getBoundingClientRect();
    chrome.storage.local.set({
      overlayPosition: {
        right: Math.max(8, window.innerWidth - rect.right),
        top: rect.top,
      },
    });
  }

  dragbar.addEventListener("pointerdown", beginDrag);
  dragbar.addEventListener("pointermove", moveDrag);
  dragbar.addEventListener("pointerup", endDrag);
  dragbar.addEventListener("pointercancel", endDrag);
  close.addEventListener("click", cleanup);
  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      chrome.storage.local.set({
        timerAction: {
          action: button.dataset.action,
          nonce: crypto.randomUUID(),
          at: Date.now(),
        },
      });
    });
  });
  function receiveStorageChange(changes, areaName) {
    if (areaName === "local" && changes.timerState?.newValue) {
      state = changes.timerState.newValue;
      render();
    }
  }

  const intervalId = window.setInterval(() => {
    if (state?.status === "running") render();
  }, 500);

  function cleanup() {
    window.clearInterval(intervalId);
    chrome.storage.local.onChanged.removeListener(receiveStorageChange);
    host.remove();
  }

  host.__standupTimerCleanup = cleanup;
  chrome.storage.local.onChanged.addListener(receiveStorageChange);
  positionFromStorage();
})();
