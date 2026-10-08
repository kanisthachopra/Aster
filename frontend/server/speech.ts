/// <reference types="node" />
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const MAX_TEXT = 1800;
const MAX_BODY = 8192;
const MAX_AUDIO = 2 * 1024 * 1024;
const MODELS = new Set(['aura-2-thalia-en', 'aura-2-apollo-en', 'aura-2-orpheus-en', 'aura-2-luna-en', 'aura-2-asteria-en']);
type SpeechEnvironment = Record<string, string | undefined>;
type Dependencies = { fetch?: typeof fetch; now?: () => number; timeoutMs?: number };
type Next = () => void;

function json(res: ServerResponse, status: number, body: unknown) {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body));
}
function localRequest(req: IncomingMessage) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) return false;
  const host = req.headers.host;
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) return false;
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return false;
  if (req.headers.origin && req.headers.origin !== `http://${host}`) return false;
  return req.method !== 'POST' || req.headers.origin === `http://${host}`;
}
function tokenMatches(actual: string | string[] | undefined, expected: string) {
  if (typeof actual !== 'string') return false;
  const value = Buffer.from(actual); const token = Buffer.from(expected);
  return value.length === token.length && timingSafeEqual(value, token);
}

/** Local development only. No client-controlled URL, model, key, or arbitrary provider options. */
export function createSpeechMiddleware(env: SpeechEnvironment, dependencies: Dependencies = {}) {
  const apiKey = env.DEEPGRAM_API_KEY?.trim() ?? '';
  const requestedModel = env.DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en';
  const model = MODELS.has(requestedModel) ? requestedModel : '';
  const requestedBudget = Number(env.DEEPGRAM_SESSION_CHAR_BUDGET ?? 20000);
  const budget = Number.isInteger(requestedBudget) && requestedBudget >= 1800 && requestedBudget <= 200000 ? requestedBudget : 20000;
  const nonce = randomBytes(32).toString('hex');
  const request = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const cache = new Map<string, { audio: Buffer; expires: number }>();
  let usedCharacters = 0;
  let active = false;
  let requests: number[] = [];

  return async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/speech/config' && path !== '/api/speech/review') { next(); return; }
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (!localRequest(req)) { json(res, 403, { message: 'Speech is available only from this local app.' }); return; }
    if (path === '/api/speech/config' && req.method === 'GET') {
      json(res, 200, { available: Boolean(apiKey && model), provider: 'deepgram', model: model || null, maxCharacters: MAX_TEXT,
        remainingCharacters: Math.max(0, budget - usedCharacters), token: nonce,
        message: !apiKey ? 'Live voice is not connected. Add your Deepgram key to frontend/.env.local and restart the preview.'
          : !model ? 'The configured voice is not supported. Check DEEPGRAM_TTS_MODEL.' : 'Live voice is configured. Only the review text is sent to Deepgram.' }); return;
    }
    if (path !== '/api/speech/review' || req.method !== 'POST') { json(res, 405, { message: 'This speech action is not supported.' }); return; }
    if (!tokenMatches(req.headers['x-aster-speech-token'], nonce)) { json(res, 403, { message: 'Refresh the app before requesting speech.' }); return; }
    if (!apiKey || !model) { json(res, 503, { message: 'Live voice is unavailable. Your written review is still ready to read.' }); return; }
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') { json(res, 415, { message: 'Send a review as JSON text.' }); return; }
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) { json(res, 413, { message: 'This review is too long to read aloud in one request.' }); return; }
    let text: string;
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) { json(res, 413, { message: 'This review is too long to read aloud in one request.' }); return; }
        chunks.push(Buffer.from(chunk));
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
      const value = body as Record<string, unknown>;
      if (value.purpose !== 'review' || typeof value.text !== 'string' || Object.keys(value).some(key => !['purpose', 'text'].includes(key))) throw new Error();
      text = value.text.trim();
      if (!text || text.length > MAX_TEXT || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) throw new Error();
    } catch { json(res, 400, { message: `Provide a review between 1 and ${MAX_TEXT} characters.` }); return; }
    const hash = createHash('sha256').update(`${model}\0${text}`).digest('hex');
    for (const [key, value] of cache) if (value.expires <= now()) cache.delete(key);
    const cached = cache.get(hash);
    if (cached) { res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('X-Aster-Speech-Cache', 'hit'); res.end(cached.audio); return; }
    requests = requests.filter(time => time > now() - 60000);
    if (active || requests.length >= 6) { res.setHeader('Retry-After', '10'); json(res, 429, { message: 'Voice is busy. Wait a moment, then try again.' }); return; }
    if (usedCharacters + text.length > budget) { json(res, 429, { message: 'This preview has reached its voice character budget. The written review is still available.' }); return; }
    usedCharacters += text.length; requests.push(now()); active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 25000);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    try {
      const url = new URL('https://api.deepgram.com/v1/speak');
      url.search = new URLSearchParams({ model, encoding: 'mp3', bit_rate: '48000', mip_opt_out: 'true' }).toString();
      const upstream = await request(url, { method: 'POST', headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }), signal: controller.signal, redirect: 'error' });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        json(res, upstream.status === 429 ? 429 : 502, { message: upstream.status === 401 || upstream.status === 403
          ? 'The voice provider did not accept the configured key. Check its permissions in Deepgram.'
          : upstream.status === 429 ? 'The voice provider is busy or has reached its account limit. Try again later.'
          : 'The voice provider could not create this reading. Your written review is still available.' }); return;
      }
      if (!upstream.headers.get('content-type')?.startsWith('audio/') || !upstream.body) throw new Error();
      const reader = upstream.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength; if (size > MAX_AUDIO) { await reader.cancel(); throw new Error(); }
        chunks.push(part.value);
      }
      if (!size || controller.signal.aborted) throw new Error();
      const audio = Buffer.concat(chunks);
      if (cache.size >= 8) cache.delete(cache.keys().next().value!);
      cache.set(hash, { audio, expires: now() + 20 * 60000 });
      res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('X-Aster-Speech-Cache', 'miss'); res.end(audio);
    } catch {
      json(res, controller.signal.aborted ? 504 : 502, { message: controller.signal.aborted
        ? 'The voice request stopped or took too long. Your written review is still available.'
        : 'Live voice is unavailable right now. Your written review is still available.' });
    } finally { clearTimeout(timeout); res.off('close', disconnect); active = false; }
  };
}

export function speechPlugin(env: SpeechEnvironment): Plugin {
  return { name: 'aster-local-review-speech', apply: 'serve', configureServer(server) {
    const middleware = createSpeechMiddleware(env);
    server.middlewares.use((req, res, next) => { void middleware(req, res, next); });
  } };
}
