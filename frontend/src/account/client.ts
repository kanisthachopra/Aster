import type { AnalysisReport } from '../analysis/types';
import type { Journey } from '../game/journey';

export interface AccountProfile {
  id: string; authorizedId: string; callsign: string; timezone: string;
  onboardingComplete: boolean; recoveryEmail?: string | null; emailVerified?: boolean;
}
export interface AccountSession {
  configured: boolean; authenticated: boolean; emailAvailable: boolean;
  profile?: AccountProfile; journey?: Journey; message?: string;
}

export class AccountError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

/** Credentials travel only to this app's same-origin server, never voice or localStorage. */
export async function apiRequest<T>(action: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/outpost?action=${encodeURIComponent(action)}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      cache: 'no-store', signal: AbortSignal.timeout(30000),
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch { throw new AccountError('The outpost connection dropped. Please try again.'); }
  let result: unknown;
  try { result = await response.json(); } catch { throw new AccountError('The account service did not respond. Please try again.', response.status); }
  if (!response.ok) {
    const error = result as { message?: string };
    throw new AccountError(error.message || 'That request could not be completed. Please try again.', response.status);
  }
  const normalizeJourney = (value: any) => {
    if (value && Array.isArray(value.entries)) value.entries = value.entries.map((entry: any) => ({ ...entry, file: null, mediaPath: entry.mediaPath ?? entry.media_path ?? null }));
  };
  normalizeJourney(result);
  normalizeJourney((result as AccountSession)?.journey);
  return result as T;
}

/** Persist readable observations; sampled body landmarks remain on this device. */
export function retainedReport(report: AnalysisReport): AnalysisReport {
  return { ...report, frames: [] };
}

export async function saveRecording(report: AnalysisReport, file: File, onProgress?: (percent: number) => void) {
  const intent = await apiRequest<{ path: string; uploadUrl: string; headers?: Record<string, string>; token: string;
    resumableUrl: string; resumableHeaders: Record<string, string>; bucketName: string; objectName: string }>('media/upload-intent', {
    reviewId: report.id, filename: file.name, mimeType: file.type || 'video/mp4', size: file.size,
  });
  if (file.size > 6 * 1024 * 1024) {
    const { Upload } = await import('tus-js-client');
    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: intent.resumableUrl, retryDelays: [0, 1000, 3000, 5000],
        headers: intent.resumableHeaders, chunkSize: 6 * 1024 * 1024,
        uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
        storeFingerprintForResuming: false,
        metadata: { bucketName: intent.bucketName, objectName: intent.objectName,
          contentType: file.type || 'video/mp4', cacheControl: '0' },
        onProgress: (sent, total) => onProgress?.(Math.round(sent / total * 100)),
        onSuccess: () => resolve(), onError: () => reject(new AccountError('The recording did not finish saving. Your review is still here; please try again.')),
      });
      upload.start();
    });
  } else {
    const response = await fetch(intent.uploadUrl, {
      method: 'PUT', headers: { ...intent.headers, 'Content-Type': file.type || 'video/mp4' },
      body: file, signal: AbortSignal.timeout(120000), credentials: 'omit',
    });
    if (!response.ok) throw new AccountError('The recording could not be saved. Please try again.');
  }
  return intent.path;
}

const savedUploads = new WeakMap<File, Map<string, string>>();
export async function saveReview(report: AnalysisReport, file: File | null, onProgress?: (percent: number) => void) {
  let mediaPath = file ? savedUploads.get(file)?.get(report.id) : undefined;
  if (file && !mediaPath) {
    mediaPath = await saveRecording(report, file, onProgress);
    const paths = savedUploads.get(file) ?? new Map<string, string>();
    paths.set(report.id, mediaPath); savedUploads.set(file, paths);
  }
  return apiRequest<Journey>('reviews/complete', { report: retainedReport(report),
    ...(mediaPath && file ? { mediaPath, filename: file.name, mimeType: file.type || 'video/mp4' } : {}) });
}
