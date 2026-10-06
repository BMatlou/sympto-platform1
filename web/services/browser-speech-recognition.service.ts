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

function normalizeWords(value: string) {
  return value
    .replace(/[^\\p{L}\\p{N}']+/gu, " ")
    .trim()
    .toLowerCase()
    .split(/\\s+/)
    .filter(Boolean);
}

function mergeTranscriptParts(parts: string[]) {
  let mergedWords: string[] = [];

  for (const part of parts) {
    const words = normalizeWords(part);
    if (words.length === 0) continue;

    if (mergedWords.length === 0) {
      mergedWords = words;
      continue;
    }

    const same = mergedWords.length === words.length &&
      mergedWords.every((word, index) => word === words[index]);
    if (same) continue;

    // Some mobile speech services return cumulative results:
    // "I have" -> "I have itching" -> "I have itching eyes".
    // In that case, replace the shorter transcript with the longer one.
    const mergedPrefixOfNew = mergedWords.every(
      (word, index) => word === words[index],
    );
    if (mergedPrefixOfNew && words.length > mergedWords.length) {
      mergedWords = words;
      continue;
    }

    // Conversely, ignore an older/shorter result that is already contained
    // in the transcript we have.
    const newPrefixOfMerged = words.every(
      (word, index) => word === mergedWords[index],
    );
    if (newPrefixOfMerged) continue;

    // Normal streaming segmentation: append only the portion that does not
    // overlap with the end of the transcript already collected.
    let overlap = Math.min(mergedWords.length, words.length);
    while (overlap > 0) {
      const suffix = mergedWords.slice(-overlap);
      const prefix = words.slice(0, overlap);

      if (suffix.every((word, index) => word === prefix[index])) {
        break;
      }
      overlap -= 1;
    }

    mergedWords.push(...words.slice(overlap));
  }

  return mergedWords.join(" ");
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

    const finalTranscript = mergeTranscriptParts(finalParts);
    // Interim recognition can also be cumulative; the most recent interim
    // result is the best representation while the user is still speaking.
    const interimTranscript = interimParts.at(-1) ?? "";

    handlers.onResult?.(finalTranscript, interimTranscript.trim());
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
