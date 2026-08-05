import test from "node:test";
import assert from "node:assert/strict";
import {
  addTime,
  formatTime,
  pauseTimer,
  remainingFromState,
  resetTimer,
  startTimer,
} from "../src/timer.js";

const base = {
  status: "idle",
  durationMs: 90_000,
  pausedRemainingMs: 90_000,
  deadlineEpochMs: null,
  revision: 0,
};

test("running time is derived from the deadline", () => {
  const running = startTimer(base, 1_000);
  assert.equal(running.deadlineEpochMs, 91_000);
  assert.equal(remainingFromState(running, 31_000), 60_000);
});

test("pause freezes the derived remaining time", () => {
  const paused = pauseTimer(startTimer(base, 1_000), 31_000);
  assert.equal(paused.status, "paused");
  assert.equal(paused.pausedRemainingMs, 60_000);
  assert.equal(remainingFromState(paused, 80_000), 60_000);
});

test("adding time preserves running status and moves the deadline", () => {
  const running = startTimer(base, 1_000);
  const extended = addTime(running, 60_000, 31_000);
  assert.equal(remainingFromState(extended, 31_000), 120_000);
  assert.equal(extended.deadlineEpochMs, 151_000);
});

test("adjusting an idle timer changes the configured duration", () => {
  const shorter = addTime(base, -30_000, 2_000);
  assert.equal(shorter.status, "idle");
  assert.equal(shorter.durationMs, 60_000);
  assert.equal(startTimer(shorter, 3_000).deadlineEpochMs, 63_000);
});

test("subtracting time clamps at zero while running", () => {
  const running = startTimer(base, 1_000);
  const shortened = addTime(running, -120_000, 31_000);
  assert.equal(remainingFromState(shortened, 31_000), 0);
});

test("reset restores the configured duration", () => {
  const reset = resetTimer(
    { ...base, status: "done", pausedRemainingMs: 0 },
    2_000,
  );
  assert.equal(reset.status, "idle");
  assert.equal(reset.pausedRemainingMs, 90_000);
});

test("formatTime rounds up partial seconds", () => {
  assert.equal(formatTime(89_001), "01:30");
  assert.equal(formatTime(0), "00:00");
});
