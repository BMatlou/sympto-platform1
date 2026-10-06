"use client";

const MODEL_ID = "onnx-community/whisper-tiny.en";
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


async function decodeForWhisper(file: File): Promise<Float32Array> {
  const AudioContextCtor =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : undefined;

  if (!AudioContextCtor) {
    throw new Error("This browser cannot decode the phone recording.");
  }

  const context = new AudioContextCtor();
  try {
    const sourceBuffer = await context.decodeAudioData(
      await file.arrayBuffer(),
    );

    if (!Number.isFinite(sourceBuffer.duration) || sourceBuffer.duration <= 0) {
      throw new Error("The phone recording has no usable audio.");
    }

    if (sourceBuffer.duration > MAX_SECONDS) {
      throw new Error("Please keep the voice recording under 60 seconds.");
    }

    // Whisper expects mono 16 kHz PCM. OfflineAudioContext performs the
    // browser-native resampling/downmixing, avoiding file-format-specific
    // decoding inside the Transformers.js pipeline.
    const targetLength = Math.max(
      1,
      Math.ceil(sourceBuffer.duration * SAMPLE_RATE),
    );
    const offline = new OfflineAudioContext(1, targetLength, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = sourceBuffer;
    source.connect(offline.destination);
    source.start(0);

    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);

    // Copy before the AudioContext is closed so the model owns a stable buffer.
    return new Float32Array(samples);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Please keep the voice recording")
    ) {
      throw error;
    }

    throw new Error(
      "Sympto could not decode this phone recording. Please try recording again.",
    );
  } finally {
    await context.close().catch(() => undefined);
  }
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
  // application errors.
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

  const dtype =
    device === "webgpu"
      ? ({ encoder_model: "fp32", decoder_model_merged: "q4" } as const)
      : "q8";

  return (await pipeline(
    "automatic-speech-recognition",
    MODEL_ID,
    {
      device,
      dtype,
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
    // Phone capture can produce formats such as M4A/MP4 that are fine for
    // the browser but unreliable when passed through the Transformers.js URL
    // decoder. Decode the recording with Web Audio first and give Whisper the
    // exact Float32Array + 16 kHz input it expects.
    const audio = await decodeForWhisper(file);

    // Transformers.js v4 ships a substantially newer WebGPU runtime. Use it
    // whenever the browser exposes WebGPU; fall back to WASM otherwise.
    const device: "webgpu" | "wasm" = hasWebGpu() ? "webgpu" : "wasm";

    const transcriber = await getTranscriber(device, onProgress);

    // whisper-tiny.en is English-only. Do not pass language/task generation
    // arguments; Transformers.js derives the correct generation settings from
    // the model configuration.
    const result = await transcriber(audio, {
      // 29-second chunks avoid an edge case in Whisper chunk handling around
      // the exact 30-second model window.
      chunk_length_s: 29,
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
