import { describe, it, expect } from 'vitest';

function shouldBlockPipeline(monthlySpendMicros: number, capMicros: number): boolean {
  return monthlySpendMicros >= capMicros;
}

describe('pipeline circuit breaker logic', () => {
  it('blocks when spend equals cap', () => {
    expect(shouldBlockPipeline(5_000_000, 5_000_000)).toBe(true);
  });

  it('blocks when spend exceeds cap', () => {
    expect(shouldBlockPipeline(6_000_000, 5_000_000)).toBe(true);
  });

  it('allows when spend is below cap', () => {
    expect(shouldBlockPipeline(4_999_999, 5_000_000)).toBe(false);
  });

  it('allows when spend is zero', () => {
    expect(shouldBlockPipeline(0, 5_000_000)).toBe(false);
  });

  it('parses cap from env var string correctly', () => {
    const capMicros = parseInt('5000000', 10);
    expect(shouldBlockPipeline(5_000_000, capMicros)).toBe(true);
  });
});
