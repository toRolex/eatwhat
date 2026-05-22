import { describe, it, expect, vi } from 'vitest';
import { getMonthlySpendByEvent, getSpendSince } from './ai-logs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

function makeDb(rows: { cost_micros: number | null }[] | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient<Database>;
}

describe('getMonthlySpendByEvent', () => {
  it('returns 0 when no rows', async () => {
    const db = makeDb([]);
    const result = await getMonthlySpendByEvent(db, 'evt1');
    expect(result).toBe(0);
  });

  it('sums cost_micros from returned rows', async () => {
    const db = makeDb([{ cost_micros: 1000 }, { cost_micros: 2000 }, { cost_micros: null }]);
    const result = await getMonthlySpendByEvent(db, 'evt1');
    expect(result).toBe(3000);
  });

  it('throws when db returns an error', async () => {
    const db = makeDb(null, new Error('db error'));
    await expect(getMonthlySpendByEvent(db, 'evt1')).rejects.toThrow('db error');
  });
});

describe('getSpendSince', () => {
  it('returns 0 when no rows', async () => {
    const db = makeDb([]);
    const result = await getSpendSince(db, 'evt1', new Date());
    expect(result).toBe(0);
  });

  it('returns correct sum when rows exist', async () => {
    const db = makeDb([{ cost_micros: 500 }, { cost_micros: 1500 }]);
    const result = await getSpendSince(db, 'evt1', new Date('2026-05-01'));
    expect(result).toBe(2000);
  });

  it('handles null cost_micros as 0', async () => {
    const db = makeDb([{ cost_micros: null }, { cost_micros: 100 }]);
    const result = await getSpendSince(db, 'evt1', new Date());
    expect(result).toBe(100);
  });
});
