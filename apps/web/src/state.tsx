import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type {
  Attempt,
  Candidate,
  ContextPacket,
  Fragment,
  Lang,
} from "@sollu/shared";
import { getPainCandidates } from "@sollu/shared";
import {
  db,
  defaultSettings,
  getKV,
  recordingId,
  setKV,
  type Pairing,
  type Settings,
} from "./db";
import { buildContext, memoryScore, normalize } from "./lib/context";
import { getIntent } from "./lib/api";
import { RelayClient } from "./lib/relay";
import { audio, type TapTicket } from "./features/audio";
import { getRehearsal, saveRehearsal } from "./features/demo/service";

export interface Session {
  attempt: Attempt;
  context: ContextPacket;
  candidates: Candidate[];
  loading: boolean;
  error: string;
  model: string;
  chosen?: Candidate;
  audioStatus: string;
  source: string;
  delivery: string;
  usual?: string;
}
type AppState = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  ready: boolean;
  session: Session | null;
  begin: (fragment: Fragment) => void;
  generate: (
    fragment?: Fragment,
    round?: 1 | 2 | 3,
    override?: Lang,
  ) => Promise<void>;
  speak: (
    candidate: Candidate,
    ticket: TapTicket | null,
    preview?: boolean,
    langOverride?: Lang,
  ) => void;
  stop: () => void;
  abandon: () => void;
  retry: () => void;
  question: { text: string; at: number } | null;
  setQuestion: (text: string) => void;
  caregiverUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
  connected: boolean;
  pairingVersion: number;
  refreshPairing: () => void;
  helpAck: string;
  cancelHelp: () => void;
  online: boolean;
  finishBaseline: (text: string) => Attempt | undefined;
};
const AppContext = createContext<AppState | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("Missing app context");
  return ctx;
};
export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings),
    [ready, setReady] = useState(false),
    [session, setSessionState] = useState<Session | null>(null);
  const [question, setQuestionState] = useState<{
      text: string;
      at: number;
    } | null>(null),
    [caregiverUnlocked, setUnlocked] = useState(false);
  const [connected, setConnected] = useState(false),
    [pairingVersion, setPairingVersion] = useState(0),
    [helpAck, setHelpAck] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const settingsRef = useRef(settings);
  const speechEpoch = useRef(0);
  const sessionRef = useRef<Session | null>(null),
    abort = useRef<AbortController | null>(null),
    relay = useRef<RelayClient | null>(null),
    pendingReceipt = useRef<string | null>(null),
    generation = useRef(0);
  function setSession(next: Session | null) {
    sessionRef.current = next;
    setSessionState(next);
  }
  function changeSession(update: (s: Session) => Session) {
    if (sessionRef.current) setSession(update(sessionRef.current));
  }
  useEffect(() => {
    void getKV<Settings>("settings").then((s) => {
      if (s) {
        const next = { ...defaultSettings, ...s };
        settingsRef.current = next;
        setSettings(next);
      }
      setReady(true);
    });
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      audio.stop();
    };
  }, []);
  useEffect(() => {
    const tap = () => {
      const s = sessionRef.current;
      if (s && !s.attempt.endedAt)
        changeSession((v) => ({
          ...v,
          attempt: { ...v.attempt, taps: v.attempt.taps + 1 },
        }));
    };
    window.addEventListener("sollu:tap", tap);
    return () => window.removeEventListener("sollu:tap", tap);
  }, []);
  useEffect(() => {
    let active = true;
    void getKV<Pairing>("pairing").then((pair) => {
      if (!pair || !active) return;
      const client = new RelayClient(
        pair,
        (message) => {
          if (
            message.type === "delivered" &&
            message.refId === pendingReceipt.current
          )
            changeSession((s) => ({
              ...s,
              delivery: `Shown on ${pair.name}’s phone ✓`,
            }));
          if (
            message.type === "ack" &&
            message.refId === pendingReceipt.current
          )
            setHelpAck(`${pair.name} is coming ✓`);
          if (message.type === "ask" && message.text)
            setQuestionState({ text: message.text, at: message.at });
        },
        setConnected,
      );
      relay.current = client;
      client.connect();
    });
    return () => {
      active = false;
      relay.current?.disconnect();
      relay.current = null;
    };
  }, [pairingVersion]);
  async function updateSettings(patch: Partial<Settings>) {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await setKV("settings", next);
  }
  function begin(fragment: Fragment, preserveAudio = false) {
    abort.current?.abort();
    generation.current++;
    if (!preserveAudio) {
      speechEpoch.current++;
      audio.stop();
    }
    const previous = sessionRef.current;
    if (previous && !previous.attempt.endedAt)
      void db.attempts.put({
        ...previous.attempt,
        endedAt: Date.now(),
        outcome: "abandoned",
      });
    const context = buildContext(settingsRef.current, fragment, {
      question: question ?? undefined,
    });
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      modality: fragment.modality,
      fragmentRaw: fragment.raw,
      sttRetries: 0,
      topicPath: fragment.topicPath,
      objectLabel: fragment.objectLabel,
      objectSource: fragment.objectSource,
      outputLang: context.outputLang,
      place: settings.place,
      timeBucket: context.now!.timeBucket,
      demoClock: settings.demo,
      rounds: [],
      taps: 1,
      offline: !navigator.onLine,
      demoCached: false,
      addresseeRelation: context.addressee?.relation,
    };
    setSession({
      attempt,
      context,
      candidates: [],
      loading: false,
      error: "",
      model: "",
      audioStatus: "",
      source: "",
      delivery: "",
    });
  }
  async function generate(
    fragment?: Fragment,
    round: 1 | 2 | 3 = 1,
    override?: Lang,
  ) {
    if (!sessionRef.current) begin(fragment ?? { modality: "text", raw: "" });
    speechEpoch.current++;
    audio.stop();
    abort.current?.abort();
    abort.current = new AbortController();
    const run = ++generation.current;
    const current = sessionRef.current!;
    const input = fragment ?? current.context.fragment;
    const context = buildContext(settingsRef.current, input, {
      round,
      exclude:
        round > 1
          ? current.attempt.rounds.flatMap((r) =>
              r.candidates.map((c) => c.text),
            )
          : [],
      question: question ?? undefined,
    });
    if (override) context.outputLang = override;
    setSession({
      ...current,
      context,
      loading: true,
      candidates: [],
      error: "",
      chosen: undefined,
      audioStatus: "",
      attempt: {
        ...current.attempt,
        fragmentRaw: input.raw,
        outputLang: context.outputLang,
        modality: input.modality,
        topicPath: input.topicPath,
        objectLabel: input.objectLabel,
        objectSource: input.objectSource,
      },
    });
    navigate("/confirm");
    try {
      const [memories, substitutions] = await Promise.all([
        db.memories.toArray(),
        db.substitutions.toArray(),
      ]);
      const ranked = memories
        .filter((m) => m.lang === context.outputLang)
        .map((m) => ({
          m,
          score: memoryScore(m, input.raw, context.now!.timeBucket),
        }))
        .sort((a, b) => b.score - a.score);
      context.ownExamples = ranked
        .slice(0, 5)
        .map(({ m }) => ({
          fragment: m.fragmentRaw.slice(0, 120),
          sentence: m.sentence,
          timeBucket: m.timeBucket,
        }));
      context.substitutions = substitutions
        .filter(
          (s) =>
            s.count >= 2 &&
            input.raw.toLowerCase().includes(s.heard.toLowerCase()),
        )
        .slice(0, 10);
      const path = input.topicPath ?? [];
      const pain =
        path[0] === "pain" && round === 1
          ? getPainCandidates(path[1], path[2], context.outputLang)
          : [];
      let candidates: Candidate[],
        model: string,
        latencyMs = 0,
        demoCached = false;
      if (pain.length) {
        candidates = pain;
        model = "Pain templates";
      } else if (!navigator.onLine) {
        const cached = settingsRef.current.demo
          ? await getRehearsal(context)
          : undefined;
        if (cached) {
          candidates = cached.candidates;
          model = `${cached.model} · CACHED`;
          demoCached = true;
        } else {
          const phrases = await db.phrases
            .where("lang")
            .equals(context.outputLang)
            .toArray();
          candidates = phrases
            .filter((p) =>
              normalize(`${p.candidate.reading} ${p.candidate.text}`).includes(
                normalize(input.raw),
              ),
            )
            .slice(0, 3)
            .map((p) => p.candidate);
          model = "Saved phrases";
        }
      } else {
        try {
          const result = await getIntent(context, abort.current.signal);
          candidates = result.candidates;
          model = result.model;
          latencyMs = result.latencyMs;
          if (settingsRef.current.demo) await saveRehearsal(context, result);
        } catch (error) {
          const cached =
            settingsRef.current.demo && !abort.current.signal.aborted
              ? await getRehearsal(context)
              : undefined;
          if (!cached) throw error;
          candidates = cached.candidates;
          model = `${cached.model} · CACHED`;
          demoCached = true;
        }
      }
      if (run !== generation.current) return;
      const usual = ranked.find(
        (r) =>
          r.score >= 5 &&
          r.m.count >= 2 &&
          r.m.timeBucket === context.now!.timeBucket &&
          !context.exclude.includes(r.m.sentence),
      );
      if (usual && round === 1) {
        const m = usual.m;
        const stored = await getKV<Candidate>(`memory-candidate:${m.id}`);
        if (stored)
          candidates = [
            { ...stored, sig: m.sig },
            ...candidates.filter(
              (c) => normalize(c.text) !== normalize(m.sentence),
            ),
          ].slice(0, 3);
      }
      if (run !== generation.current) return;
      changeSession((s) => ({
        ...s,
        context,
        candidates,
        model,
        usual: usual?.m.sentence,
        loading: false,
        error: candidates.length
          ? ""
          : "No saved match yet. Try Topics or My phrases.",
        attempt: {
          ...s.attempt,
          demoCached,
          rounds: [
            ...s.attempt.rounds,
            {
              round,
              source: pain.length
                ? "template"
                : model.toLowerCase().includes("mock")
                  ? "mock"
                  : "llm",
              model,
              latencyMs,
              candidates,
              noneOfThese: false,
              usualShown: Boolean(usual),
              usualChosen: false,
            },
          ],
        },
      }));
    } catch (error) {
      if (run !== generation.current || abort.current?.signal.aborted) return;
      changeSession((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : "Please try again.",
        candidates: [],
      }));
    }
  }
  function retry() {
    const s = sessionRef.current;
    if (!s) return;
    const rounds = s.attempt.rounds.map((r, i) =>
      i === s.attempt.rounds.length - 1 ? { ...r, noneOfThese: true } : r,
    );
    setSession({ ...s, attempt: { ...s.attempt, rounds } });
    if (s.context.round >= 3) {
      const attempt = {
        ...sessionRef.current!.attempt,
        endedAt: Date.now(),
        outcome: "topics_fallback" as const,
      };
      void db.attempts.put(attempt);
      setSession({ ...sessionRef.current!, attempt });
      navigate("/topics");
    } else void generate(undefined, (s.context.round + 1) as 2 | 3);
  }
  async function remember(c: Candidate, attempt: Attempt) {
    const id = `${attempt.outputLang}:${normalize(attempt.fragmentRaw)}:${normalize(c.text)}`;
    await setKV(`memory-candidate:${id}`, c);
    const existing = await db.memories.get(id);
    await db.memories.put({
      id,
      fragmentRaw: attempt.fragmentRaw || c.reading,
      fragmentKey: normalize(attempt.fragmentRaw),
      reading: c.reading,
      sentence: c.text,
      lang: attempt.outputLang,
      timeBucket: attempt.timeBucket,
      placeLabel: attempt.place,
      count: (existing?.count ?? 0) + 1,
      firstAt: existing?.firstAt ?? Date.now(),
      lastAt: Date.now(),
      sig: c.sig,
    });
    if (c.reading.includes("→")) {
      const [heard, means] = c.reading.split("→").map((s) => s.trim());
      const subid = `${normalize(heard)}:${normalize(means)}`;
      const old = await db.substitutions.get(subid);
      await db.substitutions.put({
        id: subid,
        heard,
        means,
        count: (old?.count ?? 0) + 1,
        lastAt: Date.now(),
      });
    }
  }
  function speak(
    c: Candidate,
    ticket: TapTicket | null,
    preview = false,
    langOverride?: Lang,
  ) {
    if (!ticket) return;
    const utteranceRun = ++speechEpoch.current;
    if (
      !sessionRef.current ||
      (sessionRef.current.attempt.endedAt && !preview)
    ) {
      begin({ modality: "topic", raw: c.reading }, true);
    }
    const s = sessionRef.current!;
    const lang = langOverride ?? s.context.outputLang;
    if (!preview) {
      setSession({
        ...s,
        context: { ...s.context, outputLang: lang },
        chosen: c,
        audioStatus: "Getting your voice ready…",
        source: "",
        delivery: "",
        attempt: {
          ...s.attempt,
          outputLang: lang,
          rounds: s.attempt.rounds.map((r, i) =>
            i === s.attempt.rounds.length - 1
              ? {
                  ...r,
                  chosenIndex: Math.max(
                    0,
                    r.candidates.findIndex((x) => x.text === c.text),
                  ),
                  usualChosen: s.usual === c.text,
                }
              : r,
          ),
        },
      });
      navigate(c.urgency === "emergency" ? "/help" : "/speaking");
    }
    void (async () => {
      const saved = preview
        ? undefined
        : await db.recordings.get(recordingId(c.text, lang));
      const consent = saved
        ? await db.consents.get(saved.consentId)
        : undefined;
      const recording =
        saved && consent && saved.text === c.text && saved.lang === lang
          ? saved
          : undefined;
      if (utteranceRun !== speechEpoch.current) return;
      const options = {
        text: c.text,
        lang,
        ticket,
        channel: preview ? ("preview" as const) : ("speak" as const),
        recording: recording?.blob,
        onStart: ({ source, atMs }: { source: string; atMs: number }) => {
          if (preview || utteranceRun !== speechEpoch.current) return;
          const live = sessionRef.current;
          if (!live) return;
          const attempt = {
            ...live.attempt,
            endedAt: Date.now(),
            outcome:
              source === "tone" ? ("alerted" as const) : ("spoken" as const),
            chosenText: c.text,
            chosenGloss: c.gloss_en,
            chosenIntent: c.intent,
            chosenReading: c.reading,
            timeToSpeechMs:
              source === "tone"
                ? undefined
                : Date.now() - live.attempt.startedAt,
            firstAudioMs: atMs - ticket.issuedAt,
          };
          setSession({
            ...live,
            attempt,
            source:
              source === "recording"
                ? consent?.givenBy === "voice_donor"
                  ? "Consented family recording"
                  : "Your recorded voice"
                : source === "tone"
                  ? "Help alert tone"
                  : "Device voice",
            audioStatus: "Speaking…",
          });
          void db.attempts.put(attempt);
          if (source !== "tone") void remember(c, attempt);
          if (c.urgency !== "emergency")
            void relay.current
              ?.send("spoken", {
                text: c.text,
                gloss_en: c.gloss_en,
                lang,
                urgency: c.urgency,
              })
              .then((id) => {
                pendingReceipt.current = id;
                changeSession((v) => ({
                  ...v,
                  delivery: id
                    ? "Waiting for delivery receipt…"
                    : "Not sent — caregiver phone disconnected",
                }));
              });
        },
        onEnd: () => {
          if (!preview && utteranceRun === speechEpoch.current)
            changeSession((v) => ({
              ...v,
              audioStatus:
                v.source === "Help alert tone"
                  ? "Help alert sounded."
                  : "Said, in your words.",
            }));
        },
      };
      const result = await (c.urgency === "emergency" && !preview
        ? audio.playHelp(options)
        : audio.speak(options));
      if (
        !preview &&
        utteranceRun === speechEpoch.current &&
        result.status !== "completed"
      )
        changeSession((v) => ({
          ...v,
          audioStatus:
            result.status === "expired"
              ? "Ready now. Tap the sentence again to speak."
              : result.status === "unavailable"
                ? "A voice for this language isn’t installed. Show this sentence to the person."
                : result.status === "cancelled"
                  ? "Stopped."
                  : "Couldn’t play audio. Show this sentence to the person.",
        }));
    })().catch(() => {
      if (utteranceRun === speechEpoch.current)
        changeSession((v) => ({
          ...v,
          audioStatus:
            "Could not load your voice. Show this sentence to the person.",
        }));
    });
    if (c.urgency === "emergency" && !preview) {
      setHelpAck("");
      void relay.current
        ?.send("help", {
          text: c.text,
          gloss_en: c.gloss_en,
          lang,
          urgency: c.urgency,
        })
        .then((id) => {
          pendingReceipt.current = id;
          changeSession((v) => ({
            ...v,
            delivery: id
              ? "Help sent — waiting for a reply"
              : "Not sent — no caregiver connection. You can send an SMS.",
          }));
        });
    }
  }
  function finishBaseline(text: string) {
    const current = sessionRef.current;
    if (!current) return;
    const attempt: Attempt = {
      ...current.attempt,
      outputLang: "en",
      chosenText: text,
      outcome: "spoken",
      endedAt: Date.now(),
      timeToSpeechMs: Date.now() - current.attempt.startedAt,
    };
    setSession({ ...current, attempt });
    void db.attempts.put(attempt);
    return attempt;
  }
  function stop() {
    speechEpoch.current++;
    audio.stop();
    abort.current?.abort();
    generation.current++;
    changeSession((s) => ({ ...s, loading: false, audioStatus: "Stopped." }));
  }
  function abandon() {
    stop();
    const s = sessionRef.current;
    if (s && !s.attempt.endedAt)
      void db.attempts.put({
        ...s.attempt,
        endedAt: Date.now(),
        outcome: "abandoned",
      });
    setSession(null);
  }
  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionState((q) => (q && Date.now() - q.at > 300000 ? null : q));
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        ready,
        session,
        begin,
        generate,
        speak,
        finishBaseline,
        stop,
        abandon,
        retry,
        question,
        setQuestion: (text) => setQuestionState({ text, at: Date.now() }),
        caregiverUnlocked,
        unlock: () => setUnlocked(true),
        lock: () => setUnlocked(false),
        connected,
        pairingVersion,
        refreshPairing: () => setPairingVersion((v) => v + 1),
        helpAck,
        cancelHelp: () => {
          stop();
          void relay.current?.send("help_cancel");
          setHelpAck("Help cancelled.");
        },
        online,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
