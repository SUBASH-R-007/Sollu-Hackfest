import { useEffect, useRef, useState } from "react";
import { audio } from "../audio";
import { TapButton } from "../../ui";
import type { MediaRecord } from "./model";

export default function EvidencePlayer({
  media,
  label = "Review recording",
  caregiver = false,
}: {
  media: MediaRecord;
  label?: string;
  caregiver?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("");
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.stop(), [media.id]);
  return (
    <div className="rehab-evidence">
      <video
        ref={video}
        playsInline
        preload="none"
        aria-label={`${media.kind} practice evidence`}
        hidden={media.kind === "audio"}
      />
      <TapButton
        disabled={playing}
        onActivate={(event) => {
          if (!video.current) return;
          const ticket = audio.createTap(event, label, {
            role: caregiver ? "caregiver" : "patient",
            surface: caregiver ? "studio" : "patient",
          });
          setPlaying(true);
          void audio
            .reviewMedia({
              element: video.current,
              blob: media.blob,
              text: label,
              ticket,
            })
            .then((result) => {
              setPlaying(false);
              setStatus(
                result.status === "completed"
                  ? "Review finished."
                  : result.status === "cancelled"
                    ? "Stopped."
                    : "Recording could not play. Try again.",
              );
            });
        }}
      >
        {label}
      </TapButton>
      <TapButton
        onActivate={() => {
          audio.stop();
          setPlaying(false);
        }}
      >
        Stop playback
      </TapButton>
      <p role="status">{status}</p>
    </div>
  );
}
