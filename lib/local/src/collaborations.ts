import type { UploadedMedia } from './publications.js';
import type { VideoComposition } from './video-composition.js';
/** Render settings declared by the artist, not a forensic verification of media content. */
export type ProposalPreparationMetadata = { version: 1; referenceId: string; fragment?: { startSeconds: number; endSeconds: number }; composition?: VideoComposition };
export const opportunityNeeds = ['Verse', 'Feature', 'Production', 'Mix', 'Master'] as const;
export type Compensation = { kind: 'split'; percent: number } | { kind: 'fee'; amount: number; currency: 'USD' };
export type OfferInput = { referenceMediaId?: string | null; workId?: number | null; workTitle?: string; need: typeof opportunityNeeds[number]; deliverable: string; requirements: string; deadline: string | null; compensation: Compensation; status: 'open' | 'closed' };
export type CollaborationOffer = OfferInput & { reference?: UploadedMedia | null; ownerName?: string; id: number; projectId: number; ownerId: number; projectTitle: string; revision: number; createdAt: string; available: boolean };
export type CollaborationStatus = 'discussion' | 'submitted' | 'changes_requested' | 'accepted' | 'delivered' | 'completed' | 'rejected' | 'withdrawn';
export type Collaboration = { admission: import('./messages.js').Admission; requestPolicy: number; unreadCount: number; lastActivityId: number | null; id: number; offerId: number; ownerId: number; applicantId: number; ownerName: string; applicantName: string; projectTitle: string; terms: CollaborationOffer; status: CollaborationStatus; revision: number; updatedAt: string };
export type CollaborationDetail = Collaboration & {
  currentOffer: CollaborationOffer;
  submissions: { id: number; kind: 'proposal' | 'delivery'; text: string; media: UploadedMedia; files: UploadedMedia[]; createdAt: string; terms: CollaborationOffer | null; preparation?: ProposalPreparationMetadata | null; remix?: { publicationId?: number; draftId?: string; draftRevision?: number; composition?: VideoComposition; title: string; originalTitle: string; originalArtist: string } | null }[];
  messages: { id: number; authorId: number; author: string; text: string; kind?: string; createdAt: string }[];
  nextMessageCursor: number | null;
};
