# Chrome Web Store publication checklist

Research checked against official Chrome for Developers documentation on 2026-08-04. The signed-in Developer Dashboard is the final authority if a field or fee differs from these public pages.

## 1. Developer account — manual, owner-only

- [ ] Choose the permanent Google account that will own the item. The developer email cannot be changed after account creation; moving later requires an item transfer.
- [ ] Register as a Chrome Web Store developer, accept the Developer Agreement and policies, and pay the one-time registration fee. Google's current official support form identifies the fee as **US$5**, while the agreement reserves Google's right to set the amount; verify the amount shown in the registration flow.
- [ ] Enable **2-Step Verification** on the owner Google account. It is required before publishing or updating.
- [ ] Complete the Account page: required publisher name and verified contact email. A physical address is additionally required if the item sells functionality, features, or subscriptions.
- [ ] Enable publication/review email notifications and monitor this mailbox.

Sources: [Register your developer account](https://developer.chrome.com/docs/webstore/register/), [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account), [Developer Agreement](https://developer.chrome.com/docs/webstore/program-policies/terms), [Program Policies — 2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/policies), [official developer support form noting the current $5 fee](https://support.google.com/chrome_webstore/contact/one_stop_support).

## 2. Production package

- [ ] Test the release build by loading it unpacked in Chrome and exercise every advertised feature, permission path, reload, update, and uninstall/reinstall flow.
- [ ] Use **Manifest V3**. The Web Store no longer accepts Manifest V2.
- [ ] Put a valid `manifest.json` at the ZIP root, not inside a parent directory. Do not put comments in the JSON.
- [ ] Include and proofread:
  - `name` (maximum 75 characters)
  - monotonically increasing `version`
  - `description` (maximum 132 characters)
  - `icons`, including a 128×128 PNG
- [ ] Include all extension logic in the package. Do not load remote JavaScript, use `eval()` on fetched strings, or fetch command-like data that acts as executable logic. Remote data and images are allowed when they do not supply logic and their use complies with the privacy policy.
- [ ] Remove development URLs, dead code, unused permissions, source maps containing secrets, test credentials, build caches, and unrelated files.
- [ ] Keep the package reviewable: obfuscation is prohibited; minification is allowed but can slow review. Prefer clear authored source where practical.
- [ ] Keep the ZIP below **2 GB**.

Sources: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare), [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest), [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/), [review factors](https://developer.chrome.com/docs/webstore/review-process).

### Standup Timer release-specific preflight

- [ ] Replace the current localhost-only `content_scripts.matches` entries with the intended production behavior, or remove the bridge entirely. A store package should not claim production functionality that only works on local development origins.
- [ ] Add manifest/action icons at the sizes the product actually uses; include the required 128×128 store icon in the ZIP.
- [ ] Confirm the extension has one narrow, visible purpose: showing and controlling a draggable standup countdown on the current tab.
- [ ] Confirm all timer and overlay behavior works without the companion localhost web app if that is the advertised store experience.

## 3. Permissions and reviewer justifications

- [ ] Request the narrowest permissions necessary. Remove unused entries from `permissions`, `optional_permissions`, and `host_permissions`; do not request future capabilities.
- [ ] Avoid broad host patterns such as `<all_urls>`, `https://*/*`, or `*://*/*` unless the feature truly requires them. Broad host and sensitive execution permissions receive more scrutiny and can extend review time.
- [ ] In **Privacy practices → Permissions justification**, explain each permission in plain language, the user action that invokes it, and why a narrower option cannot implement the feature.

Draft justifications for the current architecture, to be revalidated against the final package:

- `activeTab`: “Grants temporary access only after the user clicks the extension, so the timer overlay can appear on that tab. The extension does not receive passive access to browsing activity.”
- `scripting`: “Injects the packaged timer overlay into the active tab after the user explicitly clicks the extension action.”
- `storage`: “Stores timer state and overlay preferences locally so the countdown survives reloads and stays synchronized between extension contexts.”

Source: [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [excessive-permissions guidance](https://developer.chrome.com/docs/webstore/troubleshooting/#excessive-permissions), [review process](https://developer.chrome.com/docs/webstore/review-process).

## 4. Store listing and assets

- [ ] Provide an accurate detailed description, primary category, and primary language. Lead with the extension's single purpose; describe only features present in the submitted package and avoid keyword spam.
- [ ] Required image set:
  - **128×128 PNG icon** in the ZIP. For a square mark, Google recommends 96×96 artwork centered with 16 px transparent padding on each side.
  - **At least 1 screenshot, up to 5**, each full-bleed with square corners at **1280×800** (preferred) or **640×400**.
  - **Small promo tile**, PNG or JPEG, **440×280**.
- [ ] Optional discovery assets:
  - Marquee promo tile, PNG or JPEG, **1400×560**.
  - YouTube promotional video URL.
- [ ] Make screenshots show the real extension experience, not a concept image. Keep listing text, screenshots, permission behavior, and privacy declarations mutually consistent.
- [ ] Add homepage and support URLs if available. Verify an official publisher site in Search Console if displaying a verified publisher URL.
- [ ] If localized, provide consistent descriptions/screenshots/video for each locale. Promo tiles are global, not localized.
- [ ] Declare mature content only if applicable.

Documentation caveat: the listing overview places a YouTube video in its “must provide” graphic list, but Google's dedicated image requirements explicitly say only the icon, small promo image, and screenshot are mandatory. Treat the video as optional unless the current signed-in Dashboard marks it required.

Sources: [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [Supplying Images](https://developer.chrome.com/docs/webstore/images), [Listing Requirements policy](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements).

## 5. Privacy and data-use declarations

- [ ] Write a narrow **single-purpose description** for reviewers.
- [ ] Declare whether the extension executes remote code. A self-contained MV3 build should select **No**; a false or missing declaration can cause rejection.
- [ ] Accurately disclose every applicable type of data handled and certify Limited Use compliance. Chrome's FAQ says on-device processing/storage can still count as handling user data even when nothing is transmitted.
- [ ] Provide a public privacy-policy URL whenever the product handles user data. The policy and in-product disclosures must explain what is collected or stored, how it is used, whether it is shared, and every recipient. Dashboard answers, runtime behavior, and policy must agree.
- [ ] If personal or sensitive user data is handled, disclose it prominently before collection and obtain informed consent where required; transfer it only over modern encryption. Add the required Limited Use disclosure on the extension website/homepage or a page one click away.
- [ ] Do not collect browsing activity except where necessary for a prominently described, user-facing feature. Do not sell data or use it for personalized advertising.

For a local-only Standup Timer release, the privacy policy should explicitly state that timer duration/state and overlay preferences are stored on the user's device, whether they are synced by Chrome, whether any page content or URLs are read, and that no analytics or third-party transmission occurs **only if code inspection confirms those claims**. Complete Dashboard checkboxes based on the final build, not this draft.

Sources: [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Program Policies — user privacy](https://developer.chrome.com/docs/webstore/program-policies/policies).

## 6. Distribution and reviewer access

- [ ] Choose visibility: **Public**, **Unlisted**, or **Private**. All three receive the same policy review.
- [ ] Choose all regions or explicit countries/exclusions.
- [ ] Add trusted testers or owned/managed Google Groups if using Private visibility.
- [ ] If reviewers need a special sequence, account, or environment, complete **Test instructions** and provide working non-expiring test credentials. Do not put production secrets in the package or public listing.
- [ ] If shipping a parallel beta item, append “DEVELOPMENT BUILD” or “BETA” to its name and clearly mark the description as beta testing to avoid repetitive-content enforcement.

Source: [Set up distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), [first-time publishing tabs](https://developer.chrome.com/docs/webstore/publish/).

## 7. Submit, review, and release

- [ ] In the Developer Dashboard, choose **Add new item**, upload the ZIP, and resolve every validation error and warning.
- [ ] Complete Package, Store Listing, Privacy, Distribution, and Test instructions (when needed).
- [ ] Decide between automatic publication after approval or **deferred publishing**.
- [ ] Click **Submit for Review** and monitor dashboard status plus the verified publisher email.
- [ ] Expect most reviews within a few days, but potentially a few weeks. Google's review page currently warns of elevated review times; contact developer support if pending for more than three weeks.
- [ ] If deferred, publish within **30 days** after approval or the staged submission returns to draft and needs review again.
- [ ] If a bug is found while pending, cancel review, upload a corrected ZIP with a higher manifest version, and resubmit.
- [ ] If rejected, verify the cited policy against the exact submitted build, fix the cause, and resubmit or use the Dashboard appeal route when appropriate.

Sources: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/), [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process), [Troubleshooting violations](https://developer.chrome.com/docs/webstore/troubleshooting/).

## 8. Automation boundary

Safe to automate locally before account access:

- Deterministic production build and ZIP creation.
- Manifest schema/version checks, permission allow-list checks, remote-code scans, asset dimension checks, tests, unpacked-extension smoke tests, and package-content reports.
- Drafting listing copy, permission justifications, privacy-policy text, and asset files for human review.

Chrome Web Store API V2 can automate **after an item already exists**:

- Upload a new package, fetch status, submit/publish, cancel a submission, and manage eligible percentage rollout.
- Use OAuth or a service account after explicit account setup and authorization.

Not supported by API V2, or requires owner action in the Dashboard:

- Registering the developer account, accepting legal terms, paying the fee, enabling 2-Step Verification, and verifying the contact email.
- Creating the initial Web Store item. API V2 uploads only to an existing item.
- Filling initial Store Listing and Privacy fields.
- Changing visibility; after a manual visibility change, publish manually once before API publishing resumes.
- Bypassing review. V2's `skipReview` is only an attempt; the service rejects it when the item does not qualify.

The deprecated V1 API can create an item but is scheduled to stop working on **2026-10-15**. Do not build a new first-publication workflow around it; create the first item manually, then use V2 for repeatable updates if desired.

Sources: [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api), [API V2 reference](https://developer.chrome.com/docs/webstore/api/reference/rest), [V2 launch and V1 retirement](https://developer.chrome.com/blog/cws-api-v2), [`publish` method](https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish).

## Publication go/no-go

Do not submit until all of these are true:

- The exact ZIP was tested unpacked and matches every listing claim.
- The manifest is MV3, valid, minimally permissioned, and contains no development-only origins or remote logic.
- Required listing assets exist at exact dimensions.
- Permission justifications, data-use answers, privacy policy, and runtime behavior agree.
- Reviewer instructions are sufficient to exercise every feature.
- The owner has reviewed the legal declarations and explicitly chosen visibility and automatic versus deferred publishing.
