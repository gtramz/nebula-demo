import type { PresentationCatalog, PresentationRemixExample } from '@nebula/local';

type ProjectCopy = { id: number; artistId: number; pitch?: string | null; story?: string | null };
/** Display-only cleanup of exact importer strings, scoped to registered examples.
 * Never normalize arbitrary user text or write the cleaned copy back to storage. */
export function projectProductCopy(project: ProjectCopy, catalogs: PresentationCatalog[], example?: PresentationRemixExample | null) {
  let { pitch, story } = project;
  const catalog = catalogs.find(c => c.artistId === project.artistId && c.releases.some(r => r.projectId === project.id));
  const release = catalog?.releases.find(r => r.projectId === project.id);
  if (release && catalog) {
    const format = release.formatLabel ?? release.type;
    const seededPitch = `${format} · ${release.year}${release.dateKind === 'upload' ? ' upload' : ''}${['No Pop','No Regrets'].includes(release.title) ? ' · Demo opportunity' : ''}`;
    if (pitch === seededPitch) pitch = release.dateKind === 'upload' ? `${format} · YouTube ${release.year}` : `${format} · ${release.year}`;
    const artists = release.tracks.map(t => t.artists).join('; ');
    const seededStory = `${release.title} · ${artists}. ${release.dateKind === 'upload' ? 'Official audio published on YouTube; the year refers to that upload.' : 'Verified Spotify release.'} Catalog playback is a silent visual preview.`;
    if (story === seededStory || (catalog.artistName === 'CHILZ' && story === 'A release by CHILZ. Explore the tracklist below.')) story = '';
  }
  const recording = example && [example.original, example.remix].find(r => r.projectId === project.id && r.artistIds.includes(project.artistId));
  if (recording) {
    if (pitch === 'Single · Presentation recording') pitch = 'Single';
    if (story === 'Original recording by gramz & SANNFERNNA, supplied for this presentation.') story = 'Original recording by gramz & SANNFERNNA.';
    if (story === 'CHILZ remix of luna by gramz & SANNFERNNA. Finished recording supplied for this presentation.') story = 'CHILZ remix of luna by gramz & SANNFERNNA.';
  }
  return { pitch, story };
}

export function offerProductDeliverable(offer: { projectId: number; workId?: number | null; deliverable: string }, catalogs: PresentationCatalog[]) {
  const release = catalogs.flatMap(c => c.releases).find(r => r.projectId === offer.projectId && r.tracks.some(t => t.workId === offer.workId));
  const expected = release?.title === 'No Pop' ? 'a featured vocal contribution' : release?.title === 'No Regrets' ? 'a completed stereo mix' : undefined;
  return expected && offer.deliverable === `Demo opportunity · ${expected}` ? expected : offer.deliverable;
}
