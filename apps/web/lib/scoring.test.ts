import { describe, it, expect } from 'vitest';
import { bordaScore, computeBorda } from './scoring';

describe('bordaScore', () => {
  it('assigns max points to rank 1', () => {
    expect(bordaScore(1, 3)).toBe(3);
  });

  it('assigns decreasing points for lower ranks', () => {
    expect(bordaScore(2, 3)).toBe(2);
    expect(bordaScore(3, 3)).toBe(1);
  });

  it('returns 0 for rank beyond totalProposals', () => {
    expect(bordaScore(4, 3)).toBe(0);
  });

  it('never returns negative', () => {
    expect(bordaScore(100, 3)).toBe(0);
  });

  it('works with a 5-proposal field', () => {
    expect(bordaScore(1, 5)).toBe(5);
    expect(bordaScore(5, 5)).toBe(1);
  });
});

describe('computeBorda', () => {
  it('tallies votes and scores correctly for multiple voters', () => {
    const proposals = ['a', 'b', 'c'];
    const votes = [
      { proposal_id: 'a', invitation_id: 'g1', rank: 1 },
      { proposal_id: 'b', invitation_id: 'g1', rank: 2 },
      { proposal_id: 'c', invitation_id: 'g1', rank: 3 },
      { proposal_id: 'a', invitation_id: 'g2', rank: 1 },
      { proposal_id: 'b', invitation_id: 'g2', rank: 2 },
    ];
    const { tally, totalVoters } = computeBorda(proposals, votes);
    const byId = Object.fromEntries(tally.map(t => [t.proposal_id, t]));

    expect(totalVoters).toBe(2);
    expect(byId['a']!.vote_count).toBe(2);
    expect(byId['a']!.weighted_score).toBe(6);
    expect(byId['b']!.vote_count).toBe(2);
    expect(byId['b']!.weighted_score).toBe(4);
    expect(byId['c']!.vote_count).toBe(1);
    expect(byId['c']!.weighted_score).toBe(1);
  });

  it('returns all-zero tallies with zero votes', () => {
    const { tally, totalVoters } = computeBorda(['a', 'b', 'c'], []);

    expect(totalVoters).toBe(0);
    expect(tally).toHaveLength(3);
    for (const t of tally) {
      expect(t.vote_count).toBe(0);
      expect(t.weighted_score).toBe(0);
    }
  });

  it('preserves all proposal IDs in the tally even with no votes', () => {
    const { tally } = computeBorda(['a', 'b', 'c'], []);
    expect(tally.map(t => t.proposal_id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('counts a single voter correctly', () => {
    const votes = [
      { proposal_id: 'a', invitation_id: 'solo', rank: 1 },
      { proposal_id: 'b', invitation_id: 'solo', rank: 2 },
    ];
    const { tally, totalVoters } = computeBorda(['a', 'b'], votes);
    const byId = Object.fromEntries(tally.map(t => [t.proposal_id, t]));

    expect(totalVoters).toBe(1);
    expect(byId['a']!.weighted_score).toBe(2);
    expect(byId['b']!.weighted_score).toBe(1);
  });

  it('produces a tie when two voters perfectly split on different top picks', () => {
    const votes = [
      { proposal_id: 'a', invitation_id: 'g1', rank: 1 },
      { proposal_id: 'b', invitation_id: 'g2', rank: 1 },
    ];
    const { tally } = computeBorda(['a', 'b'], votes);
    const byId = Object.fromEntries(tally.map(t => [t.proposal_id, t]));

    expect(byId['a']!.weighted_score).toBe(byId['b']!.weighted_score);
  });

  it('handles partial rankings — voter who only ranks some proposals', () => {
    const proposals = ['a', 'b', 'c'];
    const votes = [
      { proposal_id: 'a', invitation_id: 'g1', rank: 1 },
    ];
    const { tally, totalVoters } = computeBorda(proposals, votes);
    const byId = Object.fromEntries(tally.map(t => [t.proposal_id, t]));

    expect(totalVoters).toBe(1);
    expect(byId['a']!.weighted_score).toBe(3);
    expect(byId['b']!.weighted_score).toBe(0);
    expect(byId['c']!.weighted_score).toBe(0);
  });

  it('silently ignores votes for unknown proposal IDs', () => {
    const votes = [{ proposal_id: 'ghost', invitation_id: 'g1', rank: 1 }];
    const { tally } = computeBorda(['a', 'b'], votes);
    for (const t of tally) {
      expect(t.weighted_score).toBe(0);
    }
  });
});
