# Maya Standup Timer — Chrome Web Store draft

This copy is based on the Manifest V3 package in `standup-timer/extension/`. Revalidate it against the exact ZIP immediately before submission.

## Store Listing

**Name**
Maya Standup Timer

**Short description**
Keep standups moving with Maya, a lively animated timekeeper who stays over your meeting or board.

**Detailed description**

Keep the timer visible without leaving the tab where your meeting or board is open.

Click Maya Standup Timer in the Chrome toolbar to place a compact, draggable timebox over the current page. Maya stays alive while you work—breathing, glancing, reacting, and speaking through captions as the clock runs down.

Maya Standup Timer stays deliberately focused:

- Start, pause, resume, reset, and quick ±30-second controls
- 1:00, 1:30, and 2:00 presets, a typeable time display, and hold-to-repeat ±15-second fine tuning
- Overtime that counts up instead of closing, with reactions from Maya and a +30-second rescue
- Local sound cues at 30 seconds, through the final ticks, at zero, and during overtime, with a remembered mute control
- A draggable position and timer state that are remembered locally and synchronized across open overlays
- Reduced-motion support
- No account, analytics, advertising, tracking, or network connection

The extension runs only after you click its toolbar button. It does not read, collect, or transmit page content, URLs, browsing history, or personal information. All artwork, animation, captions, and audio are packaged or generated locally.

**Category**
Productivity → Workflow & Planning

**Primary language**
English

**Pricing**
Free

**Mature content**
No

**Homepage URL**
Not supplied. Do not invent one.

**Support URL**
Not supplied. Do not invent one. Use the Chrome Web Store support/contact facilities unless a real project support page is created before submission.

## Privacy Practices

### Single-purpose statement

Maya Standup Timer displays and controls a draggable standup countdown on the browser tab the user explicitly chooses.

### Permission justifications

**`activeTab`**
Grants temporary access only after the user clicks the extension toolbar button, allowing Maya Standup Timer to display the timer on that tab. The extension does not receive passive or permanent access to browsing activity.

**`scripting`**
Injects the packaged timer overlay into the active tab after the user explicitly clicks the extension toolbar button. The injected code only creates and controls the timer interface.

**`storage`**
Stores the countdown state, draggable overlay position, and mute preference on the user's device so the timer survives extension service-worker restarts and remembers its settings between uses.

### Remote code

**Answer:** No, this extension does not use remote code.

All executable logic is included in the extension package. The extension does not download or evaluate scripts, WebAssembly, commands, or configuration containing executable logic.

### Data-use answers

**Does the extension collect or transmit user data?**
No. The extension does not collect or transmit personal or sensitive user data and makes no network requests.

**On-device data handled**
The extension stores only operational timer data in `chrome.storage.local`:

- Countdown storage schema version, status, duration, remaining time or deadline, revision, and update timestamp
- Overlay position on screen
- Mute preference

This information stays on the user's device. It is not sent to the developer or any third party.

**Chrome Web Store data categories**
Select no collection for every listed category, provided the final package still behaves as audited. Specifically, the extension does not collect or transmit:

- Personally identifiable information
- Health information
- Financial and payment information
- Authentication information
- Personal communications
- Location
- Web history or browsing activity
- Website content
- User activity such as clicks, mouse position, scrolling, or keystrokes

The overlay necessarily receives pointer events directed at its own drag handle and controls, but those interactions are processed locally and are neither retained as user-activity analytics nor transmitted.

**Limited Use certifications**

- Data is used only to provide the extension's single timer purpose.
- Data is not sold or transferred to third parties.
- Data is not used for advertising, creditworthiness, lending, or unrelated purposes.
- No humans can access the locally stored data through the developer.

**Privacy policy URL**
Host `privacy-policy.html` at a stable public HTTPS URL and enter that real URL before submission. No URL is supplied in this repository draft.

## Distribution

**Recommended visibility**
Public

**Recommended regions**
All regions

**Rationale**
The extension is free, language-light, local-only, and not tied to a country-specific service. Public/all-regions distribution is appropriate once listing assets, the hosted privacy-policy URL, and final package verification are complete.

**Automatic versus deferred publish**
Use deferred publishing for the first release so the approved listing, package, and install flow can receive one final owner review before going live.

## Reviewer Test Instructions

No account, credentials, payment, companion application, or network access is required.

1. Install the submitted package.
2. Open any ordinary `http://` or `https://` page. Chrome-internal pages such as `chrome://extensions` intentionally block script injection.
3. Click the **Maya Standup Timer** toolbar button.
4. Confirm that the timer overlay appears over the current page.
5. Drag the overlay by its drag area and confirm that it can be repositioned.
6. Open **Set**, select a preset, type an exact time in the large readout, and use the ±15-second stepper. Confirm that each change updates the display immediately.
7. Click **Start**, wait several seconds, and confirm that the countdown decreases.
8. Click **Pause**, then **Resume**, and confirm that the timer behaves accordingly.
9. Use **−30s** and **+30s** and confirm that the remaining time changes. Use the speaker control to mute and unmute local sound cues.
10. Let a short timer reach zero. Confirm that the display counts upward in red, Maya reacts, and **+30s** resumes a 30-second countdown.
11. Use **Reset** and confirm that the configured duration returns.
12. Click the red **Hang up** control, reopen the overlay from the toolbar, and confirm that the timer state, mute setting, and saved position remain available.
13. Reload the page and reopen the overlay to confirm the locally stored settings persist.

Expected behavior on protected pages: Chrome does not permit extensions to inject into pages such as `chrome://` URLs or the Chrome Web Store. The toolbar shows a failure indicator instead of injecting the overlay.

## Final source audit

Audited against the Maya Standup Timer 1.1.0 production extension and release ZIP on August 5, 2026:

- Manifest V3 permissions are exactly `activeTab`, `scripting`, and `storage`, with no host permissions or content scripts.
- All executable code and Maya artwork are packaged locally.
- The code contains no `fetch`, XHR, WebSocket, beacon, analytics SDK, remote script, page-content extraction, or URL/history storage.
- `chrome.storage.local` is limited to `timerState`, `overlayPosition`, and `soundMuted`.
- Manifest icons and packaged assets exist, and the production package tests pass.

No mismatch remains between the final extension source and the claims in this listing or privacy policy.

## Submission status

Version 1.1.0 was submitted to Chrome Web Store review on August 5, 2026. The draft includes four 1280×800 screenshots, the 440×280 small promo tile, the packaged 128×128 store icon, updated privacy disclosures, and updated reviewer instructions. Automatic publishing after approval is enabled.
