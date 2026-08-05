chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["overlay.js"],
    });
  } catch (error) {
    console.warn("Standup Timer cannot run on this page.", error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    overlayPosition: { right: 24, top: 24 },
  });
});
