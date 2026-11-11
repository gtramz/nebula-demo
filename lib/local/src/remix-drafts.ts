import type { RemixAttribution, RemixInput, UploadedMedia } from './publications.js';

/** Local mock contract. Antiq's production transport/auth remains to be supplied. */
type DraftBase = {
  id: string; ownerId: number; revision: number; createdAt: string; updatedAt: string;
  title: string; description: string; settings: RemixInput; attribution: Pick<RemixAttribution, 'sourceId' | 'sourceRevision' | 'artistId' | 'artistName' | 'title' | 'projectId' | 'grantedAt'>;
  render: UploadedMedia | null; renderRevision: number | null;
};
/** Missing workflow denotes an unchanged legacy contribution/mix draft. */
export type RemixDraft = DraftBase & (
  | { workflow: 'finished-audio'; finalAudio: { version: 1; duration: number; receiptRevision: number } | null; contribution: null }
  | { workflow?: 'mix' | 'video'; finalAudio?: never; contribution: (UploadedMedia & { duration: number }) | null }
);
export type RemixDraftUpdate = {
  revision: number; title: string; description: string; settings: RemixInput;
  contributionId: string | null; contributionDuration: number | null; renderId: string | null;
};
