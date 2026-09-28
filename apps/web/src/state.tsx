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
import {
  applyCandidatePolicy,
  candidateMeaningKey,
  getPainCandidates,
  getControlledCandidates,
  requiresPredefinedCommunication,
} from "@sollu/shared";
import {
  db,
  defaultSettings,
  getKV,
  recordingId,
  setKV,
  type Pairing,
  type Settings,
} from "./db";
import {
  buildContext,
  memoryScore,
  normalize,
  recentConfirmedTurns,
  inferenceContext,
  clockNow,
  timeBucket,
} from "./lib/context";
import { getIntent } from "./lib/api";
import { RelayClient, type DeliveryStatus } from "./lib/relay";
import { copy } from "./lib/copy";
import { audio, type TapTicket } from "./features/audio";
import {
  clearRehearsal,
  getRehearsal,
  saveRehearsal,
} from "./features/demo/service";
import { parseStoredDraft } from "./lib/draft";
import { memoryIdentity } from "./lib/memory";
import {
  persistLocalProcessingPreference,
  localProcessingPreferenceVersion,
  readLocalProcessingPreference,
  setLocalProcessingOnly,
  subscribeLocalProcessingPolicy,
} from "./features/privacy/browserPolicy";
import { setRecognitionPreference } from "./features/privacy/recognitionPreference";
import {
  setCloudSentencePermission,
  subscribeCloudSentencePermission,
} from "./features/privacy/sentencePolicy";

