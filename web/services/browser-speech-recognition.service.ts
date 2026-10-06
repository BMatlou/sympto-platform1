"use client";

export type BrowserSpeechRecognitionHandlers = {
  onStart?: () => void;
  onResult?: (finalTranscript: string, interimTranscript: string) => void;
  onError?: (message: string, code?: string) => void;
  onEnd?: () => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function isBrowserSpeechRecognitionSupported() {
  return Boolean(getConstructor());
}

function errorMessage(code: string | undefined) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone or speech recognition access was blocked. Allow microphone access for Sympto and try again.";
    case "no-speech":
      return "I did not hear any speech. Please speak clearly and try again.";
    case "audio-capture":
      return "The browser could not access your microphone. Check that no other app is using it.";
    case "network":
      return "The browser's speech recognition service could not be reached. Check your connection and try again.";
    case "language-not-supported":
      return "This browser does not support English speech recognition on this device.";
    case "aborted":
      return "";
    default:
      return "Sympto could not start speech recognition. Please try again.";
  }
}

export function createBrowserSpeechRecognition(
  handlers: BrowserSpeechRecognitionHandlers,
): BrowserSpeechRecognition | null {
  const Constructor = getConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();

  // English is the current Talk to Sympto language. en-US is broadly
  // supported by browser speech services and handles South African English
  // speech well enough for health-note dictation.
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    handlers.onStart?.();
  };

  recognition.onresult = (event) => {
    // SpeechRecognition keeps a result list for the whole recognition session.
    // Rebuild the current final/interim transcript from that list instead of
    // appending every event, otherwise browsers such as Chrome can repeat
    // already-finalized phrases (for example: "I have I have itching").
    const finalParts: string[] = [];
    const interimParts: string[] = [];

    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() ?? "";

      if (!transcript) continue;

      if (result.isFinal) {
        finalParts.push(transcript);
      } else {
        interimParts.push(transcript);
      }
    }

    handlers.onResult?.(
      finalParts.join(" ").trim(),
      interimParts.join(" ").trim(),
    );
  };

  recognition.onerror = (event) => {
    const message = errorMessage(event.error);
    if (message) {
      handlers.onError?.(message, event.error);
    }
  };

  recognition.onend = () => {
    handlers.onEnd?.();
  };

  return recognition;
}
