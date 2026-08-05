import { useEffect, useRef, useState } from "react";
import {
  TIMER_CHANNEL,
  TIMER_STORAGE_KEY,
  addTime,
  formatTime,
  pauseTimer,
  remainingFromState,
  resetTimer,
  startTimer,
} from "./timer.js";

const DEFAULT_STATE = {
  schemaVersion: 1,
  status: "idle",
  durationMs: 90_000,
  deadlineEpochMs: null,
  pausedRemainingMs: 90_000,
  revision: 0,
  updatedAt: 0,
};

const ART_MOMENTS = [
  "focused",
  "blink",
  "glance",
  "nod",
  "warning",
  "celebrate",
];

const DIGIT_SEGMENTS = {
  0: "abcdef",
  1: "bc",
  2: "abdeg",
  3: "abcdg",
  4: "bcfg",
  5: "acdfg",
  6: "acdefg",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};

const SEGMENTS = [
  ["a", "10,4 50,4 56,10 50,16 10,16 4,10"],
  ["b", "50,18 56,12 60,18 60,44 54,50 48,44"],
  ["c", "54,52 60,58 60,84 54,90 48,84 48,58"],
  ["d", "10,84 50,84 56,90 50,96 10,96 4,90"],
  ["e", "0,58 6,52 12,58 12,84 6,90 0,84"],
  ["f", "0,18 6,12 12,18 12,44 6,50 0,44"],
  ["g", "10,44 50,44 56,50 50,56 10,56 4,50"],
];

function SevenSegmentDigit({ value }) {
  const activeSegments = DIGIT_SEGMENTS[value] ?? "";

  return (
    <svg className="seven-segment-digit" viewBox="0 0 60 100">
      {SEGMENTS.map(([segment, points]) => (
        <polygon
          key={segment}
          className={
            "seven-segment" +
            (activeSegments.includes(segment) ? " is-on" : "")
          }
          points={points}
        />
      ))}
    </svg>
  );
}

function SevenSegmentDisplay({ value }) {
  return (
    <span className="seven-segment-display" aria-hidden="true">
      {value.split("").map((character, index) =>
        character === ":" ? (
          <span className="seven-segment-colon" key={"colon-" + index} />
        ) : (
          <SevenSegmentDigit value={character} key={index} />
        ),
      )}
    </span>
  );
}

