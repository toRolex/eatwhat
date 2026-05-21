export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const error = err as { status?: number };
    if (retries > 0 && error.status === 429) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs);
    }
    throw err;
  }
}
