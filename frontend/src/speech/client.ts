import type { SpeechConfiguration } from './types';
export type { SpeechConfiguration, SpeechStatus, SpeechResult, SpeakOptions } from './types';

export class SpeechUnavailable extends Error {}
export async function getSpeechConfiguration(signal?: AbortSignal): Promise<SpeechConfiguration> {
  try {
    const response = await fetch('/api/speech/config', { cache: 'no-store', signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error();
    return await response.json() as SpeechConfiguration;
  } catch (error) {
    if (signal?.aborted) throw error;
    return { available: false, provider: 'deepgram', model: null, maxCharacters: 1800,
      message: 'Live voice is unavailable in this preview. Your written review is still ready to read.' };
  }
}

export async function requestReviewSpeech(text: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const config = await getSpeechConfiguration(signal);
  if (!config.available || !config.token) throw new SpeechUnavailable(config.message);
  if (!text.trim() || text.length > config.maxCharacters) throw new Error(`Keep the spoken review under ${config.maxCharacters} characters.`);
  const response = await fetch('/api/speech/review', { method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', 'X-Aster-Speech-Token': config.token },
    body: JSON.stringify({ purpose: 'review', text }) });
  if (!response.ok) {
    let message = 'Live voice could not read this review. The text remains available.';
    try { const result = await response.json(); if (typeof result.message === 'string') message = result.message; } catch { /* No provider errors are exposed. */ }
    throw new Error(message);
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Live voice returned no playable audio. The text remains available.');
  return response.arrayBuffer();
}