const LINES = {
  idle: [
    "Yesterday: coffee. Today: countdown. Blockers: optimism.",
    "Set the time. I’ll guard the timebox.",
  ],
  calm: [
    "Green status. Suspiciously green.",
    "A crisp update? In this economy?",
  ],
  half: [
    "Half the timebox gone. Still a ‘quick update’?",
    "Plot twist: the context has context.",
  ],
  warning: [
    "We’ve entered the ‘one last thing’ arc.",
    "Deep dive? Parking lot. Move!",
  ],
  final: [
    "Ten seconds! Acceptance criteria later!",
    "Final panel. Land the update!",
  ],
  paused: [
    "Blocker detected: reality.",
    "The timebox is paused. The drama is not.",
  ],
  done: [
    "Timebox complete. Discussion mysteriously alive.",
    "Definition of Done: timer says yes.",
  ],
  added: [
    "One small minute. Famous last words.",
    "Scope acquired a second season.",
  ],
  subtracted: [
    "Scope cut! The rarest agile ceremony.",
    "Thirty seconds deleted. Courage restored.",
  ],
};

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY));
    return saved?.timer ? { ...DEFAULT_STATE, ...saved.timer } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function App() {
  const [session, setSession] = useState(loadSession);
  const [now, setNow] = useState(Date.now());
  const [lineKey, setLineKey] = useState("idle");
  const [lineIndex, setLineIndex] = useState(0);
  const [reactionOverride, setReactionOverride] = useState(null);
  const [mayaMoment, setMayaMoment] = useState("focused");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [exactMinutes, setExactMinutes] = useState(
    String(Math.floor(session.durationMs / 60_000)),
  );
  const [exactSeconds, setExactSeconds] = useState(
    String(Math.floor((session.durationMs % 60_000) / 1000)),
  );
  const sessionRef = useRef(session);
  const channelRef = useRef(null);

  sessionRef.current = session;

  const remainingMs = remainingFromState(session, now);
  const progress = session.durationMs
    ? Math.min(1, remainingMs / session.durationMs)
    : 0;
  const phase =
    session.status === "paused"
      ? "paused"
      : session.status === "done"
        ? "done"
        : session.status !== "running"
          ? "idle"
          : remainingMs <= 10_000
            ? "final"
            : progress <= 0.25
              ? "warning"
              : progress <= 0.55
                ? "half"
                : "calm";
  const artState =
    phase === "done"
      ? "celebrate"
      : phase === "warning" || phase === "final"
        ? "warning"
        : phase === "paused"
          ? "glance"
          : "focused";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (artState !== "focused" || prefersReducedMotion) {
      setMayaMoment("focused");
      return undefined;
    }

    let momentTimer;
    let returnTimer;
    let cancelled = false;

    function scheduleMoment() {
      momentTimer = window.setTimeout(
        () => {
          if (cancelled) return;
          const roll = Math.random();
          const isCheckingTime = phase === "half";
          const blinkThreshold = isCheckingTime ? 0.45 : 0.62;
          const glanceThreshold = isCheckingTime ? 0.82 : 0.84;
          const moment =
            roll < blinkThreshold
              ? "blink"
              : roll < glanceThreshold
                ? "glance"
                : "nod";
          setMayaMoment(moment);
          returnTimer = window.setTimeout(
            () => {
              if (cancelled) return;
              setMayaMoment("focused");
              scheduleMoment();
            },
            moment === "blink" ? 180 : 1_100,
          );
        },
        2_200 + Math.random() * 3_800,
      );
    }

    scheduleMoment();
    return () => {
      cancelled = true;
      window.clearTimeout(momentTimer);
      window.clearTimeout(returnTimer);
    };
  }, [artState, phase, prefersReducedMotion]);

  useEffect(() => {
    if (session.status !== "running") return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session.status]);

  useEffect(() => {
    if (session.status === "running" && remainingMs <= 0) {
      setSession((current) => ({
        ...current,
        status: "done",
        deadlineEpochMs: null,
        pausedRemainingMs: 0,
        revision: current.revision + 1,
        updatedAt: Date.now(),
      }));
    }
  }, [remainingMs, session.status]);

  useEffect(() => {
    const channel = new BroadcastChannel(TIMER_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = ({ data }) => {
      if (
        data?.type === "STANDUP_TIMER_STATE" &&
        data.state?.updatedAt > sessionRef.current.updatedAt
      ) {
        setSession(data.state);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({ timer: session }),
    );
    channelRef.current?.postMessage({
      type: "STANDUP_TIMER_STATE",
      state: session,
    });
    window.postMessage(
      {
        source: "standup-timer-web",
        type: "STATE_UPDATE",
        payload: session,
      },
      window.location.origin,
    );
  }, [session]);

  useEffect(() => {
    if (session.status === "running" || session.status === "paused") return;
    setExactMinutes(String(Math.floor(session.durationMs / 60_000)));
    setExactSeconds(
      String(Math.floor((session.durationMs % 60_000) / 1000)),
    );
  }, [session.durationMs, session.status]);

  function update(next) {
    setNow(Date.now());
    setSession(next);
  }

  function toggleTimer() {
    const current = sessionRef.current;
    const timestamp = Date.now();
    if (current.status === "running") {
      update(pauseTimer(current, timestamp));
    } else if (current.status === "done") {
      update(startTimer(resetTimer(current, timestamp), timestamp));
    } else {
      update(startTimer(current, timestamp));
    }
  }

  function adjustTime(amountMs) {
    const reaction = amountMs < 0 ? "subtracted" : "added";
    setReactionOverride(reaction);
    update(addTime(sessionRef.current, amountMs));
  }

  function followPointer(event) {
    if (prefersReducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--maya-x", x * 7 + "px");
    event.currentTarget.style.setProperty("--maya-y", y * 5 + "px");
    event.currentTarget.style.setProperty("--maya-rotate", x * 0.28 + "deg");
  }

  function centerMaya(event) {
    event.currentTarget.style.setProperty("--maya-x", "0px");
    event.currentTarget.style.setProperty("--maya-y", "0px");
    event.currentTarget.style.setProperty("--maya-rotate", "0deg");
  }

  useEffect(() => {
    function receiveExtensionAction(event) {
      if (
        event.origin !== window.location.origin ||
        event.data?.source !== "standup-timer-extension"
      ) {
        return;
      }
      if (event.data.action === "toggle") toggleTimer();
      if (event.data.action === "add-30") adjustTime(30_000);
      if (event.data.action === "subtract-30") adjustTime(-30_000);
    }
    window.addEventListener("message", receiveExtensionAction);
    return () => window.removeEventListener("message", receiveExtensionAction);
  }, []);

  useEffect(() => {
    const nextKey = reactionOverride ?? phase;
    if (nextKey !== lineKey) {
      setLineKey(nextKey);
      setLineIndex((current) => (current + 1) % LINES[nextKey].length);
    }
  }, [lineKey, phase, reactionOverride]);

  useEffect(() => {
    if (!reactionOverride) return undefined;
    const id = window.setTimeout(() => setReactionOverride(null), 2_500);
    return () => window.clearTimeout(id);
  }, [reactionOverride]);

  function changeDuration(seconds) {
    const durationMs = Math.max(1_000, seconds * 1000);
    update({
      ...sessionRef.current,
      durationMs,
      pausedRemainingMs: durationMs,
      status: "idle",
      deadlineEpochMs: null,
      revision: sessionRef.current.revision + 1,
      updatedAt: Date.now(),
    });
  }

  function setExactTime(event) {
    event.preventDefault();
    const minutes = Math.max(0, Number.parseInt(exactMinutes, 10) || 0);
    const seconds = Math.max(
      0,
      Math.min(59, Number.parseInt(exactSeconds, 10) || 0),
    );
    changeDuration(minutes * 60 + seconds);
  }

  function endCall() {
    const current = sessionRef.current;
    if (current.status === "running") {
      update(pauseTimer(current, Date.now()));
    }
    setCallEnded(true);
    window.setTimeout(() => window.close(), 0);
  }

  function rejoinCall() {
    update(resetTimer(sessionRef.current));
    setCallEnded(false);
  }

  const visibleMoment = artState === "focused" ? mayaMoment : artState;
  const statusLabel =
    session.status === "idle" ? "READY" : session.status.toUpperCase();
  const displayTime = formatTime(remainingMs);

  if (callEnded) {
    return (
      <main className="call-ended">
        <img
          src="/assets/timekeeper-celebrate.png"
          alt="Maya celebrating the completed standup"
        />
        <div>
          <span className="ended-kicker">CALL ENDED</span>
          <h1>Standup wrapped.</h1>
          <p>Maya has released the timebox back into the wild.</p>
          <button onClick={rejoinCall}>Rejoin</button>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        "app state-" + session.status + " art-" + artState + " phase-" + phase
      }
    >
      <header className="topbar">
        <a className="brand" href="#timer" aria-label="Standup Timer home">
          <span className="brand-mark">ST</span>
          <span>STANDUP TIMER</span>
        </a>
        <span className="maya-duty">MAYA · CONNECTED</span>
      </header>

      <section className="timer-card" id="timer" aria-label="Standup timer">
        <div
          className="manga-stage"
          onPointerMove={followPointer}
          onPointerLeave={centerMaya}
        >
          <div className="call-status">
            <span aria-hidden="true" /> MAYA · LIVE
          </div>
          <div className={"maya-wrap maya-" + visibleMoment}>
            <div className="maya-scene">
              <div
                className="maya-art-stack"
                role="img"
                aria-label="Maya, an original manga timekeeper, holding a large orange kitchen timer"
              >
                {ART_MOMENTS.map((moment) => (
                  <img
                    key={moment}
                    className={
                      "timekeeper-art" +
                      (visibleMoment === moment ? " is-visible" : "")
                    }
                    src={"/assets/timekeeper-" + moment + ".png"}
                    alt=""
                    aria-hidden="true"
                  />
                ))}
              </div>

              <div className="timer-face">
                <span className="timer-status">{statusLabel}</span>
                <output
                  className="timer-output"
                  aria-label={displayTime + " remaining"}
                >
                  <span className="sr-only">{displayTime}</span>
                  <SevenSegmentDisplay value={displayTime} />
                </output>
              </div>
            </div>
          </div>
          <div className="speech-bubble" aria-live="polite">
            <span className="bubble-kicker">MAYA SAYS</span>
            <strong>{LINES[lineKey][lineIndex % LINES[lineKey].length]}</strong>
          </div>
        </div>

        <div className="timer-settings">
          <div className="preset-row">
            <span className="eyebrow">QUICK SET</span>
            <div className="duration-picker" aria-label="Timer presets">
              {[60, 90, 120].map((seconds) => (
                <button
                  key={seconds}
                  className={
                    session.durationMs === seconds * 1000 ? "active" : ""
                  }
                  onClick={() => changeDuration(seconds)}
                  disabled={session.status === "running"}
                  aria-pressed={session.durationMs === seconds * 1000}
                >
                  {seconds === 60 ? "1m" : seconds === 90 ? "1.5m" : "2m"}
                </button>
              ))}
            </div>
          </div>

          <form className="exact-time" onSubmit={setExactTime}>
            <span className="eyebrow">CUSTOM</span>
            <label>
              <span>min</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Minutes"
                value={exactMinutes}
                onChange={(event) => setExactMinutes(event.target.value)}
                disabled={session.status === "running"}
              />
            </label>
            <span className="time-colon">:</span>
            <label>
              <span>sec</span>
              <input
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                aria-label="Seconds"
                value={exactSeconds}
                onChange={(event) => setExactSeconds(event.target.value)}
                disabled={session.status === "running"}
              />
            </label>
            <button type="submit" disabled={session.status === "running"}>
              Set time
            </button>
          </form>
        </div>

        <nav className="main-controls" aria-label="Timer call controls">
          <button
            className="call-control"
            onClick={() => adjustTime(-30_000)}
            aria-label="Subtract 30 seconds"
          >
            −30s
          </button>
          <button
            className="call-control"
            onClick={() => update(resetTimer(sessionRef.current))}
          >
            Reset
          </button>
          <button className="primary start" onClick={toggleTimer}>
            {session.status === "running"
              ? "Pause"
              : session.status === "paused"
                ? "Resume"
                : session.status === "done"
                  ? "Again"
                  : "Start"}
          </button>
          <button
            className="call-control add-control"
            onClick={() => adjustTime(30_000)}
            aria-label="Add 30 seconds"
          >
            +30s
          </button>
          <button className="call-control hangup" onClick={endCall}>
            Hang up
          </button>
        </nav>
      </section>
    </main>
  );
}
