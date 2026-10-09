export type SpeechStatus = {
  available: boolean; provider: 'deepgram'; model: string | null; message: string; maxCharacters: number;
  remainingCharacters?: number; token?: string; maxChunkCharacters?: number; retryAfterSeconds?: number;
};
export type SpeechConfiguration = SpeechStatus;
export type SpeechResult = { status: 'completed' | 'unavailable' | 'error' | 'cancelled' | 'muted'; message?: string };
export type SpeakOptions = { signal?: AbortSignal; onStatus?: (status: 'preparing' | 'speaking') => void };
