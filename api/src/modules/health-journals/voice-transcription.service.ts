import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

type UploadedAudio = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class VoiceTranscriptionService {
  private readonly url =
    String(
      process.env.SYMPTO_TRANSCRIPTION_URL ??
        'https://api.openai.com/v1/audio/transcriptions',
    ).trim();

  private readonly apiKey = String(
    process.env.SYMPTO_TRANSCRIPTION_API_KEY ??
      process.env.SYMPTO_AI_API_KEY ??
      '',
  ).trim();

  private readonly model = String(
    process.env.SYMPTO_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe',
  ).trim();

  async transcribe(audio: UploadedAudio): Promise<{ text: string }> {
    if (!audio?.buffer?.length) {
      throw new BadRequestException('No audio recording was provided.');
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Voice transcription is not configured on the Sympto server.',
      );
    }

    const form = new FormData();

    // Node's Buffer can be backed by ArrayBufferLike (including SharedArrayBuffer).
    // Copy it into a plain ArrayBuffer so the Blob constructor satisfies the
    // TypeScript DOM BlobPart type and remains safe across Node versions.
    const audioBytes = new Uint8Array(audio.buffer.byteLength);
    audioBytes.set(audio.buffer);
    const audioArrayBuffer = audioBytes.buffer as ArrayBuffer;

    form.append(
      'file',
      new Blob([audioArrayBuffer], {
        type: audio.mimetype || 'application/octet-stream',
      }),
      audio.originalname || 'sympto-voice.webm',
    );
    form.append('model', this.model);
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append(
      'prompt',
      'Healthcare voice note from a South African English speaker. Preserve symptom names, medicine names, body locations, severity words, dates, durations, and quantities exactly when spoken.',
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.apiKey,
        },
        body: form,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error?.message === 'string'
            ? payload.error.message
            : 'The voice recording could not be transcribed.';
        throw new ServiceUnavailableException(message);
      }

      const text = String(payload?.text ?? '').trim();

      if (!text) {
        throw new BadRequestException(
          'Sympto could not hear any words in that recording. Please try again.',
        );
      }

      return {
        text: text.slice(0, 5000),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Sympto could not transcribe that voice recording. Please try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
