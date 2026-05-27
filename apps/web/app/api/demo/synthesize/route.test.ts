import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@groupplan/ai', () => ({
  ClaudeAIProvider: vi.fn(),
}));

vi.mock('@groupplan/venues', () => ({
  GooglePlacesVenueProvider: vi.fn(),
  YelpVenueProvider: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  ensureEnvLoaded: vi.fn(),
}));

vi.mock('@/lib/photo-signing', () => ({
  signPhotoRef: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  clientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { POST } from './route';
import { clientIp, rateLimit } from '@/lib/rate-limit';

describe('POST /api/demo/synthesize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientIp).mockReturnValue('127.0.0.1');
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.YELP_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('rate limit exceeded -> 429', async () => {
    vi.mocked(rateLimit).mockReturnValue({ ok: false, remaining: 0, retryAfterSec: 3600 });

    const response = await POST(new NextRequest('http://localhost/api/demo/synthesize', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(429);
  });

  it('no API keys -> 503', async () => {
    vi.mocked(rateLimit).mockReturnValue({ ok: true, remaining: 2, retryAfterSec: 0 });

    const response = await POST(new NextRequest('http://localhost/api/demo/synthesize', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(503);
  });
});
