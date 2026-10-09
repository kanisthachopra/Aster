/** Settle cancellation even when an AudioContext resume/decode promise remains pending. */
export function withSpeechAbort<T>(pending: Promise<T>, signal: AbortSignal, timeoutMs = 35000, timeoutMessage = 'Voice took too long to respond. Choose Try voice again.'): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Reading cancelled', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(timeoutMessage)); }, timeoutMs);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    pending.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}
