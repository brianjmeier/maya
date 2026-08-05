import {
  TIMER_ACTIONS,
  applyTimerAction,
  createDefaultTimerState,
  normalizeTimerState,
} from "./timer-state.js";

const TIMER_STATE_KEY = "timerState";
const OVERLAY_POSITION_KEY = "overlayPosition";
const DEFAULT_POSITION = Object.freeze({ right: 24, top: 24 });
const DEFAULT_ACTION_TITLE = "Show Maya Standup Timer";

async function initializeStorage() {
  const saved = await chrome.storage.local.get([
    TIMER_STATE_KEY,
    OVERLAY_POSITION_KEY,
  ]);
  const defaults = {};

  if (!saved[TIMER_STATE_KEY]) {
    defaults[TIMER_STATE_KEY] = createDefaultTimerState();
  }
  if (!saved[OVERLAY_POSITION_KEY]) {
    defaults[OVERLAY_POSITION_KEY] = DEFAULT_POSITION;
  }

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
}

async function readTimerState({ repairStorage = true } = {}) {
  const saved = await chrome.storage.local.get(TIMER_STATE_KEY);
  const state = normalizeTimerState(saved[TIMER_STATE_KEY]);

  if (
    repairStorage &&
    JSON.stringify(state) !== JSON.stringify(saved[TIMER_STATE_KEY])
  ) {
    await chrome.storage.local.set({ [TIMER_STATE_KEY]: state });
  }

  return state;
}

let actionQueue = Promise.resolve();

function dispatchTimerAction(action, durationMs) {
  const operation = actionQueue.then(async () => {
    // the action write below persists the normalized state anyway
    const current = await readTimerState({ repairStorage: false });
    const next = applyTimerAction(current, action, Date.now(), durationMs);
    if (next !== current) {
      await chrome.storage.local.set({ [TIMER_STATE_KEY]: next });
    }
    return next;
  });

  actionQueue = operation.catch(() => undefined);
  return operation;
}

async function showInjectionFailure(tabId) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: "#c5221f", tabId }),
    chrome.action.setBadgeText({ text: "!", tabId }),
    chrome.action.setTitle({
      title: "Maya cannot open on this protected Chrome page",
      tabId,
    }),
  ]);
}

async function clearInjectionFailure(tabId) {
  await Promise.all([
    chrome.action.setBadgeText({ text: "", tabId }),
    chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE, tabId }),
  ]);
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"],
    });
    await clearInjectionFailure(tab.id);
  } catch (error) {
    await showInjectionFailure(tab.id);
    console.warn("Maya Standup Timer cannot run on this page.", error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "MAYA_TIMER_GET_STATE") {
    readTimerState().then(
      (state) => sendResponse({ ok: true, state }),
      () => sendResponse({ ok: false }),
    );
    return true;
  }

  if (
    message?.type === "MAYA_TIMER_ACTION" &&
    TIMER_ACTIONS.includes(message.action) &&
    (message.action !== "set-duration" || Number.isFinite(message.durationMs))
  ) {
    dispatchTimerAction(message.action, message.durationMs).then(
      (state) => sendResponse({ ok: true, state }),
      () => sendResponse({ ok: false }),
    );
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener(initializeStorage);
chrome.runtime.onStartup.addListener(initializeStorage);
