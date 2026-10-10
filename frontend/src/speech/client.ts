import type { SpeechConfiguration } from './types';
export type { SpeechConfiguration, SpeechStatus, SpeechResult, SpeakOptions } from './types';

export class SpeechUnavailable extends Error {
  constructor(message: string, readonly requiresSignIn = false) { super(message); }
}
const signInMessage = 'Sign in for ORBIT’s spoken feedback. Your video and written review will stay here.';
export async function getSpeechConfiguration(signal?: AbortSignal): Promise<SpeechConfiguration> {
  try {
    const boundedSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000);
    const response = await fetch('/api/speech/config', { cache: 'no-store', signal: boundedSignal });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error();
    const result = await response.json();
    if (!response.ok) return { available: false, provider: 'deepgram', model: null, maxCharacters: 1800,
      requiresSignIn: response.status === 401,
      message: response.status === 401 ? signInMessage : typeof result?.message === 'string' ? result.message : 'Voice could not connect. Try again shortly.' };
    return result as SpeechConfiguration;
  } catch (error) {
    if (signal?.aborted) throw error;
    return { available: false, provider: 'deepgram', model: null, maxCharacters: 1800,
      message: 'The voice connection did not respond. Choose Try voice again; your written review is still ready.' };
  }
}

export async function requestReviewSpeech(text: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const config = await getSpeechConfiguration(signal);
  // An exhausted generation budget can still serve an exact cached replay.
  if ((!config.available && config.remainingCharacters !== 0) || !config.token) throw new SpeechUnavailable(config.message, config.requiresSignIn);
  if (!text.trim() || text.length > config.maxCharacters) throw new Error(`Keep the spoken review under ${config.maxCharacters} characters.`);
  const response = await fetch('/api/speech/review', { method: 'POST', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    headers: { 'Content-Type': 'application/json', 'X-Aster-Speech-Token': config.token },
    body: JSON.stringify({ purpose: 'review', text }) });
  if (!response.ok) {
    if (response.status === 401) throw new SpeechUnavailable(signInMessage, true);
    let message = 'Live voice could not read this review. The text remains available.';
    try { const result = await response.json(); if (typeof result.message === 'string') message = result.message; } catch { /* No provider errors are exposed. */ }
    throw new Error(message);
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Live voice returned no playable audio. The text remains available.');
  return response.arrayBuffer();
}
