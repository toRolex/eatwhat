import { describe, expect, it } from 'vitest';
import type { InsertProposalRow } from './proposals';

describe('InsertProposalRow v2 fields', () => {
  it('accepts envy_scores, narrative_personal, narrative_group, confidence_score', () => {
    const row: InsertProposalRow = {
      event_id: 'evt1',
      rank: 1,
      restaurant_name: 'Test',
      restaurant_addr: '1 Main St',
      cuisine_type: 'Italian',
      price_range: '$$',
      reasoning: 'Good fit.',
      constraints_met: { vegetarian: true },
      constraints_gap: {},
      envy_scores: { 'inv-abc': 0.2 },
      narrative_group: 'Appears to be a good fit for the group.',
      narrative_personal: { 'inv-abc': 'Likely accommodates your preferences.' },
      confidence_score: 0.85,
    };
    expect(row.envy_scores).toBeDefined();
    expect(row.narrative_group).toBeDefined();
  });

  it('accepts null for optional v2 fields', () => {
    const row: InsertProposalRow = {
      event_id: 'evt1',
      rank: 1,
      restaurant_name: 'Test',
      restaurant_addr: '1 Main St',
      cuisine_type: 'Italian',
      price_range: '$$',
      reasoning: 'Good fit.',
      constraints_met: { vegetarian: true },
      constraints_gap: {},
      envy_scores: null,
      narrative_group: null,
      narrative_personal: null,
      confidence_score: null,
    };
    expect(row.envy_scores).toBeNull();
  });
});
