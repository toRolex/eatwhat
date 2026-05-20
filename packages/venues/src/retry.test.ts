import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './retry';

function makeMockResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as unknown as Response;
}

describe('fetchWithRetry — no retries needed', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response on 200', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeMockResponse(200));
    vi.stubGlobal('fetch', mockFetch);
    const res = await fetchWithRetry('https://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it('does not retry on 400 — returns 400 response immediately', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeMockResponse(400));
    vi.stubGlobal('fetch', mockFetch);
    const res = await fetchWithRetry('https://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(400);
  });

  it('does not retry on 404 — returns 404 response immediately', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeMockResponse(404));
    vi.stubGlobal('fetch', mockFetch);
    const res = await fetchWithRetry('https://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(404);
  });
});

describe('fetchWithRetry — with retries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('retries on 429 and returns success on retry', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeMockResponse(429))
      .mockResolvedValueOnce(makeMockResponse(200));
    vi.stubGlobal('fetch', mockFetch);
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('retries on 500 and returns success on retry', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeMockResponse(500))
      .mockResolvedValueOnce(makeMockResponse(200));
    vi.stubGlobal('fetch', mockFetch);
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('throws after exhausting all retries on persistent 429', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeMockResponse(429));
    vi.stubGlobal('fetch', mockFetch);
    const promise = fetchWithRetry('https://example.com');
    const assertion = expect(promise).rejects.toThrow('HTTP 429');
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on AbortError and returns success', async () => {
    const abortErr = new Error('signal aborted');
    abortErr.name = 'AbortError';
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce(makeMockResponse(200));
    vi.stubGlobal('fetch', mockFetch);
    const promise = fetchWithRetry('https://example.com');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('aborts immediately when caller signal is already aborted', async () => {
    const abortErr = new Error('signal aborted');
    abortErr.name = 'AbortError';
    const mockFetch = vi.fn().mockImplementation((_url: unknown, opts?: RequestInit) => {
      if (opts?.signal?.aborted) return Promise.reject(abortErr);
      return Promise.resolve(makeMockResponse(200));
    });
    vi.stubGlobal('fetch', mockFetch);
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchWithRetry('https://example.com', { signal: controller.signal }),
    ).rejects.toThrow('signal aborted');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
