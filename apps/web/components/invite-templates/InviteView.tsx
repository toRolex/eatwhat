import dynamic from 'next/dynamic';
import type { Invitation, Event } from '@groupplan/types';
import type { InviteTemplateProps } from './index';

interface Props {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'proposed_date' | 'rsvp_deadline' | 'status' | 'slug'>;
  templateId: string;
}

const LOADERS: Record<string, ReturnType<typeof dynamic<InviteTemplateProps>>> = {
  classic:  dynamic(() => import('./classic')),
  minimal:  dynamic(() => import('./minimal')),
  gradient: dynamic(() => import('./gradient')),
};

// Falls back to classic if an unknown template_id is stored
const FALLBACK = LOADERS['classic']!;

export default function InviteView({ invitation, event, templateId }: Props) {
  const Template = LOADERS[templateId] ?? FALLBACK;
  return <Template invitation={invitation} event={event} />;
}
