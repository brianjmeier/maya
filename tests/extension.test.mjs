import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  DEFAULT_DURATION_MS,
  MAX_DURATION_MS,
  applyTimerAction,
  createDefaultTimerState,
  normalizeTimerState,
  overtimeFromTimerState,
  remainingFromTimerState,
} from "../extension/timer-state.js";

const extensionUrl = new URL("../extension/", import.meta.url);

async function source(name) {
  return readFile(new URL(name, extensionUrl), "utf8");
}

test("manifest is a self-contained, narrow-permission MV3 package", async () => {
  const manifestSource = await source("manifest.json");
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
  assert.equal(manifest.background.service_worker, "service-worker.js");
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.description.length <= 132, true);
  assert.equal("host_permissions" in manifest, false);
  assert.equal("content_scripts" in manifest, false);
  assert.deepEqual(manifest.web_accessible_resources, [
    { resources: ["assets/maya-*.webp"], matches: ["http://*/*", "https://*/*"] },
  ]);
  assert.doesNotMatch(manifestSource, /localhost|127\.0\.0\.1|<all_urls>/);
});

test("manifest icons and all six Maya frames exist", async () => {
  const manifest = JSON.parse(await source("manifest.json"));

  for (const size of [16, 32, 48, 128]) {
    const path = manifest.icons[String(size)];
    assert.equal(manifest.action.default_icon[String(size)], path);
    const bytes = await readFile(new URL(path, extensionUrl));
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }

  for (const frame of [
    "focused", "blink", "glance", "nod", "talk-a", "talk-b", "skeptic", "wink",
    "warning", "celebrate",
  ]) {
    await access(new URL(`assets/maya-${frame}.webp`, extensionUrl));
  }
});

