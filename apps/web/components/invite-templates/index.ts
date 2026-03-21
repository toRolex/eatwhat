import type { ComponentType } from 'react';
import type { Invitation, Event } from '@groupplan/types';

// Shared props contract for all invite templates
export interface InviteTemplateProps {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'proposed_date' | 'rsvp_deadline' | 'status' | 'slug'>;
}

// Registry maps template_id → component; adding a template is one line here + a new file
const templates: Record<string, () => Promise<{ default: ComponentType<InviteTemplateProps> }>> = {
  classic:  () => import('./classic'),
  minimal:  () => import('./minimal'),
  gradient: () => import('./gradient'),
};

export default templates;
