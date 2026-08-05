# V2 exploration: Google Meet

## Recommendation

Build a Meet side-panel add-on, not a speaking bot.

The public Google Meet REST API can provide meeting and participant records with user
authorization. A Meet add-on can share the timer inside the side panel and use a
backend room keyed to the meeting. By contrast, the Developer Preview Meet Media API
is read-only: it can consume media and participant metadata but cannot inject audio,
speak a countdown, send chat, mute people, or behave like a normal attendee. It also
requires developer-preview enrollment, admin and host consent, attendee notification,
restricted scopes, and potentially a security assessment.

## Practical sequence

### V2.0: Meet-aware overlay

Recognize a Meet page and offer “Use in this Meet.” Keep the current extension state
model and avoid scraping the page or requesting OAuth.

### V2.1: Side-panel add-on

Reuse the same compact timer UI in a Meet add-on side panel. Synchronize timer
transitions through a small backend keyed to the meeting ID. Keep cues visual and
local.

### V2.2: Opt-in roster import

After a clear user action, use meetings.space.readonly authorization, get the meeting
info, resolve the active conference, and fetch active participants every 10–15
seconds. Always show a review step before replacing the timer lineup.

### V2.3: Enterprise events

For managed domains that need durable automation, use Google Workspace Events with
Pub/Sub. Domain-wide delegation should remain an explicit enterprise-only choice.

### Lab track

The Meet Media API could someday suggest speaker transitions from speech or silence,
but the timer must never depend on it. It cannot deliver the spoken-bot experience
described in the original idea.

## Official references

- https://developers.google.com/workspace/meet/overview
- https://developers.google.com/workspace/meet/add-ons/guides/overview
- https://developers.google.com/workspace/meet/add-ons/guides/get-meeting-info
- https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on
- https://developers.google.com/workspace/meet/api/guides/overview
- https://developers.google.com/workspace/meet/api/guides/authenticate-authorize
- https://developers.google.com/workspace/meet/api/guides/participants
- https://developers.google.com/workspace/events/guides/events-meet
- https://developers.google.com/workspace/meet/media-api/guides/overview
- https://developers.google.com/workspace/meet/media-api/guides/get-started
- https://developers.google.com/workspace/marketplace/about-app-review
