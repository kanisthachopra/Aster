/// <reference types="node" />
import { createHmac, randomBytes, randomInt, randomUUID, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {coachingConfiguration,explainCoachQuestion} from './coachingService.ts';
import {trustedCoachingCard} from '../src/analysis/coachingCards.ts';

type Env = Record<string, string | undefined>;
type Row = Record<string, any>;
type Request = IncomingMessage & { body?: unknown };
const scrypt = promisify(derive), BUCKET = 'aster-recordings', MAX_BYTES = 150 * 1024 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new Failure(status, message); }
const string = (value: unknown, max = 100) => typeof value === 'string' && value.length <= max ? value.trim() : fail(400, 'Check the information you entered.');
const password = (value: unknown) => typeof value === 'string' && value.length >= 12 && value.length <= 128 ? value : fail(400, 'Use a password between 12 and 128 characters.');
const identifier = (value: unknown) => { const result = string(value, 32).toLowerCase(); return /^[a-z0-9][a-z0-9_-]{2,31}$/.test(result) ? result : fail(400, 'Use 3–32 letters, numbers, underscores or hyphens for your authorized ID.'); };
const email = (value: unknown) => { const result = string(value, 254).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : fail(400, 'Enter a valid email address.'); };
const normalCommand = (value: unknown) => string(value, 100).toLowerCase().replace(/[\s-]/g, '');
const command = () => Array.from({ length: 3 }, () => randomBytes(6).toString('hex')).join('-');
async function hash(value: string, salt: string, pepper: string) { return (await scrypt(`${value}\0${pepper}`, salt, 32) as Buffer).toString('hex'); }
function equal(a: string, b: string) { const left = Buffer.from(a, 'hex'), right = Buffer.from(b, 'hex'); return left.length === right.length && timingSafeEqual(left, right); }
function publicProfile(row: Row) { return { id: row.id, authorizedId: row.authorized_id, callsign: row.callsign, timezone: row.timezone, onboardingComplete: row.onboarding_complete, recoveryEmail: row.recovery_email, emailVerified: Boolean(row.recovery_email_verified_at) }; }
function send(res: ServerResponse, status: number, value: unknown) { if (res.writableEnded || res.destroyed) return; res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); }

