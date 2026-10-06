"use client";

const MODEL_ID = "Xenova/whisper-tiny.en";
const SAMPLE_RATE = 16_000;
const MAX_SECONDS = 60;

type ProgressInfo = {
  status?: string;
  progress?: number;
};

type Transcriber = (
  audio: string | Float32Array,
  options?: {
    chunk_length_s?: number;
    stride_length_s?: number;
  },
) => Promise<{ text?: string } | Array<{ text?: string }>>;

type VoiceDevice = "webgpu" | "wasm";

let webGpuTranscriberPromise: Promise<Transcriber> | null = null;
let wasmTranscriberPromise: Promise<Transcriber> | null = null;

function isLikelyMobileDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return true;

  // Catch mobile/tablet browsers whose UA does not identify the platform.
  return navigator.maxTouchPoints > 1 &&
    typeof window !== "undefined" &&
    Math.min(window.innerWidth, window.innerHeight) <= 1024;
}

function hasWebGpu() {
  return (
    typeof navigator !== "undefined" &&
    Boolean((navigator as Navigator & { gpu?: unknown }).gpu)
  );
}

async function createTranscriber(
  device: VoiceDevice,
  onProgress?: (progress: number) => void,
): Promise<Transcriber> {
  const { pipeline, env } = await import("@huggingface/transformers");

  // Keep provider diagnostics quiet in development without hiding real
  // application errors. WASM is the compatibility path for mobile devices.
  env.logLevel = 40;
  env.backends.onnx?.setLogLevel?.(40);

  // Single-threaded WASM is the safest browser configuration, especially on
  // Android/mobile browsers where worker/shared-memory support varies.
  if (device === "wasm" && env.backends.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  const progress_callback = (info: ProgressInfo) => {
    if (
      (info.status === "progress_total" || info.status === "progress") &&
      Number.isFinite(info.progress)
    ) {
      onProgress?.(Math.max(0, Math.min(100, Number(info.progress))));
    }
  };

  return (await pipeline(
    "automatic-speech-recognition",
    MODEL_ID,
    {
      device,
      progress_callback,
    },
  )) as unknown as Transcriber;
}

async function getTranscriber(
  device: VoiceDevice,
  onProgress?: (progress: number) => void,
): Promise<Transcriber> {
  if (device === "webgpu") {
    if (!webGpuTranscriberPromise) {
      webGpuTranscriberPromise = createTranscriber(device, onProgress).catch((error) => {
        webGpuTranscriberPromise = null;
        throw error;
      });
    }
    return webGpuTranscriberPromise;
  }

  if (!wasmTranscriberPromise) {
    wasmTranscriberPromise = createTranscriber(device, onProgress).catch((error) => {
      wasmTranscriberPromise = null;
      throw error;
    });
  }

  return wasmTranscriberPromise;
}

export function isLocalVoiceTranscriptionSupported() {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

export async function transcribeLocalVoice(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!isLocalVoiceTranscriptionSupported()) {
    throw new Error("This browser cannot run local voice transcription.");
  }

  if (!file.type.startsWith("audio/")) {
    throw new Error("Please provide an audio recording.");
  }

  if (file.size <= 0) {
    throw new Error("The voice recording is empty.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    // Transformers.js can decode a browser-supported audio URL directly.
    // This avoids depending on an internal audio helper that is not part of
    // the installed package's public TypeScript exports.
    //
    // WebGPU inference is still experimental on some mobile devices. Those
    // browsers can successfully load the model and then fail only when the
    // first inference runs (the exact "Inputs given to model: {}" failure).
    // Use the more compatible WASM backend on phones/tablets instead.
    const device: "webgpu" | "wasm" =
      !isLikelyMobileDevice() && hasWebGpu() ? "webgpu" : "wasm";

    const transcriber = await getTranscriber(device, onProgress);

    // whisper-tiny.en is English-only. Do not pass language/task generation
    // arguments; Transformers.js derives the correct generation settings from
    // the model configuration.
    const result = await transcriber(objectUrl, {
      // Larger chunks reduce repeated Whisper work for ordinary short health updates.
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const text = Array.isArray(result)
      ? result.map((item) => String(item?.text ?? "")).join(" ")
      : String(result?.text ?? "");

    const transcript = text.trim();

    if (!transcript) {
      throw new Error(
        "Sympto could not make out any words. Please speak clearly and try again.",
      );
    }

    return transcript;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
