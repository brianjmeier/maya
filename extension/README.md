# Maya Standup Timer for Chrome

Maya is a self-contained Manifest V3 extension that adds a movable standup timer
to the current webpage. It runs offline and does not depend on the Standup Timer
website being open.

## Load unpacked

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` directory.
4. Pin **Maya Standup Timer** from Chrome's Extensions menu.
5. Open a normal `http://` or `https://` page and click Maya's toolbar icon.

Clicking the toolbar icon again removes the overlay. The red **Hang up** control
also removes it immediately without closing or changing the underlying tab.
Chrome does not permit script injection on protected pages such as
`chrome://extensions` or the Chrome Web Store; Maya shows a red `!` badge when a
page cannot host the overlay.

## Timer controls

- Start, pause, resume, reset, add 30 seconds, or subtract 30 seconds.
- Open the compact setup tray for 1 minute, 1.5 minute, and 2 minute presets or
  an exact minutes-and-seconds value.
- Drag the handle to move Maya. When the handle is focused, arrow keys move the
  overlay by 10 pixels and Shift+Arrow moves it by 40 pixels.
- State and position stay synchronized across open overlays through
  `chrome.storage.local`.

## Permissions

- `activeTab`: temporary access to the current page only after the user clicks
  Maya's toolbar icon.
- `scripting`: injects the packaged overlay into that user-selected page.
- `storage`: saves only timer state and overlay position on the local device.

The extension requests no persistent host permissions. It has no content scripts,
analytics, advertising, accounts, remote code, or network requests. The release
privacy statement lives at [`../store-listing/privacy-policy.md`](../store-listing/privacy-policy.md).

## Release check

From the `standup-timer/` directory:

```sh
npm test
```

The extension tests validate the production manifest, icon references and exact
dimensions, absence of dev origins and remote executable code, timer behavior,
runtime messaging, and overlay cleanup contract.
