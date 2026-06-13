import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDb, upsertPreferences } from '@/lib/db';

// In-memory round counter (resets on server restart)
const roundMap = new Map<string, number>();

const SYSTEM_PROMPT = `你是一只海鸥聚会参谋 🐦，性格俏皮、爱用短句和梗。你的任务是帮用户收集聚会偏好。

你需要收集以下 4 项信息（每次只问一项，按顺序来）：
1. 聚会氛围（vibe）：想要什么感觉？「热闹」「安静」「浪漫」「随便」都行
2. 饮食禁忌（dietary）：有什么不吃的？不吃辣、不吃香菜、素食、海鲜过敏等
3. 预算偏好（budget）：人均多少？"$"（越省越好）、"$$"（100-200）、"$$$"（随便不差钱）
4. 位置区域（location）：在哪个片区？如海岸城、万象天地、科技园

对话规则：
- 每次只问一个问题，等用户回答了再问下一个
- 如果用户说「随便」「都行」「无所谓」或类似模糊回答，接受它，填默认值，继续下一个
- 如果用户一次性回答了好几个问题的信息，接受它们，跳过已收集的，继续问还没收集的
- 用俏皮、亲切的语气，短句子，可以适当用 emoji
- 当所有 4 项信息都收集完毕后，在回复末尾加上：
  ---PREFERENCES---
  {"vibe":"用户填的氛围","dietary":["禁忌1","禁忌2"],"budget":"$或$$或$$$","location":"用户填的位置"}
  注意：如果用户说了「随便」，vibe 填 "随便"，dietary 填 []，budget 填 "$$"，location 填 "深圳"
- 不要在对话中间输出 ---PREFERENCES---，只有全部收集完才输出
- 你的可见回复应该自然对话风格，---PREFERENCES--- 前面的内容就是给用户看的`;

/** Ensure a demo event exists so preferences can be stored */
function ensureDemoEvent() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM events WHERE id = ?').get('demo-event') as any;
  if (!existing) {
    db.prepare(`
      INSERT INTO events (id, host_id, host_name, title, description, category, location_hint, proposed_date, status, slug, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'demo-event',
      'demo-host',
      'Demo Host',
      'Demo Party',
      'Demo event for chat preferences',
      '聚餐',
      '深圳',
      '2026-06-20',
      'open',
      'demo-party',
    );
  }
  // Also ensure a demo invitation
  const inv = db.prepare('SELECT id FROM invitations WHERE id = ?').get('demo-invitation') as any;
  if (!inv) {
    db.prepare(`
      INSERT INTO invitations (id, event_id, name, email, status, invite_token, slug, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'demo-invitation',
      'demo-event',
      'Demo User',
      'demo@example.com',
      'accepted',
      'demo-token-chat',
      'demo-party-chat',
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, roomId, conversationHistory } = body as {
      message: string;
      roomId: string;
      conversationHistory: Array<{ role: string; content: string }>;
    };

    if (!message || !roomId) {
      return NextResponse.json({ error: '缺少 message 或 roomId' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // Fallback: use mock responses when no API key
      return handleMock(message, roomId, conversationHistory);
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    const round = (roundMap.get(roomId) || 0) + 1;
    roundMap.set(roomId, round);

    // Build messages for DeepSeek
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Include recent conversation history (last 10 turns to keep context manageable)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    // Add the current user message
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.8,
      max_tokens: 600,
    });

    const rawReply = completion.choices[0]?.message?.content || '海鸥今天嗓子哑了…等一下再来？🐦';

    // Check if preferences are complete
    const prefMarker = '---PREFERENCES---';
    const markerIdx = rawReply.indexOf(prefMarker);

    if (markerIdx !== -1) {
      const visibleReply = rawReply.substring(0, markerIdx).trim();
      const jsonStr = rawReply.substring(markerIdx + prefMarker.length).trim();

      try {
        const prefs = JSON.parse(jsonStr);
        ensureDemoEvent();

        // Map preferences to DB columns
        upsertPreferences('demo-invitation', 'demo-event', {
          dietary: Array.isArray(prefs.dietary) ? prefs.dietary : [],
          vibe_pref: prefs.vibe || null,
          budget_min: prefs.budget === '$' ? 0 : prefs.budget === '$$' ? 100 : 200,
          budget_max: prefs.budget === '$' ? 100 : prefs.budget === '$$' ? 200 : 999,
          location_pref: prefs.location || null,
        });

        return NextResponse.json({
          reply: visibleReply || '偏好已收齐！海鸥已帮你存好啦 🐦',
          complete: true,
        });
      } catch (parseErr) {
        // JSON parse failed, but marker was present — return visible part
        return NextResponse.json({
          reply: rawReply.replace(prefMarker, '').trim(),
          complete: true,
        });
      }
    }

    return NextResponse.json({
      reply: rawReply,
      complete: false,
    });
  } catch (err: any) {
    console.error('[chat/preferences] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

/** Mock fallback when DEEPSEEK_API_KEY is not set */
async function handleMock(
  message: string,
  roomId: string,
  conversationHistory: Array<{ role: string; content: string }>,
) {
  const round = (roundMap.get(roomId) || 0) + 1;
  roundMap.set(roomId, round);

  const userMsgs = conversationHistory.filter(m => m.role === 'user').length;
  // Count this one too
  const totalUserMsgs = userMsgs + 1;

  const mockReplies: Record<number, string> = {
    1: `好嘞！「${message}」收到了~ 那吃方面有啥雷区不？不吃辣？不吃香菜？素食？跟我说说 🐦`,
    2: `记住了！那人居预算呢？① 随便不差钱 ② 100-200 刚合适 ③ 越省越好`,
    3: `了解！最后问一下，你在哪个片区？方便我帮你算距离~ 比如海岸城、万象天地、科技园…`,
    4: `齐活了！你的偏好海鸥都记下了 🐦
---PREFERENCES---
{"vibe":"热闹","dietary":["不吃辣"],"budget":"$$","location":"海岸城"}`,
  };

  const reply = mockReplies[totalUserMsgs] || mockReplies[4]!;

  if (totalUserMsgs >= 4) {
    try {
      const markerIdx = reply.indexOf('---PREFERENCES---');
      if (markerIdx !== -1) {
        const visibleReply = reply.substring(0, markerIdx).trim();
        const jsonStr = reply.substring(markerIdx + '---PREFERENCES---'.length).trim();
        const prefs = JSON.parse(jsonStr);
        ensureDemoEvent();
        upsertPreferences('demo-invitation', 'demo-event', {
          dietary: Array.isArray(prefs.dietary) ? prefs.dietary : [],
          vibe_pref: prefs.vibe || null,
          budget_min: prefs.budget === '$' ? 0 : prefs.budget === '$$' ? 100 : 200,
          budget_max: prefs.budget === '$' ? 100 : prefs.budget === '$$' ? 200 : 999,
          location_pref: prefs.location || null,
        });
        return NextResponse.json({
          reply: visibleReply || '偏好已收齐！',
          complete: true,
        });
      }
    } catch {}
  }

  return NextResponse.json({
    reply,
    complete: false,
  });
}
