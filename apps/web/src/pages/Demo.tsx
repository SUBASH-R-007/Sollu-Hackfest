import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  Play,
  RefreshCw,
  Trash2,
  WifiOff,
} from "lucide-react";
import { getMockCandidates, type Fragment, type Lang } from "@sollu/shared";
import { useApp } from "../state";
import type { Settings } from "../db";
import { buildContext } from "../lib/context";
import { getIntent } from "../lib/api";
import {
  clearRehearsal,
  getRehearsalCount,
  saveRehearsal,
} from "../features/demo/service";
import { Back, Hint, PageTitle, TapButton } from "../ui";

const scenarios = [
  {
    title: "Night tablets",
    time: "20:58",
    detail:
      "Say “tablet… raathiri”, choose the exact sentence, then look for a delivery receipt on the caregiver phone.",
    action: "Open sample fragment",
  },
  {
    title: "The same task on a picture board",
    time: "20:58",
    detail:
      "Build the same request on the English board. Compare the measured taps and time, including its final speech tap.",
    action: "Open picture board",
  },
  {
    title: "A water bottle",
    time: "14:10",
    detail:
      "Use Camera for the real demonstration. This sample supplies only the word “bottle”; it is not an object-detection result.",
    action: "Open bottle sample",
  },
  {
    title: "Language follows the listener",
    time: "07:30",
    detail:
      "Talk to Dr. Rao. Pain → shoulder → left produces English intensity choices. Pick the sentence you mean.",
    action: "Open left-shoulder choices",
  },
  {
    title: "A partner’s question",
    time: "12:40",
    detail:
      "Priya asks what you want for lunch. “ரசம்” is ready in Type; tap Find my words and choose your answer.",
    action: "Prepare the question",
  },
  {
    title: "Find a different meaning",
    time: "16:30",
    detail:
      "Start with “table”. Choose None of these to reinterpret the fragment, then inspect the communication log.",
    action: "Start recovery example",
  },
  {
    title: "Help and acknowledgment",
    time: "14:10",
    detail:
      "Open Home and tap the exact Help phrase. A connected caregiver can reply “I’m coming”. Offline, use the visible SMS option.",
    action: "Open Home for Help",
  },
];
const sampleBottle: Fragment = {
  modality: "camera",
  raw: "bottle",
  objectLabel: "bottle",
};
const rowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
} as const;