test("extension JavaScript contains no remote or dynamic executable code", async () => {
  const combined = await Promise.all([
    source("service-worker.js"),
    source("timer-state.js"),
    source("overlay.js"),
  ]).then((parts) => parts.join("\n"));

  assert.doesNotMatch(combined, /https?:\/\//);
  assert.doesNotMatch(combined, /\beval\s*\(|new Function\s*\(/);
  assert.doesNotMatch(combined, /web-bridge|timerAction/);
});

test("timer state supports presets, exact durations, and bounded adjustments", () => {
  const now = 1_000_000;
  const initial = createDefaultTimerState(now);
  assert.equal(initial.durationMs, DEFAULT_DURATION_MS);
  assert.equal(initial.doneAtEpochMs, null);

  for (const durationMs of [60_000, 90_000, 120_000, 75_000]) {
    const configured = applyTimerAction(initial, "set-duration", now + 1, durationMs);
    assert.equal(configured.status, "idle");
    assert.equal(configured.durationMs, durationMs);
    assert.equal(configured.pausedRemainingMs, durationMs);
  }

  const shorter = applyTimerAction(initial, "subtract-30", now + 2);
  assert.equal(shorter.durationMs, 60_000);
  const restored = applyTimerAction(shorter, "add-30", now + 3);
  assert.equal(restored.durationMs, 90_000);
  const capped = applyTimerAction(initial, "set-duration", now + 4, Infinity);
  assert.equal(capped.durationMs, DEFAULT_DURATION_MS);
  assert.equal(
    applyTimerAction(initial, "set-duration", now + 5, MAX_DURATION_MS + 1).durationMs,
    MAX_DURATION_MS,
  );
});

test("running timer actions preserve deadline semantics and reach done at zero", () => {
  const now = 2_000_000;
  const initial = createDefaultTimerState(now);
  const running = applyTimerAction(initial, "toggle", now + 1);
  assert.equal(running.status, "running");
  assert.equal(remainingFromTimerState(running, now + 31), 89_970);

  const paused = applyTimerAction(running, "toggle", now + 30_001);
  assert.equal(paused.status, "paused");
  assert.equal(paused.pausedRemainingMs, 60_000);

  const extended = applyTimerAction(paused, "add-30", now + 30_002);
  assert.equal(extended.pausedRemainingMs, 90_000);

  const tiny = applyTimerAction(paused, "set-duration", now + 30_003, 10_000);
  const tinyRunning = applyTimerAction(tiny, "toggle", now + 30_004);
  const done = normalizeTimerState(tinyRunning, now + 40_004);
  assert.equal(done.status, "done");
  assert.equal(done.pausedRemainingMs, 0);
});

test("hitting zero starts overtime instead of ending the session", () => {
  const now = 3_000_000;
  const short = applyTimerAction(createDefaultTimerState(now), "set-duration", now, 10_000);
  const running = applyTimerAction(short, "toggle", now + 1);
  const deadline = running.deadlineEpochMs;

  const expired = applyTimerAction(running, "expire", now + 12_000);
  assert.equal(expired.status, "done");
  assert.equal(expired.doneAtEpochMs, deadline);
  assert.equal(overtimeFromTimerState(expired, now + 15_000), now + 15_000 - deadline);

  const normalizedLate = normalizeTimerState(running, now + 60_000);
  assert.equal(normalizedLate.status, "done");
  assert.equal(normalizedLate.doneAtEpochMs, deadline);

  const granted = applyTimerAction(expired, "add-30", now + 20_000);
  assert.equal(granted.status, "running");
  assert.equal(remainingFromTimerState(granted, now + 20_000), 30_000);
  assert.equal(granted.doneAtEpochMs, null);
  assert.equal(granted.durationMs, 10_000);

  assert.deepEqual(applyTimerAction(expired, "subtract-30", now + 21_000), expired);

  const reset = applyTimerAction(expired, "reset", now + 22_000);
  assert.equal(reset.status, "idle");
  assert.equal(reset.doneAtEpochMs, null);
  assert.equal(overtimeFromTimerState(reset, now + 23_000), 0);

  const again = applyTimerAction(expired, "toggle", now + 24_000);
  assert.equal(again.status, "running");
  assert.equal(again.doneAtEpochMs, null);
  assert.equal(remainingFromTimerState(again, now + 24_000), 10_000);
});

test("overlay is a timer-only Meet-style surface with a living Maya", async () => {
  const overlay = await source("overlay.js");

  // the original manga frames drive the scene: aligned micro-blends + panel cuts
  assert.match(overlay, /<canvas class="scene" width="640" height="427"/);
  assert.match(overlay, /sceneContext\.drawImage/);
  assert.match(overlay, /chrome\.runtime\.getURL\(`assets\/maya-\$\{name\}\.webp`\)/);
  for (const frame of [
    "focused", "blink", "glance", "nod", "talk-a", "talk-b", "skeptic", "wink",
    "warning", "celebrate",
  ]) {
    assert.match(overlay, new RegExp(`"${frame}"`));
  }
  assert.match(overlay, /FRAME_GROUP/);
  assert.match(overlay, /talkUntil/);
  assert.match(overlay, /DISPLAY_QUADS/);
  assert.match(overlay, /function mapDisplayPoint/);
  assert.match(overlay, /flashAlpha/);
  assert.doesNotMatch(overlay, /<img|new Function/);

  // continuous animation engine with reduced-motion support
  assert.match(overlay, /requestAnimationFrame/);
  assert.match(overlay, /cancelAnimationFrame/);
  assert.match(overlay, /prefers-reduced-motion/);
  assert.match(overlay, /window\.devicePixelRatio/);
  assert.match(overlay, /new ResizeObserver/);
  assert.match(overlay, /sceneResizeObserver\.disconnect\(\)/);

  // sound engine with mute persistence
  assert.match(overlay, /AudioContext/);
  assert.match(overlay, /playTick/);
  assert.match(overlay, /playChime/);
  assert.match(overlay, /playNag/);
  assert.match(overlay, /soundMuted/);
  assert.match(overlay, /class="sound-toggle"/);
  assert.match(overlay, /visibilityState/);

  // Maya speaks through captions
  assert.match(overlay, /class="caption"/);
  assert.match(overlay, /showCaption/);
  assert.match(overlay, /overtimeDeep/);

  // overtime keeps the call open and counts up in red
  assert.match(overlay, /displayedOvertime/);
  assert.match(overlay, /PLUS_GLYPH/);
  assert.match(overlay, /DIGIT_COLORS/);
  assert.match(overlay, /over by \$\{minutes\} minutes/);

  // set UI: presets plus a hold-to-repeat stepper, no form inputs
  assert.match(overlay, /data-duration-ms="60000"/);
  assert.match(overlay, /data-duration-ms="90000"/);
  assert.match(overlay, /data-duration-ms="120000"/);
  assert.match(overlay, /data-step-ms="-15000"/);
  assert.match(overlay, /data-step-ms="15000"/);
  assert.doesNotMatch(overlay, /name="minutes"|name="seconds"|<input/);

  // timer-only surface and call chrome
  assert.doesNotMatch(overlay, /class="progress"|participant-list|people-list/);
  assert.match(overlay, /data-action="subtract-30"/);
  assert.match(overlay, /data-action="add-30"/);
  assert.match(overlay, /data-action="reset"/);
  assert.match(overlay, /data-action="toggle"/);
  assert.match(overlay, /class="call-control hangup"/);
  assert.match(overlay, /class="sr-only timer-reading"/);
  assert.match(overlay, /chrome\.runtime\.sendMessage/);

  // complete cleanup contract
  assert.match(overlay, /clearInterval\(intervalId\)/);
  assert.match(overlay, /listeners\.abort\(\)/);
  assert.match(overlay, /removeListener\(receiveStorageChange\)/);
  assert.match(overlay, /audioContext\.close\(\)/);
});

test("service worker owns state changes and reports protected-page failures", async () => {
  const worker = await source("service-worker.js");

  assert.match(worker, /MAYA_TIMER_GET_STATE/);
  assert.match(worker, /MAYA_TIMER_ACTION/);
  assert.match(worker, /dispatchTimerAction\(message\.action, message\.durationMs\)/);
  assert.match(worker, /setBadgeText\(\{ text: "!", tabId \}\)/);
  assert.match(worker, /protected Chrome page/);
  assert.match(worker, /actionQueue/);
});
