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

const MAYA_FRAMES = [
  "focused", "blink", "glance", "nod", "talk-a", "talk-b", "skeptic", "wink",
  "yawn", "pleading", "sigh", "warning", "celebrate",
];

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

test("manifest icons and all thirteen Maya frames exist", async () => {
  const manifest = JSON.parse(await source("manifest.json"));

  for (const size of [16, 32, 48, 128]) {
    const path = manifest.icons[String(size)];
    assert.equal(manifest.action.default_icon[String(size)], path);
    const bytes = await readFile(new URL(path, extensionUrl));
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }

  for (const frame of MAYA_FRAMES) {
    await access(new URL(`assets/maya-${frame}.webp`, extensionUrl));
  }
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

test("overlay ships the timer-only controls and every Maya frame", async () => {
  const overlay = await source("overlay.js");

  // the canvas scene renders the manga frames; every frame is referenced
  assert.match(overlay, /<canvas class="scene" width="640" height="427"/);
  for (const frame of MAYA_FRAMES) {
    assert.match(overlay, new RegExp(`"${frame}"`));
  }

  // controls contract: call dock actions, presets, stepper, hangup
  for (const action of ["toggle", "add-30", "subtract-30", "reset"]) {
    assert.match(overlay, new RegExp(`data-action="${action}"`));
  }
  for (const preset of [60000, 90000, 120000]) {
    assert.match(overlay, new RegExp(`data-duration-ms="${preset}"`));
  }
  assert.match(overlay, /data-step-ms="-15000"/);
  assert.match(overlay, /data-step-ms="15000"/);
  assert.match(overlay, /<input class="stepper-time" inputmode="numeric"/);
  assert.match(overlay, /class="call-control hangup"/);
  assert.match(overlay, /class="sr-only timer-reading"/);

  // release gates: no raster <img>, no dynamic code, reduced-motion honored
  assert.doesNotMatch(overlay, /<img|new Function/);
  assert.match(overlay, /prefers-reduced-motion/);

  // timer-only surface: no participant lists, no form controls
  assert.doesNotMatch(overlay, /class="progress"|participant-list|people-list|<form/);
});

test("service worker owns state changes and reports protected-page failures", async () => {
  const worker = await source("service-worker.js");

  assert.match(worker, /MAYA_TIMER_GET_STATE/);
  assert.match(worker, /MAYA_TIMER_ACTION/);
  assert.match(worker, /setBadgeText\(\{ text: "!", tabId \}\)/);
  assert.match(worker, /protected Chrome page/);
});
