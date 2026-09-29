import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera as CameraIcon,
  ImagePlus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ObjectDetection } from "@tensorflow-models/coco-ssd";
import type { Fragment } from "@sollu/shared";
import { useApp } from "../state";
import { Back, Hint, PageTitle, TapButton } from "../ui";
import { copy } from "../lib/copy";
import {
  isLocalProcessingOnly,
  requireModelDownloadPermission,
  subscribeLocalProcessingPolicy,
} from "../features/privacy/browserPolicy";

const concepts: Record<string, string> = {
  bottle: "Drink",
  cup: "Drink",
  bowl: "Food",
  banana: "Food",
  apple: "Food",
  orange: "Food",
  sandwich: "Food",
  bed: "Rest",
  couch: "Rest",
  chair: "Rest",
  toilet: "Toilet & bath",
  sink: "Toilet & bath",
  toothbrush: "Toilet & bath",
  tv: "TV",
  remote: "TV",
  "cell phone": "Phone",
  book: "Reading",
  clock: "Time",
};
// Display names only; the English label is still what is sent for sentences.
const tamilObjects: Record<string, string> = {
  bottle: "பாட்டில்",
  cup: "கப்",
  bowl: "கிண்ணம்",
  banana: "வாழைப்பழம்",
  apple: "ஆப்பிள்",
  orange: "ஆரஞ்சு",
  sandwich: "சாண்ட்விச்",
  bed: "படுக்கை",
  couch: "சோபா",
  chair: "நாற்காலி",
  toilet: "கழிவறை",
  sink: "சிங்க்",
  toothbrush: "பல் பிரஷ்",
  tv: "டிவி",
  remote: "ரிமோட்",
  "cell phone": "ஃபோன்",
  book: "புத்தகம்",
  clock: "கடிகாரம்",
};
const tamilConcepts: Record<string, string> = {
  Drink: "குடிக்க",
  Food: "சாப்பாடு",
  Rest: "ஓய்வு",
  "Toilet & bath": "கழிவறை, குளியல்",
  TV: "டிவி",
  Phone: "ஃபோன்",
  Reading: "படிக்க",
  Time: "நேரம்",
};

// Model weights are reused in memory. Photos are never stored in this cache.
let cachedModel: ObjectDetection | undefined;
let pendingModel:
  { promise: Promise<ObjectDetection>; revoked: boolean } | undefined;
async function getModel(): Promise<ObjectDetection> {
  if (cachedModel) return cachedModel;
  requireModelDownloadPermission();
  if (!pendingModel) {
    const pending = {
      promise: undefined as unknown as Promise<ObjectDetection>,
      revoked: false,
    };
    const stopWatching = subscribeLocalProcessingPolicy((protectedMode) => {
      if (protectedMode) {
        pending.revoked = true;
        if (pendingModel === pending) pendingModel = undefined;
      }
    });
    const assertAllowed = () => {
      requireModelDownloadPermission();
      if (pending.revoked)
        throw new Error(
          "The model download was cancelled after privacy protection changed. Use Topics.",
        );
    };
    pending.promise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      assertAllowed();
      await tf.ready();
      assertAllowed();
      const coco = await import("@tensorflow-models/coco-ssd");
      // This wrapper has no AbortSignal option. Recheck immediately before the
      // actual transfer; an already-started weight download may finish, but no
      // photo is uploaded and a revoked result is discarded, never cached.
      assertAllowed();
      const model = await coco.load({ base: "lite_mobilenet_v2" });
      if (pending.revoked || isLocalProcessingOnly()) {
        model.dispose();
        throw new Error(
          "Privacy protection changed. The downloaded model was discarded. Use Topics.",
        );
      }
      cachedModel = model;
      return model;
    })().finally(() => {
      stopWatching();
      if (pendingModel === pending) pendingModel = undefined;
    });
    pendingModel = pending;
  }
  return pendingModel.promise;
}

