const MAX_RETRIES = 2;
const TIMEOUT_MS = 10_000;
const BASE_BACKOFF_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return true;
  return err.message.includes('fetch failed') || err.message.includes('ECONNRESET');
}

export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const signal = init.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal;
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < MAX_RETRIES) {
          await sleep(BASE_BACKOFF_MS * (attempt + 1));
          continue;
        }
        throw lastError;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (init.signal?.aborted) throw err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(BASE_BACKOFF_MS * (attempt + 1));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