/** Hosted boundary: browser credentials never receive an Auth token or service key. */
export function createOutpostHandler(env: Env, dependencies: { fetch?: typeof fetch; now?: () => number } = {}) {
  const request = dependencies.fetch ?? fetch, now = dependencies.now ?? Date.now;
  const base = env.SUPABASE_URL?.replace(/\/$/, ''), admin = env.SUPABASE_SECRET_KEY, publishable = env.SUPABASE_PUBLISHABLE_KEY, pepper = env.RECOVERY_PEPPER;
  const configured = Boolean(base?.startsWith('https://') && admin && publishable && pepper && pepper.length >= 32 && env.APP_ORIGIN);
  const emailAvailable = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  const origins = new Set([env.APP_ORIGIN, env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined].filter(Boolean));
  // Both owned production addresses serve this app. DNS problems must not make
  // the working Vercel alias unable to sign in. Never trust an arbitrary Host.
  if (env.APP_ORIGIN === 'https://aster.kcmira.me') origins.add('https://aster-ruddy.vercel.app');
  const localRequest = (req: IncomingMessage) => !env.VERCEL && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '') && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(req.headers.host || '');
  const secureCookies = (req: IncomingMessage) => !localRequest(req) && env.APP_ORIGIN?.startsWith('https://');
  const names = (req: IncomingMessage) => secureCookies(req) ? ['__Host-aster-access', '__Host-aster-refresh', '__Host-aster-session'] : ['aster-access', 'aster-refresh', 'aster-session'];
  const fingerprint = (value: string) => createHmac('sha256', pepper || 'unconfigured').update(value).digest('hex');
  async function supa(path: string, options: { method?: string; body?: unknown; token?: string; service?: boolean; prefer?: string } = {}): Promise<any> {
    const headers: Record<string, string> = { apikey: options.service ? admin! : publishable!, 'Content-Type': 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    else if (options.service && admin!.split('.').length === 3) headers.Authorization = `Bearer ${admin}`;
    if (options.prefer) headers.Prefer = options.prefer;
    let response: Response;
    try { response = await request(`${base}${path}`, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: AbortSignal.timeout(12000), redirect: 'error' }); }
    catch { return fail(503, 'The outpost connection is unavailable. Try again shortly.'); }
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const databaseMessages: Record<string, string> = {
        'Timezone changes after progress require a calendar migration': 'Your activity calendar is already in use. Keep this time zone to preserve your progress.',
        'Not enough energy credits': 'You do not have enough energy credits to protect that day.',
        'Confirm spending reserve credits': 'Confirm that you want to spend reserve credits.',
        'Weekly protection limit reached': 'Three days in that week are already protected.',
        'Choose an earlier missed account day': 'Choose a missed day after you created your account and before today.',
        'Activity day cannot be protected': 'That day already has a completed activity.',
      };
      if (detail?.code === '22023' && databaseMessages[detail.message]) fail(400, databaseMessages[detail.message]);
      return fail(response.status === 401 || response.status === 403 ? 401 : response.status === 409 ? 409 : 503,
        response.status === 401 || response.status === 403 ? 'Your session could not be verified. Sign in again.' : response.status === 409 ? 'That authorized ID is already in use.' : 'The outpost could not save this request. Try again shortly.');
    }
    return response.status === 204 ? null : response.json().catch(() => null);
  }
  async function rate(key: string, limit: number, seconds: number, cost = 1) {
    const result = await supa('/rest/v1/rpc/consume_rate_limit', { service: true, method: 'POST', body: { p_key: fingerprint(key), p_limit: limit, p_window_seconds: seconds, p_cost: cost } });
    if (!result?.allowed) fail(429, `Too many attempts. Try again in ${Math.max(1, Number(result?.retry_after) || 60)} seconds.`);
  }
  async function profile(id: string) { return (await supa(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`, { service: true }))[0] as Row | undefined; }
  async function find(authorizedId: string) { return (await supa(`/rest/v1/profiles?authorized_id=eq.${encodeURIComponent(authorizedId)}&select=*`, { service: true }))[0] as Row | undefined; }
  function cookies(res: ServerResponse, tokens?: Row, session?: string) {
    res.setHeader('Set-Cookie', names(res.req).flatMap((name, index) => index === 2 && tokens && !session ? [] : [`${name}=${tokens ? encodeURIComponent(index === 2 ? session! : tokens[index ? 'refresh_token' : 'access_token']) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokens ? index ? 2592000 : Math.max(60, Math.min(3600, Number(tokens.expires_in) || 3600)) : 0}${secureCookies(res.req) ? '; Secure' : ''}`]));
  }
  async function user(req: Request, res: ServerResponse) {
    const cookieNames = names(req);
    const stored = Object.fromEntries((req.headers.cookie || '').split(';').map(part => { const index = part.indexOf('='); return [part.slice(0, index).trim(), part.slice(index + 1)]; }));
    const session = stored[cookieNames[2]] ? decodeURIComponent(stored[cookieNames[2]]) : '';
    if (!/^[a-f0-9]{64}$/.test(session)) { cookies(res); return fail(401, 'Sign in to restore your journey.'); }
    const sessionHash = fingerprint(session);
    const savedSession = (await supa(`/rest/v1/app_sessions?id_hash=eq.${sessionHash}&select=*`, { service: true }))[0];
    if (!savedSession || Date.parse(savedSession.expires_at) <= now()) { cookies(res); return fail(401, 'Your session has ended. Sign in again.'); }
    let token = stored[cookieNames[0]] ? decodeURIComponent(stored[cookieNames[0]]) : '';
    let identity: Row | null = null;
    if (token) { try { identity = await supa('/auth/v1/user', { token }); } catch (error) { if (!(error instanceof Failure) || error.status !== 401) throw error; } }
    if (!identity && stored[cookieNames[1]]) {
      let refreshed: Row;
      try { refreshed = await supa('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: decodeURIComponent(stored[cookieNames[1]]) } }); }
      catch { cookies(res); return fail(401, 'Your session has ended. Sign in again.'); }
      token = refreshed.access_token; identity = await supa('/auth/v1/user', { token }); cookies(res, refreshed);
    }
    if (!identity?.id || !UUID.test(identity.id) || savedSession.owner_id !== identity.id) { cookies(res); return fail(401, 'Sign in to restore your journey.'); }
    return { id: identity.id as string, token, auth: identity, sessionHash };
  }
  async function signIn(row: Row, secret: string, res: ServerResponse) {
    const auth = await supa(`/auth/v1/admin/users/${row.id}`, { service: true });
    let tokens: Row;
    try { tokens = await supa('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: auth.email, password: secret } }); }
    catch { return fail(401, 'The authorized ID or password did not match.'); }
    await supa('/auth/v1/user', { token: tokens.access_token });
    const session = randomBytes(32).toString('hex');
    await supa('/rest/v1/app_sessions', { service: true, method: 'POST', body: { id_hash: fingerprint(session), owner_id: row.id, expires_at: new Date(now() + 30 * 86400000).toISOString() } });
    cookies(res, tokens, session);
    const journey = await supa('/rest/v1/rpc/get_journey', { token: tokens.access_token, method: 'POST', body: {} });
    return { profile: publicProfile(row), journey };
  }
  async function newRecovery(owner: string, old?: Row) {
    const secret = command(), salt = randomBytes(16).toString('hex'), secretHash = await hash(normalCommand(secret), salt, pepper!);
    if (old) {
      const rotated = await supa('/rest/v1/rpc/rotate_recovery', { service: true, method: 'POST', body: { p_owner_id: owner, p_expected_version: old.version, p_expected_hash: old.secret_hash, p_new_salt: salt, p_new_hash: secretHash } });
      if (rotated !== true) fail(409, 'That recovery command has already been used.');
    } else await supa('/rest/v1/recovery_credentials', { service: true, method: 'POST', body: { owner_id: owner, salt, secret_hash: secretHash } });
    return secret;
  }
  async function recoveryRow(owner: string) { return (await supa(`/rest/v1/recovery_credentials?owner_id=eq.${owner}&select=*`, { service: true }))[0] as Row | undefined; }
  async function emailCode(owner: string, address: string, purpose: string) {
    if (!emailAvailable) fail(503, 'Email recovery is not connected yet. Keep your recovery command safe.');
    await rate(`email-send:${owner}`, 3, 3600);
    const code = String(randomInt(100000, 1000000)), salt = randomBytes(16).toString('hex');
    await supa('/rest/v1/recovery_email_codes?on_conflict=owner_id,purpose', { service: true, method: 'POST', prefer: 'resolution=merge-duplicates', body: { owner_id: owner, purpose, email: address, salt, code_hash: await hash(code, salt, pepper!), expires_at: new Date(now() + 600000).toISOString(), attempts: 0 } });
    const response = await request('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [address], subject: 'Your Aster Outpost verification code', text: `Your verification code is ${code}. It expires in ten minutes. If you did not request this, ignore this email.` }), signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); fail(503, 'The verification email could not be sent. Try again later.'); }
    await response.body?.cancel();
  }
  async function verifyCode(owner: string, purpose: string, value: unknown) {
    await rate(`email-verify:${owner}`, 5, 600);
    const code = string(value, 6); if (!/^\d{6}$/.test(code)) fail(400, 'Enter the six-digit code.');
    const record = (await supa(`/rest/v1/recovery_email_codes?owner_id=eq.${owner}&purpose=eq.${purpose}&select=*`, { service: true }))[0];
    if (!record || Date.parse(record.expires_at) < now() || !equal(await hash(code, record.salt, pepper!), record.code_hash)) fail(400, 'The code is invalid or has expired.');
    const consumed = await supa(`/rest/v1/recovery_email_codes?owner_id=eq.${owner}&purpose=eq.${purpose}&code_hash=eq.${record.code_hash}`, { service: true, method: 'DELETE', prefer: 'return=representation' });
    if (!consumed?.length) fail(409, 'That code has already been used.');
    return record.email as string;
  }
  async function drainDeletedMedia(owner: string) {
    const pending = await supa(`/rest/v1/media_deletion_queue?owner_id=eq.${owner}&completed_at=is.null&select=path&limit=20`, { service: true });
    for (const item of pending) {
      if (!String(item.path).startsWith(`${owner}/`)) fail(503, 'The media cleanup record could not be verified.');
      await supa(`/storage/v1/object/${BUCKET}`, { service: true, method: 'DELETE', body: { prefixes: [item.path] } });
      await supa(`/rest/v1/media_deletion_queue?owner_id=eq.${owner}&path=eq.${encodeURIComponent(item.path)}`, { service: true, method: 'PATCH', body: { completed_at: new Date(now()).toISOString() } });
    }
  }
  return async (req: Request, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const action = new URL(req.url || '/', 'http://localhost').searchParams.get('action') || 'session';
      const readOnly = ['session', 'journey', 'speech-config', 'coach-config'].includes(action);
      if (req.method !== (readOnly ? 'GET' : 'POST')) fail(405, 'This action uses a different request method.');
      const localOrigin = localRequest(req) && req.headers.origin === `http://${req.headers.host}`;
      if (!readOnly && ((!origins.has(req.headers.origin) && !localOrigin) || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin'))) fail(403, 'Open this action from the outpost itself.');
      if (!configured) { if (action === 'session') { send(res, 200, { configured: false, authenticated: false, emailAvailable: false, message: 'Cloud accounts are not connected yet. This visit remains a guest expedition.' }); return; } fail(503, 'Cloud accounts are not connected yet.'); }
      let body: Row = {};
      if (!readOnly) {
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail(415, 'Send this action as JSON.');
        if (Number(req.headers['content-length'] || 0) > 128 * 1024) fail(413, 'This request is too large.');
        if (req.body !== undefined) { if (Buffer.byteLength(JSON.stringify(req.body)) > 128 * 1024) fail(413, 'This request is too large.'); body = req.body as Row; }
        else { let raw = ''; for await (const part of req) { raw += part.toString(); if (Buffer.byteLength(raw) > 128 * 1024) fail(413, 'This request is too large.'); } try { body = JSON.parse(raw || '{}'); } catch { fail(400, 'Send valid JSON.'); } }
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Send an object for this action.');
      }
      const ip = env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown') : req.socket.remoteAddress || 'unknown';
      if (['register', 'login', 'recover-command', 'recover-email/send', 'recover-email/verify'].includes(action)) await rate(`auth-ip:${ip}`, 30, 900);
      if (action === 'register') {
        await rate(`register:${ip}`, 5, 3600);
        const authorizedId = identifier(body.authorizedId), secret = password(body.password), callsign = string(body.callsign || 'Traveller', 60), timezone = string(body.timezone || 'UTC', 100);
        try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { fail(400, 'Choose a valid time zone.'); }
        if (body.email) email(body.email);
        if (await find(authorizedId)) fail(409, 'That authorized ID is already in use.');
        const auth = await supa('/auth/v1/admin/users', { service: true, method: 'POST', body: { email: `${randomUUID()}@aster.invalid`, password: secret, email_confirm: true } });
        try {
          await supa('/rest/v1/profiles', { service: true, method: 'POST', body: { id: auth.id, authorized_id: authorizedId, callsign, timezone, onboarding_complete: false, recovery_email: body.email ? email(body.email) : null } });
          const recoveryCommand = await newRecovery(auth.id);
          const row = (await profile(auth.id))!;
          send(res, 201, { ...await signIn(row, secret, res), recoveryCommand, emailAvailable }); return;
        } catch (error) {
          cookies(res);
          await supa(`/auth/v1/admin/users/${auth.id}`, { service: true, method: 'DELETE' }).catch(() => {});
          throw error;
        }
      }
      if (action === 'login') {
        const authorizedId = identifier(body.authorizedId); await rate(`login:${authorizedId}`, 10, 900);
        const row = await find(authorizedId); if (!row) fail(401, 'The authorized ID or password did not match.');
        send(res, 200, await signIn(row, password(body.password), res)); return;
      }
      if (action === 'recover-command' || action === 'recover-email/verify') {
        const authorizedId = identifier(body.authorizedId), nextPassword = password(body.newPassword); await rate(`recovery:${authorizedId}`, 5, 900);
        const row = await find(authorizedId); if (!row) fail(400, 'Recovery information did not match.');
        const old = await recoveryRow(row.id); if (!old) fail(400, 'Recovery information did not match.');
        if (action === 'recover-command') {
          const supplied = normalCommand(body.command); if (!/^[a-f0-9]{36}$/.test(supplied) || !equal(await hash(supplied, old.salt, pepper!), old.secret_hash)) fail(400, 'Recovery information did not match.');
        } else {
          if (!row.recovery_email_verified_at || !emailAvailable) fail(400, 'Recovery information did not match.');
          const verified = await verifyCode(row.id, 'recover', body.code); if (verified !== row.recovery_email) fail(400, 'Recovery information did not match.');
        }
        const recoveryCommand = await newRecovery(row.id, old);
        try {
          await supa(`/rest/v1/app_sessions?owner_id=eq.${row.id}`, { service: true, method: 'DELETE' });
          await supa(`/auth/v1/admin/users/${row.id}`, { service: true, method: 'PUT', body: { password: nextPassword } });
          send(res, 200, { ...await signIn(row, nextPassword, res), recoveryCommand }); return;
        }
        catch (error) {
          // A provider failure must not strand the user with an undisclosed command.
          const pending = await recoveryRow(row.id);
          if (pending && equal(await hash(normalCommand(recoveryCommand), pending.salt, pepper!), pending.secret_hash)) await supa('/rest/v1/rpc/rotate_recovery', { service: true, method: 'POST', body: { p_owner_id: row.id, p_expected_version: pending.version, p_expected_hash: pending.secret_hash, p_new_salt: old.salt, p_new_hash: old.secret_hash } }).catch(() => {});
          throw error;
        }
      }
      if (action === 'recover-email/send') {
        const authorizedId = identifier(body.authorizedId); await rate(`email-recovery:${authorizedId}`, 3, 3600);
        if (!emailAvailable) fail(503, 'Email recovery is not connected yet. Use your recovery command.');
        const row = await find(authorizedId); if (row?.recovery_email_verified_at) await emailCode(row.id, row.recovery_email, 'recover');
        send(res, 200, { message: 'If this ID has a verified recovery email, a code is on its way.' }); return;
      }
      if (action === 'session') {
        try { const current = await user(req, res); await rate(`request:${current.id}`, 120, 60); const row = await profile(current.id); const journey = await supa('/rest/v1/rpc/get_journey', { token: current.token, method: 'POST', body: {} }); send(res, 200, { configured: true, authenticated: true, profile: row ? publicProfile(row) : null, journey, emailAvailable }); }
        catch (error) { if (!(error instanceof Failure) || error.status !== 401) throw error; send(res, 200, { configured: true, authenticated: false, emailAvailable }); } return;
      }
      const current = await user(req, res), row = await profile(current.id); if (!row) fail(401, 'Your profile could not be found.');
      await rate(`request:${current.id}`, 120, 60);
      if(action==='coach-config'){send(res,200,coachingConfiguration(env));return;}
      if(action==='coach-question'){
        if(body.consent!==true)fail(400,'Choose whether to share this question with the conversation provider.');
        const exercise=string(body.exercise,10),cueId=string(body.cueId,100),question=string(body.question,600);
        const focus=trustedCoachingCard(exercise,cueId);
        if(!focus)fail(400,'Choose an explanation from this exercise review.');
        const goal=string(body.goal||'control',30);
        if(!['control','strength','comfortable'].includes(goal))fail(400,'Choose a review goal.');
        await rate(`coach:${current.id}`,8,60);
        await rate(`coach-daily:${current.id}`,16000,86400,question.length+800);
        await rate('coach-global',100000,86400,question.length+800);
        const answer=await explainCoachQuestion(env,{exercise:focus.exercise,question,focus,goal},{fetch:request});
        send(res,200,answer);return;
      }
      if (action === 'logout') { await supa(`/rest/v1/app_sessions?id_hash=eq.${current.sessionHash}`, { service: true, method: 'DELETE' }); cookies(res); await supa('/auth/v1/logout?scope=local', { token: current.token, method: 'POST' }).catch(() => {}); send(res, 200, { ok: true }); return; }
      if (action === 'profile') {
        const update: Row = {};
        if (body.callsign !== undefined) update.callsign = string(body.callsign, 60);
        if (body.timezone !== undefined) { update.timezone = string(body.timezone, 100); try { new Intl.DateTimeFormat('en', { timeZone: update.timezone }); } catch { fail(400, 'Choose a valid time zone.'); } }
        if (typeof body.onboardingComplete === 'boolean') update.onboarding_complete = body.onboardingComplete;
        await supa(`/rest/v1/profiles?id=eq.${current.id}`, { service: true, method: 'PATCH', body: update }); send(res, 200, { profile: publicProfile((await profile(current.id))!) }); return;
      }
      if (action === 'recovery-rotate') {
        await rate(`rotate:${current.id}`, 5, 900); await signIn(row, password(body.password), res);
        send(res, 200, { recoveryCommand: await newRecovery(current.id, await recoveryRow(current.id)) }); return;
      }
      if (action === 'email/send') { const address = email(body.email); await emailCode(current.id, address, 'verify'); send(res, 200, { message: 'A verification code is on its way. Your current recovery address stays active until you verify the new one.' }); return; }
      if (action === 'email/verify') { const address = await verifyCode(current.id, 'verify', body.code); await supa(`/rest/v1/profiles?id=eq.${current.id}`, { service: true, method: 'PATCH', body: { recovery_email: address, recovery_email_verified_at: new Date(now()).toISOString() } }); send(res, 200, { profile: publicProfile((await profile(current.id))!) }); return; }
      if (action === 'journey') { send(res, 200, await supa('/rest/v1/rpc/get_journey', { token: current.token, method: 'POST', body: {} })); return; }
      if (action === 'protect') { const day = string(body.day, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail(400, 'Choose a valid missed day.'); send(res, 200, await supa('/rest/v1/rpc/protect_day', { token: current.token, method: 'POST', body: { p_day: day, p_allow_reserve: body.allowReserve === true } })); return; }
      if (action === 'media/upload-intent') {
        await rate(`upload:${current.id}`, 20, 3600);
        const reviewId = string(body.reviewId, 36), mime = string(body.mimeType, 40), bytes = Number(body.size), filename = string(body.filename, 255);
        if (!UUID.test(reviewId) || !['video/mp4', 'video/webm', 'video/quicktime'].includes(mime) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_BYTES) fail(400, 'Choose a supported video up to 150 MB.');
        const path = `${current.id}/${reviewId}/${randomUUID()}.${mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4'}`;
        await supa('/rest/v1/media_uploads', { service: true, method: 'POST', body: { owner_id: current.id, review_id: reviewId, path, expected_bytes: bytes, mimetype: mime, expires_at: new Date(now() + 7200000).toISOString() } });
        const signed = await supa(`/storage/v1/object/upload/sign/${BUCKET}/${path}`, { service: true, method: 'POST', body: {} });
        const uploadUrl = new URL(`${base}/storage/v1${signed.url}`), token = uploadUrl.searchParams.get('token');
        if (!token) fail(503, 'The upload service did not issue a valid upload token.');
        const storageBase = base!.replace(/\.supabase\.co$/, '.storage.supabase.co');
        send(res, 200, { path, filename, uploadUrl: uploadUrl.href, headers: { 'Content-Type': mime }, expiresIn: 7200,
          token, resumableUrl: `${storageBase}/storage/v1/upload/resumable/sign`, resumableHeaders: { apikey: publishable, 'x-signature': token }, bucketName: BUCKET, objectName: path }); return;
      }
      if (action === 'reviews/complete') {
        const report = cleanReport(body.report), path = body.mediaPath ? string(body.mediaPath, 200) : null;
        if (path) {
          const intent = (await supa(`/rest/v1/media_uploads?owner_id=eq.${current.id}&review_id=eq.${report.id}&path=eq.${encodeURIComponent(path)}&select=*`, { service: true }))[0];
          if (!intent || Date.parse(intent.expires_at) < now()) fail(400, 'That upload is not attached to this review.');
          const info = await supa(`/storage/v1/object/info/${BUCKET}/${path}`, { service: true });
          const size = Number(info.metadata?.size ?? info.size), mime = info.metadata?.mimetype ?? info.content_type;
          if (size !== Number(intent.expected_bytes) || size > MAX_BYTES || mime !== intent.mimetype) fail(400, 'The uploaded video did not match its declared size and type.');
          await supa(`/rest/v1/media_uploads?owner_id=eq.${current.id}&path=eq.${encodeURIComponent(path)}`, { service: true, method: 'PATCH', body: { verified_at: new Date(now()).toISOString() } });
        }
        const journey = await supa('/rest/v1/rpc/complete_review', { token: current.token, method: 'POST', body: { p_report: report, p_media_path: path, p_filename: path ? string(body.filename || 'Workout video', 255) : null, p_mimetype: path ? string(body.mimeType, 40) : null } });
        send(res, 200, journey); return;
      }
      if (action === 'media/sign' || action === 'journal/delete') {
        const id = string(body.reviewId, 36); if (!UUID.test(id)) fail(400, 'Choose a saved review.');
        if (action === 'journal/delete') {
          await drainDeletedMedia(current.id);
          const path = await supa('/rest/v1/rpc/delete_review', { token: current.token, method: 'POST', body: { p_review_id: id, p_media_only: body.mediaOnly === true } });
          if (path) { if (!String(path).startsWith(`${current.id}/`)) fail(503, 'The media cleanup record could not be verified.'); await supa(`/storage/v1/object/${BUCKET}`, { service: true, method: 'DELETE', body: { prefixes: [path] } }); await supa(`/rest/v1/media_deletion_queue?owner_id=eq.${current.id}&path=eq.${encodeURIComponent(path)}`, { service: true, method: 'PATCH', body: { completed_at: new Date(now()).toISOString() } }); }
          send(res, 200, await supa('/rest/v1/rpc/get_journey', { token: current.token, method: 'POST', body: {} })); return;
        }
        const journey = await supa('/rest/v1/rpc/get_journey', { token: current.token, method: 'POST', body: {} });
        const entry = journey.entries?.find((item: Row) => item.id === id), path = entry?.mediaPath ?? entry?.media_path;
        if (!path || !String(path).startsWith(`${current.id}/`)) fail(404, 'This review has no saved recording.');
        const signed = await supa(`/storage/v1/object/sign/${BUCKET}/${path}`, { service: true, method: 'POST', body: { expiresIn: 300 } });
        send(res, 200, { url: `${base}/storage/v1${signed.signedURL}`, expiresIn: 300 }); return;
      }
      if (action === 'speech-config') { send(res, 200, { available: Boolean(env.DEEPGRAM_API_KEY), provider: 'deepgram', token: 'cookie-session', model: env.DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en', maxCharacters: 1800, message: env.DEEPGRAM_API_KEY ? 'Voice is connected to your account.' : 'Live voice is not connected yet.' }); return; }
      if (action === 'speech-review') {
        if (!env.DEEPGRAM_API_KEY) fail(503, 'Live voice is not connected yet.');
        const text = string(body.text, 1800); if (!text || body.purpose !== 'review') fail(400, 'Provide review text to read.');
        await rate(`voice:${current.id}`, 6, 60); await rate(`voice-daily:${current.id}`, 20000, 86400, text.length);
        await rate('voice-global', 100000, 86400, text.length);
        const model = env.DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en'; if (!/^aura-2-(thalia|apollo|orpheus|luna|asteria)-en$/.test(model)) fail(503, 'The configured voice is unavailable.');
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000);
        const disconnect = () => { if (!res.writableEnded) controller.abort(); }; res.on('close', disconnect);
        try {
          const response = await request(`https://api.deepgram.com/v1/speak?${new URLSearchParams({ model, encoding: 'mp3', bit_rate: '48000', mip_opt_out: 'true' })}`, { method: 'POST', headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal, redirect: 'error' });
          if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/') || !response.body) { await response.body?.cancel(); fail(503, 'Voice could not create this reading. Try again later.'); }
          const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0;
          while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > 2 * 1024 * 1024) { await reader.cancel(); fail(502, 'The voice response was too large.'); } parts.push(item.value); }
          if (!size) fail(502, 'No playable voice was returned.'); res.setHeader('Content-Type', 'audio/mpeg'); res.end(Buffer.concat(parts));
        } finally { clearTimeout(timer); res.off('close', disconnect); } return;
      }
      fail(404, 'This outpost action was not found.');
    } catch (error) { send(res, error instanceof Failure ? error.status : 503, { message: error instanceof Failure ? error.message : 'The outpost connection stopped. Try again shortly.' }); }
  };
}

export function cleanReport(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(400, 'Provide a completed review.');
  const source = value as Row, id = string(source.id, 36);
  if (!UUID.test(id) || !['pullup', 'pushup', 'squat'].includes(source.exercise) || !['usable', 'partial'].includes(source.status)) fail(400, 'Only completed supported exercise reviews can be saved.');
  const report: Row = { id, exercise: source.exercise, status: source.status, frames: [], summary: string(source.summary, 3000) };
  for (const key of ['duration', 'width', 'height', 'sampledFrames', 'usableFrames', 'coverage', 'estimatedRepetitions', 'poseFrames']) { const number = Number(source[key] ?? 0); if (!Number.isFinite(number) || number < 0 || number > (key === 'duration' ? 120 : key === 'coverage' ? 1 : 100000)) fail(400, 'The review contains invalid measurements.'); report[key] = number; }
  if (report.duration < 2 || report.usableFrames > report.sampledFrames) fail(400, 'The review contains invalid measurements.');
  report.findings = (Array.isArray(source.findings) ? source.findings : []).slice(0, 20).map((item: Row) => { const timestamp = Number(item.timestamp); if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > report.duration) fail(400, 'A review timestamp is invalid.'); return { id: string(item.id, 100), title: string(item.title, 200), observation: string(item.observation, 2000), suggestion: string(item.suggestion, 2000), timestamp }; });
  report.limitations = (Array.isArray(source.limitations) ? source.limitations : []).slice(0, 20).map((item: unknown) => string(item, 1000));
  report.sources = (Array.isArray(source.sources) ? source.sources : []).slice(0, 10).map((item: Row) => { const url = string(item.url, 2000); if (!url.startsWith('https://')) fail(400, 'A review source URL is invalid.'); return { title: string(item.title, 200), url }; });
  report.captureNotes = (Array.isArray(source.captureNotes) ? source.captureNotes : []).slice(0, 20).map((item: unknown) => string(item, 1000));
  return report;
}
export function outpostPlugin(env: Env): Plugin {
  const handler = createOutpostHandler(env);
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = req.url?.split('?')[0];
    if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY && env.RECOVERY_PEPPER && (path === '/api/speech/config' || path === '/api/speech/review')) req.url = `/api/outpost?action=${path.endsWith('config') ? 'speech-config' : 'speech-review'}`;
    if (req.url?.split('?')[0] !== '/api/outpost') next(); else void handler(req, res);
  };
  return { name: 'aster-outpost-accounts', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
}
