import { NextRequest, NextResponse } from 'next/server';
import { synthesizePlan } from '@/lib/ai';
import type { SynthesizeInput, VenueRecord } from '@/lib/ai';
import { loadVenues, toVenueRecord } from '@/lib/venues';

// ---------------------------------------------------------------------------
// POST /api/demo/synthesize
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      location?: string;
    };
    const location = body.location?.trim() || '深圳南山区';

    // Check API key availability
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        {
          error:
            'DeepSeek API key 未配置。请在 apps/web/.env.local 中设置 DEEPSEEK_API_KEY=sk-...',
        },
        { status: 503 },
      );
    }

    // Build preferences from the demo guest data (hardcoded to match types.ts GUESTS_DATA)
    const preferences: SynthesizeInput['preferences'] = [
      {
        name: '小明',
        dietary: ['不吃辣'],
        cuisine: ['火锅', '日料'],
        budget: '$$',
        vibe: '就想大吃一顿，别太安静就行',
      },
      {
        name: '阿花',
        dietary: ['素食'],
        cuisine: ['粤菜', '东南亚'],
        budget: '$',
        vibe: '清爽健康，不想吃完有负担',
      },
      {
        name: '老张',
        dietary: [],
        cuisine: ['烧烤', '川菜'],
        budget: '$$$',
        vibe: '今晚我请客，档次不能低',
      },
      {
        name: '小林',
        dietary: ['海鲜过敏'],
        cuisine: ['日料', '粤菜'],
        budget: '$$',
        vibe: '安静一点，能好好聊天',
      },
      {
        name: '大刘',
        dietary: [],
        cuisine: ['火锅', '烧烤'],
        budget: '$$',
        vibe: '热闹！人多就是要嗨',
      },
      {
        name: '老王',
        dietary: [],
        cuisine: ['都行'],
        budget: '$$$',
        vibe: '你们定，我跟',
      },
    ];

    // Load all venues from seed JSON, filter by location
    const allVenues = loadVenues();
    const venueRecords: VenueRecord[] = allVenues
      .filter((v) =>
        v.address.includes(location.includes('南山') ? '南山' : location),
      )
      .map(toVenueRecord);

    // Use full pool if nothing matched location filter
    const venues =
      venueRecords.length > 0 ? venueRecords : allVenues.map(toVenueRecord);

    const input: SynthesizeInput = {
      preferences,
      location,
      venues,
      hostNotes:
        '所有7个人都要能容纳的店，周五晚上聚餐派队，预算总体控制在中档',
    };

    const proposals = await synthesizePlan(input);

    return NextResponse.json({ proposals });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI synthesis failed';
    console.error('[synthesize]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
