import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type TranscriptionResult = {
  text: string;
  language: string;
  duration: number;
};

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "SERVICE_ERROR";
  details?: string;
};

export async function transcribeAudio(
  options: TranscribeOptions,
): Promise<TranscriptionResult | TranscriptionError> {
  if (!ENV.groqApiKey) {
    return { error: "Transcription service not configured", code: "SERVICE_ERROR", details: "GROQ_API_KEY not set" };
  }

  let audioBuffer: Buffer;
  let mimeType: string;

  try {
    const res = await fetch(options.audioUrl);
    if (!res.ok) {
      return { error: "Failed to download audio", code: "INVALID_FORMAT", details: `HTTP ${res.status}` };
    }
    audioBuffer = Buffer.from(await res.arrayBuffer());
    mimeType = res.headers.get("content-type") || "audio/mpeg";

    if (audioBuffer.length / (1024 * 1024) > 25) {
      return { error: "Audio file too large", code: "FILE_TOO_LARGE", details: "Max 25MB" };
    }
  } catch (e) {
    return { error: "Failed to fetch audio", code: "SERVICE_ERROR", details: String(e) };
  }

  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "whisper-large-v3-turbo"); // Groq's fastest Whisper model
  formData.append("response_format", "verbose_json");
  if (options.language) formData.append("language", options.language);
  if (options.prompt) formData.append("prompt", options.prompt);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.groqApiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { error: "Transcription failed", code: "TRANSCRIPTION_FAILED", details: `${res.status}: ${detail}` };
    }

    const json = await res.json() as { text: string; language: string; duration: number };
    return { text: json.text, language: json.language, duration: json.duration };
  } catch (e) {
    return { error: "Transcription request failed", code: "SERVICE_ERROR", details: String(e) };
  }
}
