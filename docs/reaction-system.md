# Maya’s reaction system

Maya is the product’s one timekeeper and one voice. She never becomes a static status
illustration: her calm state contains irregular blinks, glances toward the timer,
small acknowledgment nods, breathing, and pointer-following parallax. She becomes
skeptical through the middle, dramatically urgent below 25 percent, and celebratory
at zero. Pausing, adding time, and subtracting time also change her line immediately.

## DailyToast implementation research

DailyToast’s current public app uses two animation tiers:

- Its setup-screen “Zen” character is a static PNG with a 3-second vertical CSS loop;
  the separate shadow PNG scales on a 1.5-second offset loop.
- Its running toast is a 300 × 560 canvas animation. The app preloads TexturePacker
  PNG atlases plus JSON frame manifests for ready, wait1, wait2, wait3, and shoot.
  A custom Angular component draws each atlas frame into the canvas at 15 fps, using
  requestAnimationFrame after a frame-rate timeout. Ready flows into wait1, later
  actions advance through wait2/wait3, and reset plays shoot. Audio feedback is loaded
  separately with Howler and HTML Audio.

That is why DailyToast feels alive even when nothing is happening: it always has a
loop running, while named sequences sit above the loop for state and interaction
changes. Maya follows the same behavioral model without copying its art: a continuous
calm loop, short stochastic moments, and higher-priority warning/done sequences.

Public implementation evidence:

- https://dailytoast.io/
- https://dailytoast.io/assets/images/toast/wait1/1x/toast-wait1.json
- https://dailytoast.io/assets/images/toast/wait1/1x/toast-wait1.png
- https://dailytoast.io/main-es2015.34f7cebaad8167405f9f.js

## Original joke beats

- Start: “Yesterday: coffee. Today: countdown. Blockers: optimism.”
- Calm: “Green status. Suspiciously green.”
- Halfway: “Half the timebox gone. Still a ‘quick update’?”
- Warning: “We’ve entered the ‘one last thing’ arc.”
- Final ten: “Ten seconds! Acceptance criteria later!”
- Added minute: “One small minute. Famous last words.”
- Subtracted time: “Scope cut! The rarest agile ceremony.”
- Repeated added time: “Scope acquired a second season.”
- Paused: “Blocker detected: reality.”
- Done: “Definition of Done: timer says yes.”

The lines reference familiar meeting situations rather than reproducing a known meme
template, character, or caption. This keeps the humor recognizable and the visual
identity original.

## Motion rules

- Focused art uses a very slow breathing scale beneath irregular blink, glance, and
  nod frames.
- The whole real raster follows the pointer by a few pixels, creating responsive
  parallax without drawing fake facial features in CSS.
- Warning art adds a short urgency tremor.
- Done art uses a restrained victory bounce.
- The timer face changes its progress color as urgency rises.
- All nonessential motion stops when the operating system requests reduced motion.

The current Scrum Guide makes the Daily Scrum a 15-minute, outcome-oriented event;
the older three-question format remains useful shared shorthand for jokes, not a
required flow in this product.

Sources:

- https://scrumguides.org/scrum-guide.html
- https://scrumguides.org/scrum-guide-2017.html
- https://www.teamretro.com/guides/daily-standup-guide/daily-standup-agenda/
- https://www.copyright.gov/engage/visual-artists/
