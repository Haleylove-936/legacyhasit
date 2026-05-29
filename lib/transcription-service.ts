/**
 * Transcription Service
 *
 * Handles audio transcription. Currently uses a stub implementation
 * that simulates Whisper-like behavior. Can be replaced with real
 * Whisper API, server-side transcription, or other services later.
 */

/**
 * Stub transcription function.
 * In production, this would call a real transcription service
 * (e.g., Whisper API, server endpoint, etc.).
 *
 * For now, returns a plausible transcript based on the title
 * and a short placeholder to simulate real behavior.
 */
/**
 * Real transcription function.
 * This calls the backend via tRPC to upload the audio and then transcribe it.
 */
export async function transcribeAudio(
  fileUri: string,
  title: string,
  theme: string,
  trpc?: any, // Pass trpc client (optional — falls back to stub if not provided)
): Promise<string> {
  // If no trpc client provided, return a stub transcript for testing/offline use
  if (!trpc) {
    const stubs: Record<string, string> = {
      childhood: `When I was young, I remember ${title}. Those were simpler times, full of wonder and discovery.`,
      recipes: `To make this dish, you start with the basics. ${title} was always a family favorite.`,
      love: `I first met the love of my life when ${title} happened. It changed everything.`,
    };
    return stubs[theme] ?? `I remember ${title}. It was a meaningful moment in my life.`;
  }
  try {
    // 1. Read file as base64
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
    });
    reader.readAsDataURL(blob);
    const base64 = await base64Promise;

    // 2. Upload to R2 via tRPC
    const safeTitle = title
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 20);
    const filename = `${Date.now()}-${safeTitle || 'recording'}.mp3`;
    const { url: audioUrl } = await trpc.transcription.upload.mutate({
      key: `recordings/${filename}`,
      data: base64,
      contentType: 'audio/mpeg',
    });

    // 3. Transcribe via tRPC
    const result = await trpc.transcription.transcribe.mutate({
      audioUrl,
      prompt: `This is a family memory about ${title} in the theme of ${theme}.`,
    });

    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    // Fallback to a placeholder if real transcription fails
    return `[Transcription failed] I remember ${title}. (A real transcript could not be generated at this time.)`;
  }
}

/**
 * Check if transcription is available for a memory.
 * Used to determine whether to show transcript in UI.
 */
export function hasTranscript(transcript: string | null | undefined): boolean {
  return !!transcript && transcript.trim().length > 0;
}
