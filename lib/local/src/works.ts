/** Administration metadata, not copyright or a recording. Visibility is contextual. */
export type Song = { id: number; ownerId: number; title: string; description: string; revision: number; createdAt: string; updatedAt: string };
export type RecordingInput = { id: string; mediaId: string; publicationId?: number | null; publicationRevision?: number };
export type ProjectRecording = RecordingInput & { available: boolean; media: import('./publications.js').UploadedMedia | null };
export type SongEntry = { clientId?: string; workId?: number; revision?: number; title: string; description: string; recordings?: RecordingInput[] };
export type Tracklist = { revision: number; primaryRecordingId?: string | null; songs: (Song & { references: string[]; recordings?: ProjectRecording[] })[] };
export const musicalProject = (category: string) => ['single','ep','album','video'].includes(category.toLowerCase());
export const songProjectHref = (projectId: number, workId?: number | null) => `/project/${projectId}${workId ? `?song=${workId}` : ''}`;