export interface Session {
  attempt: Attempt;
  context: ContextPacket;
  candidates: Candidate[];
  moreCandidates?: Candidate[];
  loading: boolean;
  error: string;
  model: string;
  chosen?: Candidate;
  audioStatus: string;
  source: string;
  delivery: string;
  usual?: string;
  returnTo?: string;
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
  showMoreChoices: () => void;
  question: { text: string; at: number; lang?: Lang } | null;
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
  pause: () => void;
  resume: () => void;
  paused: boolean;
  updateDraft: (fragment: Fragment) => void;
  markCommunication: (
    outcome: "intended" | "understood" | "needs_repair" | "declined",
    partnerUnderstanding?: string,
  ) => void;
};
const AppContext = createContext<AppState | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("Missing app context");
  return ctx;
};
export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(defaultSettings),
    [ready, setReady] = useState(false),
    [session, setSessionState] = useState<Session | null>(null);
  const [question, setQuestionState] = useState<{
      text: string;
      at: number;
      lang?: Lang;
    } | null>(null),
    [caregiverUnlocked, setUnlocked] = useState(false);
  const [connected, setConnected] = useState(false),
    [pairingVersion, setPairingVersion] = useState(0),
    [helpAck, setHelpAck] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const settingsRef = useRef(settings);
  const questionRef = useRef(question);
  const speechEpoch = useRef(0);
  const draftWrites = useRef(Promise.resolve());
  const settingsWrites = useRef(Promise.resolve());
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
  function changeQuestion(next: typeof question) {
    questionRef.current = next;
    setQuestionState(next);
    const current = sessionRef.current;
    if (
      !current ||
      current.chosen ||
      (!current.loading && !current.candidates.length)
    )
      return;
    // A reply to an older question must not arrive after a partner changes the question.
    generation.current++;
    abort.current?.abort();
    changeSession((s) => ({
      ...s,
      loading: false,
      candidates: [],
      moreCandidates: [],
      model: "",
      error:
        settingsRef.current.lang === "ta"
          ? "வேறு வார்த்தை அல்லது தலைப்பைத் தேர்ந்தெடுக்கவும்."
          : "The conversation question changed. Add a word or choose a topic to find new choices.",
    }));
  }
  function deliveryText(
    status: DeliveryStatus | undefined,
    help: boolean,
    name = "your caregiver",
  ) {
    const l = settingsRef.current.lang;
    if (status === "queued")
      return copy(
        l,
        help
          ? "Help queued on this device for up to 60 seconds. No receipt yet."
          : "Message queued on this device for up to 5 minutes. No receipt yet.",
        help
          ? "உதவி செய்தி 60 வினாடிகள் வரை காத்திருக்கும். இன்னும் சேரவில்லை."
          : "செய்தி 5 நிமிடங்கள் வரை காத்திருக்கும். இன்னும் சேரவில்லை.",
      );
    if (status === "delivered")
      return copy(
        l,
        `Shown on ${name}’s phone ✓`,
        `${name} சாதனத்தில் காட்டப்பட்டது ✓`,
      );
    if (status === "expired")
      return copy(
        l,
        "Message expired without a receipt. Tap the sentence to send again if needed.",
        "செய்தியின் நேரம் முடிந்தது. தேவைப்பட்டால் வாக்கியத்தை மீண்டும் தொடுங்கள்.",
      );
    if (status === "cancelled")
      return copy(
        l,
        "Queued message cancelled.",
        "காத்திருந்த செய்தி ரத்து செய்யப்பட்டது.",
      );
    if (status === "sent")
      return copy(
        l,
        help
          ? "Help sent — waiting for a reply"
          : "Waiting for delivery receipt…",
        help
          ? "உதவி செய்தி அனுப்பப்பட்டது. பதிலுக்குக் காத்திருக்கிறது."
          : "செய்தி சேர்ந்ததா என்று காத்திருக்கிறது…",
      );
    return copy(
      l,
      "Not sent — no caregiver connection. You can send an SMS.",
      "செய்தி அனுப்பப்படவில்லை. குறுஞ்செய்தி அனுப்பலாம்.",
    );
  }
  useEffect(() => {
    let active = true;
    const initialGeneration = generation.current;
    void Promise.all([getKV<Settings>("settings"), getKV<unknown>("draft:v1")])
      .then(([s, storedDraft]) => {
        if (!active) return;
        if (s) {
          const next = { ...defaultSettings, ...s };
          next.localProcessingOnly =
            s.localProcessingOnly !== false || readLocalProcessingPreference();
          setLocalProcessingOnly(next.localProcessingOnly);
          settingsRef.current = next;
          setSettings(next);
        }
        const draft = parseStoredDraft(storedDraft);
        if (
          draft &&
          generation.current === initialGeneration &&
          !sessionRef.current
        ) {
          setSession(draft);
          setPaused(true);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      active = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      audio.stop();
    };
  }, []);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeLocalProcessingPolicy(
      (protectedMode, source) => {
        if (source !== "storage") return;
        if (protectedMode) {
          applyPrivacyMode(true);
        } else {
          // An intentional relaxation is accepted only after BOTH stores confirm it.
          void getKV<Settings>("settings")
            .then((stored) => {
              if (active)
                applyPrivacyMode(
                  stored?.localProcessingOnly !== false ||
                    readLocalProcessingPreference(),
                );
            })
            .catch(() => {
              if (active) applyPrivacyMode(true);
            });
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    audio.setRate(settings.speechRate);
  }, [settings.speechRate]);
  useEffect(() => {
    const changed = (event: Event) => {
      generation.current++;
      speechEpoch.current++;
      abort.current?.abort();
      audio.stop();
      changeSession((s) => ({
        ...s,
        candidates: [],
        moreCandidates: [],
        loading: false,
        chosen: undefined,
        model: "",
        error: "",
      }));
      if (event.type === "sollu:llm-settings-changed") void clearRehearsal();
    };
    window.addEventListener("sollu:llm-settings-changed", changed);
    window.addEventListener("sollu:communication-settings-changed", changed);
    const unsubscribeSentences = subscribeCloudSentencePermission(() =>
      changed(new Event("sollu:llm-settings-changed")),
    );
    return () => {
      unsubscribeSentences();
      window.removeEventListener("sollu:llm-settings-changed", changed);
      window.removeEventListener(
        "sollu:communication-settings-changed",
        changed,
      );
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const draft =
      session && !session.attempt.endedAt
        ? { ...session, loading: false, audioStatus: "", delivery: "" }
        : null;
    draftWrites.current = draftWrites.current
      .catch(() => {})
      .then(() => (draft ? setKV("draft:v1", draft) : db.kv.delete("draft:v1")))
      .catch(() => {});
  }, [session, ready]);
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
            changeQuestion({
              text: message.text,
              at: message.at,
              lang: message.lang,
            });
        },
        setConnected,
        (event) => {
          if (!active || event.id !== pendingReceipt.current) return;
          changeSession((s) => ({
            ...s,
            delivery: deliveryText(
              event.status,
              event.type === "help",
              pair.name,
            ),
          }));
        },
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
  function applyPrivacyMode(protectedMode: boolean) {
    const changed = settingsRef.current.localProcessingOnly !== protectedMode;
    setLocalProcessingOnly(protectedMode);
    settingsRef.current = {
      ...settingsRef.current,
      localProcessingOnly: protectedMode,
    };
    setSettings(settingsRef.current);
    if (changed || protectedMode) {
      generation.current++;
      speechEpoch.current++;
      abort.current?.abort();
      audio.stop();
      window.dispatchEvent(new Event("sollu:stop"));
      changeSession((s) => ({
        ...s,
        candidates: [],
        moreCandidates: [],
        loading: false,
        chosen: undefined,
        model: "",
        error: "",
      }));
    }
  }
  async function updateSettings(patch: Partial<Settings>) {
    const privacyVersion = localProcessingPreferenceVersion();
    if (patch.localProcessingOnly === true) {
      try {
        setCloudSentencePermission(false);
      } catch {
        /* Failed writes still revoke the current tab. */
      }
      // Forget an online input choice when protection is explicitly restored.
      try {
        setRecognitionPreference("local");
      } catch {
        // The preference module revokes locally even if browser storage fails.
      }
      // Revoke pending requests and speech immediately, even if persistence fails.
      applyPrivacyMode(true);
      persistLocalProcessingPreference(true);
    }
    const save = settingsWrites.current
      .catch(() => {})
      .then(async () => {
        const next = await db.transaction("rw", db.kv, async () => {
          const latest = await getKV<Settings>("settings");
          const merged = {
            ...defaultSettings,
            ...(latest ?? settingsRef.current),
            ...patch,
          };
          if (patch.localProcessingOnly === undefined)
            merged.localProcessingOnly =
              latest?.localProcessingOnly !== false ||
              readLocalProcessingPreference();
          await setKV("settings", merged);
          return merged;
        });
        if (
          patch.localProcessingOnly === false &&
          localProcessingPreferenceVersion() !== privacyVersion
        ) {
          applyPrivacyMode(true);
          throw new Error(
            "Privacy protection changed while saving. Review the setting and try again.",
          );
        }
        if (patch.localProcessingOnly !== undefined)
          persistLocalProcessingPreference(patch.localProcessingOnly);
        next.localProcessingOnly =
          next.localProcessingOnly !== false || readLocalProcessingPreference();
        applyPrivacyMode(next.localProcessingOnly);
        settingsRef.current = next;
        setSettings(next);
        window.dispatchEvent(new Event("sollu:communication-settings-changed"));
      });
    settingsWrites.current = save;
    await save;
  }
  function begin(fragment: Fragment, preserveAudio = false) {
    pendingReceipt.current = null;
    setPaused(false);
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
      question: questionRef.current ?? undefined,
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
      place: settingsRef.current.place,
      timeBucket: timeBucket(clockNow(settingsRef.current).getHours()),
      demoClock: settingsRef.current.demo,
      rounds: [],
      taps: 1,
      offline: !navigator.onLine,
      demoCached: false,
      addresseeRelation: context.addressee?.relation,
      addresseeId: context.addressee?.id,
    };
    setSession({
      attempt,
      context,
      candidates: [],
      moreCandidates: [],
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
    const requestController = new AbortController();
    abort.current = requestController;
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
      question: questionRef.current ?? undefined,
    });
    if (override) context.outputLang = override;
    context.rejectedMeaningKeys =
      round > 1
        ? [
            ...new Set(
              current.attempt.rounds.flatMap((r) =>
                r.candidates.map(candidateMeaningKey),
              ),
            ),
          ].slice(-30)
        : [];
    setSession({
      ...current,
      context,
      loading: true,
      candidates: [],
      moreCandidates: [],
      error: "",
      chosen: undefined,
      audioStatus: "",
      attempt: {
        ...current.attempt,
        fragmentRaw: input.raw,
        place: context.place ?? settingsRef.current.place,
        timeBucket: timeBucket(clockNow(settingsRef.current).getHours()),
        addresseeId: context.addressee?.id,
        addresseeRelation: context.addressee?.relation,
        outputLang: context.outputLang,
        modality: input.modality,
        topicPath: input.topicPath,
        objectLabel: input.objectLabel,
        objectSource: input.objectSource,
      },
    });
    navigate("/confirm");
    try {
      const [memories, substitutions, recentAttempts] = await Promise.all([
        db.memories.toArray(),
        db.substitutions.toArray(),
        settingsRef.current.shareRecentContext
          ? db.attempts
              .where("startedAt")
              .above(Date.now() - 10 * 60_000)
              .toArray()
          : Promise.resolve([]),
      ]);
      if (run !== generation.current || requestController.signal.aborted)
        return;
      const ranked = memories
        .filter(
          (m) =>
            m.confirmed === true &&
            m.lang === context.outputLang &&
            m.placeLabel === context.place &&
            m.addresseeId === settingsRef.current.addressee,
        )
        .map((m) => ({
          m,
          score: memoryScore(m, input.raw, context.now?.timeBucket),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);
      context.ownExamples = ranked.slice(0, 5).map(({ m }) => ({
        fragment: m.fragmentRaw.slice(0, 120),
        sentence: m.sentence,
        timeBucket: m.timeBucket,
      }));
      context.substitutions = substitutions
        .filter(
          (s) =>
            s.confirmed === true &&
            (!s.lang || s.lang === context.outputLang) &&
            (!s.place || s.place === context.place) &&
            (!s.addresseeId ||
              s.addresseeId === settingsRef.current.addressee) &&
            input.raw.toLowerCase().includes(s.heard.toLowerCase()),
        )
        .slice(0, 10);
      context.recentTurns = recentConfirmedTurns(recentAttempts, context);
      const path = input.topicPath ?? [];
      const predefined = requiresPredefinedCommunication(context);
      const pain =
        path[0] === "pain" && round === 1
          ? getPainCandidates(path[1], path[2], context.outputLang)
          : [];
      let candidates: Candidate[],
        model: string,
        latencyMs = 0,
        demoCached = false;
      let serverGeneratedCandidates: Candidate[] = [];
      const savedPhrases = await db.phrases
        .where("lang")
        .equals(context.outputLang)
        .toArray();
      if (run !== generation.current || requestController.signal.aborted)
        return;
      const trustedCandidates = savedPhrases.map((p) => p.candidate);
      if (pain.length) {
        candidates = pain;
        model = "Pain templates";
      } else if (predefined) {
        // Prepared health/help wording must also bypass network and rehearsal caches.
        candidates = getControlledCandidates(context);
        model = "Prepared health/help wording";
      } else if (!navigator.onLine) {
        const cached = settingsRef.current.demo
          ? await getRehearsal(context)
          : undefined;
        if (cached) {
          candidates = cached.candidates;
          model = `${cached.model} · CACHED`;
          demoCached = true;
        } else {
          candidates = [
            ...getControlledCandidates(context),
            ...savedPhrases
              .filter((p) =>
                normalize(
                  `${p.candidate.reading} ${p.candidate.text}`,
                ).includes(normalize(input.raw)),
              )
              .slice(0, 3)
              .map((p) => p.candidate),
          ];
          model = "Offline vocabulary";
        }
      } else {
        try {
          const result = await getIntent(
            context,
            settingsRef.current,
            requestController.signal,
          );
          if (run !== generation.current || requestController.signal.aborted)
            return;
          // Catalog interpretation can use private device context without sending it to a model.
          candidates =
            result.mock || result.fallback
              ? getControlledCandidates(context)
              : result.candidates;
          serverGeneratedCandidates = result.candidates.filter(
            (c) => c.source === "model" && Boolean(c.sig),
          );
          model = result.model;
          latencyMs = result.latencyMs;
          // Generated suggestions must come from this request, never a stale rehearsal.
          if (settingsRef.current.demo && !serverGeneratedCandidates.length)
            await saveRehearsal(context, { ...result, candidates });
        } catch (error) {
          const cached =
            settingsRef.current.demo && !requestController.signal.aborted
              ? await getRehearsal(context)
              : undefined;
          if (requestController.signal.aborted) throw error;
          candidates = cached?.candidates ?? getControlledCandidates(context);
          model = cached ? `${cached.model} · CACHED` : "Offline vocabulary";
          demoCached = Boolean(cached);
        }
      }
      if (run !== generation.current) return;
      const usual = ranked.find(
        (r) =>
          r.score >= 5 &&
          r.m.count >= 2 &&
          r.m.timeBucket === context.now?.timeBucket &&
          !context.exclude.includes(r.m.sentence),
      );
      if (usual && round === 1 && !predefined) {
        const m = usual.m;
        const stored =
          m.candidate ?? (await getKV<Candidate>(`memory-candidate:${m.id}`));
        if (stored) {
          trustedCandidates.push(stored);
          candidates = [
            { ...stored, sig: m.sig },
            ...candidates.filter(
              (c) => normalize(c.text) !== normalize(m.sentence),
            ),
          ];
        }
      }
      if (run !== generation.current) return;
      const checked = applyCandidatePolicy(candidates, context, {
        trustedCandidates,
        serverGeneratedCandidates,
        modelContext: serverGeneratedCandidates.length
          ? inferenceContext(context, settingsRef.current)
          : undefined,
      });
      const moreCandidates = checked.candidates.slice(
        settingsRef.current.choiceCount,
      );
      candidates = checked.candidates.slice(0, settingsRef.current.choiceCount);
      const usualShown = Boolean(
        !predefined &&
        usual &&
        candidates.some(
          (c) => normalize(c.text) === normalize(usual.m.sentence),
        ),
      );
      changeSession((s) => ({
        ...s,
        context,
        candidates,
        moreCandidates,
        model,
        usual: usualShown ? usual?.m.sentence : undefined,
        loading: false,
        error: candidates.length
          ? ""
          : settingsRef.current.lang === "ta"
            ? "வேறு வார்த்தை அல்லது தலைப்பைத் தேர்ந்தெடுக்கவும்."
            : "Please add a word, choose a topic, or use My words.",
        attempt: {
          ...s.attempt,
          demoCached,
          rounds: [
            ...s.attempt.rounds,
            {
              round,
              source: pain.length
                ? "template"
                : serverGeneratedCandidates.length
                  ? model.startsWith("ollama:")
                    ? "local"
                    : "llm"
                  : model.toLowerCase().includes("mock")
                    ? "mock"
                    : model.startsWith("ollama:")
                      ? "local"
                      : "template",
              model,
              latencyMs,
              candidates,
              noneOfThese: false,
              usualShown,
              usualChosen: false,
            },
          ],
        },
      }));
    } catch (error) {
      if (run !== generation.current || requestController.signal.aborted)
        return;
      changeSession((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : "Please try again.",
        candidates: [],
        moreCandidates: [],
      }));
    }
  }
  function showMoreChoices() {
    changeSession((s) => {
      if (s.loading || s.chosen || !s.moreCandidates?.length) return s;
      const candidates = [...s.candidates, ...s.moreCandidates].slice(0, 3);
      return {
        ...s,
        candidates,
        moreCandidates: [],
        attempt: {
          ...s.attempt,
          // A choice is logged as shown (and eligible for rejection) only after it is revealed.
          rounds: s.attempt.rounds.map((round, index) =>
            index === s.attempt.rounds.length - 1
              ? { ...round, candidates }
              : round,
          ),
        },
      };
    });
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
    const id = await memoryIdentity(attempt, c);
    await setKV(`memory-candidate:${id}`, c);
    const existing = await db.memories.get(id);
    await db.memories.put({
      id,
      fragmentRaw: attempt.fragmentRaw || c.reading,
      fragmentKey: normalize(attempt.fragmentRaw).slice(0, 120),
      reading: c.reading,
      sentence: c.text,
      lang: attempt.outputLang,
      timeBucket: attempt.timeBucket,
      placeLabel: attempt.place,
      count: (existing?.count ?? 0) + 1,
      firstAt: existing?.firstAt ?? Date.now(),
      lastAt: Date.now(),
      sig: c.sig,
      candidate: c,
      confirmed:
        existing?.confirmed === true &&
        existing.lang === attempt.outputLang &&
        existing.placeLabel === attempt.place &&
        existing.addresseeId === attempt.addresseeId &&
        existing.timeBucket === attempt.timeBucket,
      addresseeId: attempt.addresseeId,
    });
  }
  function speak(
    c: Candidate,
    ticket: TapTicket | null,
    preview = false,
    langOverride?: Lang,
  ) {
    if (!ticket) return;
    if (!preview) setPaused(false);
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
        returnTo:
          /^\/(words|scenes|stories|passport|draw|sentence|comfort)(\/|$)/.test(
            location.pathname,
          )
            ? `${location.pathname}${location.search}`
            : s.returnTo,
        audioStatus: "Getting your voice ready…",
        source: "",
        delivery: "",
        attempt: {
          ...s.attempt,
          outputLang: lang,
          addresseeId: s.context.addressee?.id,
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
          if (c.urgency !== "emergency") void sendChosen("spoken");
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
      void sendChosen("help");
    }
    async function sendChosen(type: "spoken" | "help") {
      const client = relay.current;
      let id: string | null = null;
      try {
        id =
          (await client?.send(type, {
            text: c.text,
            gloss_en: c.gloss_en,
            lang,
            urgency: c.urgency,
          })) ?? null;
      } catch {
        /* Show an honest local send failure. */
      }
      if (utteranceRun !== speechEpoch.current) return;
      pendingReceipt.current = id;
      changeSession((v) => ({
        ...v,
        delivery: deliveryText(
          id ? client?.getDeliveryStatus(id) : undefined,
          type === "help",
        ),
      }));
    }
  }
  function finishBaseline(text: string) {
    const current = sessionRef.current;
    if (!current) return;
    const attempt: Attempt = {
      ...current.attempt,
      outputLang: settingsRef.current.lang,
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
    window.dispatchEvent(new Event("sollu:stop"));
    speechEpoch.current++;
    audio.stop();
    abort.current?.abort();
    generation.current++;
    changeSession((s) => ({ ...s, loading: false, audioStatus: "Stopped." }));
  }
  function abandon() {
    pendingReceipt.current = null;
    setPaused(false);
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
      if (questionRef.current && Date.now() - questionRef.current.at > 300000)
        changeQuestion(null);
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
        paused,
        pause: () => {
          stop();
          setPaused(true);
        },
        resume: () => {
          setPaused(false);
          if (sessionRef.current)
            navigate(
              sessionRef.current.candidates.length ? "/confirm" : "/type",
            );
        },
        updateDraft: (fragment) => {
          const current = sessionRef.current;
          if (
            !current ||
            JSON.stringify(current.context.fragment) ===
              JSON.stringify(fragment)
          )
            return;
          generation.current++;
          speechEpoch.current++;
          abort.current?.abort();
          audio.stop();
          changeSession((s) => ({
            ...s,
            context: { ...s.context, fragment },
            candidates: [],
            moreCandidates: [],
            loading: false,
            chosen: undefined,
            usual: undefined,
            model: "",
            error: "",
            attempt: { ...s.attempt, fragmentRaw: fragment.raw },
          }));
        },
        markCommunication: (communicationOutcome, partnerUnderstanding) => {
          const current = sessionRef.current;
          if (!current) return;
          const attempt = {
            ...current.attempt,
            communicationOutcome,
            ...(partnerUnderstanding?.trim()
              ? {
                  partnerUnderstanding: partnerUnderstanding
                    .trim()
                    .slice(0, 500),
                }
              : {}),
          };
          setSession({ ...current, attempt });
          void db.attempts.put(attempt);
        },
        stop,
        abandon,
        retry,
        showMoreChoices,
        question,
        setQuestion: (text) =>
          changeQuestion({
            text,
            at: Date.now(),
            lang: settingsRef.current.lang,
          }),
        caregiverUnlocked,
        unlock: () => setUnlocked(true),
        lock: () => setUnlocked(false),
        connected,
        pairingVersion,
        refreshPairing: () => setPairingVersion((v) => v + 1),
        helpAck,
        cancelHelp: () => {
          stop();
          // The relay serializes this after Help and resolves its own last Help ID, even if encryption is still pending.
          void relay.current?.send("help_cancel").catch(() => {});
          setHelpAck("Help cancelled.");
        },
        online,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
