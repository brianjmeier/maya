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

  const artState =
    session.status === "done"
      ? "celebrate"
      : session.status === "running" && progress <= 0.3
        ? "warning"
        : "focused";

  useEffect(() => {
    [
      "focused",
      "blink",
      "glance",
      "nod",
      "warning",
      "celebrate",
    ].forEach((name) => {
      const image = new Image();
      image.src = "/assets/timekeeper-" + name + ".png";
    });
  }, []);

  useEffect(() => {
    if (artState !== "focused") {
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
          const moment = roll < 0.62 ? "blink" : roll < 0.84 ? "glance" : "nod";
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
  }, [artState]);

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
    let nextKey = "idle";
    if (session.status === "paused") nextKey = "paused";
    else if (session.status === "done") nextKey = "done";
    else if (session.status === "running" && remainingMs <= 10_000)
      nextKey = "final";
    else if (session.status === "running" && progress <= 0.25)
      nextKey = "warning";
    else if (session.status === "running" && progress <= 0.55)
      nextKey = "half";
    else if (session.status === "running") nextKey = "calm";

    nextKey = reactionOverride ?? nextKey;
    if (nextKey !== lineKey) {
      setLineKey(nextKey);
      setLineIndex((current) => (current + 1) % LINES[nextKey].length);
    }
  }, [lineKey, progress, reactionOverride, remainingMs, session.status]);

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

  const visibleMoment = artState === "focused" ? mayaMoment : artState;
  const artSource = "/assets/timekeeper-" + visibleMoment + ".png";
  const statusLabel =
    session.status === "idle" ? "READY" : session.status.toUpperCase();

  return (
    <main className={"app state-" + session.status + " art-" + artState}>
      <header className="topbar">
        <a className="brand" href="#timer" aria-label="Standup Timer home">
          <span className="brand-mark">ST</span>
          <span>STANDUP TIMER</span>
        </a>
        <span className="maya-duty">MAYA IS ON DUTY</span>
      </header>

      <section className="timer-card" id="timer" aria-label="Standup timer">
        <div className="chapter-label">CHAPTER 01 · THE DAILY TIMEBOX</div>
        <div
          className="manga-stage"
          onPointerMove={followPointer}
          onPointerLeave={centerMaya}
        >
          <div className={"maya-wrap maya-" + visibleMoment}>
            <img
              key={artSource}
              className="timekeeper-art"
              src={artSource}
              alt="Maya, an original manga timekeeper, holding a large orange kitchen timer"
            />
          </div>
          <div className="speech-bubble" aria-live="polite">
            <span className="bubble-kicker">MAYA SAYS</span>
            <strong>{LINES[lineKey][lineIndex % LINES[lineKey].length]}</strong>
          </div>

          <div className="timer-face">
            <span className="timer-status">{statusLabel}</span>
            <output aria-label={formatTime(remainingMs) + " remaining"}>
              {formatTime(remainingMs)}
            </output>
            <div className="face-progress">
              <span style={{ width: progress * 100 + "%" }} />
            </div>
          </div>

          <div className="maya-card">
            <span className="eyebrow">YOUR TIMEKEEPER</span>
            <strong>MAYA</strong>
            <span>Guarding the timebox</span>
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
                >
                  {seconds === 60 ? "1m" : seconds === 90 ? "1.5m" : "2m"}
                </button>
              ))}
            </div>
          </div>

          <form className="exact-time" onSubmit={setExactTime}>
            <span className="eyebrow">EXACT TIME</span>
            <label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={exactMinutes}
                onChange={(event) => setExactMinutes(event.target.value)}
                disabled={session.status === "running"}
              />
              <span>min</span>
            </label>
            <span className="time-colon">:</span>
            <label>
              <input
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                value={exactSeconds}
                onChange={(event) => setExactSeconds(event.target.value)}
                disabled={session.status === "running"}
              />
              <span>sec</span>
            </label>
            <button type="submit" disabled={session.status === "running"}>
              Set
            </button>
          </form>

          <div className="adjust-time" aria-label="Adjust remaining time">
            <span className="eyebrow">ADJUST</span>
            <button onClick={() => adjustTime(-30_000)}>− 30s</button>
            <button onClick={() => adjustTime(30_000)}>+ 30s</button>
          </div>
        </div>

        <div className="main-controls">
          <button
            className="secondary"
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
        </div>
      </section>

      <footer>
        <span>ONE TIMER. ZERO DASHBOARDS.</span>
        <span>Tip: the Chrome extension keeps Maya over any board.</span>
      </footer>
    </main>
  );
}
