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
    language?: string;
    task?: string;
    chunk_length_s?: number;
    stride_length_s?: number;
  },
) => Promise<{ text?: string } | Array<{ text?: string }>>;

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber(
  onProgress?: (progress: number) => void,
): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");

      const hasWebGpu =
        typeof navigator !== "undefined" &&
        Boolean((navigator as Navigator & { gpu?: unknown }).gpu);

      const progress_callback = (info: ProgressInfo) => {
        if (
          (info.status === "progress_total" || info.status === "progress") &&
          Number.isFinite(info.progress)
        ) {
          onProgress?.(Math.max(0, Math.min(100, Number(info.progress))));
        }
      };

      const load = (device?: "webgpu") =>
        pipeline(
          "automatic-speech-recognition",
          MODEL_ID,
          {
            ...(device ? { device } : {}),
            progress_callback,
          },
        );

      try {
        return (await load(hasWebGpu ? "webgpu" : undefined)) as unknown as Transcriber;
      } catch (error) {
        // Some browsers expose navigator.gpu but cannot initialize this model
        // with WebGPU. Fall back to the normal browser runtime instead of failing voice.
        if (!hasWebGpu) throw error;
        return (await load()) as unknown as Transcriber;
      }
    })().catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }

  return transcriberPromise;
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
    onProgress?.(100);

    const transcriber = await getTranscriber(onProgress);

    const result = await transcriber(objectUrl, {
      language: "en",
      task: "transcribe",
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
