import { useSyncExternalStore } from "react";
import {
  getSpeechRecognitionMode,
  subscribeLocalProcessingPolicy,
} from "./browserPolicy";
import {
  subscribeRecognitionPreference,
  type RecognitionMode,
} from "./recognitionPreference";

function subscribe(listener: () => void) {
  const stopPreference = subscribeRecognitionPreference(listener);
  const stopPolicy = subscribeLocalProcessingPolicy(() => listener());
  return () => {
    stopPreference();
    stopPolicy();
  };
}

/** Subscribing updates the label and stops active input; it never starts a mic. */
export function useSpeechRecognitionMode(): RecognitionMode {
  return useSyncExternalStore<RecognitionMode>(
    subscribe,
    getSpeechRecognitionMode,
    () => "local",
  );
}
