import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  HeartHandshake,
  Link2,
  MessageCircle,
  Send,
  ShieldCheck,
  VolumeX,
} from "lucide-react";
import { audio } from "../features/audio";
import { setKV, type Pairing } from "../db";
import { receivePairing, RelayClient, type RelayMessage } from "../lib/relay";
import { Empty, PageTitle, TapButton } from "../ui";

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Care() {
  const navigate = useNavigate();
  const pairingRequest = useRef<Promise<Pairing | undefined> | null>(null);
  const relay = useRef<RelayClient | null>(null);
  const alertsReady = useRef(false);
  const mounted = useRef(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [feed, setFeed] = useState<RelayMessage[]>([]);
  const [help, setHelp] = useState<RelayMessage | null>(null);
  const [alerts, setAlerts] = useState(false);
  const [alertStatus, setAlertStatus] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [questionLang, setQuestionLang] = useState<"ta" | "en">("ta");
  const [questionStatus, setQuestionStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let client: RelayClient | undefined;
    // Reuse the import promise when StrictMode reruns effects: the first import clears the URL hash.
    pairingRequest.current ??= receivePairing();
    void pairingRequest.current
      .then((pair) => {
        if (!active) return;
        if (!pair) {
          setLoading(false);
          return;
        }
        if (pair.role !== "care" || !pair.roomId || !pair.grant || !pair.key)
          throw new Error("Invalid pairing");
        setPairing(pair);
        client = new RelayClient(
          pair,
          (message) => {
            if (!active || message.from.role !== "patient") return;
            if (message.type === "spoken" || message.type === "help") {
              setFeed((items) => [message, ...items].slice(0, 100));
              // A delivered receipt confirms this page received and accepted the message, not an acknowledgement.
              void client?.send("delivered", { refId: message.id });
            }
            if (message.type === "help") {
              setHelp(message);
              setReplyStatus("");
              if (alertsReady.current) {
                navigator.vibrate?.([200, 100, 200]);
                void audio.alarm().then((result) => {
                  if (
                    active &&
                    result.status !== "completed" &&
                    result.status !== "cancelled"
                  ) {
                    setAlertStatus(
                      "The sound could not play. Keep this page visible for Help alerts.",
                    );
                  }
                });
              }
            }
            if (message.type === "help_cancel") {
              audio.stop();
              navigator.vibrate?.(0);
              setHelp(null);
              setReplyStatus("The person cancelled their Help request.");
            }
          },
          (value) => {
            if (active) setConnected(value);
          },
        );
        relay.current = client;
        client.connect();
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError(
          "This pairing link could not be opened. Ask for a new link from the patient’s caregiver settings.",
        );
      });
    return () => {
      active = false;
      mounted.current = false;
      client?.disconnect();
      if (relay.current === client) relay.current = null;
      audio.stop();
      navigator.vibrate?.(0);
    };
  }, []);

  async function enableAlerts(event: Event) {
    const ticket = audio.createTap(event, "Enable alerts", {
      role: "caregiver",
      surface: "care",
    });
    const enabled = await audio.enableAlerts(ticket);
    if (!mounted.current) return;
    alertsReady.current = enabled;
    setAlerts(enabled);
    setAlertStatus(
      enabled
        ? "Alert sound is enabled while this page is open."
        : "Your browser could not enable sound. Visual Help alerts still work while this page is open.",
    );
  }

  async function acknowledge() {
    if (!help) return;
    audio.stop();
    navigator.vibrate?.(0);
    setReplyStatus("Sending your reply…");
    try {
      const id = await relay.current?.send("ack", {
        refId: help.id,
        name: pairing?.name,
      });
      if (mounted.current)
        setReplyStatus(
          id
            ? "Your “I’m coming” reply was sent."
            : "Reply not sent — reconnect and try again.",
        );
    } catch {
      if (mounted.current)
        setReplyStatus("Reply not sent — reconnect and try again.");
    }
  }

  async function sendQuestion() {
    const text = question.trim();
    if (!text || sending) return;
    setSending(true);
    setQuestionStatus("Sending…");
    try {
      const id = await relay.current?.send("ask", { text, lang: questionLang });
      if (!mounted.current) return;
      setQuestionStatus(
        id
          ? "Question sent. It can guide the next answer for five minutes."
          : "Question not sent — the connection is unavailable.",
      );
      if (id) setQuestion("");
    } catch {
      if (mounted.current)
        setQuestionStatus("Question not sent. Please try again.");
    } finally {
      if (mounted.current) setSending(false);
    }
  }

  const latest = feed.find((message) => message.type === "spoken");

  return (
    <section className="care-page">
      <PageTitle
        eyebrow="A little closer, even from another room"
        title="Here for them."
        subtitle="A quiet place to see their words and respond when they need you."
        action={
          <span
            className={`connection-badge ${connected ? "connected" : ""}`}
            role="status"
          >
            <span aria-hidden="true">●</span>{" "}
            {connected ? "Connected" : "Not connected"}
          </span>
        }
      />
      <div className="notice care-notice">
        <Bell size={22} aria-hidden="true" />
        <p>
          <strong>Keep this page open to receive alerts.</strong> Background
          notifications are not available in this version. This is not an
          emergency service.
        </p>
      </div>
      {loading ? (
        <p role="status">Opening your secure connection…</p>
      ) : error ? (
        <div role="alert" className="notice error-notice">
          {error}
        </div>
      ) : !pairing ? (
        <Empty icon="🔗" title="Link this device first">
          On the patient’s device, open caregiver settings and choose Link a
          phone. Open the generated pairing link here. The key stays on the
          paired devices.
        </Empty>
      ) : (
        <>
          <div className="care-toolbar">
            <span>
              <Link2 size={18} aria-hidden="true" /> Linked as{" "}
              <strong>{pairing.name}</strong>
            </span>
            <TapButton
              className={alerts ? "secondary-button" : "primary-button"}
              onActivate={(event) => {
                void enableAlerts(event);
              }}
            >
              <Bell size={20} aria-hidden="true" />
              {alerts ? "Alerts enabled" : "Enable alerts"}
            </TapButton>
          </div>
          <p className="muted" role="status">
            {alertStatus ||
              "Enable sound here once. Until then, Help appears on this page without an alarm."}
          </p>
          {!connected && (
            <p role="status" className="notice">
              Reconnecting… Messages cannot arrive until the connection returns.
              Ask the person directly if they need help.
            </p>
          )}
          {help && (
            <section
              className="care-help help-panel"
              aria-labelledby="care-help-title"
              role="alert"
            >
              <span className="eyebrow">
                Help requested · {formatTime(help.at)}
              </span>
              <h2 id="care-help-title">
                <HeartHandshake size={30} aria-hidden="true" /> They need your
                help.
              </h2>
              {help.text && (
                <p className="care-sentence" lang={help.lang}>
                  {help.text}
                </p>
              )}
              {help.gloss_en && help.gloss_en !== help.text && (
                <p>{help.gloss_en}</p>
              )}
              <div className="button-row">
                <TapButton
                  className="primary-button"
                  disabled={!connected}
                  onActivate={() => {
                    void acknowledge();
                  }}
                >
                  <Check size={22} aria-hidden="true" />
                  I’m coming
                </TapButton>
                <TapButton
                  className="secondary-button"
                  onActivate={() => {
                    audio.stop();
                    navigator.vibrate?.(0);
                  }}
                >
                  <VolumeX size={22} aria-hidden="true" />
                  Silence alert
                </TapButton>
              </div>
            </section>
          )}
          {replyStatus && (
            <p role="status" className="notice">
              {replyStatus}
            </p>
          )}
          <section className="care-latest panel" aria-labelledby="latest-title">
            <div className="section-heading">
              <h2 id="latest-title">Their latest words</h2>
              {latest && (
                <time dateTime={new Date(latest.at).toISOString()}>
                  {formatTime(latest.at)}
                </time>
              )}
            </div>
            {latest ? (
              <>
                <p className="care-sentence" lang={latest.lang}>
                  {latest.text}
                </p>
                {latest.gloss_en && latest.gloss_en !== latest.text && (
                  <p className="care-gloss">{latest.gloss_en}</p>
                )}
                <span className="privacy-caption">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Received on this device
                </span>
              </>
            ) : (
              <Empty icon="💬" title="Their words will appear here">
                When the person chooses a sentence, you’ll see it here. This
                page never speaks in their voice or starts speech on their
                device.
              </Empty>
            )}
          </section>
          <section
            className="panel care-question"
            aria-labelledby="question-title"
          >
            <h2 id="question-title">
              <MessageCircle size={22} aria-hidden="true" /> Ask a simple
              question
            </h2>
            <p>
              The question appears as context on their device. It cannot choose
              or speak an answer for them.
            </p>
            <label htmlFor="care-question">Your question</label>
            <textarea
              id="care-question"
              value={question}
              maxLength={240}
              rows={3}
              placeholder="What would you like for lunch?"
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="button-row">
              <label htmlFor="care-question-language">
                Language{" "}
                <select
                  id="care-question-language"
                  value={questionLang}
                  onChange={(event) =>
                    setQuestionLang(event.target.value as "ta" | "en")
                  }
                >
                  <option value="ta">Tamil</option>
                  <option value="en">English</option>
                </select>
              </label>
              <TapButton
                className="primary-button"
                disabled={!connected || !question.trim() || sending}
                onActivate={() => {
                  void sendQuestion();
                }}
              >
                <Send size={19} aria-hidden="true" />
                Send question
              </TapButton>
            </div>
            <p role="status">{questionStatus}</p>
          </section>
          <section className="panel" aria-labelledby="feed-title">
            <h2 id="feed-title">This session</h2>
            <p className="muted">
              The latest 100 received messages. This feed clears when the page
              is closed.
            </p>
            {feed.length ? (
              <ol className="care-feed">
                {feed.map((message) => (
                  <li key={message.id}>
                    <div className="section-heading">
                      <span className="eyebrow">
                        {message.type === "help"
                          ? "Help request"
                          : "Chosen sentence"}
                      </span>
                      <time dateTime={new Date(message.at).toISOString()}>
                        {formatTime(message.at)}
                      </time>
                    </div>
                    <p lang={message.lang}>
                      {message.text || "Help requested"}
                    </p>
                    {message.gloss_en && message.gloss_en !== message.text && (
                      <p className="muted">{message.gloss_en}</p>
                    )}
                    {Date.now() - message.at > 60_000 && (
                      <small>Sent at {formatTime(message.at)}</small>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No messages yet.</p>
            )}
          </section>
        </>
      )}
      <TapButton
        className="back-button"
        onActivate={() => {
          void setKV("role", "patient").then(() => navigate("/"));
        }}
      >
        <HeartHandshake size={20} aria-hidden="true" />
        Use this device for the patient
      </TapButton>
    </section>
  );
}
