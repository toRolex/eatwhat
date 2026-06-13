import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// DeepSeek client (OpenAI-compatible)
// ---------------------------------------------------------------------------
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-v4-pro';

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is not set. Add it to apps/web/.env.local:\n' +
      'DEEPSEEK_API_KEY=sk-...',
    );
  }
  return new OpenAI({ baseURL: DEEPSEEK_BASE_URL, apiKey });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface VenueRecord {
  name: string;
  address: string;
  cuisine_type: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  tags: string[];
  hours: string;
}

export interface SynthesizedProposal {
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  image_url: string | null;
  maps_url: string | null;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
}

export interface SynthesizeInput {
  preferences: Array<{
    name: string;
    dietary: string[];
    cuisine: string[];
    budget: string;
    vibe: string | null;
  }>;
  location: string;
  venues: VenueRecord[];
  hostNotes?: string;
}

// ---------------------------------------------------------------------------
// Build the prompt
// ---------------------------------------------------------------------------
function buildPrompt(input: SynthesizeInput): string {
  const guestLines = input.preferences
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}: dietary=[${p.dietary.join(', ') || 'none'}], cuisine_prefs=[${p.cuisine.join(', ')}], budget=${p.budget}, vibe="${p.vibe ?? '无所谓'}"`,
    )
    .join('\n');

  const venueLines = input.venues
    .map(
      (v, i) =>
        `${i + 1}. ${v.name} | ${v.cuisine_type} | ${v.price_range} | ★${v.rating} (${v.review_count} reviews) | ${v.address} | hours: ${v.hours} | tags: [${v.tags.join(', ')}]`,
    )
    .join('\n');

  const notesLine = input.hostNotes
    ? `\n组织者备注：${input.hostNotes}\n`
    : '';

  return `你是一个为朋友聚会推荐餐厅的「今天整点啥」AI 助手。风格要求：像海鸥一样俏皮、有网感，用轻松活泼的中文写推荐理由，不要像正式文案。

## 聚会位置
${input.location}

## 参与者偏好
${guestLines}
${notesLine}
## 候选商家（按距离排序）
${venueLines}

## 任务
综合所有人的偏好和约束，从候选商家中推荐最合适的 3 个，按推荐优先级排序。

## 输出格式
严格输出以下 JSON 数组，不要添加任何额外文字、markdown 标记或注释：

[
  {
    "rank": 1,
    "restaurant_name": "商家名称（必须与候选列表完全一致）",
    "restaurant_addr": "商家地址",
    "cuisine_type": "主菜系",
    "cuisine_types": ["菜系1", "菜系2"],
    "price_range": "价格区间 ($/$$/$$$/$$$$)",
    "rating": 数字评分,
    "review_count": 评价数量,
    "image_url": null,
    "maps_url": null,
    "reasoning": "推荐理由，用海鸥俏皮风格，50-150字中文，解释为什么这家店适合这群人，提到具体偏好匹配，语气轻松有趣",
    "constraints_met": { "约束名": true },
    "constraints_gap": {}
  },
  ... 共 3 个
]

注意：
- reasoning 必须用中文，风格像海鸥一样俏皮、口语化，有「今天整点啥」的品牌调性
- constraints_met 的 key 用英文 snake_case（如: budget_fit, dietary_ok, cuisine_match, vibe_match, location_convenient）
- 确保每个推荐的理由具体而不是泛泛而谈
- 只输出 JSON 数组，不要有任何其他内容`;
}

// ---------------------------------------------------------------------------
// Parse the AI response
// ---------------------------------------------------------------------------
function parseResponse(text: string): SynthesizedProposal[] {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    const endFence = cleaned.indexOf('\n');
    cleaned = cleaned.slice(endFence + 1);
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
  }

  const parsed = JSON.parse(cleaned) as unknown[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned empty or non-array result');
  }

  return parsed.slice(0, 3).map((item: unknown, index: number) => {
    const r = item as Record<string, unknown>;
    return {
      rank: index + 1,
      restaurant_name: String(r.restaurant_name ?? 'Unknown'),
      restaurant_addr: String(r.restaurant_addr ?? ''),
      cuisine_type: String(r.cuisine_type ?? 'Other'),
      cuisine_types: Array.isArray(r.cuisine_types) ? r.cuisine_types.map(String) : [String(r.cuisine_type ?? 'Other')],
      price_range: String(r.price_range ?? '$$'),
      rating: Number(r.rating) || 4.0,
      review_count: Number(r.review_count) || 0,
      image_url: null,
      maps_url: null,
      reasoning: String(r.reasoning ?? '这家店完美适配所有人的口味。'),
      constraints_met: (r.constraints_met as Record<string, boolean>) ?? {},
      constraints_gap: (r.constraints_gap as Record<string, string>) ?? {},
    } satisfies SynthesizedProposal;
  });
}

// ---------------------------------------------------------------------------
// Debug-aware synthesis
// ---------------------------------------------------------------------------
export interface SynthesizeDebug {
  prompt: string;
  rawResponse: string;
}

export async function synthesizePlanWithDebug(
  input: SynthesizeInput,
): Promise<{ proposals: SynthesizedProposal[]; debug: SynthesizeDebug }> {
  const client = getClient();
  const prompt = buildPrompt(input);

  const completion = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '你是一个精准的 JSON 输出引擎。只输出合法的 JSON 数组，不添加任何其他文字。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  }, { timeout: 90000 });

  const raw = completion.choices[0]?.message?.content ?? '';
  if (!raw) {
    throw new Error('DeepSeek returned empty response');
  }

  return {
    proposals: parseResponse(raw),
    debug: { prompt, rawResponse: raw },
  };
}

// ---------------------------------------------------------------------------
// Main export: synthesizePlan
// ---------------------------------------------------------------------------
export async function synthesizePlan(
  input: SynthesizeInput,
): Promise<SynthesizedProposal[]> {
  const result = await synthesizePlanWithDebug(input);
  return result.proposals;
}

// ---------------------------------------------------------------------------
// Quick health check
// ---------------------------------------------------------------------------
export async function checkDeepSeekConnectivity(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 10,
    });
    const ok = !!(completion.choices[0]?.message?.content);
    return { ok };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
