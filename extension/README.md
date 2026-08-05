# Maya Standup Timer for Chrome

Maya is a self-contained Manifest V3 extension that adds a movable standup timer
to the current webpage. It runs offline and does not depend on the Standup Timer
website being open. Maya is drawn from the original manga artwork and never
sits still: the frame continuously breathes, sways, and follows your pointer,
she blinks, glances at the clock, and nods through seamless blends between
aligned frames, comments on the meeting through Meet-style captions, and cuts
to dramatic warning and celebration panels as the timebox drains.

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

## Timer behavior

- Start, pause, resume, reset, add 30 seconds, or subtract 30 seconds.
- **Hitting zero never closes the timer.** The session enters overtime: the
  display turns red and counts up (`+00:42`), Maya celebrates briefly and then
  starts politely pestering. Only **Hang up** ends the call.
- During overtime, **+30** grants thirty more seconds and resumes the countdown;
  **again** restarts the full timebox; **reset** returns to idle.
- The setup tray (⌚) offers 1:00 / 1:30 / 2:00 presets plus a ±15s stepper.
  Steps apply immediately — hold a stepper button to repeat.
- Drag the handle to move Maya. When the handle is focused, arrow keys move the
  overlay by 10 pixels and Shift+Arrow moves it by 40 pixels.
- State and position stay synchronized across open overlays through
  `chrome.storage.local`.

## Sound

All audio is synthesized locally with the Web Audio API — no audio files, no
network. Maya plays a heads-up ping at 30 seconds, soft rising ticks through the
final 10 seconds, a three-note chime at zero, and a gentle knock at each
overtime minute. The speaker chip on the video tile mutes everything; the
preference is stored locally and shared by every overlay. Browsers only allow
audio after an interaction with the page, so an overlay that was never clicked
in its tab may stay silent until you touch it. Sounds play only in visible
tabs so several open overlays do not stack their chimes.

## Reduced motion

When the operating system asks for reduced motion, the ambient animation stops
and Maya holds a static pose per mood. Captions, the countdown, and sounds keep
working.

## Permissions

- `activeTab`: temporary access to the current page only after the user clicks
  Maya's toolbar icon.
- `scripting`: injects the packaged overlay into that user-selected page.
- `storage`: saves only timer state, overlay position, and the mute preference
  on the local device.

The extension requests no persistent host permissions; its only web-accessible
resources are Maya's six packaged artwork frames. It has no content scripts,
analytics, advertising, accounts, remote code, or network requests. The release privacy statement lives
at [`../store-listing/privacy-policy.md`](../store-listing/privacy-policy.md).

## Release check

From the `standup-timer/` directory:

```sh
npm test
```

The extension tests validate the production manifest, icon references and exact
dimensions, absence of dev origins and remote executable code, timer and
overtime behavior, runtime messaging, the vector rig and its animation engine,
the sound engine, and the overlay cleanup contract.
