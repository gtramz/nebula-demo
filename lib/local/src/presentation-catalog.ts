/** Visual reference metadata only. Never represents an uploaded recording or royalties. */
type CatalogSource = { spotifyId?: string; sourceId?: string; sourcePlatform?: 'spotify' | 'youtube' };
export type PresentationTrack = CatalogSource & { workId: number; title: string; artists: string; durationSeconds: number; explicit: boolean };
export type PresentationRelease = CatalogSource & { projectId: number; title: string; type: 'Single' | 'EP' | 'Album' | 'Video'; year: number; dateKind?: 'release' | 'upload'; formatLabel?: string; source: string; coverUrl: string; tracks: PresentationTrack[] };
export type PresentationCatalog = { version: 1; artistId: number; artistName: string; source: string; picture: string; releases: PresentationRelease[] };

/** User-supplied, finished recordings in the fictional presentation scene. */
export type PresentationRecording = { postId: number; projectId: number; workId: number; artistIds: number[]; title: string; mediaId: string; durationSeconds: number; coverId: string };
export type PresentationRemixExample = { version: 1; original: PresentationRecording; remix: PresentationRecording; accounts: { id: number; name: string; role: string }[] };
