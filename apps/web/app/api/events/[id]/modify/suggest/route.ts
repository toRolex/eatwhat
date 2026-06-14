import { NextResponse } from 'next/server';
import { getEventById, insertModificationSuggestion } from '@/lib/db';
import { classifyModificationIntent } from '@/lib/modification';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  const { data: event } = getEventById(id);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const evt = event as Record<string, unknown>;
  if (evt.status !== 'deciding' && evt.status !== 'finalized') {
    return NextResponse.json(
      { error: 'Modification suggestions can only be submitted while the event is in deciding or finalized state' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const feedbackText = typeof body.feedback_text === 'string' ? body.feedback_text.trim() : '';

  if (!feedbackText) {
    return NextResponse.json({ error: 'feedback_text is required' }, { status: 400 });
  }

  if (feedbackText.length > 500) {
    return NextResponse.json({ error: 'feedback_text must be under 500 characters' }, { status: 400 });
  }

  const classification = classifyModificationIntent(feedbackText);

  const { data: suggestion } = insertModificationSuggestion({
    event_id: id,
    invitation_id: 'demo-host',
    feedback_text: feedbackText,
    intent_type: classification.intent_type,
    intent_confidence: classification.intent_confidence,
    affected_scope: classification.affected_scope,
    ai_interpretation: classification.ai_interpretation || undefined,
    status: 'pending',
  });

  return NextResponse.json({ suggestion });
}
