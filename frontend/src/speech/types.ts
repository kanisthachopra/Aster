export type SpeechStatus = {
  available: boolean; provider: 'deepgram'; model: string | null; message: string; maxCharacters: number;
  remainingCharacters?: number; token?: string; maxChunkCharacters?: number; retryAfterSeconds?: number;
  requiresSignIn?: boolean;
};
export type SpeechConfiguration = SpeechStatus;
export type SpeechResult = { status: 'completed' | 'unavailable' | 'error' | 'cancelled' | 'muted'; message?: string; requiresSignIn?: boolean };
export type SpeakOptions = { signal?: AbortSignal; onStatus?: (status: 'preparing' | 'speaking') => void };
