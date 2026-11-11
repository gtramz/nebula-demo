# Project detail: Music and Versions

Date: 2026-11-10. Scope: `nebula-demo` public project detail only.

## Implementation

- `artifacts/nebula/src/features/project/music.tsx`: common song rows, initial/explicit song selection, identity-scoped view state and media queries, public Versions list, deferred comparison, unassigned recordings, playback coordination.
- `artifacts/nebula/src/pages/project.tsx`: integrate common Music/Versions instead of stacked catalog, song and community players; retain project identity, financial sidebar and community privacy.
- `artifacts/nebula/src/features/collaborations/index.tsx`: shared offer query and opt-in compact project presentation; retain owner/applicant controls; prevent Close while an edit is open.
- `artifacts/nebula/src/components/audio-preview.tsx`: account-scoped waveform cache and optional existing-reference loader.
- `artifacts/nebula/src/features/collaborations/proposal-preparation.tsx`: export the existing reference waveform decoder for reuse.
- `tests-presentation/project-music.spec.ts`: new layout, playback, return, catalog, owner and role regressions.
- `tests-presentation/shared-artist.spec.ts`, `tests-shared/project-songs.spec.ts`: update selectors and traversal for collapsible project content and the existing guided proposal flow; retain privacy, submission and concurrency assertions.

## Verification

- Production build and TypeScript pass. Existing bundle-size/sourcemap warnings remain nonfatal.
- Unit suite: 82 passed.
- API suites `server/works.test.mjs`, `server/app.test.mjs`, `server/proposal-preparation.test.mjs`: 33 passed, including song membership, private media, permissions, proposal terms, conflicts and transactions.
- Shared browser song suite: 4 passed, desktop/mobile, including five-song EP creation/edit/reordering, Discovery song links, a private proposal between two accounts and concurrent edit recovery.
- Presentation browser coverage: real LUNA playback, visual catalog playback, exclusive Home → project audio, optional funding and privacy, profile return, scoped/general offers, Music/Versions and on-demand comparison. The final focused Music/Versions + shared-artist run passed 14/14; the other 12 presentation cases (funding music, Home playback and optional funding) also passed. Together with the shared song suite, this covers 30 distinct browser cases. Initial test failures exposed the need to select audio before alternate video and protect Close during offer editing; both were corrected and the relevant cases passed again.
- Visual review at 390, 768, 1024 and 1440 CSS pixels. Mobile tests use Chromium emulation, not physical iOS/Android devices.

## Preservation and boundaries

Backup: `.data/backups/project-music-versions-20261110-214258/`, containing a SQLite snapshot, media/prepared copies and SHA256 manifest. Compared 32 tables and 78 files. Only operational rate-limit entries changed; account/project/work/publication/agreement/history records and media matched. No fixtures were applied to the active database or portable seed.

Recordings are matched by work ID/owner or exact reference, never title similarity. Only registered catalog tracks use the existing silent visual transport; these are not generated audio. Unknown real user songs without a recording remain without a fabricated player. Public versions come from the existing authorized project community endpoint; private drafts and proposals are not queried as versions. Metadata and original attribution are unchanged.

## Captures

Captured against isolated presentation fixtures, with no changes to the active account.

| Width | Music | Versions |
|---|---|---|
| 390px | [Music](verification/project-music-versions/music-390.png) | [Versions](verification/project-music-versions/versions-390.png) |
| 768px | [Music](verification/project-music-versions/music-768.png) | [Versions](verification/project-music-versions/versions-768.png) |
| 1024px | [Music](verification/project-music-versions/music-1024.png) | [Versions](verification/project-music-versions/versions-1024.png) |
| 1440px | [Music](verification/project-music-versions/music-1440.png) | [Versions](verification/project-music-versions/versions-1440.png) |
