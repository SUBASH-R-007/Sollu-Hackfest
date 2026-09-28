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
        "Camera access needs HTTPS or localhost. You can choose a photo below.",
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
        setError("The camera could not open. Choose a photo, or use Topics.");
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
          "I’m not sure what this is. Try a bottle or cup, take another photo, or use Topics.",
        );
    } catch (failure) {
      if (mounted.current && request === detectionRequest.current) {
        setError(
          failure instanceof Error && settings.localProcessingOnly
            ? failure.message
            : "The object recogniser is unavailable. Its first download needs internet. Your photo has stayed on this device. Try Topics or the labelled demo below.",
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
      setError("The camera is still getting ready. Please try again.");
      return;
    }
    try {
      void recognise(
        resizePhoto(preview, preview.videoWidth, preview.videoHeight),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Please try another photo.",
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
      setError("Choose a JPG, PNG, WebP, or other supported camera photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That photo is too large. Please choose a photo under 10 MB.");
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
          "This photo format could not be opened. Try a JPG or PNG photo.",
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
            aria-label="Live rear-camera preview"
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
              alt="Your photo, processed only on this device"
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
              Looking at this photo on your device… The first model download may
              take a moment.
            </span>
          </div>
        )}
        {label && !working && (
          <div className="camera-result" style={{ display: "grid", gap: 12 }}>
            <div className="chip" role="status">
              I see: <strong>{label}</strong> · {concepts[label]}
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
          <ShieldCheck size={18} aria-hidden="true" /> Photos stay on this
          device.{" "}
          {settings.localProcessingOnly !== false
            ? "Local-only protection blocks new model downloads. A model already loaded in this tab can still work."
            : "The first use downloads a free recognition model. A transfer already started may finish if protection changes; it contains no photo."}{" "}
          Only the object label is sent to the Sollu server to find sentences.
        </Hint>
        <p className="muted">
          Recognises everyday objects such as bottles, cups and chairs. It
          cannot recognise medicine, glasses or personal objects yet.
        </p>
        <div
          className="camera-alternatives"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          <TapButton onActivate={() => navigate("/topics")}>
            <span aria-hidden="true">🗂️</span>
            <span>
              {copy(settings.lang, "Use Topics", "தலைப்புகளைக் காட்டு")}
            </span>
          </TapButton>
          <TapButton disabled={working} onActivate={demoBottle}>
            <span aria-hidden="true">🧪</span>
            <span>
              {copy(
                settings.lang,
                "Try demo: water bottle",
                "மாதிரி: தண்ணீர் பாட்டில்",
              )}
            </span>
          </TapButton>
        </div>
        <p className="muted">
          The demo uses a sample bottle label. It does not identify anything in
          your photo.
        </p>
      </div>
    </div>
  );
}
