const MIN_DURATION_MS = 1_000;
export const MAX_DURATION_MS = 5_999_000;
export const DEFAULT_DURATION_MS = 90_000;

export const TIMER_ACTIONS = Object.freeze([
  "toggle",
  "add-30",
  "subtract-30",
  "set-duration",
  "reset",
  "expire",
]);

const VALID_STATUSES = new Set(["idle", "running", "paused", "done"]);

function clampDuration(value, fallback = DEFAULT_DURATION_MS) {
  const duration = Number.isFinite(value) ? value : fallback;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, duration));
}

function nextRevision(state) {
  return Number.isSafeInteger(state.revision) ? state.revision + 1 : 1;
}

function commit(state, changes, now) {
  return {
    ...state,
    ...changes,
    revision: nextRevision(state),
    updatedAt: now,
  };
}

export function createDefaultTimerState(now = Date.now()) {
  return {
    schemaVersion: 1,
    status: "idle",
    durationMs: DEFAULT_DURATION_MS,
    deadlineEpochMs: null,
    pausedRemainingMs: DEFAULT_DURATION_MS,
    doneAtEpochMs: null,
    revision: 0,
    updatedAt: now,
  };
}

export function remainingFromTimerState(state, now = Date.now()) {
  if (state.status === "running" && Number.isFinite(state.deadlineEpochMs)) {
    return Math.max(0, state.deadlineEpochMs - now);
  }

  return Math.max(0, state.pausedRemainingMs ?? state.durationMs ?? 0);
}

export function overtimeFromTimerState(state, now = Date.now()) {
  if (state.status !== "done" || !Number.isFinite(state.doneAtEpochMs)) {
    return 0;
  }

  return Math.max(0, now - state.doneAtEpochMs);
}

export function normalizeTimerState(candidate, now = Date.now()) {
  const fallback = createDefaultTimerState(now);
  if (!candidate || typeof candidate !== "object") return fallback;

  const durationMs = clampDuration(candidate.durationMs);
  const status = VALID_STATUSES.has(candidate.status) ? candidate.status : "idle";
  const normalized = {
    ...fallback,
    status,
    durationMs,
    deadlineEpochMs: Number.isFinite(candidate.deadlineEpochMs)
      ? candidate.deadlineEpochMs
      : null,
    pausedRemainingMs: Math.min(
      MAX_DURATION_MS,
      Math.max(
        0,
        Number.isFinite(candidate.pausedRemainingMs)
          ? candidate.pausedRemainingMs
          : durationMs,
      ),
    ),
    doneAtEpochMs: Number.isFinite(candidate.doneAtEpochMs)
      ? candidate.doneAtEpochMs
      : null,
    revision: Number.isSafeInteger(candidate.revision) ? candidate.revision : 0,
    updatedAt: Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : now,
  };

  if (normalized.status === "running") {
    normalized.doneAtEpochMs = null;
    if (!normalized.deadlineEpochMs) {
      return { ...normalized, status: "idle", pausedRemainingMs: durationMs };
    }

    if (normalized.deadlineEpochMs <= now) {
      return {
        ...normalized,
        status: "done",
        deadlineEpochMs: null,
        pausedRemainingMs: 0,
        doneAtEpochMs: normalized.deadlineEpochMs,
      };
    }
  }

  if (normalized.status !== "done") {
    normalized.doneAtEpochMs = null;
  }

  if (normalized.status === "idle") {
    normalized.deadlineEpochMs = null;
    normalized.pausedRemainingMs = durationMs;
  }

  return normalized;
}

function expire(state, now) {
  if (state.status !== "running" || remainingFromTimerState(state, now) > 0) {
    return state;
  }

  return commit(state, {
    status: "done",
    deadlineEpochMs: null,
    pausedRemainingMs: 0,
    doneAtEpochMs: Number.isFinite(state.deadlineEpochMs)
      ? state.deadlineEpochMs
      : now,
  }, now);
}

function reset(state, now) {
  return commit(state, {
    status: "idle",
    deadlineEpochMs: null,
    pausedRemainingMs: state.durationMs,
    doneAtEpochMs: null,
  }, now);
}

function setDuration(state, durationOverrideMs, now) {
  const durationMs = clampDuration(durationOverrideMs);
  return commit(state, {
    status: "idle",
    durationMs,
    deadlineEpochMs: null,
    pausedRemainingMs: durationMs,
    doneAtEpochMs: null,
  }, now);
}

function toggle(state, now) {
  if (state.status === "running") {
    const remainingMs = remainingFromTimerState(state, now);
    return commit(state, {
      status: remainingMs > 0 ? "paused" : "done",
      deadlineEpochMs: null,
      pausedRemainingMs: remainingMs,
      doneAtEpochMs: remainingMs > 0 ? null : now,
    }, now);
  }

  const remainingMs =
    state.status === "paused" ? state.pausedRemainingMs : state.durationMs;
  return commit(state, {
    status: "running",
    deadlineEpochMs: now + remainingMs,
    pausedRemainingMs: remainingMs,
    doneAtEpochMs: null,
  }, now);
}

function adjust(state, adjustmentMs, now) {
  if (state.status === "done") {
    // overtime: +30 grants a fresh 30-second countdown, -30 is a no-op
    if (adjustmentMs < 0) return state;

    return commit(state, {
      status: "running",
      deadlineEpochMs: now + 30_000,
      pausedRemainingMs: 30_000,
      doneAtEpochMs: null,
    }, now);
  }

  if (state.status === "idle") {
    const durationMs = clampDuration(state.durationMs + adjustmentMs);
    return commit(state, {
      status: "idle",
      durationMs,
      deadlineEpochMs: null,
      pausedRemainingMs: durationMs,
      doneAtEpochMs: null,
    }, now);
  }

  const remainingMs = Math.min(
    MAX_DURATION_MS,
    Math.max(0, remainingFromTimerState(state, now) + adjustmentMs),
  );
  return commit(state, {
    status: remainingMs > 0 ? state.status : "done",
    deadlineEpochMs:
      state.status === "running" && remainingMs > 0 ? now + remainingMs : null,
    pausedRemainingMs: remainingMs,
    doneAtEpochMs: remainingMs > 0 ? null : now,
  }, now);
}

export function applyTimerAction(
  candidate,
  action,
  now = Date.now(),
  durationOverrideMs,
) {
  const state = normalizeTimerState(candidate, now);

  switch (action) {
    case "expire":
      return expire(state, now);
    case "reset":
      return reset(state, now);
    case "set-duration":
      return setDuration(state, durationOverrideMs, now);
    case "toggle":
      return toggle(state, now);
    case "add-30":
      return adjust(state, 30_000, now);
    case "subtract-30":
      return adjust(state, -30_000, now);
    default:
      return state;
  }
}