export default function Demo() {
  const {
    settings,
    updateSettings,
    begin,
    generate,
    setQuestion,
    online,
    abandon,
  } = useApp();
  const navigate = useNavigate();
  const [count, setCount] = useState(0),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [provider, setProvider] = useState("Not checked");
  const request = useRef<AbortController | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void getRehearsalCount().then((n) => {
      if (mounted.current) setCount(n);
    });
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const configured = (
    time: string,
    addressee = "priya",
    lang: Lang = "ta",
  ): Settings => ({
    ...settings,
    demo: true,
    stage: true,
    demoTime: time,
    demoSetAt: Date.now(),
    addressee,
    lang,
  });
  async function warm() {
    setBusy(true);
    setStatus("Checking the local server…");
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/health", {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("The local server is unavailable.");
      const health = (await response.json()) as {
        providers?: { intent?: string };
      };
      const mock = health.providers?.intent !== "ollama";
      if (mounted.current)
        setProvider(mock ? "Mock fixtures — not live AI" : "Local Ollama");
      const nightSettings = configured("20:58");
      const waterSettings = configured("14:10", "karthik");
      const recoverySettings = configured("16:30");
      const night = buildContext(nightSettings, {
        modality: "speech",
        raw: "tablet… raathiri",
      });
      const water = buildContext(waterSettings, sampleBottle);
      const first = buildContext(recoverySettings, {
        modality: "speech",
        raw: "table",
      });
      const recovery = buildContext(recoverySettings, first.fragment, {
        round: 2,
        exclude: getMockCandidates(first).map((c) => c.text),
      });
      for (const [index, context] of [night, water, recovery].entries()) {
        if (mounted.current)
          setStatus(`Preparing ${index + 1} of 3 sentence sets…`);
        const result = await getIntent(context, controller.signal);
        if (controller.signal.aborted) return;
        await saveRehearsal(context, result);
      }
      if (mounted.current) {
        setCount(await getRehearsalCount());
        setStatus(
          mock
            ? "Three mock sentence sets are stored. They will be labelled CACHED when reused. No real AI quality or speech latency was measured."
            : "Three local-model sentence sets are stored. Reused results are labelled CACHED; their old generation time is not a live measurement.",
        );
      }
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setStatus(
          error instanceof Error
            ? error.message
            : "Warm-up could not finish. Previously saved results remain available.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function launch(index: number) {
    try {
      abandon();
      await updateSettings(
        configured(
          scenarios[index].time,
          index === 3
            ? "rao"
            : index === 2 || index === 6
              ? "karthik"
              : "priya",
          index === 3 ? "en" : "ta",
        ),
      );
      if (index === 1) {
        navigate("/baseline");
        return;
      }
      if (index === 6) {
        navigate("/");
        return;
      }
      if (index === 4) {
        setQuestion("மதியம் என்ன சாப்பிடணும்?");
        begin({ modality: "text", raw: "ரசம்" });
        navigate("/type");
        return;
      }
      const fragment: Fragment =
        index === 0
          ? { modality: "speech", raw: "tablet… raathiri" }
          : index === 2
            ? sampleBottle
            : index === 3
              ? {
                  modality: "topic",
                  raw: "pain shoulder left",
                  topicPath: ["pain", "shoulder", "left"],
                }
              : { modality: "speech", raw: "table" };
      begin(fragment);
      await generate(fragment);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "The scenario could not open.",
      );
    }
  }
  async function clear() {
    try {
      await clearRehearsal();
      setCount(0);
      setStatus(
        "Rehearsal results cleared. Your recordings, phrases and communication log were kept.",
      );
    } catch {
      setStatus("The rehearsal results could not be cleared.");
    }
  }
  return (
    <>
      <Back to="/settings" label="Back to family settings" />
      <PageTitle
        eyebrow="REHEARSE WITH HONEST MEASUREMENTS"
        title="Ready for the demo."
        subtitle="Prepare the sentence sets, then let the person choose every word that is spoken."
      />
      <section className="panel">
        <h2>Warm up and save a rehearsal</h2>
        <p>
          Checks the server and prepares night tablets, water, and the second
          “table” round. This button never plays audio. Own-voice recordings and
          device voices are prepared separately in Voice Studio.
        </p>
        <div style={rowStyle}>
          <span className="mode-badge">{provider}</span>
          <span>{count} / 100 cached sentence sets</span>
        </div>
        <div style={rowStyle}>
          <TapButton
            className="primary"
            disabled={busy || !online}
            onActivate={() => {
              void warm();
            }}
          >
            <RefreshCw size={21} />
            {busy ? "Preparing…" : "Warm up three scenarios"}
          </TapButton>
          <TapButton
            className="secondary"
            disabled={busy || count === 0}
            onActivate={() => {
              void clear();
            }}
          >
            <Trash2 size={20} />
            Clear rehearsal results
          </TapButton>
        </div>
        {status && (
          <p className="notice" role="status">
            {status}
          </p>
        )}
        <Hint>
          Warm-up stores sentence suggestions. It does not record a voice, run
          speech recognition, or test your camera.
        </Hint>
      </section>
      {!online && (
        <div className="notice amber">
          <WifiOff size={20} /> You are offline. Cached suggestions and saved
          exact-phrase recordings remain local. Caregiver messages are not sent;
          use SMS or speak to someone nearby.
        </div>
      )}
      <section className="panel">
        <h2>Seven scenes, at your pace</h2>
        <p>
          These sample-input buttons prepare a scene without requiring the
          microphone or camera. The normal Speak and Camera screens are where
          you test those inputs. Every prepared scene has a visible demo clock.
        </p>
        <div style={{ display: "grid", gap: 20 }}>
          {scenarios.map((scenario, index) => (
            <article
              key={scenario.title}
              style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}
            >
              <div style={rowStyle}>
                <span className="eyebrow">SCENE {index + 1}</span>
                <span className="mode-badge">
                  <Clock3 size={15} />
                  {scenario.time}
                </span>
              </div>
              <h3>{scenario.title}</h3>
              <p>{scenario.detail}</p>
              <TapButton
                className="secondary"
                disabled={busy}
                onActivate={() => {
                  void launch(index);
                }}
              >
                <Play size={19} />
                {scenario.action}
                <ArrowRight size={18} />
              </TapButton>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Before you begin</h2>
        <p>
          <Check size={18} /> Record or select the exact phrases you want to
          demonstrate. Say clearly whose voice the audience is hearing: a
          consented phrase recording or a device voice.
        </p>
        <p>
          <Check size={18} /> Pair the caregiver phone, open its page, and tap
          Enable alerts. A delivery receipt means the sentence arrived; “I’m
          coming” is a separate reply.
        </p>
        <p>
          <Check size={18} /> Run the seven scenes twice. Then rehearse offline
          with CACHED badges visible and skip caregiver-phone steps. Never
          present a cached generation as live AI speed.
        </p>
        <p>
          Cached suggestions contain previous guesses. The person still taps an
          exact sentence before any playback. If a match is unavailable, use
          Pain, My phrases, Type, or the large text on screen.
        </p>
      </section>
    </>
  );
}
