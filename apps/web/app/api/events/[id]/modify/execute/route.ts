import { NextResponse } from 'next/server';
import {
  getEventById,
  getModificationSuggestionsByEvent,
  updateModificationSuggestionStatus,
  getProposalsByEvent,
  bumpPlanVersion,
  replaceProposalsAndAdvance,
  InsertProposalRow,
} from '@/lib/db';
import { getEffectiveScope } from '@/lib/modification';
import type { IntentType } from '@/lib/modification';

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
  if (evt.host_id !== 'demo-host') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (evt.status !== 'deciding') {
    return NextResponse.json(
      { error: 'Modification can only be executed while the event is in deciding state' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const approvedIds: string[] = Array.isArray(body.approved_ids) ? body.approved_ids : [];
  const rejectedIds: string[] = Array.isArray(body.rejected_ids) ? body.rejected_ids : [];

  if (approvedIds.length === 0 && rejectedIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one approved_id or rejected_id is required' },
      { status: 400 },
    );
  }

  // Reject suggestions
  for (const sid of rejectedIds) {
    updateModificationSuggestionStatus(sid, 'rejected', 'demo-host');
  }

  // Get all pending suggestions to find intent types for approved ones
  const { data: allSuggestions } = getModificationSuggestionsByEvent(id);
  const suggestions = (allSuggestions ?? []) as Array<Record<string, unknown>>;

  const intentTypes: IntentType[] = [];
  for (const sid of approvedIds) {
    updateModificationSuggestionStatus(sid, 'approved', 'demo-host');
    const sug = suggestions.find((s) => s.id === sid);
    if (sug?.intent_type) {
      intentTypes.push(sug.intent_type as IntentType);
    }
  }

  const scope = getEffectiveScope(intentTypes);

  let newVersion: number;
  let changeLog: { kept: string[]; replaced: string[]; added: string[]; reason: string };

  if (scope === 'full') {
    replaceProposalsAndAdvance(id, []);
    const { data: version } = bumpPlanVersion(id);
    newVersion = version ?? 1;
    changeLog = {
      kept: [],
      replaced: [],
      added: [],
      reason: `全量重算：${intentTypes.join(', ')} 类型修改，需要重新搜索候选`,
    };
  } else {
    const { data: proposals } = getProposalsByEvent(id);
    const existingProposals = (proposals ?? []) as Array<Record<string, unknown>>;

    const { data: version } = bumpPlanVersion(id);
    newVersion = version ?? 1;

    const rows: InsertProposalRow[] = existingProposals.map((p, i) => ({
      event_id: id,
      rank: (i + 1) as number,
      restaurant_name: (p.restaurant_name as string) ?? '',
      restaurant_addr: (p.restaurant_addr as string) ?? '',
      cuisine_type: (p.cuisine_type as string) ?? '',
      price_range: (p.price_range as string) ?? '',
      rating: (p.rating as number) ?? undefined,
      reasoning: (p.reasoning as string) ?? '',
      constraints_met: (p.constraints_met as Record<string, boolean>) ?? {},
      constraints_gap: (p.constraints_gap as Record<string, string>) ?? {},
    }));

    replaceProposalsAndAdvance(id, rows);

    changeLog = {
      kept: existingProposals.map((p) => p.restaurant_name as string),
      replaced: [],
      added: [],
      reason: `局部调整：${intentTypes.join(', ')} 类修改，保留现有候选`,
    };
  }

  // Mark approved suggestions as applied
  for (const sid of approvedIds) {
    updateModificationSuggestionStatus(sid, 'applied', 'demo-host');
  }

  const { data: updatedProposals } = getProposalsByEvent(id);

  return NextResponse.json({
    new_version: newVersion,
    proposals: updatedProposals ?? [],
    change_log: changeLog,
  });
}
