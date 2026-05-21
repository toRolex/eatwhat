import crypto from 'crypto';
import { ImplicitInferenceResult, ImplicitContext, ConstraintItem, ConstraintStrength } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';

export interface EventRecord {
  id: string;
  title: string;
  event_date: string | null;
  guest_count: number;
}

function findKeyword(lower: string, keywords: string[]): string | undefined {
  return keywords.find(k => lower.includes(k));
}

function makeItem(
  category: ConstraintItem['category'],
  value: string,
  confidence: number,
  sourceText: string,
  reason: string,
): ConstraintItem {
  return { id: crypto.randomUUID(), category, strength: 'inferred' as ConstraintStrength, value, confidence, sourceText, reason };
}

export function runImplicitInference(event: EventRecord): ImplicitInferenceResult {
  const lower = event.title.toLowerCase();
  let formality_bias = 0;
  let event_type_hint: ImplicitContext['event_type_hint'] = 'general';

  if (lower.includes('birthday') || lower.includes('bday')) {
    event_type_hint = 'celebration';
    formality_bias += 0.3;
  } else if (lower.includes('team') || lower.includes('standup') || lower.includes('offsite')) {
    event_type_hint = 'work';
    formality_bias += 0.5;
  } else if (lower.includes('date night') || (lower.includes('date') && !lower.includes('update'))) {
    event_type_hint = 'date';
    formality_bias += 0.2;
  }

  let meal_type: ImplicitContext['meal_type'] = 'dinner';
  if (event.event_date !== null) {
    const d = new Date(event.event_date);
    const hour = d.getHours();
    const day = d.getDay();
    if (hour >= 10 && hour <= 13) {
      meal_type = day === 6 || day === 0 ? 'brunch' : 'lunch';
    } else if (hour >= 14 && hour <= 16) {
      meal_type = 'lunch';
    } else if (hour >= 17 && hour <= 19) {
      meal_type = 'dinner';
    } else if (hour >= 20) {
      meal_type = 'late_night';
      formality_bias += 0.2;
    }
  }

  const gc = event.guest_count;
  const group_size_class: ImplicitContext['group_size_class'] =
    gc === 2 ? 'intimate' : gc <= 6 ? 'small' : gc <= 12 ? 'medium' : 'large';

  formality_bias = Math.max(-1, Math.min(1, formality_bias));

  const context: ImplicitContext = { event_type_hint, meal_type, formality_bias, group_size_class };
  const inferred: ConstraintItem[] = [];

  if (lower.includes('birthday') || lower.includes('bday')) {
    inferred.push(makeItem('ambiance', 'celebratory', 0.8, findKeyword(lower, ['birthday', 'bday']) ?? 'birthday', 'Title suggests celebratory occasion'));
  } else if (lower.includes('celebration') || lower.includes('anniversary')) {
    inferred.push(makeItem('ambiance', 'celebratory', 0.8, findKeyword(lower, ['celebration', 'anniversary']) ?? 'celebration', 'Title suggests celebratory occasion'));
  }

  if (lower.includes('date night') || lower.includes('romantic')) {
    inferred.push(makeItem('ambiance', 'romantic', 0.85, findKeyword(lower, ['date night', 'romantic']) ?? 'date night', 'Title suggests romantic occasion'));
  }

  const workKw = findKeyword(lower, ['offsite', 'standup', 'work']);
  const hasTeamLunch = lower.includes('team') && lower.includes('lunch');
  if (hasTeamLunch) {
    inferred.push(makeItem('ambiance', 'professional', 0.8, 'team lunch', 'Title suggests work context'));
  } else if (workKw) {
    inferred.push(makeItem('ambiance', 'professional', 0.8, workKw, 'Title suggests work context'));
  } else if (lower.includes('team')) {
    inferred.push(makeItem('ambiance', 'professional', 0.8, 'team', 'Title suggests work context'));
  }

  const fastKw = findKeyword(lower, ['lunch break', 'quick', 'fast']);
  if (fastKw) {
    inferred.push(makeItem('service_speed', 'fast', 0.75, fastKw, 'Title suggests time constraint'));
  }

  if (lower.includes('casual')) {
    inferred.push(makeItem('ambiance', 'casual', 0.8, 'casual', 'Title suggests casual setting'));
  }

  if (lower.includes('fine dining')) {
    inferred.push(makeItem('ambiance', 'upscale', 0.85, 'fine dining', 'Title suggests upscale setting'));
  } else if (lower.includes('fancy')) {
    inferred.push(makeItem('ambiance', 'upscale', 0.85, 'fancy', 'Title suggests upscale setting'));
  }

  if (lower.includes('cheap')) {
    inferred.push(makeItem('budget', 'budget-conscious', 0.8, 'cheap', 'Title suggests budget constraint'));
  } else if (lower.includes('budget') && !lower.includes('fine dining')) {
    inferred.push(makeItem('budget', 'budget-conscious', 0.8, 'budget', 'Title suggests budget constraint'));
  }

  const familyKw = findKeyword(lower, ['with parents', 'family', 'kids']);
  if (familyKw) {
    inferred.push(makeItem('ambiance', 'family-friendly', 0.8, familyKw, 'Title suggests family-friendly setting'));
  }

  const result: ImplicitInferenceResult = { context, inferred };

  safeLogStage({
    eventId: event.id,
    stage: 'implicit-inference',
    provider: 'internal',
    model: 'none',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    rawInput: event,
    rawOutput: result,
  });

  return result;
}

export const implicitInference = { run: runImplicitInference };
