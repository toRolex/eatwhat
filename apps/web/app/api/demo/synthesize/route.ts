import { NextRequest, NextResponse } from 'next/server';
import { synthesizePlanWithDebug } from '@/lib/ai';
import type { SynthesizeInput, SynthesizeDebug, VenueRecord } from '@/lib/ai';
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

    // Check API key availability — use mock fallback when not configured
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({
        proposals: mockSynthesize(),
        debug: { prompt: '', rawResponse: '' },
      });
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

    // Limit venues to avoid overwhelming the prompt (top 20 by rating)
    const venues =
      (venueRecords.length > 0 ? venueRecords : allVenues.map(toVenueRecord))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 20);

    const input: SynthesizeInput = {
      preferences,
      location,
      venues,
      hostNotes:
        '所有7个人都要能容纳的店，周五晚上聚餐派队，预算总体控制在中档',
    };

    const result = await synthesizePlanWithDebug(input);

    return NextResponse.json({ proposals: result.proposals, debug: result.debug });
  } catch (err) {
    // Fallback to mock if AI call fails
    console.error('[synthesize] AI call failed, using mock fallback:', err);
    return NextResponse.json({
      proposals: mockSynthesize(),
      debug: { prompt: '', rawResponse: '' },
    });
  }

  // Unreachable — kept for clarity
  throw new Error('unreachable');
}

/** Mock synthesis when DEEPSEEK_API_KEY is not set */
function mockSynthesize() {
  return [
    {
      rank: 1,
      restaurant_name: '八合里牛肉火锅（海岸城店）',
      restaurant_addr: '深圳市南山区文心五路33号海岸城B1层',
      cuisine_type: '潮汕牛肉火锅',
      cuisine_types: ['潮汕牛肉火锅', '粤菜'],
      price_range: '$$',
      rating: 4.8,
      review_count: 3286,
      image_url: null,
      maps_url: null,
      reasoning: '小明不吃辣、阿花要清爽、小林要安静能聊天——潮汕牛肉锅简直是天选之子！清汤底不辣不油，明档现切牛肉看得见的新鲜，人均100出头刚好卡在大家的预算甜点区。老张想请客也有包间能撑场面，大刘要的热闹感大厅散台就有。海鸥盖章：这就是今晚的答案！',
      constraints_met: { budget_fit: true, dietary_ok: true, cuisine_match: true, vibe_match: true, location_convenient: true },
      constraints_gap: {},
    },
    {
      rank: 2,
      restaurant_name: '鸟金·炭火烧鸟',
      restaurant_addr: '深圳市南山区深南大道9668号万象天地L3层',
      cuisine_type: '日式烧鸟',
      cuisine_types: ['日料', '烧鸟'],
      price_range: '$$$',
      rating: 4.7,
      review_count: 1523,
      image_url: null,
      maps_url: null,
      reasoning: '小林的日料梦、老王的不差钱预算、还有安静能聊天的氛围——烧鸟专门店天生就是为这种组合而生的。坐在板前看师傅慢慢烤，聊天的节奏自然就对了。价格比牛肉锅高一些，但老张说了今晚他请客，档次不能低嘛！唯一的小遗憾是阿花的素食选择偏少，点几串烤蔬菜能凑合。',
      constraints_met: { budget_fit: true, dietary_ok: false, cuisine_match: true, vibe_match: true, location_convenient: true },
      constraints_gap: { dietary_ok: '素食选择有限，仅烤蔬菜类' },
    },
    {
      rank: 3,
      restaurant_name: '金稻园砂锅粥（南油店）',
      restaurant_addr: '深圳市南山区南油生活区南商路',
      cuisine_type: '粤菜·砂锅粥',
      cuisine_types: ['粤菜', '砂锅粥', '大排档'],
      price_range: '$',
      rating: 4.6,
      review_count: 8927,
      image_url: null,
      maps_url: null,
      reasoning: '人均80吃到撑，阿花的省钱计划完美落地！虾蟹粥鲜甜不辣，有素食需求的可以单点炒青菜和粥底。大刘要的热闹劲大排档氛围天然自带，周五晚上南油那片烟火气十足。不过老张想的高档路线这里确实不太搭，建议他跟大刘划拳决定谁来妥协。',
      constraints_met: { budget_fit: true, dietary_ok: true, cuisine_match: true, vibe_match: false, location_convenient: true },
      constraints_gap: { vibe_match: '大排档环境，不适合追求档次的食客' },
    },
  ];
}
