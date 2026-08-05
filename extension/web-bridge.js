const SOURCE_WEB = "standup-timer-web";
const SOURCE_EXTENSION = "standup-timer-extension";

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    event.data?.source !== SOURCE_WEB ||
    event.data?.type !== "STATE_UPDATE"
  ) {
    return;
  }

  chrome.storage.local.set({ timerState: event.data.payload });
});

chrome.storage.local.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.timerAction?.newValue) return;
  window.postMessage(
    {
      source: SOURCE_EXTENSION,
      action: changes.timerAction.newValue.action,
    },
    window.location.origin,
  );
});
