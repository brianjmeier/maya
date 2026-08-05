# Maya Standup Timer — Chrome Web Store draft

This copy is based on the Manifest V3 package in `standup-timer/extension/`. Revalidate it against the exact ZIP immediately before submission.

## Store Listing

**Name**
Maya Standup Timer

**Short description**
Keep standups moving with Maya, a draggable timer that stays over your meeting or board.

**Detailed description**

Keep the timer visible without leaving the tab where your meeting or board is open.

Click Maya Standup Timer in the Chrome toolbar to place a compact, draggable countdown over the current page. Start or pause the timer, add or subtract 30 seconds, and move it wherever it stays useful without covering your work.

Maya Standup Timer is deliberately focused:

- A countdown that floats above the tab you choose
- Start, pause, resume, reset, and quick ±30-second controls
- One-minute, 90-second, and two-minute presets plus exact minutes and seconds
- A draggable position that is remembered locally
- Timer state that remains available between uses
- No account, analytics, advertising, or network connection

The extension runs only after you click its toolbar button. It does not read, collect, or transmit page content, URLs, browsing history, or personal information.

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
Stores the countdown state and draggable overlay position on the user's device so the timer survives extension service-worker restarts and remembers its position between uses.

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
6. Open **Set**, select a preset, then enter an exact minutes-and-seconds value and confirm that the display updates.
7. Click **Start**, wait several seconds, and confirm that the countdown decreases.
8. Click **Pause**, then **Resume**, and confirm that the timer behaves accordingly.
9. Use **−30s** and **+30s** and confirm that the remaining time changes, then use **Reset** and confirm that the configured duration returns.
10. Click the red **Hang up** control, reopen the overlay from the toolbar, and confirm that the timer state and saved position remain available.
11. Reload the page and reopen the overlay to confirm the locally stored state persists.

Expected behavior on protected pages: Chrome does not permit extensions to inject into pages such as `chrome://` URLs or the Chrome Web Store. The toolbar shows a failure indicator instead of injecting the overlay.

## Final source audit

Audited against the production extension and release ZIP on August 4, 2026:

- Manifest V3 permissions are exactly `activeTab`, `scripting`, and `storage`, with no host permissions or content scripts.
- All executable code and Maya artwork are packaged locally.
- The code contains no `fetch`, XHR, WebSocket, beacon, analytics SDK, remote script, page-content extraction, or URL/history storage.
- `chrome.storage.local` is limited to `timerState` and `overlayPosition`.
- Manifest icons and packaged assets exist, and the production package tests pass.

No mismatch remains between the final extension source and the claims in this listing or privacy policy.

## Remaining external submission blockers

- Host `privacy-policy.html` at a stable public HTTPS URL and add that exact URL to the Dashboard.
- Register or confirm the owner Chrome Web Store developer account, pay the displayed one-time fee if needed, enable 2-Step Verification, and verify its contact email.
- Capture at least one real 1280×800 or 640×400 product screenshot and create the required 440×280 small promo tile. The packaged 128×128 store icon already exists.
- Add a real support URL only if one exists; otherwise use Chrome Web Store's built-in support/contact facilities.
- Have the account owner review the declarations and explicitly choose visibility plus deferred versus automatic publishing before submission.