function resizePhoto(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const scale = Math.min(1, 512 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error(
      "This browser could not open the photo. Please try Topics.",
    );
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export default function Camera() {
  const { settings, begin, generate, session } = useApp();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const cameraRequest = useRef(0);
  const detectionRequest = useRef(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [working, setWorking] = useState(false);
  const [photo, setPhoto] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const say = (en: string, ta: string) => copy(settings.lang, en, ta);

  function stopCamera() {
    cameraRequest.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }

  async function openCamera() {
    detectionRequest.current += 1;
    stopCamera();
    const request = ++cameraRequest.current;
    setOpening(true);
    setCameraReady(false);
    setPhoto("");
    setLabel("");
    setError("");
    setWorking(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setOpening(false);
      setError(
        say(
          "The camera can’t open here. Choose a photo below.",
          "இங்கே கேமரா திறக்காது. கீழே ஒரு படத்தைத் தேர்ந்தெடுங்கள்.",
        ),
      );
      return;
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (!mounted.current || request !== cameraRequest.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      if (!video.current) {
        stopCamera();
        return;
      }
      video.current.srcObject = next;
      await video.current.play(); // Silent camera preview; the stream has no audio track.
      if (mounted.current && request === cameraRequest.current)
        setCameraReady(true);
    } catch {
      if (mounted.current && request === cameraRequest.current) {
        stopCamera();
        setOpening(false);
        setError(
          say(
            "The camera could not open. Choose a photo, or use Topics.",
            "கேமரா திறக்கவில்லை. படத்தைத் தேர்ந்தெடுங்கள், அல்லது தலைப்புகளைப் பாருங்கள்.",
          ),
        );
      }
    } finally {
      if (mounted.current && request === cameraRequest.current)
        setOpening(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    if (
      !session ||
      session.attempt.endedAt ||
      session.attempt.modality !== "camera"
    )
      begin({ modality: "camera", raw: "" });
    void openCamera();
    return () => {
      mounted.current = false;
      detectionRequest.current += 1;
      stopCamera();
    };
    // Start once per visit; changing app context must not reopen the camera.
  }, []);

  async function recognise(canvas: HTMLCanvasElement) {
    const request = ++detectionRequest.current;
    stopCamera();
    setCameraReady(false);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setLabel("");
    setError("");
    setWorking(true);
    try {
      const model = await getModel();
      if (!mounted.current || request !== detectionRequest.current) return;
      const predictions = await model.detect(canvas, 20, 0.6);
      if (!mounted.current || request !== detectionRequest.current) return;
      const match = predictions
        .filter((prediction) => Object.hasOwn(concepts, prediction.class))
        .sort((a, b) => b.score - a.score)[0];
      if (match) setLabel(match.class);
      else
        setError(
          say(
            "I’m not sure what this is. Take another photo, or use Topics.",
            "இது என்னவென்று தெரியவில்லை. வேறு படம் எடுங்கள், அல்லது தலைப்புகளைப் பாருங்கள்.",
          ),
        );
    } catch (failure) {
      if (mounted.current && request === detectionRequest.current) {
        setError(
          failure instanceof Error && settings.localProcessingOnly
            ? say(
                failure.message,
                "உள்ளூர் பாதுகாப்பு இயக்கத்தில் உள்ளது. தலைப்புகளைப் பாருங்கள்.",
              )
            : say(
                "Object finder not ready: it needs internet the first time. Your photo stayed on this device. Use Topics.",
                "பொருளைக் கண்டறிய முதல் முறை இணையம் தேவை. உங்கள் படம் இந்தச் சாதனத்திலேயே உள்ளது. தலைப்புகளைப் பாருங்கள்.",
              ),
        );
      }
    } finally {
      if (mounted.current && request === detectionRequest.current)
        setWorking(false);
    }
  }

  function capture() {
    const preview = video.current;
    if (!preview || preview.videoWidth === 0) {
      setError(
        say(
          "The camera is still getting ready. Please try again.",
          "கேமரா இன்னும் தயாராகிறது. மீண்டும் முயற்சி செய்யுங்கள்.",
        ),
      );
      return;
    }
    try {
      void recognise(
        resizePhoto(preview, preview.videoWidth, preview.videoHeight),
      );
    } catch (failure) {
      setError(
        say(
          failure instanceof Error
            ? failure.message
            : "Please try another photo.",
          "இந்தப் படத்தைத் திறக்க முடியவில்லை. வேறு படத்தை முயற்சி செய்யுங்கள்.",
        ),
      );
    }
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/heic",
        "image/heif",
      ].includes(file.type)
    ) {
      setError(
        say(
          "Choose a JPG, PNG, WebP, or other supported camera photo.",
          "JPG அல்லது PNG படத்தைத் தேர்ந்தெடுங்கள்.",
        ),
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(
        say(
          "That photo is too large. Please choose a photo under 10 MB.",
          "படம் மிகப் பெரியது. 10 MB-க்குக் குறைவான படத்தைத் தேர்ந்தெடுங்கள்.",
        ),
      );
      return;
    }
    const request = ++detectionRequest.current;
    stopCamera();
    setOpening(false);
    setCameraReady(false);
    setWorking(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!mounted.current || request !== detectionRequest.current) return;
      await recognise(
        resizePhoto(image, image.naturalWidth, image.naturalHeight),
      );
    } catch {
      if (mounted.current && request === detectionRequest.current) {
        setError(
          say(
            "This photo format could not be opened. Try a JPG or PNG photo.",
            "இந்தப் படத்தைத் திறக்க முடியவில்லை. JPG அல்லது PNG படத்தை முயற்சி செய்யுங்கள்.",
          ),
        );
        setWorking(false);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function useObject() {
    const fragment: Fragment = {
      modality: "camera",
      raw: label,
      objectLabel: label,
      objectSource: "coco",
    };
    void generate(fragment);
  }

  function demoBottle() {
    detectionRequest.current += 1;
    stopCamera();
    // No objectSource: this fixture is explicitly NOT a detection of the user's image.
    const fragment: Fragment = {
      modality: "camera",
      raw: "bottle",
      objectLabel: "bottle",
    };
    void generate(fragment);
  }

  return (
    <div className="camera-page">
      <Back />
      <PageTitle
        eyebrow="SHOW ME"
        title={settings.lang === "ta" ? "கேமரா · Camera" : "Camera"}
        subtitle="Point at a familiar object. We’ll help you find the words."
      />
      <div className="camera-layout" style={{ display: "grid", gap: "1rem" }}>
        <div
          className="camera-view"
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            maxHeight: 420,
            overflow: "hidden",
            borderRadius: 24,
            background: "#e9efed",
          }}
        >
          <video
            ref={video}
            muted
            playsInline
            aria-label={say("Live rear-camera preview", "கேமரா காட்சி")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: !photo && cameraReady ? "block" : "none",
            }}
          />
          {photo && (
            <img
              src={photo}
              alt={say(
                "Your photo, processed only on this device",
                "உங்கள் படம், இந்தச் சாதனத்தில் மட்டும்",
              )}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
          {!photo && !cameraReady && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeContent: "center",
                justifyItems: "center",
                gap: 12,
                padding: 24,
              }}
            >
              <CameraIcon size={48} aria-hidden="true" />
              <p>
                {opening
                  ? copy(
                      settings.lang,
                      "Opening your camera…",
                      "கேமரா திறக்கிறது…",
                    )
                  : copy(
                      settings.lang,
                      "Take or choose a photo",
                      "படம் எடு அல்லது தேர்ந்தெடு",
                    )}
              </p>
            </div>
          )}
        </div>
        <div
          className="camera-actions"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          {cameraReady && (
            <TapButton
              className="primary-button"
              disabled={working}
              onActivate={capture}
            >
              <CameraIcon />
              <span>{copy(settings.lang, "Take photo", "படம் எடு")}</span>
            </TapButton>
          )}
          {!cameraReady && (
            <TapButton
              className="secondary-button"
              disabled={working || opening}
              onActivate={() => {
                void openCamera();
              }}
            >
              <RefreshCw />
              <span>
                {photo
                  ? copy(settings.lang, "Take another photo", "வேறு படம் எடு")
                  : copy(settings.lang, "Open camera", "கேமராவைத் திற")}
              </span>
            </TapButton>
          )}
          <TapButton
            className="secondary-button"
            disabled={working}
            onActivate={() => fileInput.current?.click()}
          >
            <ImagePlus />
            <span>
              {copy(settings.lang, "Choose a photo", "படத்தைத் தேர்ந்தெடு")}
            </span>
          </TapButton>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Choose a photo from this device"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void choosePhoto(file);
            }}
          />
        </div>
        {working && (
          <div className="hint" role="status">
            <ScanLine aria-hidden="true" />
            <span>
              {say(
                "Looking at your photo on this device…",
                "உங்கள் படத்தை இந்தச் சாதனத்திலேயே பார்க்கிறது…",
              )}
            </span>
          </div>
        )}
        {label && !working && (
          <div className="camera-result" style={{ display: "grid", gap: 12 }}>
            <div className="chip" role="status">
              {say("I see:", "இது:")}{" "}
              <strong>{say(label, tamilObjects[label] ?? label)}</strong> ·{" "}
              {say(
                concepts[label] ?? "",
                tamilConcepts[concepts[label] ?? ""] ?? concepts[label] ?? "",
              )}
            </div>
            <TapButton className="primary-button" onActivate={useObject}>
              <ArrowRight />
              <span>
                {copy(
                  settings.lang,
                  `Find my words for this ${label}`,
                  "இந்தப் பொருளுக்கான வார்த்தைகளைக் காட்டு",
                )}
              </span>
            </TapButton>
          </div>
        )}
        {error && (
          <p className="notice" role="status">
            {error}
          </p>
        )}
        <Hint>
          <ShieldCheck size={18} aria-hidden="true" />{" "}
          {say(
            "Photos stay on this device. Only the object’s name is sent to find sentences.",
            "படம் இந்தச் சாதனத்திலேயே இருக்கும். பொருளின் பெயர் மட்டும் வாக்கியம் தேட அனுப்பப்படும்.",
          )}
        </Hint>
        <p className="muted">
          {settings.localProcessingOnly !== false
            ? say(
                "Local-only protection is on: no new downloads. An object finder already open here still works.",
                "உள்ளூர் பாதுகாப்பு இயக்கத்தில் உள்ளது; புதிதாக எதுவும் பதிவிறக்கப்படாது.",
              )
            : say(
                "First use downloads a free object finder. It never contains your photo.",
                "முதல் முறை ஒரு இலவசக் கருவி பதிவிறக்கப்படும்; அதில் உங்கள் படம் இருக்காது.",
              )}{" "}
          {say(
            "It knows everyday things like cups and chairs, not medicines or personal items.",
            "கப், நாற்காலி போன்ற பொதுப் பொருட்களை மட்டும் அறியும்; மருந்துகளை அறியாது.",
          )}
        </p>
        <div
          className="camera-alternatives"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          <TapButton
            className="secondary-button"
            onActivate={() => navigate("/topics")}
          >
            <span aria-hidden="true">🗂️</span>
            <span>
              {copy(settings.lang, "Use Topics", "தலைப்புகளைக் காட்டு")}
            </span>
          </TapButton>
          {settings.demo && (
            <TapButton
              className="secondary-button"
              disabled={working}
              onActivate={demoBottle}
            >
              <span aria-hidden="true">🧪</span>
              <span>
                {say("Try demo: water bottle", "மாதிரி: தண்ணீர் பாட்டில்")}
              </span>
            </TapButton>
          )}
        </div>
        {settings.demo && (
          <p className="muted">
            {say(
              "The demo uses a sample bottle label. It does not identify anything in your photo.",
              "மாதிரி ஒரு பாட்டில் பெயரை மட்டும் பயன்படுத்தும்; உங்கள் படத்தில் உள்ளதை அறியாது.",
            )}
          </p>
        )}
      </div>
    </div>
  );
}
