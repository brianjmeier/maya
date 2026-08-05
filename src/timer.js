export const TIMER_STORAGE_KEY = "standup-timer:v1";
export const TIMER_CHANNEL = "standup-timer";

export function remainingFromState(state, now = Date.now()) {
  if (state.status === "running" && state.deadlineEpochMs) {
    return Math.max(0, state.deadlineEpochMs - now);
  }
  return Math.max(0, state.pausedRemainingMs ?? state.durationMs ?? 0);
}

export function startTimer(state, now = Date.now()) {
  const remaining =
    state.status === "paused" ? remainingFromState(state, now) : state.durationMs;

  return {
    ...state,
    status: "running",
    deadlineEpochMs: now + remaining,
    pausedRemainingMs: remaining,
    revision: (state.revision ?? 0) + 1,
    updatedAt: now,
  };
}

export function pauseTimer(state, now = Date.now()) {
  const remaining = remainingFromState(state, now);
  return {
    ...state,
    status: "paused",
    deadlineEpochMs: null,
    pausedRemainingMs: remaining,
    revision: (state.revision ?? 0) + 1,
    updatedAt: now,
  };
}

export function resetTimer(state, now = Date.now()) {
  return {
    ...state,
    status: "idle",
    deadlineEpochMs: null,
    pausedRemainingMs: state.durationMs,
    revision: (state.revision ?? 0) + 1,
    updatedAt: now,
  };
}

export function addTime(state, amountMs, now = Date.now()) {
  if (state.status === "idle" || state.status === "done") {
    const durationMs = Math.max(1_000, state.durationMs + amountMs);
    return {
      ...state,
      status: "idle",
      durationMs,
      deadlineEpochMs: null,
      pausedRemainingMs: durationMs,
      revision: (state.revision ?? 0) + 1,
      updatedAt: now,
    };
  }

  const remaining = Math.max(
    0,
    remainingFromState(state, now) + amountMs,
  );
  return {
    ...state,
    deadlineEpochMs: state.status === "running" ? now + remaining : null,
    pausedRemainingMs: remaining,
    revision: (state.revision ?? 0) + 1,
    updatedAt: now,
  };
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}
